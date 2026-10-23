// app.js - Orchestrator of the content script: site table, filters, panel
// Exposes: DuoGG.app.{ state, actions, scan } (content script console, tests)
//
// Cycle: a mutation of the table -> scan() reads the rows again -> recompute()
// evaluates the rules, sets the attributes, renders #duogg-more and the panel.
// A filter change applies locally first (applyOp, pure), then the service
// worker saves it; chrome.storage.onChanged brings the state back.
(function (D) {
  if (globalThis.top !== globalThis || globalThis.__duoggStarted) return;
  globalThis.__duoggStarted = true;

  const OURS = '#duogg-more, #duogg-root, #duogg-tools';
  const st = {
    db: D.model.emptyDb(),
    neon: { configured: false },
    dom: [], domSig: '', pageKey: '', account: undefined,
    extra: [], cursor: null, apiById: new Map(),
    manual: new Set(),
    more: { loading: false, message: '', error: '', available: false },
    panel: null, timer: null, last: null, notice: '', versionAt: 0
  };

  // Posts of the site, completed by the API when it knows them (full list of
  // wanted positions), then posts of Show more.
  function all() {
    const dom = st.dom.map((p) => {
      const a = st.apiById.get(p.id);
      return a && p.lookingForPartial ? Object.assign({}, p, { lookingFor: a.lookingFor, lookingForPartial: false }) : p;
    });
    const ids = new Set(dom.map((p) => p.id));
    return dom.concat(st.extra.filter((p) => !ids.has(p.id)));
  }

  function siteList() {
    const first = D.extract.rows(document)[0];
    return first ? first.parentElement : null;
  }

  function scan() {
    if (orphaned()) st.notice = D.ORPHAN;
    else if (Date.now() - st.versionAt >= D.config.version.checkMs) checkVersion();
    const rows = D.extract.rows(document);
    const sig = rows.map(D.extract.partnerIdOf).join(',');
    const key = JSON.stringify(D.extract.pageState(document, location));
    if (key !== st.pageKey) {
      // A native filter changed: the loaded pages no longer match.
      st.pageKey = key; st.extra = []; st.cursor = null; st.apiById = new Map();
      st.more.message = ''; st.more.error = '';
    }
    if (sig !== st.domSig) { st.domSig = sig; st.dom = rows.map(D.extract.partner).filter(Boolean); }
    st.more.available = st.dom.length > 0;
    const account = D.extract.accountName(document);
    if (account !== st.account) { st.account = account; pageOpen(account); }
    recompute();
  }

  // ---- Update notice ---------------------------------------------------------
  // After a reload of the extension, this content script can no longer reach
  // Chrome: the panel says F5. A newer manifest.json on the disk: the panel
  // says to reload the extension (src/core/version.js).
  function orphaned() {
    const r = globalThis.chrome && globalThis.chrome.runtime;
    return !r || !r.id;
  }

  function checkVersion() {
    st.versionAt = Date.now();
    D.client.send({ type: 'version' }).then((r) => {
      const n = D.versionNotice({ loaded: r.loaded, disk: r.disk, tab: D.version });
      const text = n.warn ? n.text : '';
      if (text !== st.notice) { st.notice = text; recompute(); }
    }).catch(() => { /* unreachable worker: the next operation says it */ });
  }

  function recompute() {
    if (!st.panel) return;
    const filters = D.model.filtersOf(st.db);
    const list = all();
    const result = D.engine.evaluate(list, filters, { blacklist: D.model.blacklistMap(st.db), manual: st.manual });
    const order = D.engine.order(list, filters.sort);
    D.rows.apply(document, result, order, filters.showHidden);
    D.more.render(siteList(), st.extra, result, order, filters.showHidden, onRowAction);
    const visible = (arr) => arr.filter((p) => !(result.byId.get(p.id) || {}).hidden).length;
    const domIds = new Set(st.dom.map((p) => p.id));
    const extra = list.filter((p) => !domIds.has(p.id));
    const totals = { dom: st.dom.length, visibleDom: visible(st.dom), extra: extra.length, visibleExtra: visible(extra) };
    st.last = { list: list, result: result };
    const root = document.getElementById('duogg-root');
    if (root) root.style.display = st.dom.length || st.extra.length ? '' : 'none';
    st.panel.update({ db: st.db, neon: st.neon, filters: filters, result: result, totals: totals, more: st.more, notice: st.notice });
  }

  function schedule() {
    clearTimeout(st.timer);
    st.timer = setTimeout(scan, D.config.observeDebounceMs);
  }

  // Mutation made by the extension: in #duogg-more, or in the shadow root of
  // the panel or of the row action bar. closest() does not cross a shadow
  // root: go up to its host first.
  function isOurs(node) {
    let el = node && (node.nodeType === 1 ? node : node.parentElement || node.host);
    if (!el && node && node.getRootNode) el = node.getRootNode().host;
    if (!el) return false;
    const root = el.getRootNode ? el.getRootNode() : null;
    if (root && root.host) el = root.host;
    return !!(el.closest && el.closest(OURS));
  }

  // ---- Store --------------------------------------------------------------
  // Each change of st.db increments dbSeq. A response computed by the worker
  // before a later op or onChanged is stale: it does not replace st.db.
  let dbSeq = 0;
  function setDb(db) { st.db = db; dbSeq++; }

  function op(o) {
    setDb(D.model.applyOp(st.db, o, Date.now()));
    recompute();
    return D.client.op(o).then((r) => { if (r) st.neon = r.neon; }).catch((e) => {
      st.more.error = e.message;
      recompute();
      throw e;
    });
  }

  function pageOpen(account) {
    const seq = dbSeq;
    D.client.send({ type: 'page.open', account: account || null }).then((r) => {
      if (!r) return;
      if (seq === dbSeq) setDb(r.db);
      st.neon = r.neon;
      recompute();
    }).catch((e) => { st.more.error = e.message; recompute(); });
  }

  // ---- Show more ------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function more() {
    if (st.more.loading) return;
    const cfg = D.config.more;
    const state = D.extract.pageState(document, location);
    st.more.loading = true; st.more.error = ''; st.more.message = '';
    recompute();
    const before = st.last ? st.last.list.length : 0;
    const visibleExtra = () => (st.last ? st.last.list.filter((p) => !st.dom.some((d) => d.id === p.id) && !st.last.result.byId.get(p.id).hidden).length : 0);
    const startVisible = visibleExtra();
    let pages = 0;
    try {
      // First time: page 1 of the API, the same as the site. It gives the
      // cursor and the full list of wanted positions of the truncated rows (+).
      if (st.cursor == null) {
        const first = await D.api.fetchPage(state, null);
        pages++;
        first.forEach((p) => st.apiById.set(p.id, p));
        addExtra(first);
        st.cursor = D.api.cursorOf(first);
      }
      while (st.cursor != null && pages < cfg.maxPagesPerClick && visibleExtra() - startVisible < cfg.targetVisible) {
        await sleep(cfg.delayMs);
        const list = await D.api.fetchPage(state, st.cursor);
        pages++;
        const next = D.api.cursorOf(list);
        addExtra(list);
        if (!list.length || next == null || next >= st.cursor) { st.cursor = null; st.more.message = 'End of the site list.'; break; }
        st.cursor = next;
      }
      const added = (st.last ? st.last.list.length : 0) - before;
      st.more.message = (st.more.message ? st.more.message + ' ' : '') +
        '+' + added + ' posts over ' + pages + ' page(s), ' + (visibleExtra() - startVisible) + ' visible.';
    } catch (e) {
      st.more.error = e.message;
    } finally {
      st.more.loading = false;
      recompute();
    }
  }

  function addExtra(list) {
    const known = new Set(all().map((p) => p.id));
    list.forEach((p) => { if (!known.has(p.id)) { st.extra.push(p); known.add(p.id); } });
    recompute();
  }

  // ---- Actions ---------------------------------------------------------------
  function onRowAction(kind, id) {
    const p = all().find((x) => x.id === id);
    if (!p) return;
    if (kind === 'blacklist') st.panel.openBlacklist(p);
    if (kind === 'hide') { st.manual.add(id); recompute(); }
  }

  const actions = {
    setFilters(patch) {
      const cur = D.model.filtersOf(st.db);
      const next = Object.assign({}, patch);
      if (patch.rules) next.rules = Object.assign({}, cur.rules, patch.rules);
      return op({ kind: 'filters.set', filters: next });
    },
    selectProfile: (id) => op({ kind: 'profile.select', id: id }),
    setUi: (ui) => op({ kind: 'ui.set', ui: ui }).catch(() => {}),
    blacklistAdd: (entry) => op({ kind: 'blacklist.upsert', entry: entry }),
    blacklistRemove: (key) => op({ kind: 'blacklist.remove', key: key }),
    more: more,
    openSiteForm() {
      const sel = D.SELECTORS.postButton;
      const btn = Array.from(document.querySelectorAll(sel.css)).find((b) => b.textContent.trim() === sel.text);
      if (btn) btn.click();
      return !!btn;
    }
  };

  function start() {
    // The popup asks which version this page runs: an F5 replaces a content
    // script, a reload of the extension does not.
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg && msg.type === 'ping') reply({ v: D.version });
    });
    D.style.injectPage(document);
    st.panel = D.panel.mount(actions);
    D.rows.mountTools(onRowAction);
    const seq = dbSeq;
    D.client.read().then((db) => { if (seq === dbSeq) setDb(db); recompute(); }).catch(() => {});
    D.client.onChange((db) => { setDb(db); recompute(); });
    new MutationObserver((records) => {
      if (records.every((r) => isOurs(r.target))) return;
      schedule();
    }).observe(document.body, { childList: true, subtree: true });
    scan();
  }

  D.app = { state: st, actions: actions, scan: scan };
  start();
})(globalThis.DuoGG);
