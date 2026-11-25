import { Show } from 'solid-js';
import { useProfile } from '../lib/profile-context';
import { useProfileRead } from '../lib/profile-products';
import Disclosure from './Disclosure';
import SearchBar from './SearchBar';
import Icon from './Icon';
import './Select.css';
import './CompareControl.css';
import './CompareSearch.css';
export default function CompareControl() {
  const ctx = useProfile();
  const meta = useProfileRead('comparisonMeta');
  const label = () => ctx.vs() ? `vs ${meta()?.name ?? '…'}` : 'vs —';
  return <Disclosure class="compare-control" triggerClass="select-trigger" haspopup="dialog" ariaLabel={`Compare: ${label()}`} trigger={() => <span class="select-value">{label()}</span>}>
    {api => <div id={api.panelId} role="dialog" aria-label="Compare entities" class="compare-control-panel search-popover"><div class="compare-search-row">
      <Show when={!ctx.vs()} fallback={<div class="compare-pill"><span class="compare-pill-label">vs</span><span class="compare-pill-name">{meta()?.name ?? ctx.vs()}</span><button class="compare-pill-clear" aria-label="Clear comparison" onClick={() => ctx.setVs(null)}><Icon name="close" size={16} /></button></div>}>
        <div class="compare-search"><SearchBar compact sport={ctx.sport()} entityType={ctx.type()} excludeId={ctx.id()} placeholder={`Compare with another ${ctx.type()}…`} onPick={entity => { ctx.setVs(entity.id); api.close(); api.focusTrigger(); }} /></div>
      </Show>
    </div></div>}
  </Disclosure>;
}
