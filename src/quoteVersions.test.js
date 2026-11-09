import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextQuoteVersion } from './quoteVersions.js';

const quote = (id, groupId, version, status = 'In attesa') => ({
  id,
  status,
  formData: { _quoteGroupId: groupId, _quoteVersion: version },
});

test('assegna la versione successiva alla più alta del gruppo, da qualsiasi preventivo', () => {
  const quotes = [
    quote('a', 'event', 1),
    quote('b', 'event', 2),
    quote('c', 'event', 3),
    quote('other', 'another-event', 20),
  ];
  for (const source of quotes.slice(0, 3)) {
    assert.equal(getNextQuoteVersion(quotes, source), 4);
  }
});

test('considera versioni archiviate, lacune e numeri duplicati esistenti', () => {
  const quotes = [
    quote('a', 'event', 1),
    quote('b', 'event', 2),
    quote('b2', 'event', 2),
    quote('e', 'event', 5, 'Archiviato'),
  ];
  assert.equal(getNextQuoteVersion(quotes, quotes[0]), 6);
});

test('gestisce preventivi precedenti senza gruppo o versione', () => {
  const original = { id: 'legacy', formData: {} };
  const duplicate = quote('duplicate', 'legacy', 2);
  assert.equal(getNextQuoteVersion([original], original), 2);
  assert.equal(getNextQuoteVersion([original, duplicate], original), 3);
});

test('continua la progressione oltre la Z', () => {
  const original = quote('a', 'event', 1);
  const last = quote('z', 'event', 26);
  assert.equal(getNextQuoteVersion([original, last], original), 27);
});
