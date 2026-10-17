// engine.js - Rule evaluation and sorting, without DOM
// Exposes: DuoGG.engine.{ evaluate, order, mergeFilters }
//
// evaluate() receives the posts in the order of the site (newest first, then
// the pages of Show more) and returns one decision per post. Every active
// rule is evaluated: the panel shows each reason, and the counters overlap
// (a post counts in every rule that hides it).
(function (D) {
  // Saved filters + default values of the rules added since.
  function mergeFilters(saved) {
    const f = D.defaultFilters();
    const s = saved || {};
    Object.keys(s).forEach((k) => { if (k !== 'rules') f[k] = s[k]; });
    Object.keys(s.rules || {}).forEach((k) => { if (k in f.rules) f.rules[k] = !!s.rules[k]; });
    return f;
  }

  // ctx: { blacklist: Map<key, entry>, manual: Set<id> }
  // -> { byId: Map<id, {hidden, reasons}>, counts: {rule: n}, total, visible }
  function evaluate(partners, filters, ctx) {
    const f = mergeFilters(filters);
    const blacklist = (ctx && ctx.blacklist) || new Map();
    // Entries without a tag (v1 import, name typed alone).
    const names = new Set();
    blacklist.forEach((e, k) => { if (k.indexOf('#') < 0) names.add(k); });
    const c = { blacklist: blacklist, blacklistNames: names, manual: (ctx && ctx.manual) || new Set(), seen: new Set() };
    const rules = D.RULES.filter((r) => f.rules[r.id]);
    const counts = {};
    D.RULES.forEach((r) => { counts[r.id] = 0; });
    const byId = new Map();
    let visible = 0;
    partners.forEach((p) => {
      const reasons = [];
      rules.forEach((r) => {
        if (r.test(p, f, c)) { reasons.push(r.id); counts[r.id]++; }
      });
      const hidden = reasons.length > 0;
      if (!hidden) visible++;
      byId.set(p.id, { hidden: hidden, reasons: reasons });
    });
    return { byId: byId, counts: counts, total: partners.length, visible: visible };
  }

  // Display order: list of ids. Stable sort, missing values last.
  function order(partners, sortId) {
    const sort = D.SORTS.find((s) => s.id === sortId) || D.SORTS[0];
    const idx = partners.map((p, i) => ({ p: p, i: i }));
    if (sort.key) {
      idx.sort((a, b) => {
        const ka = sort.key(a.p), kb = sort.key(b.p);
        if (ka == null && kb == null) return a.i - b.i;
        if (ka == null) return 1;
        if (kb == null) return -1;
        if (ka === kb) return a.i - b.i;
        return sort.desc ? kb - ka : ka - kb;
      });
    }
    return idx.map((x) => x.p.id);
  }

  D.engine = { evaluate: evaluate, order: order, mergeFilters: mergeFilters };
})(globalThis.DuoGG);
