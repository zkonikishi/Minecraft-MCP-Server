import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const client = new Client({ name: 'md-validate-dungeon-start', version: '1' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    'dist/main.js', '--host', '127.0.0.1', '--port', '29565',
    '--username', 'MCPTestBot', '--auth', 'offline',
    '--version', '26.2'
  ],
  cwd: process.cwd(), stderr: 'pipe'
});
transport.stderr?.on('data', data => process.stderr.write(data));
await client.connect(transport);
const call = (name, args = {}) => client.callTool({ name, arguments: args });

await sleep(10000);
const result = {};
await call('send-chat', { message: '/md leave' });
await sleep(1500);

for (const dungeon of [
  'ZDungeon_DeerGodHana', 'ZDungeon_DeerGodHana', 'ZDungeon_DragonMonk',
  'ZDungeon_FireElemental', 'ZDungeon_OrcKing', 'ZDungeon_SlimePrincess'
]) {
  await call('send-chat', { message: `/md reload ${dungeon}` });
  await sleep(1200);
}

await call('send-chat', { message: '/md play ZDungeon_DeerGodHana' });
await sleep(10000);
result.position = await call('get-position');
result.entities = await call('list-nearby-entities', { radius: 96 });
result.chat = await call('read-chat', { count: 80 });
await call('send-chat', { message: '/md leave' });
await sleep(1500);
console.log(JSON.stringify(result, null, 2));
await client.close();

