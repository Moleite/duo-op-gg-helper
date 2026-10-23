// version.test.mjs - Notice of a new version or of a page that runs old code
//
// The popup and the panel show the text of versionNotice(): the rules live
// in one pure function.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/ext.mjs';

const D = load(['src/core/config.js', 'src/core/version.js']);
const n = (v) => D.versionNotice(v);

test('a newer version on the disk asks for a reload of the extension first', () => {
  assert.deepEqual(n({ loaded: '2.2.0', disk: '2.3.0', tab: '2.1.1' }), {
    warn: true, text: 'Version 2.3.0 available: reload the extension (chrome://extensions, ↻), then F5 on the page of the site.'
  });
});

test('a page that runs other code, or no code, asks for F5', () => {
  assert.equal(n({ loaded: '2.2.0', disk: '2.2.0', tab: '2.1.1' }).text, 'v2.2.0 · this page runs v2.1.1: F5 on the page of the site.');
  assert.equal(n({ loaded: '2.2.0', disk: '2.2.0', tab: 'none' }).text, 'v2.2.0 · no script on this page: F5 on the page of the site.');
});

test('everything up to date, or nothing to compare', () => {
  assert.deepEqual(n({ loaded: '2.2.0', disk: '2.2.0', tab: '2.2.0' }), { warn: false, text: 'v2.2.0 · page up to date' });
  assert.deepEqual(n({ loaded: '2.2.0', disk: null, tab: null }), { warn: false, text: 'v2.2.0' });
});
