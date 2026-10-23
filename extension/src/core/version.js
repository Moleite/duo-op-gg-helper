// version.js - Notice of a new version or of a page that runs old code, pure
// Exposes: DuoGG.versionNotice({ loaded, disk, tab }) -> { warn, text }, DuoGG.ORPHAN
//
// Three pieces of code can differ (docs/run/getting-started.md#update-notices):
//   - the files on the disk, after a git pull: the extension needs a reload
//     (chrome://extensions, the reload arrow);
//   - the extension loaded by Chrome, read by getManifest();
//   - the content script of a page of the site, injected at its load: F5.
// The reload of the extension comes first: an F5 before it keeps the old
// content scripts. Same rules as BotEd_MDF and twitch-stalker.
(function (D) {
  // Shown by the panel when the extension was reloaded under the page: the
  // content script can no longer reach Chrome.
  D.ORPHAN = 'Extension reloaded: this panel no longer saves anything. F5 on the page of the site.';

  // loaded: version of the extension running. disk: version of manifest.json
  // on the disk, or null when unknown. tab: version of the content script of
  // the page of the site, 'none' for a page without an answer, null when not
  // asked.
  D.versionNotice = function (v) {
    const loaded = v.loaded || '?';
    if (v.disk && v.disk !== loaded) {
      return { warn: true, text: 'Version ' + v.disk + ' available: reload the extension (chrome://extensions, ↻), then F5 on the page of the site.' };
    }
    if (v.tab === 'none') return { warn: true, text: 'v' + loaded + ' · no script on this page: F5 on the page of the site.' };
    if (v.tab && v.tab !== loaded) return { warn: true, text: 'v' + loaded + ' · this page runs v' + v.tab + ': F5 on the page of the site.' };
    return { warn: false, text: 'v' + loaded + (v.tab ? ' · page up to date' : '') };
  };
})(globalThis.DuoGG);
