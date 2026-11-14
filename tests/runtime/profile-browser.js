// Run with Chrome DevTools evaluate_script sourcePath on a loaded, multi-card profile.
async () => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const wait = async predicate => {
    for (let i = 0; i < 150; i++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Profile browser assertion timed out');
  };
  await wait(() => document.querySelectorAll('[role=tab]').length > 1);
  const faces = [...document.querySelectorAll('.pane-face')];
  const labels = [...document.querySelectorAll('[role=tab]')].map(tab => tab.textContent);
  const requests = [];
  const originalFetch = window.fetch;
  window.fetch = (...args) => { requests.push(String(args[0])); return originalFetch(...args); };
  try {
    for (const label of [...labels, labels[0]]) {
      [...document.querySelectorAll('[role=tab]')].find(tab => tab.textContent === label).click();
      await wait(() => document.querySelector('[role=tab][aria-selected=true]').textContent === label);
    }
    assert(requests.length === 0, 'Tab selection must not fetch');
    assert(faces.every(face => face.isConnected), 'Tabs must retain mounted panes');
    assert(document.querySelectorAll('.pane-face[inert]').length === faces.length - 1, 'Hidden faces must be inert');
    const face = document.querySelector('.reading-table-pane.active .pane-face');
    history.replaceState({ ...history.state, browserTest: true }, '', location.href);
    for (const dismissal of ['back', 'escape', 'backdrop']) {
      face.focus();
      face.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await wait(() => history.state?.scoracleLift);
      assert(history.state.browserTest, 'Lift must preserve unrelated history state');
      assert(document.documentElement.style.overflow === 'hidden', 'Lift must lock document scroll');
      assert(document.querySelector('.app-tray').closest('[inert]'), 'Lift must inert the background');
      if (dismissal === 'back') history.back();
      else if (dismissal === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else document.querySelector('.pane-lift-backdrop').click();
      await wait(() => !history.state?.scoracleLift && !document.querySelector('[role=dialog]'));
      assert(document.activeElement === face, 'Dismissal must restore focus');
      assert(document.documentElement.style.overflow === '', 'Dismissal must unlock scrolling');
      assert(!document.querySelector('.app-tray').closest('[inert]'), 'Dismissal must restore the background');
    }
    assert(document.querySelector('.reading-table-pane.active .pane-face') === face, 'Lift must retain the same node');
    assert(requests.length === 0, 'Lift history must not refetch');
    return { cards: labels.length, requests: 0, sameNodes: true, hiddenInert: true, backEscapeBackdrop: true, focus: true };
  } finally { window.fetch = originalFetch; }
};
