/**
 * Vitest setup — unmount rendered components after each test so the DOM doesn't
 * leak between cases. Harmless for the pure-logic `.test.ts` suites (they render
 * nothing). Explicit imports (no `globals: true`) so existing tests' semantics
 * are unchanged.
 */
import { afterEach } from "vitest";
import { cleanup } from "@solidjs/testing-library";

afterEach(() => cleanup());
