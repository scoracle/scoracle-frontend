import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';

/** Delay only the first reveal. Reads, navigation and search start normally. */
export function createArrival(cardReady?: () => boolean) {
  type Phase = 'waiting' | 'closing' | 'opening' | 'done';
  const [phase, setPhase] = createSignal<Phase>('waiting');
  const [elapsed, setElapsed] = createSignal(false);
  let timer: ReturnType<typeof setTimeout>;
  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPhase('done');
    else timer = setTimeout(() => setElapsed(true), 1000);
  });
  createEffect(() => {
    if (!elapsed() || phase() !== 'waiting') return;
    if (!cardReady) { setPhase('done'); return; }
    if (!cardReady()) return;
    setPhase('closing');
    timer = setTimeout(() => {
      setPhase('opening');
      timer = setTimeout(() => setPhase('done'), 360);
    }, 240);
  });
  onCleanup(() => clearTimeout(timer));
  return phase;
}
