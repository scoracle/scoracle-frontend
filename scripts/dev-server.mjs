import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";

// Runs `wrangler dev` under a supervisor that notices when it has been
// orphaned and takes the dev server down with it.
//
// `wrangler dev` is long-running and foreground, so when the shell that
// started it goes away the process is NOT killed — it reparents to init and
// keeps its dist/ watcher alive, and every later build wakes it to spawn
// another ~70MB workerd (see scripts/reap-dev-servers.mjs). `npm run dev:reap`
// cleans that up, but only at the START of the next cf:dev; nothing stopped
// the orphan being created in the first place. This does.
//
// Detection is just getppid(): Node re-reads it on every access, so an
// orphaned process sees ppid flip to 1 within a poll. Every stale stack found
// in the 2026-07-23 sweep had ppid 1, so this would have caught all of them.
// A dev server running in a terminal or tmux pane keeps a live parent and is
// never touched.

const root = process.cwd();
const POLL_MS = 2000;
const SIGKILL_GRACE_MS = 2000;

const wrangler = join(root, "node_modules", ".bin", "wrangler");
const args = ["dev", ...process.argv.slice(2)];

// `detached` puts wrangler in its own process group so we can signal the whole
// tree with -pid. Signalling wrangler alone is not enough: workerd has been
// observed outliving its parent and holding the port while serving nothing.
const child = spawn(wrangler, args, { stdio: "inherit", detached: true });

let shuttingDown = false;

const killTree = (signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal); // Group already gone; try the bare pid.
    } catch {
      // Nothing left to signal.
    }
  }
};

const shutDown = (reason, exitCode) => {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(watch);
  if (reason) console.log(`\ndev-server: ${reason}`);
  killTree("SIGTERM");
  setTimeout(() => {
    killTree("SIGKILL");
    process.exit(exitCode);
  }, SIGKILL_GRACE_MS).unref();
  child.once("exit", () => process.exit(exitCode));
};

// Watching our own ppid is NOT enough. The real chain is
// `shell -> npm run cf:dev -> this -> wrangler`, and when the shell dies npm
// survives (reparented to init), so our direct parent never changes. What
// actually died is further up. So record the whole ancestry at startup and
// watch for any of it disappearing.
const ancestry = (() => {
  const chain = [];
  let cursor = process.ppid;
  while (cursor && cursor > 1 && chain.length < 32 && !chain.includes(cursor)) {
    chain.push(cursor);
    let ppid = 0;
    try {
      ppid = Number(
        execFileSync("ps", ["-o", "ppid=", "-p", String(cursor)], { encoding: "utf8" }).trim()
      );
    } catch {
      break; // Already gone, or no ps — stop walking.
    }
    cursor = ppid;
  }
  return chain;
})();

// EPERM means it exists but is not ours; only ESRCH means actually gone.
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

const watch = setInterval(() => {
  const dead = ancestry.find((pid) => !isAlive(pid));
  if (dead !== undefined) {
    shutDown(
      `orphaned (ancestor ${dead} exited) — shutting the dev server down instead of leaking it`,
      0
    );
  }
}, POLL_MS);

// Ctrl-C reaches our process group, not wrangler's — forward it by hand.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutDown(null, 0));
}

child.on("exit", (code, signal) => {
  if (shuttingDown) return;
  clearInterval(watch);
  process.exit(signal ? 1 : (code ?? 0));
});

child.on("error", (error) => {
  clearInterval(watch);
  console.error(`dev-server: failed to start ${wrangler} — ${error.message}`);
  process.exit(1);
});
