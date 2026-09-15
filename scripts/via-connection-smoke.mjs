// Read-only smoke against an already running isolated endpoint; never starts Java.
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import minecraftData from 'minecraft-data';

const { values } = parseArgs({ options: {
  port: { type: 'string' }, version: { type: 'string' },
  mode: { type: 'string', default: 'via-plugin' }, backend: { type: 'string' },
  username: { type: 'string', default: 'ViaSmoke' }
} });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 25565 || !values.version) {
  throw new Error('Supply --port (isolated localhost, not 25565) and --version (client protocol)');
}
if (!['native', 'via-plugin', 'via-proxy', 'via-server-mod'].includes(values.mode)) throw new Error('Invalid mode');
const client = new Client({ name: 'via-readonly-smoke', version: '1' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/main.js', '--host', '127.0.0.1', '--port', String(port), '--version', values.version,
    '--connection-mode', values.mode, '--auth', 'offline', '--username', values.username,
    ...(values.backend ? ['--backend-version', values.backend] : [])],
  cwd: fileURLToPath(new URL('../', import.meta.url)), stderr: 'pipe'
});
let stderr = '';
transport.stderr?.on('data', data => { stderr += data; });
try {
  await client.connect(transport);
  const deadline = Date.now() + 60000;
  let state;
  while (Date.now() < deadline) {
    const response = await client.callTool({ name: 'get-player-state', arguments: {} });
    if (!response.isError) {
      state = JSON.parse(response.content.filter(c => c.type === 'text').map(c => c.text).join('\n'));
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!state) throw new Error('Login timed out');
  if (minecraftData(state.connection.clientVersion).version.version !== minecraftData(values.version).version.version) {
    throw new Error('Client protocol mismatch');
  }
  const view = await client.callTool({ name: 'get-bot-view', arguments: { width: 160, distance: 8 } });
  if (view.isError || !view.content.some(c => c.type === 'image')) throw new Error('View capture failed');
  if (/PartialReadError|DecoderException|TypeError/.test(stderr)) throw new Error('Protocol error in client log');
  console.log(JSON.stringify({ accepted: true, connection: state.connection, visual: true }));
} finally {
  // SDK close may send signals; let our child leave via its stdin EOF handler first.
  const child = transport._process;
  if (child && child.exitCode === null) {
    await new Promise(resolve => { child.once('exit', resolve); child.stdin.end(); });
  }
  await client.close();
}
