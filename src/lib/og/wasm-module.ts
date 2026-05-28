/**
 * Cross-bundle handoff for the resvg WebAssembly module.
 *
 * `worker.ts` (bundled by wrangler) imports the `.wasm` as a build-time
 * `WebAssembly.Module` — Workers forbid instantiating wasm from bytes at
 * runtime — and the OG rasterizer (in the Vite-built SSR bundle) needs it.
 * Those are two separate bundles, so a shared module-scoped variable would be
 * duplicated, not shared; `globalThis` is the only transport that spans both.
 * This module owns that single key and types it, so neither end reaches for a
 * raw `globalThis as {...}` cast and the contract lives in one place — which
 * is the only spot to touch if the worker shim is swapped for an official
 * SolidStart Cloudflare adapter later.
 */

interface ResvgGlobal {
  __scoracleResvgModule?: WebAssembly.Module;
}

export function setResvgModule(mod: WebAssembly.Module): void {
  (globalThis as ResvgGlobal).__scoracleResvgModule = mod;
}

export function getResvgModule(): WebAssembly.Module | undefined {
  return (globalThis as ResvgGlobal).__scoracleResvgModule;
}
