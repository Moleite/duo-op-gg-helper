// popup.js - Popup of the extension: Profiles, Blacklist, Neon tabs
// Exposes: nothing (boots the popup)
//
// The popup reads the state through the service worker (message `state`): it
// adds the status of the connection string without ever returning it.
(function (D) {
  const h = D.h;
  const TABS = [['profiles', 'Profiles'], ['blacklist', 'Blacklist'], ['neon', 'Neon']];
  let state = null;

  const ctx = {
    send: D.client.send,
    op: async (o) => { const r = await D.client.op(o); refresh(r); return r; },
    refresh: refresh
  };

  const views = {
    profiles: D.popupProfiles.create(ctx),
    blacklist: D.popupBlacklist.create(ctx),
    neon: D.popupNeon.create(ctx)
  };

  const nav = document.getElementById('nav');
  const main = document.getElementById('main');
  const buttons = {};
  let tab = 'profiles';
  try { tab = localStorage.getItem('duogg-popup-tab') || tab; } catch (e) { /* storage unavailable */ }
  if (!views[tab]) tab = 'profiles';

  function show(id) {
    tab = id;
    try { localStorage.setItem('duogg-popup-tab', id); } catch (e) { /* storage unavailable */ }
    TABS.forEach(([t]) => {
      buttons[t].classList.toggle('on', t === id);
      views[t].el.style.display = t === id ? '' : 'none';
    });
  }

  TABS.forEach(([id, label]) => {
    buttons[id] = h('button', { onclick: () => show(id) }, label);
    nav.appendChild(buttons[id]);
    main.appendChild(views[id].el);
  });

  function refresh(s) {
    if (!s || !s.db) return;
    state = s;
    document.getElementById('version').textContent = 'v' + D.version;
    Object.values(views).forEach((v) => v.update(state));
  }

  show(tab);
  D.client.send({ type: 'state' }).then(refresh).catch((e) => {
    main.prepend(h('div', { class: 'hint err' }, 'Service worker unreachable: ' + e.message));
  });
  D.client.onChange((db) => { if (state) refresh(Object.assign({}, state, { db: db })); });
})(globalThis.DuoGG);
