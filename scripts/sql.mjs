// sql.mjs - Read-only SQL query on the Neon database, from the terminal
// Exposes: node scripts/sql.mjs "select ..."
//
// Reads `databaseUrlRead` in scripts/sql.local.json (git-ignored): the
// connection string of a role that is a member of duogg-read. Postgres
// refuses any write, and the read_all policy shows it every row
// (db/grants.sql). Each call wakes the database up: group the questions
// (docs/database/sql-cli.md).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgPath = path.join(ROOT, 'scripts', 'sql.local.json');

function fail(msg) { console.error(msg); process.exit(1); }

const query = process.argv.slice(2).join(' ').trim();
if (!query) fail('Usage: node scripts/sql.mjs "select count(*) from blacklist_entry"');
if (!fs.existsSync(cfgPath)) fail('scripts/sql.local.json missing: {"databaseUrlRead": "postgresql://duogg_agent:..."} (docs/database/sql-cli.md)');
const { databaseUrlRead } = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

for (const f of ['src/core/config.js', 'src/store/neon.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'extension', f), 'utf8'), { filename: f });
}
const D = globalThis.DuoGG;
const conn = D.neon.parse(databaseUrlRead);
if (!conn) fail('databaseUrlRead is unreadable.');

const res = await D.neon.batch(conn, [
  { query: 'select current_user as role', params: [] },
  { query: query, params: [] }
]);
console.error('role: ' + ((res[0].rows[0] || {}).role || '?'));
const rows = (res[1] && res[1].rows) || [];
if (rows.length) console.table(rows); else console.log('(no rows)');
