import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getContractOptionDefaults } from './contractDefaults.js';

test('allinea le opzioni del contratto ai servizi indicati nel preventivo', () => {
  assert.deepEqual(getContractOptionDefaults({
    numImpianti: 2,
    distanzaKm: 120,
    usaPernottamento: true,
    numPasti: 3,
  }), {
    includAudio: true,
    escludiAudio: false,
    includLuci: false,
    escludiLuci: false,
    includViaggio: true,
    escludiViaggio: false,
    includAlloggio: true,
    escludiAlloggio: false,
    includVitto: false,
    escludiVitto: true,
  });
});

test('segna come escluse le opzioni esplicitamente non fornite dal preventivo', () => {
  assert.deepEqual(getContractOptionDefaults({
    numImpianti: '0',
    distanzaKm: 0,
    usaPernottamento: false,
  }), {
    includAudio: false,
    escludiAudio: true,
    includLuci: false,
    escludiLuci: false,
    includViaggio: false,
    escludiViaggio: false,
    includAlloggio: false,
    escludiAlloggio: false,
    includVitto: false,
    escludiVitto: true,
  });
});
