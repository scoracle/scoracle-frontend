import { createMemo, Show } from 'solid-js';
import { useProfile } from '../lib/profile-context';
import { useProfileRead, useProfileProducts } from '../lib/profile-products';
import { parseEntities } from '../lib/data/parse-entities';
import Disclosure from './Disclosure';
import SearchBar from './SearchBar';
import Icon from './Icon';
import './Select.css';
import './CompareControl.css';
import './CompareSearch.css';
export default function CompareControl() {
  const ctx = useProfile();
  const meta = useProfileRead('comparisonMeta');
  const { directory, teams, loadSearch } = useProfileProducts();
  const candidates = createMemo(() => { const state = directory.state(); return state.status === 'success' ? parseEntities(state.data.entities, ctx.sport()).filter(e => e.type === ctx.type() && e.id !== ctx.id()) : []; });
  const details = createMemo(() => { const state = teams.state(); return state.status === 'success' ? Object.fromEntries(Object.entries(state.data).map(([id, team]) => [id, team.conference || team.league?.name || ''])) : {}; });
  const label = () => ctx.vs() ? `vs ${meta()?.name ?? '…'}` : 'vs —';
  return <Disclosure class="compare-control" triggerClass="select-trigger" haspopup="dialog" ariaLabel={`Compare: ${label()}`} trigger={() => <span class="select-value">{label()}</span>}>
    {api => {
      loadSearch();
      return <div class="compare-control-panel search-popover"><div class="compare-search-row">
        <Show when={!ctx.vs()} fallback={<div class="compare-pill"><span class="compare-pill-label">vs</span><span class="compare-pill-name">{meta()?.name ?? ctx.vs()}</span><button class="compare-pill-clear" aria-label="Clear comparison" onClick={() => ctx.setVs(null)}><Icon name="close" size={16} /></button></div>}>
          <Show when={directory.state().status !== 'pending'} fallback={<p role="status">Loading search…</p>}>
            <Show when={directory.state().status === 'success'} fallback={<p role="alert">Search unavailable. <button onClick={() => loadSearch(true)}>Retry</button></p>}>
              <div class="compare-search"><SearchBar compact entities={candidates()} teamDetails={details()} placeholder={`Compare with another ${ctx.type()}…`} onPick={entity => { ctx.setVs(entity.id); api.close(); }} /></div>
            </Show>
          </Show>
        </Show>
        <Show when={teams.state().status === 'error'}><p role="alert">Team details unavailable. <button onClick={() => loadSearch(true)}>Retry team details</button></p></Show>
      </div></div>;
    }}
  </Disclosure>;
}
