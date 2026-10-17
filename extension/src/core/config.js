// config.js - DuoGG namespace and versioned constants of the extension
// Exposes: DuoGG.config, DuoGG.version
//
// Loaded first everywhere (content script, service worker, popup, Node
// tests). A module of the extension is an IIFE attached to globalThis.DuoGG:
// MV3 does not accept `import` in a content script.
//
// A constant lives here when it changes only with the code. A setting that
// the player changes while playing goes in the store (docs/architecture/config.md).
(function (g) {
  const D = (g.DuoGG = g.DuoGG || {});

  D.config = {
    // Delay between a mutation of the site table and the next recompute.
    // React renders the list in bursts: one recompute per burst is enough.
    observeDebounceMs: 150,

    // Show more: API pages requested per click. The site renders 50 posts
    // and does not paginate (docs/architecture/site-api.md).
    more: {
      pageSize: 50,
      maxPagesPerClick: 4,
      targetVisible: 20,
      delayMs: 400
    },

    // Neon: maximum age of the local cache before an automatic pull, when a
    // page of the site opens. A pull wakes the database up
    // (docs/database/sync.md).
    neon: {
      pullTtlMs: 6 * 3600 * 1000,
      requestTimeoutMs: 15000
    },

    // Post note: length shown as a warning. The limit of the site is unknown
    // (docs/project/todo.md).
    announce: {
      warnLength: 200
    }
  };

  D.version = (g.chrome && g.chrome.runtime && g.chrome.runtime.getManifest)
    ? g.chrome.runtime.getManifest().version
    : 'dev';
})(globalThis);
