// model.js - Local database: shape, operations, merge of a pull
// Exposes: DuoGG.model.{ emptyDb, blankProfile, applyOp, mergePull, activeProfile,
//          filtersOf, blacklistMap, dirtyRows, clearDirty, uuid }
//
// Pure functions: the service worker applies them (worker.js), the tests
// replay them without Chrome. An operation is idempotent: replaying it gives
// the same state (docs/database/sync.md).
//
// Each changed row enters `dirty`. The push sends the current state of these
// rows, not the history of the operations.
(function (D) {
  const lol = D.lol;

  function emptyDb() {
    return {
      v: 1,
      profiles: {},
      blacklist: {},
      activeProfileId: null,
      localFilters: null,
      ui: { panel: { x: null, y: 80, collapsed: false, tab: 'filters' } },
      dirty: { profiles: {}, blacklist: {} },
      sync: { lastPullAt: null, lastPushAt: null, role: null, db: null, error: null }
    };
  }

  function uuid() {
    if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function blankProfile(now) {
    return {
      id: uuid(), label: 'My profile', gameName: '', tagLine: '', region: 'euw', opggAccount: '',
      position: 'ALL', position2: null, champion: '', champion2: '', wantedPositions: [],
      queueType: 'RANKED_SOLO', rank: '', noteTemplate: '', filters: null,
      updatedAt: now, removedAt: null
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function touchProfile(db, p, now) {
    p.updatedAt = Math.max(now, (p.updatedAt || 0) + 1);
    db.profiles[p.id] = p;
    db.dirty.profiles[p.id] = true;
  }

  function blacklistEntry(e, now, prev) {
    const key = lol.riotKey(e.gameName, e.tagLine);
    return {
      key: key,
      gameName: String(e.gameName || '').trim(),
      tagLine: e.tagLine ? String(e.tagLine).trim().replace(/^#/, '') : null,
      region: e.region || (prev && prev.region) || null,
      reason: e.reason || null,
      note: e.note || null,
      position: e.position || null,
      rank: e.rank || null,
      champion: e.champion || null,
      partnerId: e.partnerId || null,
      createdAt: (prev && prev.createdAt) || e.createdAt || now,
      updatedAt: Math.max(now, ((prev && prev.updatedAt) || 0) + 1),
      removedAt: null
    };
  }

  // -> new state. List of `op.kind`: docs/generated/operations.md.
  function applyOp(db0, op, now) {
    const db = clone(db0);
    const t = now || Date.now();
    switch (op.kind) {
      case 'profile.upsert': {
        const prev = db.profiles[op.profile.id] || blankProfile(t);
        touchProfile(db, Object.assign({}, prev, op.profile, { removedAt: null }), t);
        if (!db.activeProfileId) db.activeProfileId = op.profile.id;
        break;
      }
      case 'profile.remove': {
        const p = db.profiles[op.id];
        if (p && !p.removedAt) { p.removedAt = t; touchProfile(db, p, t); }
        if (db.activeProfileId === op.id) db.activeProfileId = null;
        break;
      }
      case 'profile.select':
        db.activeProfileId = op.id && db.profiles[op.id] && !db.profiles[op.id].removedAt ? op.id : null;
        break;
      case 'filters.set': {
        const p = activeProfile(db);
        if (p) { p.filters = Object.assign({}, p.filters || {}, op.filters); touchProfile(db, p, t); }
        else db.localFilters = Object.assign({}, db.localFilters || {}, op.filters);
        break;
      }
      case 'blacklist.upsert':
      case 'blacklist.import': {
        const list = op.kind === 'blacklist.upsert' ? [op.entry] : op.entries;
        list.forEach((e) => {
          const key = lol.riotKey(e.gameName, e.tagLine);
          if (!key) return;
          db.blacklist[key] = blacklistEntry(e, t, db.blacklist[key]);
          db.dirty.blacklist[key] = true;
        });
        break;
      }
      case 'blacklist.remove': {
        const e = db.blacklist[op.key];
        if (e && !e.removedAt) {
          e.removedAt = t;
          e.updatedAt = Math.max(t, e.updatedAt + 1);
          db.dirty.blacklist[op.key] = true;
        }
        break;
      }
      case 'ui.set':
        db.ui = Object.assign({}, db.ui, op.ui);
        break;
      default:
        throw new Error('Unknown operation: ' + op.kind);
    }
    return db;
  }

  // The server wins, except over a newer local row not pushed yet.
  function mergePull(db0, server, now) {
    const db = clone(db0);
    (server.profiles || []).forEach((p) => {
      const local = db.profiles[p.id];
      if (local && db.dirty.profiles[p.id] && local.updatedAt > p.updatedAt) return;
      db.profiles[p.id] = p;
      delete db.dirty.profiles[p.id];
    });
    (server.blacklist || []).forEach((e) => {
      const local = db.blacklist[e.key];
      if (local && db.dirty.blacklist[e.key] && local.updatedAt > e.updatedAt) return;
      db.blacklist[e.key] = e;
      delete db.dirty.blacklist[e.key];
    });
    if (db.activeProfileId && (!db.profiles[db.activeProfileId] || db.profiles[db.activeProfileId].removedAt)) {
      db.activeProfileId = null;
    }
    db.sync = Object.assign({}, db.sync, { lastPullAt: now, role: server.role || null, db: server.db || null, error: null });
    return db;
  }

  function activeProfile(db) {
    const p = db.activeProfileId && db.profiles[db.activeProfileId];
    return p && !p.removedAt ? p : null;
  }

  function filtersOf(db) {
    const p = activeProfile(db);
    return D.engine.mergeFilters(p ? p.filters : db.localFilters);
  }

  function blacklistMap(db) {
    const m = new Map();
    Object.keys(db.blacklist).forEach((k) => { if (!db.blacklist[k].removedAt) m.set(k, db.blacklist[k]); });
    return m;
  }

  function dirtyRows(db) {
    return {
      profiles: Object.keys(db.dirty.profiles).map((id) => db.profiles[id]).filter(Boolean),
      blacklist: Object.keys(db.dirty.blacklist).map((k) => db.blacklist[k]).filter(Boolean)
    };
  }

  // Removes the pushed rows from `dirty`, when they did not change since.
  function clearDirty(db0, pushed, now) {
    const db = clone(db0);
    pushed.profiles.forEach((p) => {
      const cur = db.profiles[p.id];
      if (cur && cur.updatedAt === p.updatedAt) delete db.dirty.profiles[p.id];
    });
    pushed.blacklist.forEach((e) => {
      const cur = db.blacklist[e.key];
      if (cur && cur.updatedAt === e.updatedAt) delete db.dirty.blacklist[e.key];
    });
    db.sync = Object.assign({}, db.sync, { lastPushAt: now, error: null });
    return db;
  }

  D.model = {
    emptyDb: emptyDb,
    blankProfile: blankProfile,
    applyOp: applyOp,
    mergePull: mergePull,
    activeProfile: activeProfile,
    filtersOf: filtersOf,
    blacklistMap: blacklistMap,
    dirtyRows: dirtyRows,
    clearDirty: clearDirty,
    uuid: uuid
  };
})(globalThis.DuoGG);
