// check.mjs - Checks of the documentation and the code, before each commit and in CI
// Exposes: npm run check (exit 1 on any error)
//
// Documentation (docs/CONVENTIONS.md): budgets, routing header, links and
//   anchors, cited paths, `src:` pointers, style (scripts/style.mjs),
//   generated files up to date.
// Code: syntax, 400 lines per file, no innerHTML in extension/, files of the
//   manifest and of popup.html present, docs/ paths cited in the code present,
//   clean DOM captures.
// Language: the repository is written in English. An accented letter in the
//   documentation, the code, the SQL or the tests is an error.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { proseOf, styleProblems } from './style.mjs';
import { build } from './generate.mjs';
import { problems as domProblems } from './clean-dom.mjs';
import { keysOf } from './env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
// Latin-1 letters with a diacritic, and the oe ligature. Written as escapes:
// this file is checked too.
const ACCENT = /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0152\u0153]/;

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter)); else if (filter(p)) out.push(rel(p));
  }
  return out;
}

function accents(f, text) {
  text.split('\n').forEach((l, i) => { if (ACCENT.test(l)) err(`${f}:${i + 1}`, 'accented letter: write in English'); });
}

// ---- Documentation ---------------------------------------------------------
const DOCS = walk(path.join(ROOT, 'docs'), (p) => p.endsWith('.md'));
const ENTRY = ['AGENTS.md', 'README.md', 'CLAUDE.md'].filter(exists);

function budget(f) {
  if (f.startsWith('docs/generated/')) return null;
  if (f === 'docs/00-INDEX.md' || f === 'docs/01-SYMPTOMS.md') return 16384;
  if (f === 'AGENTS.md' || f.startsWith('docs/journal/')) return 12288;
  if (f.startsWith('docs/')) return 8192;
  return null;
}

