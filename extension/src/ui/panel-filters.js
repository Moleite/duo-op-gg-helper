// panel-filters.js - Filters tab of the panel: my position, my rank, rules, sorting, Show more
// Exposes: DuoGG.panelFilters.create(actions) -> { el, update(view) }
//
// The controls are built once, from `D.RULES` and `D.SORTS`: a rule added to the
// registry shows here without any other code.
(function (D) {
  const h = D.h;
  const lol = D.lol;

  function create(actions) {
    const set = (patch) => actions.setFilters(patch);

    const myPos = h('select', { onchange: (e) => set({ myPosition: e.target.value }) },
      h('option', { value: 'ALL' }, 'Any'),
      lol.POSITIONS.map((p) => h('option', { value: p }, lol.POSITION_LABELS[p])));

    const tierSel = h('select', { onchange: () => set({ myRank: rankValue() }) },
      h('option', { value: '' }, 'Rank?'),
      lol.TIERS.map((t) => h('option', { value: t }, lol.rankLabel({ tier: t, div: null }))));
    const divSel = h('select', { onchange: () => set({ myRank: rankValue() }) },
      [1, 2, 3, 4].map((d) => h('option', { value: String(d) }, String(d))));
    function rankValue() {
      if (!tierSel.value) return '';
      const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].indexOf(tierSel.value) >= 0;
      return lol.rankLabel({ tier: tierSel.value, div: apex ? null : Number(divSel.value) });
    }

    const ruleCtl = {};
    const rules = h('div', { class: 'rules' }, D.RULES.map((r) => {
      const cb = h('input', { type: 'checkbox', onchange: (e) => set({ rules: { [r.id]: e.target.checked } }) });
      const count = h('span', { class: 'count', title: 'Posts hidden by this rule' }, '0');
      const param = r.param ? h('input', {
        type: 'number', min: r.param.min, max: r.param.max, title: r.param.label,
        onchange: (e) => set({ [r.param.key]: Number(e.target.value) })
      }) : null;
      ruleCtl[r.id] = { cb: cb, count: count, param: param };
      return h('label', { class: 'rule', title: r.what }, cb, h('span', { class: 'lbl' }, r.label), param, count);
    }));

    const showHidden = h('input', { type: 'checkbox', onchange: (e) => set({ showHidden: e.target.checked }) });
    const sortSel = h('select', { onchange: (e) => set({ sort: e.target.value }) },
      D.SORTS.map((s) => h('option', { value: s.id }, s.label)));

    const stats = h('div', { class: 'sec' });
    const moreBtn = h('button', { class: 'btn', onclick: () => actions.more() }, 'Show more');
    const moreHint = h('div', { class: 'hint' });

    const el = h('div', { class: 'sec' },
      h('div', { class: 'sec' }, h('h4', {}, 'Me'),
        h('div', { class: 'row' }, h('label', {}, 'My position'), myPos),
        h('div', { class: 'row' }, h('label', {}, 'My rank'), tierSel, divSel)),
      h('div', { class: 'sec' }, h('h4', {}, 'Rules'), rules),
      h('div', { class: 'sec' }, h('h4', {}, 'Display'),
        h('label', { class: 'rule' }, showHidden, h('span', { class: 'lbl' }, 'Dim instead of hiding')),
        h('div', { class: 'row' }, h('label', {}, 'Sort'), sortSel)),
      h('div', { class: 'sec' }, h('h4', {}, 'Results'), stats, moreBtn, moreHint));

    function val(ctl, v, root) {
      if (root.activeElement === ctl) return;
      if (ctl.type === 'checkbox') ctl.checked = !!v; else ctl.value = v == null ? '' : String(v);
    }

    function update(view, root) {
      const f = view.filters;
      val(myPos, f.myPosition, root);
      const r = lol.parseRank(f.myRank);
      val(tierSel, r && r.tier !== 'UNRANKED' ? r.tier : '', root);
      val(divSel, r && r.div ? r.div : 4, root);
      divSel.disabled = !r || !r.div;
      D.RULES.forEach((rule) => {
        const c = ruleCtl[rule.id];
        val(c.cb, f.rules[rule.id], root);
        if (c.param) { val(c.param, f[rule.param.key], root); c.param.disabled = !f.rules[rule.id]; }
        const n = view.result.counts[rule.id] || 0;
        c.count.textContent = String(n);
        c.count.classList.toggle('hit', n > 0 && !!f.rules[rule.id]);
      });
      val(showHidden, f.showHidden, root);
      val(sortSel, f.sort, root);
      const t = view.totals;
      D.clear(stats).append(
        h('div', { class: 'stat' }, h('span', {}, 'Site table'), h('b', {}, t.visibleDom + ' visible / ' + t.dom)),
        h('div', { class: 'stat' }, h('span', {}, 'Older posts'), h('b', {}, t.visibleExtra + ' visible / ' + t.extra)));
      moreBtn.disabled = !!view.more.loading || !view.more.available;
      moreBtn.textContent = view.more.loading ? 'Loading…' : 'Show more';
      moreHint.className = 'hint' + (view.more.error ? ' err' : '');
      moreHint.textContent = view.more.error || view.more.message || '';
    }

    return { el: el, update: update };
  }

  D.panelFilters = { create: create };
})(globalThis.DuoGG);
