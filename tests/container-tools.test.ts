import test from 'ava';
import sinon from 'sinon';
import { Vec3 } from 'vec3';
import { registerContainerTools } from '../src/tools/container-tools.js';
import { ToolFactory } from '../src/tool-factory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BotConnection } from '../src/bot-connection.js';
import type mineflayer from 'mineflayer';

function createFactory() {
  const mockServer = {
    tool: sinon.stub()
  } as unknown as McpServer;
  const mockConnection = {
    checkConnectionAndReconnect: sinon.stub().resolves({ connected: true })
  } as unknown as BotConnection;
  return {
    mockServer,
    factory: new ToolFactory(mockServer, mockConnection)
  };
}

function toolExecutor(mockServer: McpServer, name: string) {
  const toolCalls = (mockServer.tool as sinon.SinonStub).getCalls();
  const call = toolCalls.find(call => call.args[0] === name);
  return call!.args[3];
}

function mockEntity() {
  return {
    position: new Vec3(1, 64, 0),
    height: 1.8
  };
}

test('registerContainerTools registers all container tools', (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {} as Partial<mineflayer.Bot>;
  const getBot = () => mockBot as mineflayer.Bot;

  registerContainerTools(factory, getBot);

  const toolNames = (mockServer.tool as sinon.SinonStub).getCalls().map(call => call.args[0]);

  t.true(toolNames.includes('list-container'));
  t.true(toolNames.includes('deposit-to-container'));
  t.true(toolNames.includes('withdraw-from-container'));
});

test('list-container opens container and lists items', async (t) => {
  const { mockServer, factory } = createFactory();
  const closeStub = sinon.stub();
  const container = {
    containerItems: () => [
      { name: 'iron_sword', count: 1, slot: 0 }
    ],
    close: closeStub
  };
  const block = { name: 'chest', position: new Vec3(1, 64, 1) };
  const mockBot = {
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openContainer: sinon.stub().resolves(container)
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'list-container');
  const result = await executor({ x: 1, y: 64, z: 1 });

  t.true(result.content[0].text.includes('iron_sword'));
  t.true(closeStub.calledOnce);
});

test('list-container prefers openChest for chest-like blocks', async (t) => {
  const { mockServer, factory } = createFactory();
  const closeStub = sinon.stub();
  const container = {
    containerItems: () => [
      { name: 'iron_sword', count: 1, slot: 0 }
    ],
    close: closeStub
  };
  const block = { name: 'chest', position: new Vec3(1, 64, 1) };
  const openContainerStub = sinon.stub().rejects(new Error('openContainer should not be used'));
  const openChestStub = sinon.stub().resolves(container);
  const mockBot = {
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openContainer: openContainerStub,
    openChest: openChestStub
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'list-container');
  const result = await executor({ x: 1, y: 64, z: 1 });

  t.true(result.content[0].text.includes('iron_sword'));
  t.true(openChestStub.calledOnceWith(block));
  t.false(openContainerStub.called);
  t.true(closeStub.calledOnce);
});

test('list-container reports missing block', async (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {
    blockAt: sinon.stub().returns(null)
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'list-container');
  const result = await executor({ x: 1, y: 64, z: 1 });

  t.true(result.content[0].text.includes('No container block found'));
});

test('deposit-to-container deposits matching inventory item', async (t) => {
  const { mockServer, factory } = createFactory();
  const depositStub = sinon.stub().resolves();
  const closeStub = sinon.stub();
  const container = {
    deposit: depositStub,
    close: closeStub
  };
  const block = { name: 'chest', position: new Vec3(1, 64, 1) };
  const mockBot = {
    inventory: {
      items: () => [
        { name: 'iron_sword', type: 267, metadata: null, count: 1 }
      ]
    },
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openContainer: sinon.stub().resolves(container)
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'deposit-to-container');
  const result = await executor({ x: 1, y: 64, z: 1, itemName: 'iron_sword' });

  t.true(depositStub.calledOnceWith(267, null, 1));
  t.true(closeStub.calledOnce);
  t.true(result.content[0].text.includes('Deposited 1 iron_sword'));
});

test('deposit-to-container reports missing inventory item', async (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {
    inventory: {
      items: () => []
    }
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'deposit-to-container');
  const result = await executor({ x: 1, y: 64, z: 1, itemName: 'iron_sword' });

  t.true(result.content[0].text.includes("Couldn't find any item matching 'iron_sword'"));
});

test('withdraw-from-container withdraws matching container item', async (t) => {
  const { mockServer, factory } = createFactory();
  const withdrawStub = sinon.stub().resolves();
  const closeStub = sinon.stub();
  const container = {
    containerItems: () => [
      { name: 'iron_sword', type: 267, metadata: null, count: 1 }
    ],
    withdraw: withdrawStub,
    close: closeStub
  };
  const block = { name: 'chest', position: new Vec3(1, 64, 1) };
  const mockBot = {
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openContainer: sinon.stub().resolves(container)
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'withdraw-from-container');
  const result = await executor({ x: 1, y: 64, z: 1, itemName: 'iron_sword' });

  t.true(withdrawStub.calledOnceWith(267, null, 1));
  t.true(closeStub.calledOnce);
  t.true(result.content[0].text.includes('Withdrew 1 iron_sword'));
});

test('withdraw-from-container reports missing container item', async (t) => {
  const { mockServer, factory } = createFactory();
  const closeStub = sinon.stub();
  const container = {
    containerItems: () => [],
    close: closeStub
  };
  const block = { name: 'chest', position: new Vec3(1, 64, 1) };
  const mockBot = {
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openContainer: sinon.stub().resolves(container)
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerContainerTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'withdraw-from-container');
  const result = await executor({ x: 1, y: 64, z: 1, itemName: 'iron_sword' });

  t.true(result.content[0].text.includes("Couldn't find any item matching 'iron_sword'"));
  t.true(closeStub.calledOnce);
});
