// background.js - Service worker: only writer of chrome.storage, only Neon client
// Exposes: nothing (listens to chrome.runtime.onMessage, see src/store/worker.js)
//
// Every file loaded here is versioned. importScripts on a missing file fails
// at registration, and Chrome lists it in the errors of the extension even
// inside a try (scripts/check.mjs checks each path).
importScripts(
  'src/core/config.js',
  'src/core/lol.js',
  'src/filters/rules.js',
  'src/filters/engine.js',
  'src/store/model.js',
  'src/store/sql.js',
  'src/store/neon.js',
  'src/store/secrets.js',
  'src/store/worker.js'
);
