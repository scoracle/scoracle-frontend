import type { VibeResponse } from '../../../src/lib/data/vibe';
import { createProduct } from './product.ts';

/** Profile-local owner: card, ring and membership read the same response. */
export function createProfileProducts(identity: { sport: string; type: string; id: string }) {
  const vibe = createProduct<VibeResponse>();
  const loadVibe = () => vibe.load(`/api/vibe?${new URLSearchParams(identity)}`);
  const current = () => { const state = vibe.state(); return state.status === 'success' ? state.data.current : null; };
  const vibeScore = () => current()?.heat ?? null;
  // Failure retains a retryable seat; missing heat never hides readable prose.
  const hasVibe = () => vibe.state().status === 'error' || current() != null;
  return { vibe, loadVibe, current, vibeScore, hasVibe };
}
