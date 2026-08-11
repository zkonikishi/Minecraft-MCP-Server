import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const output = process.argv[2] ?? 'md-death-tower-smoke.json';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const client = new Client({ name: 'md-death-tower-smoke', version: '1' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    'dist/main.js', '--host', '127.0.0.1', '--port', '29565',
    '--username', 'MCPTestBot', '--auth', 'offline',
    '--version', '26.2'
  ],
  cwd: process.cwd(),
  stderr: 'pipe'
});

const report = { startedAt: new Date().toISOString(), stages: [], errors: [] };
try {
  await client.connect(transport);
  const call = (name, args = {}) => client.callTool({ name, arguments: args });
  let connected = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(2000);
    const probe = await call('get-position');
    if (!probe.isError) { connected = true; break; }
  }
  if (!connected) throw new Error('MCP bot did not reach PLAY state within 60 seconds');
  await call('send-chat', { message: '/md leave' });
  await sleep(1500);
  await call('send-chat', { message: '/md play ZDungeon_TowerOfDeath' });
  await sleep(20000);
  for (let floor = 1; floor <= 6; floor++) {
    report.stages.push({
      floor,
      position: await call('get-position'),
      entities: await call('list-nearby-entities', { radius: 128 })
    });
    if (floor < 6) {
      await call('send-chat', { message: '/minecraft:kill @e[type=!minecraft:player,distance=..128]' });
      await sleep(13000);
    }
  }
  await call('send-chat', { message: '/md leave' });
  await sleep(1000);
} catch (error) {
  report.errors.push(String(error?.stack ?? error));
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  await client.close().catch(() => {});
}
