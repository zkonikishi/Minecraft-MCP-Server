import test from 'ava';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('MSAL generates correlation UUIDs with the patched dependency', t => {
  const { CryptoProvider } = require('@azure/msal-node');
  const provider = new CryptoProvider();
  const first = provider.createNewGuid();
  t.regex(first, uuidPattern);
  t.not(first, provider.createNewGuid());
});

test.serial('Yggdrasil authenticates with a generated client token using patched UUID', async t => {
  const utils = require('yggdrasil/src/utils.js');
  const original = utils.call;
  let token = '';
  utils.call = async (_host: string, _route: string, body: { clientToken: string }) => {
    token = body.clientToken;
    return { clientToken: token, accessToken: 'test-only' };
  };
  try {
    const client = require('yggdrasil/src/Client.js')({});
    const result = await client.auth({ user: 'test', pass: 'test-only' });
    t.regex(token, uuidPattern);
    t.is(result.clientToken, token);
  } finally {
    utils.call = original;
  }
});

test('both authentication dependencies reject undersized UUID v5 output buffers', t => {
  for (const parent of ['@azure/msal-node', 'yggdrasil']) {
    const parentRequire = createRequire(require.resolve(parent));
    const uuid = parentRequire('uuid');
    t.throws(() => uuid.v5('test', uuid.v5.DNS, new Uint8Array(8), 4), { instanceOf: RangeError });
  }
});
