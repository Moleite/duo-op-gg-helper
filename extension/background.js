// background.js - Service worker: only writer of chrome.storage, only Neon client
// Exposes: nothing (listens to chrome.runtime.onMessage, see src/store/worker.js)
//
// config.local.js is optional: without it, the connection string is typed in
// the popup. importScripts throws on a missing file, hence the try.
try {
  importScripts('config.local.js');
} catch (e) {
  self.DuoGGLocalConfig = {};
}

importScripts(
  'src/core/config.js',
  'src/core/lol.js',
  'src/filters/rules.js',
  'src/filters/engine.js',
  'src/store/model.js',
  'src/store/sql.js',
  'src/store/neon.js',
  'src/store/worker.js'
);
