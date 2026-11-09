import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassDeck } from '../site/assets/class-deck.js';

const roster = Array.from({ length: 39 }, (_, i) => ({ id: `class-${i}`, name: `Class ${i}` }));
function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

test('every class appears before any class repeats, across many shuffles', () => {
  for (let seed = 0; seed < 100; seed++) {
    const deal = createClassDeck(roster, seeded(seed));
    for (let cycle = 0; cycle < 3; cycle++) {
      const shown = Array.from({ length: 13 }, () => deal()).flat();
      assert.equal(new Set(shown.map(c => c.id)).size, 39);
    }
  }
});
test('different visits draw different classes and orders', () => {
  const visits = new Set(Array.from({ length: 100 }, (_, i) =>
    createClassDeck(roster, seeded(i))().map(c => c.id).join(',')));
  assert.ok(visits.size > 90);
});
test('a changing roster stays unique even when a deal crosses the cycle boundary', () => {
  for (const size of [1, 2, 4, 5, 38, 40]) {
    const pool = Array.from({ length: size }, (_, i) => ({ id: String(i), name: String(i) }));
    const deal = createClassDeck(pool, seeded(size));
    for (let i = 0; i < 50; i++) {
      const cards = deal();
      assert.equal(cards.length, Math.min(size, 3));
      assert.equal(new Set(cards.map(c => c.id)).size, cards.length);
    }
  }
});
test('an unavailable or malformed pool cannot create broken tabs', () => {
  assert.deepEqual(createClassDeck([])(), []);
  assert.deepEqual(createClassDeck([null, {}, { id: 'x' }, roster[0], roster[0]])(), [roster[0]]);
  assert.deepEqual(createClassDeck(roster)(0), []);
});
