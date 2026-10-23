// panel.js - Panel of the extension on the page of the site: frame and tabs
// Exposes: DuoGG.panel.mount(actions) -> { update(view), openBlacklist(partner) }
//
// The panel lives in a closed shadow root: the scripts of the site and its
// trackers (session recorders) do not walk its content, and the CSS of the
// site does not apply to it. No secret goes through it: the connection
// string stays in the popup and the service worker.
//
// Each tab exposes create(actions) -> { el, update(view) }. update() receives
// the full view at each recompute and leaves a focused field alone.
(function (D) {
  const h = D.h;
  const TABS = [['filters', 'Filters'], ['blacklist', 'Blacklist'], ['post', 'Post']];

  function ago(t) {
    if (!t) return 'never';
    const min = Math.round((Date.now() - t) / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    return Math.round(min / 60) + ' h ago';
  }

  function mount(actions) {
    const host = h('div', { id: 'duogg-root' });
    document.documentElement.appendChild(host);
    const root = host.attachShadow({ mode: 'closed' });
    root.appendChild(h('style', { text: D.style.PANEL_CSS }));

    let ui = { x: null, y: 80, collapsed: false, tab: 'filters' };
    let dragging = false;
    const setUi = (patch) => { ui = Object.assign({}, ui, patch); layout(); actions.setUi({ panel: ui }); };

    const profileSel = h('select', { title: 'Active profile', onchange: (e) => actions.selectProfile(e.target.value || null) });
    const collapseBtn = h('button', { class: 'icon', title: 'Collapse or expand', onclick: () => setUi({ collapsed: !ui.collapsed }) }, '–');
    const head = h('div', { class: 'head' }, h('span', { class: 'title' }, 'Duo', h('b', {}, 'GG')), profileSel, collapseBtn);
    const tabsBar = h('div', { class: 'tabs' });
    const body = h('div', { class: 'body' });
    const foot = h('div', { class: 'foot' });
    // Under the header: a collapsed panel still shows that a reload is due.
    const notice = h('div', { class: 'notice' });
    const panel = h('div', { class: 'panel' }, head, notice, tabsBar, body, foot);
    root.appendChild(panel);

    const tabs = {
      filters: D.panelFilters.create(actions),
      blacklist: D.panelBlacklist.create(actions),
      post: D.panelAnnounce.create(actions)
    };
    const tabBtns = {};
    TABS.forEach(([id, label]) => {
      tabBtns[id] = h('button', { onclick: () => setUi({ tab: id, collapsed: false }) }, label);
      tabsBar.appendChild(tabBtns[id]);
      body.appendChild(tabs[id].el);
    });

    function layout() {
      if (!tabs[ui.tab]) ui.tab = 'filters';
      panel.classList.toggle('collapsed', !!ui.collapsed);
      collapseBtn.textContent = ui.collapsed ? '+' : '–';
      const maxX = Math.max(0, window.innerWidth - 340);
      if (ui.x == null) { panel.style.right = '16px'; panel.style.left = ''; } else {
        panel.style.left = Math.min(Math.max(0, ui.x), maxX) + 'px';
        panel.style.right = '';
      }
      panel.style.top = Math.min(Math.max(0, ui.y || 0), window.innerHeight - 40) + 'px';
      TABS.forEach(([id]) => {
        tabBtns[id].classList.toggle('on', ui.tab === id);
        tabs[id].el.style.display = ui.tab === id ? '' : 'none';
      });
    }

    // Drag by the header, saved on release.
    head.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target !== head && !e.target.classList.contains('title')) return;
      const r = panel.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const move = (ev) => {
        dragging = true;
        ui.x = ev.clientX - dx; ui.y = ev.clientY - dy;
        layout();
      };
      const up = () => {
        dragging = false;
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('mouseup', up, true);
        setUi({ x: ui.x, y: ui.y });
      };
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', up, true);
      e.preventDefault();
    });

    function renderProfiles(db) {
      if (root.activeElement === profileSel) return;
      const list = Object.values(db.profiles).filter((p) => !p.removedAt)
        .sort((a, b) => a.label.localeCompare(b.label));
      D.clear(profileSel).appendChild(h('option', { value: '' }, 'No profile'));
      list.forEach((p) => profileSel.appendChild(h('option', { value: p.id, selected: p.id === db.activeProfileId }, p.label)));
      profileSel.value = db.activeProfileId || '';
    }

    function update(view) {
      if (!dragging && view.db.ui && view.db.ui.panel) ui = Object.assign({}, ui, view.db.ui.panel);
      renderProfiles(view.db);
      layout();
      notice.textContent = view.notice || '';
      TABS.forEach(([id]) => tabs[id].update(view, root));
      const s = view.db.sync || {};
      const neon = !view.neon || !view.neon.configured ? 'Neon: not configured'
        : s.error ? '⚠ Neon: ' + s.error.slice(0, 60)
          : 'Neon: ' + (s.role || view.neon.user || '?') + ' · ' + ago(s.lastPullAt);
      D.clear(foot).append(h('span', { title: s.error || '' }, neon), h('span', {}, 'v' + D.version));
    }

    function openBlacklist(partner) {
      setUi({ tab: 'blacklist', collapsed: false });
      tabs.blacklist.prefill(partner);
    }

    layout();
    return { update: update, openBlacklist: openBlacklist };
  }

  D.panel = { mount: mount };
})(globalThis.DuoGG);
