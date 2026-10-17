// panel-announce.js - Post tab of the panel: note built from the profile
// Exposes: DuoGG.panelAnnounce.create(actions) -> { el, update(view) }
//
// The note is rebuilt when the profile changes, as long as the player did not
// edit it by hand. One-click posting waits for a capture of the post form of
// the site (docs/project/todo.md): the tab opens the form and copies the note.
(function (D) {
  const h = D.h;
  const A = D.announce;

  function create(actions) {
    let profile = null;
    let edited = false;
    let lastBuilt = '';

    const noProfile = h('div', { class: 'hint warn' },
      'No active profile. Create a profile in the popup of the extension (DuoGG icon in the Chrome toolbar).');
    const kv = h('div', { class: 'kv' });
    const text = h('textarea', { oninput: () => { edited = text.value !== lastBuilt; counter(); } });
    const len = h('div', { class: 'hint' });
    const hint = h('div', { class: 'hint' });
    const helpText = Object.keys(A.PLACEHOLDERS).map((k) => k + ': ' + A.PLACEHOLDERS[k]).join('\n');

    function counter() {
      const n = text.value.length;
      len.className = 'hint' + (n > D.config.announce.warnLength ? ' warn' : '');
      len.textContent = n + ' characters';
    }

    const copyBtn = h('button', { class: 'btn', onclick: async () => {
      try {
        await navigator.clipboard.writeText(text.value);
        hint.className = 'hint ok'; hint.textContent = 'Note copied.';
      } catch (e) {
        hint.className = 'hint err'; hint.textContent = 'Copy refused by the browser: select the text, then Ctrl+C.';
      }
    } }, 'Copy the note');
    const openBtn = h('button', { class: 'btn ghost', onclick: () => {
      const ok = actions.openSiteForm();
      hint.className = 'hint' + (ok ? '' : ' err');
      hint.textContent = ok ? 'Site form opened: paste the note.' : 'Post & find Duo button not found on the page.';
    } }, 'Open the site form');

    const body = h('div', { class: 'sec' },
      h('div', { class: 'sec' }, h('h4', {}, 'Profile'), kv),
      h('div', { class: 'sec' }, h('h4', { title: helpText }, 'Post note'), text, len),
      h('div', { class: 'row' }, copyBtn, openBtn), hint,
      h('div', { class: 'hint', title: helpText }, 'The note template (variables {rank}, {role}…) is edited in the popup, profile form.'),
      h('div', { class: 'hint' }, 'One-click posting: waiting for a capture of the site form.'));
    const el = h('div', { class: 'sec' }, noProfile, body);

    function update(view, root) {
      const p = D.model.activeProfile(view.db);
      noProfile.style.display = p ? 'none' : '';
      body.style.display = p ? '' : 'none';
      const changed = !profile || !p || p.id !== profile.id || p.updatedAt !== profile.updatedAt;
      profile = p;
      if (!p) return;
      D.clear(kv);
      A.summary(p).forEach(([k, v]) => kv.append(h('span', {}, k), h('span', {}, v)));
      if (changed && root.activeElement !== text) {
        // The saved template keeps its variables: the shown note fills them.
        lastBuilt = A.build(p);
        if (!edited) text.value = lastBuilt;
        counter();
      }
    }

    return { el: el, update: update };
  }

  D.panelAnnounce = { create: create };
})(globalThis.DuoGG);
