import { createRoot, createSignal } from 'solid-js';
import { expect, it, vi } from 'vitest';
import { createArrival } from './arrival';

it('waits for both the minimum dwell and the card data, then turns only once', () => {
  vi.useFakeTimers();
  const [ready, setReady] = createSignal(false);
  const { phase, plain, dispose } = createRoot(dispose => ({ phase: createArrival(ready), plain: createArrival(), dispose }));
  try {
    vi.advanceTimersByTime(999);
    expect(plain()).toBe('waiting');
    vi.advanceTimersByTime(1);
    expect(plain()).toBe('done');
    expect(phase()).toBe('waiting');
    setReady(true);
    expect(phase()).toBe('closing');
    vi.advanceTimersByTime(240);
    expect(phase()).toBe('opening');
    vi.advanceTimersByTime(360);
    setReady(false);
    expect(phase()).toBe('done');
  } finally {
    dispose();
    vi.useRealTimers();
  }
});
