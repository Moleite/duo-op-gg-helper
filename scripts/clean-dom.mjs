// clean-dom.mjs - Lightens and pseudonymizes the captures of DOM/
// Exposes: node scripts/clean-dom.mjs [--check] [file...]; lighten, pseudonymize, problems
//
// Without an argument, processes DOM/raw-*.html: writes the clean version
// under the same name without the `raw-` prefix, and leaves the raw file
// (git-ignored) in place. --check verifies the committed captures: no
// decoration, no real player name. CI runs it (docs/architecture/dom-captures.md).
//
// Constraints:
//   - the selectors of extension/src/data/selectors.js stay valid: only bytes
//     are removed, never a class, an id or an aria attribute;
//   - the pseudonymization is deterministic: same capture, same output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const DIR = path.join(path.dirname(HERE), '..', 'DOM');
const LONG_D = 120;

// Removes what the extension does not read: scripts, iframes, icon geometry.
export function lighten(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/g, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/g, '')
    .replace(/ d="([^"]*)"/g, (m, d) => (d.length > LONG_D ? ' d=""' : m))
    .replace(/(data:[a-z/+.-]+;base64,)[A-Za-z0-9+/=]{40,}/g, '$1');
}

function pad(n, w) { return String(n).padStart(w, '0'); }

// Replaces each Riot ID, note and IP fragment with a numbered value. An
// identity is the pair name + tag, numbered in order of appearance:
// Player01#0001. Two posts of the same player keep the same identity, so the
// duplicate rule stays testable.
const LINK = /href="https:\/\/www\.op\.gg\/summoners\/([a-z0-9]+)\/[^"]*"([^>]*)>([^<]*)<\/a>/g;
const TAG = /(<div class="text-3xs text-gray-500">)#([^<]*)/g;

export function pseudonymize(html) {
  const links = [...html.matchAll(LINK)].map((m) => m[3]);
  const tags = [...html.matchAll(TAG)].map((m) => m[2]);
  // Each row carries a link then a tag. Without this pairing, the tag cannot
  // follow the identity: the output is refused.
  if (links.length !== tags.length) throw new Error(`${links.length} op.gg links for ${tags.length} tags`);
  const ids = new Map();
  const seq = links.map((name, i) => {
    const key = name + '#' + tags[i];
    if (!ids.has(key)) ids.set(key, ids.size + 1);
    return ids.get(key);
  });
  let k = 0;
  let out = html.replace(LINK, (m, region, attrs) => {
    const n = seq[k++];
    return `href="https://www.op.gg/summoners/${region}/Player${pad(n, 2)}-${pad(n, 4)}"${attrs}>Player${pad(n, 2)}</a>`;
  });
  k = 0;
  out = out.replace(TAG, (m, open) => `${open}#${pad(seq[k++], 4)}`);
  const names = [...new Set(links)];
  let noteN = 0;
  out = out.replace(
    /(id="partner-\d+-edit-note"[^>]*aria-label=")[^"]*("[^>]*>\s*<span[^>]*>)[^<]*/g,
    (m, a, b) => { const t = `Anonymized note ${pad(++noteN, 2)}`; return `${a}${t}${b}${t}`; }
  );
  let ipN = 0;
  out = out.replace(/(<p class="text-gray-500">)\d{1,3}\.\d{1,3}(<\/p>)/g, (m, a, b) => `${a}0.${++ipN}${b}`);
  // Signed-in op.gg account: the header and the menu of the site repeat it
  // (text, `aria-label`, `<bdi>`). Every occurrence is replaced.
  const account = (out.match(/DesktopGNB-module_text__[A-Za-z0-9]+">([^<]+)</) || [])[1];
  if (account && account.length >= 4) out = out.split(account).join('MyAccount');
  return { html: out, names: names.concat(account ? [account] : []), identities: ids.size };
}

// A clean capture has no script and no op.gg link to a name that is not numbered.
export function problems(html) {
  const out = [];
  if (/<script\b/.test(html)) out.push('<script> tag left');
  const bad = [...html.matchAll(/href="https:\/\/www\.op\.gg\/summoners\/[a-z0-9]+\/([^"]*)"/g)]
    .map((m) => m[1]).filter((s) => !/^Player\d{2}-\d{4}$/.test(s));
  if (bad.length) out.push(`${bad.length} op.gg link(s) not pseudonymized`);
  if ([...html.matchAll(/ d="([^"]*)"/g)].some((m) => m[1].length > LONG_D)) out.push('d= attribute too long');
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    let failed = 0;
    for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('raw-'))) {
      const p = problems(fs.readFileSync(path.join(DIR, f), 'utf8'));
      if (p.length) { failed++; console.error(`DOM/${f}: ${p.join(', ')}`); }
    }
    if (failed) { console.error('Run: node scripts/clean-dom.mjs'); process.exit(1); }
    console.log('clean-dom: clean captures.');
    return;
  }
  const files = args.length ? args : fs.readdirSync(DIR).filter((f) => f.startsWith('raw-') && f.endsWith('.html'));
  for (const f of files) {
    const src = path.isAbsolute(f) ? f : path.join(DIR, path.basename(f));
    const raw = fs.readFileSync(src, 'utf8');
    const { html, names, identities } = pseudonymize(lighten(raw));
    // An original name still present elsewhere (alt attribute, tooltip) would
    // leak the identity: the output is refused.
    const leaks = names.filter((n) => n.length >= 3 && html.includes(n));
    if (leaks.length) { console.error(`${f}: original name still present (${leaks.length}), output refused.`); process.exit(1); }
    const dst = path.join(DIR, path.basename(src).replace(/^raw-/, ''));
    fs.writeFileSync(dst, html);
    console.log(`${path.basename(dst)}: ${Math.round(raw.length / 1024)} KB -> ${Math.round(html.length / 1024)} KB, ${identities} identities pseudonymized.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === HERE) main();