// GitHub anchor of a heading: lower case, punctuation removed, spaces to dashes.
function slug(t) {
  return t.trim().toLowerCase().replace(/`/g, '').replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
}
const anchorsCache = {};
function anchors(f) {
  if (!anchorsCache[f]) {
    anchorsCache[f] = new Set(read(f).replace(/```[\s\S]*?```/g, '').split('\n')
      .filter((l) => /^#{1,6} /.test(l)).map((l) => slug(l.replace(/^#+ /, ''))));
  }
  return anchorsCache[f];
}

const REPO_PATH = /^(extension|db|docs|scripts|tests|DOM|\.github)\/[\w./-]*$/;

// Git-ignored files (local secrets, raw captures): a page cites them to say
// how to create them, they do not exist in a clone.
const IGNORED = read('.gitignore').split('\n').map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
  .map((g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'));
const ignored = (p) => IGNORED.some((re) => re.test(p));

for (const f of DOCS.concat(ENTRY)) {
  const md = read(f);
  const b = budget(f);
  if (b && Buffer.byteLength(md) > b) err(f, `${Buffer.byteLength(md)} bytes, budget ${b}`);
  if (f.startsWith('docs/') && !/^# .+\n\n> \*\*Answers\*\*: .+\n> \*\*Does not answer\*\*: .+/m.test(md)) {
    err(f, 'routing header missing (title, then Answers / Does not answer)');
  }
  accents(f, md);
  const dir = path.posix.dirname(f);
  for (const m of md.replace(/```[\s\S]*?```/g, '').matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = m[1];
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [p, a] = link.split('#');
    const target = p ? path.posix.normalize(path.posix.join(dir, p)) : f;
    if (!exists(target)) { err(f, `dead link ${link}`); continue; }
    if (a && target.endsWith('.md') && !anchors(target).has(decodeURIComponent(a))) err(f, `missing anchor ${link}`);
  }
  // A pointer names a path with a `/`: `src: path#anchor` is a syntax
  // example, not a pointer.
  for (const m of md.matchAll(/`src: ([^`#\s]+\/[^`#\s]*)(?:#([^`]+))?`/g)) {
    if (!exists(m[1])) { err(f, `src: missing file ${m[1]}`); continue; }
    if (m[2] && !read(m[1]).includes(m[2])) err(f, `src: missing anchor ${m[1]}#${m[2]}`);
  }
  if (!f.startsWith('docs/journal/')) {
    for (const m of md.matchAll(/`([^`\s]+)`/g)) {
      const p = m[1].replace(/[#:].*$/, '');
      if (REPO_PATH.test(p) && !p.includes('*') && !ignored(p) && !exists(p.replace(/\/$/, ''))) err(f, `cited path missing ${p}`);
    }
  }
  if (f !== 'docs/STYLE.md' && !f.startsWith('docs/generated/')) {
    styleProblems(proseOf(md)).forEach((p) => err(f, 'style, ' + p));
  }
}

const index = exists('docs/00-INDEX.md') ? read('docs/00-INDEX.md') : '';
DOCS.filter((f) => f !== 'docs/00-INDEX.md' && !f.startsWith('docs/journal/'))
  .forEach((f) => { if (!index.includes(f.replace(/^docs\//, ''))) warnings.push(`${f}: missing from docs/00-INDEX.md`); });

// Copy of a list held by a file: the Variables table of getting-started.md
// lists exactly the keys of .env.example, in the same order.
const envKeys = keysOf(path.join(ROOT, '.env.example'));
const gsLines = read('docs/run/getting-started.md').split(String.fromCharCode(10));
const varStart = gsLines.indexOf('## Variables');
const varEnd = gsLines.findIndex((l, i) => i > varStart && l.startsWith('## '));
const docKeys = gsLines.slice(varStart, varEnd < 0 ? undefined : varEnd)
  .map((l) => (l.match(/^[|] `([A-Z0-9_]+)` [|]/) || [])[1]).filter(Boolean);
if (docKeys.join() !== envKeys.join()) {
  err('docs/run/getting-started.md', `Variables table (${docKeys.join(', ') || 'empty'}) differs from .env.example (${envKeys.join(', ')})`);
}
if (!ignored('.env')) err('.gitignore', '.env must be git-ignored');
accents('.env.example', read('.env.example'));

const gen = build();
Object.keys(gen).forEach((g) => {
  const p = 'docs/generated/' + g;
  if (!exists(p) || read(p) !== gen[g]) err(p, 'out of date: run npm run gen');
});

// ---- Code ------------------------------------------------------------------
const JS = walk(path.join(ROOT, 'extension'), (p) => /\.(js|html|css|json)$/.test(p));
const TOOLS = walk(path.join(ROOT, 'scripts'), (p) => /\.m?js$/.test(p))
  .concat(walk(path.join(ROOT, 'tests'), (p) => /\.m?js$/.test(p)))
  .concat(walk(path.join(ROOT, 'db'), (p) => /\.(sql|md)$/.test(p)));

for (const f of JS.concat(TOOLS)) {
  const code = read(f);
  accents(f, code);
  if (!/\.m?js$/.test(f)) continue;
  if (f.startsWith('extension/')) {
    try { new vm.Script(code, { filename: f }); } catch (e) { err(f, 'syntax: ' + e.message); }
    if (/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML/.test(code)) err(f, 'innerHTML forbidden (src/ui/dom.js)');
  }
  const lines = code.split('\n').length;
  if (lines > 400) err(f, `${lines} lines, budget 400`);
  code.split('\n').forEach((l, i) => { if (/^\s*\/\/.*—/.test(l)) err(`${f}:${i + 1}`, 'em dash in a comment'); });
  for (const m of code.matchAll(/(docs\/[\w./-]+\.md)/g)) if (!exists(m[1])) err(f, `cited doc missing ${m[1]}`);
}

const manifest = JSON.parse(read('extension/manifest.json'));
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) err('extension/manifest.json', `version ${manifest.version}: x.y.z expected`);
manifest.content_scripts.forEach((cs) => cs.js.forEach((j) => { if (!exists('extension/' + j)) err('extension/manifest.json', `missing file ${j}`); }));
// The connection string lives in the IndexedDB of the origin of the extension.
// A content script runs in the origin of the site: there, the same code would
// write it into the IndexedDB of the site (extension/src/store/secrets.js).
manifest.content_scripts.forEach((cs) => cs.js.forEach((j) => {
  if (exists('extension/' + j) && /indexedDB|D\.secrets\b/.test(read('extension/' + j))) {
    err('extension/manifest.json', `content script ${j} reaches the secrets: load it from background.js only`);
  }
}));
// Every importScripts path, not only src/: a missing file is listed in the
// errors of the extension, even inside a try.
const bg = (read('extension/background.js').match(/importScripts\([^)]*\)/g) || []).join(' ');
[...bg.matchAll(/'([^']+\.js)'/g)].forEach((m) => {
  const p = 'extension/' + m[1];
  if (!exists(p)) err('extension/background.js', `importScripts of a file missing from the repository: ${m[1]}`);
  else if (ignored(p)) err('extension/background.js', `importScripts of a git-ignored file: ${m[1]}`);
});
[...read('extension/popup.html').matchAll(/src="([^"]+)"/g)].forEach((m) => {
  if (!exists('extension/' + m[1])) err('extension/popup.html', `missing file ${m[1]}`);
});
for (const f of walk(path.join(ROOT, 'DOM'), (p) => p.endsWith('.html') && !path.basename(p).startsWith('raw-'))) {
  domProblems(read(f)).forEach((p) => err(f, p + ' (npm run dom)'));
}

// ---- Result ----------------------------------------------------------------
warnings.forEach((w) => console.warn('warning, ' + w));
if (errors.length) {
  errors.forEach((e) => console.error('error, ' + e));
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`check: ${DOCS.length + ENTRY.length} pages, ${JS.length + TOOLS.length} code files, 0 errors.`);
