// popup-profiles.js - Profiles tab of the popup: create, edit, activate a profile
// Exposes: DuoGG.popupProfiles.create(ctx) -> { el, update(state) }
//
// A profile = one LoL account: what the post publishes, and the filters of the
// panel while it is active. The op.gg account of the profile selects it on its
// own when the site opens (store/worker.js, pageOpen).
(function (D) {
  const h = D.h;
  const lol = D.lol;
  const REGIONS = ['euw', 'eune', 'na', 'kr', 'br', 'jp', 'lan', 'las', 'oce', 'tr', 'ru', 'me', 'sea', 'tw', 'vn'];

  function create(ctx) {
    let editingId = null;
    let profiles = [];
    let activeId = null;

    const picker = h('select', { onchange: () => { editingId = picker.value || null; fill(); } });
    const f = {
      label: h('input', { placeholder: 'Main, Smurf...' }),
      riot: h('input', { placeholder: 'Name#TAG' }),
      region: h('select', {}, REGIONS.map((r) => h('option', { value: r }, r.toUpperCase()))),
      opgg: h('input', { placeholder: 'Name shown at the top right of duo.op.gg' }),
      position: posSelect(true),
      position2: posSelect(false),
      champion: h('input', { placeholder: 'Champion 1' }),
      champion2: h('input', { placeholder: 'Champion 2' }),
      queue: h('select', {}, Object.keys(D.announce.QUEUES).map((q) => h('option', { value: q }, D.announce.QUEUES[q]))),
      rank: h('input', { placeholder: 'Emerald 2' }),
      template: h('textarea', { placeholder: D.announce.DEFAULT_TEMPLATE })
    };
    const wanted = {};
    const wantedBox = h('div', { class: 'checks' }, lol.POSITIONS.map((p) => {
      wanted[p] = h('input', { type: 'checkbox' });
      return h('label', {}, wanted[p], lol.POSITION_LABELS[p]);
    }));
    const hint = h('div', { class: 'hint' });
    const vars = Object.keys(D.announce.PLACEHOLDERS).map((k) => k + ': ' + D.announce.PLACEHOLDERS[k]).join(' · ');

    function posSelect(main) {
      return h('select', {}, h('option', { value: main ? 'ALL' : '' }, main ? 'Any' : 'None'),
        lol.POSITIONS.map((p) => h('option', { value: p }, lol.POSITION_LABELS[p])));
    }

    function row(label, el) { return h('div', { class: 'row' }, h('label', {}, label), el); }

    function fill() {
      const p = profiles.find((x) => x.id === editingId) || D.model.blankProfile(Date.now());
      f.label.value = editingId ? p.label : '';
      f.riot.value = p.gameName ? p.gameName + (p.tagLine ? '#' + p.tagLine : '') : '';
      f.region.value = p.region || 'euw';
      f.opgg.value = p.opggAccount || '';
      f.position.value = p.position || 'ALL';
      f.position2.value = p.position2 || '';
      f.champion.value = p.champion || '';
      f.champion2.value = p.champion2 || '';
      f.queue.value = p.queueType || 'RANKED_SOLO';
      f.rank.value = p.rank || '';
      f.template.value = p.noteTemplate || '';
      lol.POSITIONS.forEach((pos) => { wanted[pos].checked = (p.wantedPositions || []).indexOf(pos) >= 0; });
      delBtn.disabled = !editingId;
      activateBtn.disabled = !editingId || editingId === activeId;
      hint.className = 'hint';
      hint.textContent = editingId ? (editingId === activeId ? 'Active profile.' : '') : 'New profile.';
    }

    function read() {
      const riot = f.riot.value.trim();
      const i = riot.lastIndexOf('#');
      const rank = f.rank.value.trim();
      if (rank && !lol.parseRank(rank)) throw new Error('Unreadable rank: type for example Emerald 2 or Master.');
      return {
        id: editingId || D.model.uuid(),
        label: f.label.value.trim() || (i > 0 ? riot.slice(0, i) : riot) || 'My profile',
        gameName: i > 0 ? riot.slice(0, i).trim() : riot,
        tagLine: i > 0 ? riot.slice(i + 1).trim() : '',
        region: f.region.value,
        opggAccount: f.opgg.value.trim(),
        position: f.position.value,
        position2: f.position2.value || null,
        champion: f.champion.value.trim(),
        champion2: f.champion2.value.trim(),
        wantedPositions: lol.POSITIONS.filter((p) => wanted[p].checked),
        queueType: f.queue.value,
        rank: rank ? lol.rankLabel(lol.parseRank(rank)) : '',
        noteTemplate: f.template.value.trim()
      };
    }

    async function run(fn, okText) {
      try { await fn(); hint.className = 'hint ok'; hint.textContent = okText; } catch (e) { hint.className = 'hint err'; hint.textContent = e.message; }
    }

    const saveBtn = h('button', { class: 'btn', onclick: () => run(async () => {
      const p = read();
      await ctx.op({ kind: 'profile.upsert', profile: p });
      editingId = p.id;
    }, 'Profile saved.') }, 'Save');
    const newBtn = h('button', { class: 'btn ghost', onclick: () => { editingId = null; picker.value = ''; fill(); } }, 'New');
    const activateBtn = h('button', { class: 'btn ghost', onclick: () => run(() => ctx.op({ kind: 'profile.select', id: editingId }), 'Profile activated.') }, 'Activate');
    const delBtn = h('button', { class: 'btn danger', onclick: () => run(async () => {
      await ctx.op({ kind: 'profile.remove', id: editingId });
      editingId = null;
    }, 'Profile deleted.') }, 'Delete');

    const el = h('div', { class: 'card' }, h('h3', {}, 'Profiles'),
      row('Profile', picker),
      row('Profile name', f.label), row('Riot ID', f.riot), row('Region', f.region), row('op.gg account', f.opgg),
      row('Position', f.position), row('Second position', f.position2), row('Champions', h('div', { class: 'row' }, f.champion, f.champion2)),
      row('Looking for', wantedBox), row('Queue', f.queue), row('Rank', f.rank),
      h('div', { class: 'hint', title: vars }, 'Template of the post note. Variables: ' + Object.keys(D.announce.PLACEHOLDERS).join(' ')),
      f.template,
      h('div', { class: 'btns' }, saveBtn, newBtn, activateBtn, delBtn), hint);

    function update(state) {
      const db = state.db;
      activeId = db.activeProfileId;
      profiles = Object.values(db.profiles).filter((p) => !p.removedAt).sort((a, b) => a.label.localeCompare(b.label));
      if (editingId && !profiles.some((p) => p.id === editingId)) editingId = null;
      if (editingId === null && activeId && !el.dataset.init) editingId = activeId;
      el.dataset.init = '1';
      D.clear(picker).appendChild(h('option', { value: '' }, '+ New profile'));
      profiles.forEach((p) => picker.appendChild(h('option', { value: p.id }, p.label + (p.id === activeId ? ' (active)' : ''))));
      picker.value = editingId || '';
      if (!el.contains(document.activeElement)) fill();
    }

    return { el: el, update: update };
  }

  D.popupProfiles = { create: create };
})(globalThis.DuoGG);
