import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const client = new Client({ name: 'md-smoke-all-dungeons', version: '1' });
const transport = new StdioClientTransport({ command: process.execPath, args: [
  'dist/main.js', '--host', '127.0.0.1', '--port', '29565', '--username', 'MCPTestBot',
  '--auth', 'offline',
  '--version', '26.2'
], cwd: process.cwd(), stderr: 'pipe' });
transport.stderr?.on('data', d => process.stderr.write(d));
await client.connect(transport);
const call = (name, args = {}) => client.callTool({ name, arguments: args });
await sleep(9000);
const dungeons = [
  'ZDungeon_AmethystGolem', 'ZDungeon_DeerGodHana', 'ZDungeon_DragonMonk',
  'ZDungeon_FireElemental', 'ZDungeon_SlimePrincess', 'ZDungeon_OrcKing'
];
const report = [];
for (const dungeon of dungeons) {
  await call('send-chat', { message: '/md leave' });
  await sleep(1800);
  await call('send-chat', { message: `/md play ${dungeon}` });
  await sleep(7000);
  const position = await call('get-position');
  const entities = await call('list-nearby-entities', { radius: 256 });
  report.push({ dungeon, position, entities });
}
await call('send-chat', { message: '/md leave' });
await sleep(1200);
console.log(JSON.stringify(report, null, 2));
await client.close();
