// api.test.mjs - Conversion of API posts, cursor, GraphQL call
//
// The `RAW` object has the shape of a post read on 2026-10-17 on the API of
// the site (docs/architecture/site-api.md), with name and note replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CONTENT } from './helpers/ext.mjs';

const D = load(CONTENT.filter((f) => /^src\/(core|data)\//.test(f)));

const RAW = {
  id: '10876326', position: 'BOTTOM', position2: null, champion: null, champion2: null,
  requiredPosition: ['SUPPORT'], note: 'Note', insertedAt: '2026-10-17T13:44:47.315Z',
  queueType: 'RANKED_SOLO', options: 1024, isNewbie: false,
  summoner: {
    gameName: 'Player01', tagLine: '0001', tier: 'Emerald 2', kdaAverage: 2.02, wins: 140, losses: 136,
    opScore: 5.47, region: 'euw', champions: [{ name: 'Sivir', games: 43, wr: '53%' }]
  }
};

test('fromApi gives the same shape as the DOM', () => {
  const p = D.api.fromApi(RAW, Date.parse('2026-10-17T14:04:47Z'));
  assert.equal(p.key, 'player01#0001');
  assert.deepEqual(p.rank, { tier: 'EMERALD', div: 2 });
  assert.deepEqual(p.lookingFor, ['SUPPORT']);
  assert.equal(p.winRate, 51);
  assert.equal(p.ageMin, 20);
  assert.deepEqual(p.champions, [{ name: 'Sivir', winRate: 53, games: 43 }]);
});

test('requiredPosition null or ALL', () => {
  assert.deepEqual(D.api.fromApi(Object.assign({}, RAW, { requiredPosition: null })).lookingFor, []);
  assert.deepEqual(D.api.fromApi(Object.assign({}, RAW, { requiredPosition: ['ALL'] })).lookingFor, ['ALL']);
});

test('parseDate reads both forms of insertedAt', () => {
  assert.equal(D.api.parseDate('2026-10-15T23:09:36.000Z'), Date.parse('2026-10-15T23:09:36Z'));
  assert.equal(D.api.parseDate('Fri Oct 16 2026 08:09:36 GMT+0900 (Korean Standard Time)'), Date.parse('2026-10-15T23:09:36Z'));
  assert.equal(D.api.parseDate(null), null);
});

test('cursorOf: Unix timestamp in seconds of the oldest post', () => {
  const ps = [{ insertedAt: Date.parse('2026-10-16T00:44:36.603Z') }, { insertedAt: Date.parse('2026-10-17T00:00:00Z') }, { insertedAt: null }];
  assert.equal(D.api.cursorOf(ps), 1792111476);
  assert.equal(D.api.cursorOf([]), null);
});

test('fetchPage sends the partners query with the variables of the site', async () => {
  let sent = null;
  const fake = async (url, init) => {
    sent = { url: url, init: init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ data: { partners: [RAW] } }) };
  };
  const list = await D.api.fetchPage({ region: 'euw', position: 'SUPPORT', queueType: 'RANKED_SOLO', tier: 'ALL' }, 1792111476, fake);
  assert.equal(sent.url, 'https://duo.op.gg/graphql');
  assert.equal(sent.init.credentials, 'include');
  assert.equal(sent.body.operationName, 'partners');
  assert.deepEqual(sent.body.variables, { region: 'euw', tier: 'ALL', position: 'SUPPORT', queueType: 'RANKED_SOLO', from: 1792111476 });
  assert.equal(list[0].id, '10876326');
});

// Read on 2026-10-17: `from: 0` with position SUPPORT returns 0 posts, the
// same query without `from` returns 50.
test('first page: no from variable', () => {
  const v = D.api.variables({ region: 'euw', position: 'SUPPORT' }, null);
  assert.ok(!('from' in v));
  assert.equal(D.api.variables({}, 1792111476).from, 1792111476);
});

test('fetchPage reports a GraphQL error', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ errors: [{ message: 'Bad request' }] }) });
  await assert.rejects(D.api.fetchPage({}, 0, fake), /Bad request/);
});
