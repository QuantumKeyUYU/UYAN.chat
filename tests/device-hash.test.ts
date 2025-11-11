import assert from 'node:assert/strict';
import test from 'node:test';

type DeviceHashModule = typeof import('../src/lib/deviceHash');

const loadDeviceHash = (salt?: string): DeviceHashModule => {
  if (salt === undefined) {
    delete process.env.DEVICE_ID_SALT;
  } else {
    process.env.DEVICE_ID_SALT = salt;
  }

  delete require.cache[require.resolve('../src/lib/deviceHash')];
  return require('../src/lib/deviceHash');
};

test('hashDeviceId respects salt', () => {
  const { hashDeviceId: hashWithSaltA } = loadDeviceHash('salt-a');
  const hashA = hashWithSaltA('device-123');

  const { hashDeviceId: hashWithSaltB } = loadDeviceHash('salt-b');
  const hashB = hashWithSaltB('device-123');

  assert.notEqual(hashA, hashB);
});

test('hashDeviceId falls back to dev salt when missing', () => {
  const { hashDeviceId } = loadDeviceHash();
  const hash = hashDeviceId('device-xyz');

  assert.match(hash, /^[0-9a-f]{64}$/);
});
