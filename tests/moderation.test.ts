import assert from 'node:assert/strict';
import test from 'node:test';

import { moderateMessage, moderateResponse } from '../src/lib/moderation';

test('moderateMessage rejects crisis keywords', () => {
  const result = moderateMessage('Мне плохо, я хочу покончить с собой.');
  assert.equal(result.passed, false);
  assert.equal(result.reason, 'crisis');
});

test('moderateMessage normalizes and accepts valid content', () => {
  const result = moderateMessage('  Сегодня тяжело, но я держусь.  ');
  assert.equal(result.passed, true);
  assert.equal(result.cleanedText, 'Сегодня тяжело, но я держусь.');
});

test('moderateResponse flags contact info', () => {
  const result = moderateResponse('Поддерживаю тебя. Напиши мне t.me/support.');
  assert.equal(result.passed, false);
  assert.equal(result.reason, 'contact');
});
