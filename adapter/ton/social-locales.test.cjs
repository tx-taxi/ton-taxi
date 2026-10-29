const test = require('node:test');
const assert = require('node:assert/strict');
const {localizeTonMetadata} = require('./social-locales.cjs');

function factLinks(locale, links) {
  const meta = {status:200, facts:links.map(href => ({label:'Address',value:'example',href}))};
  const entity = {kind:'jetton', id:'example'};
  return localizeTonMetadata(meta, `/${locale}/jetton/example`, entity, {host:'ton.tx.taxi'}).facts.map(fact => fact.href);
}

test('localized server-rendered fact links retain the chosen TON locale and URL identity', () => {
  for (const locale of ['cs','pl']) {
    const links = [
      '/address/0%3Aabc?view=activity#history',
      'https://masterchain.ton.tx.taxi/block/42?shard=abcd#transactions',
      'https://ton.tx.taxi/tx/abcd?view=messages#incoming',
      '/cs/address/already?x=1#h',
      '//outside.example/address/abc',
      'https://outside.example/address/abc',
      '/api/ton/address/abc',
      'https://ton.tx.taxi.evil.example/address/abc',
    ];
    assert.deepEqual(factLinks(locale, links), [
      `/${locale}/address/0%3Aabc?view=activity#history`,
      `https://masterchain.ton.tx.taxi/${locale}/block/42?shard=abcd#transactions`,
      `https://ton.tx.taxi/${locale}/tx/abcd?view=messages#incoming`,
      ...links.slice(3),
    ]);
  }
});

test('English server-rendered fact links are unchanged', () => {
  const links = ['/address/abc?x=1#h', 'https://masterchain.ton.tx.taxi/block/42'];
  assert.deepEqual(factLinks('en', links), links);
});
