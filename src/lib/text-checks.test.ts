import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasMoneyWords, isAdult, USERNAME } from './text-checks.ts';

test('flags money and betting words', () => {
  for (const t of ['loser pays 20', 'want to bet?', 'Cash App me', 'winner takes the purse', 'send it on venmo']) {
    assert.equal(hasMoneyWords(t), true, t);
  }
});

test('leaves normal training talk alone', () => {
  for (const t of ['3 rounds technical?', 'Bring shin guards', 'Saturday at 10 works', 'pace yourself', 'bettering my jab']) {
    assert.equal(hasMoneyWords(t), false, t);
  }
});

test('18+ check is exact to the day', () => {
  const today = new Date(2026, 9, 19);
  assert.equal(isAdult(new Date(2008, 9, 19), today), true);
  assert.equal(isAdult(new Date(2008, 9, 20), today), false);
});

test('usernames are lowercase letters, numbers and underscores', () => {
  assert.equal(USERNAME.test('iron_mike86'), true);
  assert.equal(USERNAME.test('Iron Mike'), false);
  assert.equal(USERNAME.test('ab'), false);
});
