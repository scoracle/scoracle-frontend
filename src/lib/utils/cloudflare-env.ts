import { getRequestEvent } from "@solidjs/web";

declare module "@solidjs/web" {
  interface RequestEventLocals { cloudflare?: { env: Env; ctx: ExecutionContext } }
}
/** The adapter supplies bindings on Solid's request-local event, including RPCs. */
export function getCloudflareEnv(): Env | undefined {
  return getRequestEvent()?.locals.cloudflare?.env;
}
export async function readServerAssetText(path: string): Promise<string | null> {
  "use server";
  if (!/^\/data\/[a-z0-9-]+\.json$/.test(path)) throw new Error("Invalid asset path");
  const env = getCloudflareEnv();
  if (env) {
    const response = await env.ASSETS.fetch(new URL(path, "https://assets.local"));
    return response.ok ? await response.text() : null;
  }
  // Node dev/preview only. The Worker always takes the binding branch above.
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  try { return await readFile(resolve(process.cwd(), "public", path.slice(1)), "utf8"); }
  catch { return null; }
}
