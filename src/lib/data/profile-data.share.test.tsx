import { describe, it, expect } from "vitest";
import { createMemo, Errored, Loading } from "solid-js";
import { render } from "../../../tests/render";

/**
 * Why the profile-read memos are per-consumer (T2.3).
 *
 * The first two attempts to share them were reverted against a stated reason
 * that turned out to be wrong: that a shared memo destroys ERROR ISOLATION by
 * "failing every consumer of that key at once". These tests pin the actual
 * contract so the next attempt starts from the truth.
 *
 * Measured on 2026-09-29: hoisting the memos to a provider-level
 * memoProfileReads(reads) broke three browser tests — but not on the error
 * path. Retry made zero requests and the card stayed in .card-error forever.
 * The cause is that <Errored>'s reset() recomputes the BOUNDARY'S OWN SOURCES,
 * and a memo hoisted above the boundary is not one of them. revalidate() alone
 * clears the cache; something has to re-invoke the read.
 */
describe("profile-read memo ownership", () => {
  /** A read with no reactive dependency, like query() over captured args. */
  const makeRead = (state: { fail: boolean }, calls: number[]) => () => {
    calls.push(1);
    return state.fail ? Promise.reject(new Error("boom")) : Promise.resolve({ v: 7 });
  };

  it("a shared memo still isolates errors PER BOUNDARY — the old reason was wrong", async () => {
    // If this ever fails, error isolation would be a real reason to keep the
    // per-consumer memos, and the note in profile-data.ts needs correcting.
    const state = { fail: true };
    const calls: number[] = [];
    const read = makeRead(state, calls);
    const rendered: string[] = [];
    const Card = (props: { value: () => unknown; tag: string }) => (
      <Errored fallback={() => { rendered.push(props.tag); return <p>{props.tag}-error</p>; }}>
        <Loading fallback={null}><p>{props.tag}-ok:{String((props.value() as any)?.v)}</p></Loading>
      </Errored>
    );
    const App = () => {
      const shared = createMemo(read); // ONE memo, read by two sibling boundaries
      return <><Card value={shared} tag="A"/><Card value={shared} tag="B"/></>;
    };
    const { container, unmount } = render(() => <App />);
    await new Promise(r => setTimeout(r, 60));
    // Both boundaries rendered their OWN error fallback.
    expect(container.textContent).toContain("A-error");
    expect(container.textContent).toContain("B-error");
    expect(rendered.sort()).toEqual(["A", "B"]);
    unmount();
  });

  it("the boundary that owns the memo is the one that can recover it", async () => {
    // This is the real contract: recovery is scoped to the memo's owner.
    const state = { fail: true };
    const calls: number[] = [];
    const read = makeRead(state, calls);
    let resetBoundary: () => void = () => {};
    const App = () => {
      const own = createMemo(read); // created inside the boundary's own scope
      return (
        <Errored fallback={(_err, reset) => { resetBoundary = reset; return <p>error</p>; }}>
          <Loading fallback={null}><p>ok:{String((own() as any)?.v)}</p></Loading>
        </Errored>
      );
    };
    const { container, unmount } = render(() => <App />);
    await new Promise(r => setTimeout(r, 60));
    expect(container.textContent).toContain("error");
    const before = calls.length;
    state.fail = false;      // stand-in for revalidate() clearing the cache
    resetBoundary();         // the boundary recomputes its own sources
    await new Promise(r => setTimeout(r, 60));
    expect(calls.length, "an owned memo re-invokes on reset and refetches").toBeGreaterThan(before);
    expect(container.textContent).toContain("ok:7");
    unmount();
  });
});
