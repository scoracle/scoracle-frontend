import { createSignal, Show } from "solid-js";
import { Transition } from "solid-transition-group";

/**
 * Phase 2 smoke test: solid-transition-group on Solid 1.9.11 + SolidStart 2.0-alpha.
 * Toggles a card with enter/exit fades. Confirms the transition library works
 * before component porting depends on it (CrystalBall carousel uses it).
 * Delete once the transition is exercised in production traffic.
 */
export default function SmokeTransition() {
  const [visible, setVisible] = createSignal(true);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>solid-transition-group smoke test</h1>
      <button type="button" onClick={() => setVisible((v) => !v)}>
        {visible() ? "Hide" : "Show"}
      </button>
      <Transition
        onEnter={(el, done) => {
          const a = el.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 250 },
          );
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 200 },
          );
          a.finished.then(done);
        }}
      >
        <Show when={visible()}>
          <div
            style={{
              "margin-top": "1rem",
              padding: "1rem",
              border: "1px solid var(--border)",
              "border-radius": "0.375rem",
            }}
          >
            If this fades in/out smoothly, solid-transition-group works on the alpha.
          </div>
        </Show>
      </Transition>
    </main>
  );
}
