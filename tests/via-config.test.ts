import test from 'ava';
import { describeConnection, validateConnectionMode, parseConfig, type ServerConfig } from '../src/config.js';
const base: ServerConfig = { host: '127.0.0.1', port: 29568, username: 'Test', auth: 'offline' };
test('native default remains valid with protocol autodetection', t => {
  t.notThrows(() => validateConnectionMode(base));
  const info = describeConnection(base, '26.2');
  t.is(info.mode, 'native');
  t.is(info.declaredBackendVersion, null);
  t.is(info.translationDetection, 'not-probed');
});
for (const mode of ['via-plugin', 'via-proxy', 'via-server-mod'] as const) {
  test(`${mode} requires client protocol and preserves separate backend label`, t => {
    t.throws(() => validateConnectionMode({ ...base, connectionMode: mode }), { message: /explicit --version/ });
    const config = { ...base, connectionMode: mode, version: '1.21.11', backendVersion: '26.2' };
    t.notThrows(() => validateConnectionMode(config));
    const info = describeConnection(config, '1.21.11');
    t.is(info.clientVersion, '1.21.11');
    t.is(info.declaredBackendVersion, '26.2');
    t.is(info.modeSource, 'user-declared');
    t.false('auth' in info);
  });
}
test('native mode rejects misleading backend labels', t => {
  t.throws(() => validateConnectionMode({ ...base, backendVersion: '26.2' }), { message: /only/ });
});
test.serial('CLI exposes translated connection fields without replacing client version', t => {
  const argv = process.argv;
  try {
    process.argv = ['node', 'test', '--connection-mode', 'via-proxy', '--version', '1.21.11', '--backend-version', '26.2'];
    const config = parseConfig();
    t.is(config.connectionMode, 'via-proxy');
    t.is(config.version, '1.21.11');
    t.is(config.backendVersion, '26.2');
  } finally { process.argv = argv; }
});
