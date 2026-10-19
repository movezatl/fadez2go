import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ago, firstName, initials, timeLeft } from './format.ts';

test('initials', () => {
  assert.equal(initials('Marcus Reyes'), 'MR');
  assert.equal(initials('dani'), 'D');
  assert.equal(initials(null), '?');
});

test('time left and ago', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(timeLeft('2026-10-21T13:00:00Z', now), '2d 1h left');
  assert.equal(timeLeft('2026-10-19T15:30:00Z', now), '3h left');
  assert.equal(timeLeft('2026-10-19T11:00:00Z', now), 'expired');
  assert.equal(ago('2026-10-19T11:58:00Z', now), '2m');
});

test('first name', () => {
  assert.equal(firstName('Marcus Reyes'), 'Marcus');
});
