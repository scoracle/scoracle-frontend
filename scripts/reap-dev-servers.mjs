import { execFileSync } from "node:child_process";

// `wrangler dev` is long-running and foreground, so when the shell that started
// it goes away the process is not killed — it reparents to init and keeps its
// dist/ file watcher alive. Every later build then wakes EVERY orphan
// ("⎔ Reloading local server...") and each spawns another ~70MB workerd, so the
// cost is orphans x future builds, not a one-off. One abandoned server was found
// with 55 such reloads; a sweep on 2026-07-23 found 27 processes holding 3.0GB.
// The other tell is a lone workerd with ppid 1 still bound to the port while
// serving nothing — the "address already in use" that no restart clears.
//
// Runs before `cf:dev`, where killing the previous dev server is exactly what
// you want. Deliberately NOT wired into cf:build/cf:deploy: someone may be
// running a dev server on purpose while they deploy, and reaping it out from
// under them would be a surprise.

const root = process.cwd();
const SIGKILL_GRACE_MS = 2000;

const snapshot = () => {
  let out;
  try {
    out = execFileSync("ps", ["-eo", "pid=,ppid=,args="], { encoding: "utf8" });
  } catch {
    return null; // No ps (non-POSIX host) — nothing to reap, nothing to say.
  }
  const procs = new Map();
  for (const line of out.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (match) {
      procs.set(Number(match[1]), { ppid: Number(match[2]), args: match[3] });
    }
  }
  return procs;
};

const procs = snapshot();
if (!procs) process.exit(0);

const isDevServer = (args) => /workerd|wrangler/.test(args);
// The live prod API runs on this box (:8000). It could never match the patterns
// above, but the cost of being wrong here is an outage — so say it out loud.
const isProtected = (args) => /scoracle-api/.test(args);

const ancestorsOf = (pid) => {
  const chain = new Set();
  let cursor = procs.get(pid)?.ppid;
  while (cursor && cursor !== 1 && !chain.has(cursor)) {
    chain.add(cursor);
    cursor = procs.get(cursor)?.ppid;
  }
  return chain;
};

// Never kill ourselves or whatever invoked us — `npm run cf:dev` matches
// /wrangler/ by way of its own command line.
const untouchable = new Set([process.pid, ...ancestorsOf(process.pid)]);

// Seed on this checkout only: a workerd from a sibling repo is not ours to
// reap. The top-level `npm exec wrangler dev` carries no path, so walk up from
// each seed while the parent still looks like part of the same dev-server tree.
const roots = new Set();
for (const [pid, { args }] of procs) {
  if (!isDevServer(args) || !args.includes(root) || isProtected(args)) continue;
  let top = pid;
  for (const ancestor of ancestorsOf(pid)) {
    const parent = procs.get(ancestor);
    if (!parent || !isDevServer(parent.args) || isProtected(parent.args)) break;
    top = ancestor;
  }
  roots.add(top);
}

const doomed = new Set();
const collect = (pid) => {
  if (doomed.has(pid) || untouchable.has(pid) || pid <= 1) return;
  doomed.add(pid);
  for (const [child, { ppid }] of procs) if (ppid === pid) collect(child);
};
for (const pid of roots) collect(pid);

if (doomed.size === 0) process.exit(0);

const rss = (pid) => {
  try {
    return Number(execFileSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" }).trim()) || 0;
  } catch {
    return 0;
  }
};
const freedMb = Math.round([...doomed].reduce((sum, pid) => sum + rss(pid), 0) / 1024);

if (process.argv.includes("--dry-run")) {
  console.log(`reap --dry-run: would clear ${doomed.size} process(es), ~${freedMb}MB`);
  for (const pid of [...doomed].sort((a, b) => a - b)) {
    console.log(`  ${pid}  ${procs.get(pid)?.args.slice(0, 96) ?? "(gone)"}`);
  }
  process.exit(0);
}

const signal = (pids, sig) => {
  for (const pid of pids) {
    try {
      process.kill(pid, sig);
    } catch {
      // Already gone, or not ours to signal — either way there is nothing to do.
    }
  }
};

signal(doomed, "SIGTERM");

const alive = () => [...doomed].filter((pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
});

const deadline = Date.now() + SIGKILL_GRACE_MS;
while (alive().length > 0 && Date.now() < deadline) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
}

const stubborn = alive();
if (stubborn.length > 0) signal(stubborn, "SIGKILL");

console.log(
  `reap: cleared ${doomed.size} stale wrangler/workerd process${doomed.size === 1 ? "" : "es"}` +
    `${freedMb > 0 ? ` (~${freedMb}MB)` : ""}` +
    `${stubborn.length > 0 ? `, ${stubborn.length} needed SIGKILL` : ""}`
);
