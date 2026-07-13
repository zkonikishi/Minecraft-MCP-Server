import test from 'ava';
import sinon from 'sinon';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BotConnection } from '../src/bot-connection.js';
import type { Bot } from 'mineflayer';
import { ToolFactory } from '../src/tool-factory.js';
import { registerItemInspectionTools } from '../src/tools/item-inspection-tools.js';

function setup(bot: Bot) {
  const server = { tool: sinon.stub() } as unknown as McpServer;
  const connection = { checkConnectionAndReconnect: sinon.stub().resolves({ connected: true }) } as unknown as BotConnection;
  registerItemInspectionTools(new ToolFactory(server, connection), () => bot);
  return server.tool as sinon.SinonStub;
}

test('item inspection tools register and inspect held metadata', async t => {
  const item = { name: 'iron_sword', displayName: '+1 Sword', count: 1, slot: 36, type: 1, metadata: 0, stackSize: 1, lore: ['Reinforcement +1'] };
  const calls = setup({ heldItem: item, inventory: { items: () => [item], slots: [] } } as unknown as Bot).getCalls();
  t.deepEqual(calls.map(call => call.args[0]), ['inspect-item', 'inspect-held-item', 'use-held-item']);
  const result = await calls.find(call => call.args[0] === 'inspect-held-item')!.args[3]({});
  t.true(result.content[0].text.includes('+1 Sword'));
  t.true(result.content[0].text.includes('Reinforcement +1'));
});
