import type { JSX } from 'solid-js';
import { createMemo, onMount } from 'solid-js';
import { createProduct } from '../lib/product';
import type { HomeMover } from '../lib/data/home-movers';
import CrystalBall from '../components/CrystalBall';
import SearchBar from '../components/SearchBar';
import './home.css';

export default function HomeExplorer(props: { artwork?: JSX.Element }) {
  const product = createProduct<HomeMover[]>();
  const movers = createMemo(() => {
    const state = product.state();
    return state.status === 'success' ? state.data : [];
  });
  onMount(() => { void product.load('/api/home-movers'); });
  return <>
    <div class="central-card" classList={{ 'home-movers-ready': movers().length > 0 }}>
      <CrystalBall artwork={props.artwork} movers={movers()} />
    </div>
    <div class="home-search"><SearchBar storyNames={movers().map(mover => mover.name)} /></div>
  </>;
}
