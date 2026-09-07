import test from 'ava';
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { Vec3 } from 'vec3';
import { ToolFactory } from '../src/tool-factory.js';
import type { BotConnection } from '../src/bot-connection.js';

const require = createRequire(import.meta.url);

test('native stack resolves one patched minecraft-data registry after upgrade', t => {
  const rootPath = require.resolve('minecraft-data');
  for (const parent of ['mineflayer', 'minecraft-protocol', 'prismarine-registry']) {
    const consumer = createRequire(require.resolve(parent));
    t.is(consumer.resolve('minecraft-data'), rootPath);
    const data = consumer('minecraft-data')('26.2');
    t.is(data.version.version, 776);
    t.truthy(data.protocol);
    t.truthy(data.blocksByName.stone);
  }
});

test('Vec3 0.2 interoperates with Mineflayer vectors without mutation', t => {
  const consumer = createRequire(require.resolve('mineflayer'));
  const { Vec3: BotVec3 } = consumer('vec3');
  const botPosition = new BotVec3(1, 2, 3);
  const target = new Vec3(4, 6, 3);
  t.is(target.distanceTo(botPosition), 5);
  t.true(botPosition.equals(new Vec3(1, 2, 3)));
  t.deepEqual(target.minus(botPosition), new Vec3(3, 4, 0));
  t.deepEqual([botPosition.x, botPosition.y, botPosition.z], [1, 2, 3]);
});

test('Zod 4 tool schema survives MCP discovery, defaults and invalid input', async t => {
  const server = new McpServer({ name: 'schema-upgrade-test', version: '1' });
  const client = new Client({ name: 'schema-upgrade-client', version: '1' });
  const connection = {
    checkConnectionAndReconnect: async () => ({ connected: true })
  } as unknown as BotConnection;
  let calls = 0;
  new ToolFactory(server, connection).registerTool('probe', 'Schema probe', {
    count: z.number().int().min(1).max(4),
    label: z.string().default('default-label')
  }, async args => {
    calls++;
    return { content: [{ type: 'text', text: `${args.label}:${args.count}` }] };
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const { tools } = await client.listTools();
    t.is(tools.length, 1);
    t.deepEqual(tools[0].inputSchema.required, ['count']);
    t.is(tools[0].inputSchema.type, 'object');
    const good = await client.callTool({ name: 'probe', arguments: { count: 2 } });
    t.deepEqual(good.content, [{ type: 'text', text: 'default-label:2' }]);
    for (const count of [0, 5, 1.5, '2']) {
      const bad = await client.callTool({ name: 'probe', arguments: { count } });
      t.true(bad.isError);
    }
    t.is(calls, 1);
  } finally {
    await client.close();
    await server.close();
  }
});
