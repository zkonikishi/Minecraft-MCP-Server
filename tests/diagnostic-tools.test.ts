import test from 'ava';
import sinon from 'sinon';
import { Vec3 } from 'vec3';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BotConnection } from '../src/bot-connection.js';
import type { Bot } from 'mineflayer';
import { ToolFactory } from '../src/tool-factory.js';
import { registerDiagnosticTools } from '../src/tools/diagnostic-tools.js';

test('diagnostic tools register full test primitives', t => {
  const server = { tool: sinon.stub() } as unknown as McpServer;
  const connection = { checkConnectionAndReconnect: sinon.stub().resolves({ connected: true }) } as unknown as BotConnection;
  const bot = { entity: { position: new Vec3(0, 0, 0), effects: {} }, entities: {}, game: {}, experience: {} } as unknown as Bot;
  registerDiagnosticTools(new ToolFactory(server, connection), () => bot);
  t.deepEqual((server.tool as sinon.SinonStub).getCalls().map(call => call.args[0]), [
    'get-player-state', 'list-nearby-entities', 'interact-entity', 'wait-ticks'
  ]);
});
