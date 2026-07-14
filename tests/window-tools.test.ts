import test from 'ava';
import sinon from 'sinon';
import { Vec3 } from 'vec3';
import { registerWindowTools } from '../src/tools/window-tools.js';
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

test('registerWindowTools registers all window tools', (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {} as Partial<mineflayer.Bot>;
  const getBot = () => mockBot as mineflayer.Bot;

  registerWindowTools(factory, getBot);

  const toolNames = (mockServer.tool as sinon.SinonStub).getCalls().map(call => call.args[0]);

  t.true(toolNames.includes('open-block-window'));
  t.true(toolNames.includes('list-current-window'));
  t.true(toolNames.includes('inspect-window-slot'));
  t.true(toolNames.includes('click-window-slot'));
  t.true(toolNames.includes('close-current-window'));
  t.true(toolNames.includes('move-window-slot'));
  t.true(toolNames.includes('quick-move-window-slot'));
});

test('inspect-window-slot returns plugin GUI item metadata', async (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {
    currentWindow: {
      id: 16,
      type: 'custom',
      title: 'Reinforcement',
      slots: [{ name: 'paper', displayName: '强化 0 → 1', count: 1, slot: 0, type: 1, metadata: 0, stackSize: 64, lore: ['成功率: 100%'] }]
    }
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  const result = await toolExecutor(mockServer, 'inspect-window-slot')({ slot: 0 });
  t.true(result.content[0].text.includes('强化 0 → 1'));
  t.true(result.content[0].text.includes('成功率: 100%'));
});

test('move-window-slot moves a stack between GUI slots', async (t) => {
  const { mockServer, factory } = createFactory();
  const moveSlotItem = sinon.stub().resolves();
  const window = { id: 11, type: 'custom', slots: [{ name: 'iron_sword', count: 1 }, null] };
  const mockBot = { currentWindow: window, moveSlotItem } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  const result = await toolExecutor(mockServer, 'move-window-slot')({ sourceSlot: 0, destinationSlot: 1 });
  t.true(moveSlotItem.calledOnceWith(0, 1));
  t.true(result.content[0].text.includes('Moved slot 0 to 1'));
});

test('quick-move-window-slot shift-clicks a GUI slot', async (t) => {
  const { mockServer, factory } = createFactory();
  const clickWindow = sinon.stub().resolves();
  const window = { id: 12, type: 'custom', slots: [{ name: 'paper', count: 1 }] };
  const mockBot = { currentWindow: window, clickWindow } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  await toolExecutor(mockServer, 'quick-move-window-slot')({ slot: 0 });
  t.true(clickWindow.calledOnceWith(0, 0, 1));
});

test('open-block-window opens block and reports window slots', async (t) => {
  const { mockServer, factory } = createFactory();
  const block = { name: 'barrel', position: new Vec3(1, 64, 1) };
  const window = {
    id: 7,
    type: 'minecraft:generic_9x3',
    title: 'Barrel',
    slots: [
      { name: 'iron_sword', count: 1 },
      null
    ]
  };
  const openBlockStub = sinon.stub().resolves(window);
  const mockBot = {
    entity: mockEntity(),
    blockAt: sinon.stub().returns(block),
    openBlock: openBlockStub
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerWindowTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'open-block-window');
  const result = await executor({ x: 1, y: 64, z: 1 });

  t.true(openBlockStub.calledOnce);
  t.true(result.content[0].text.includes('Opened barrel'));
  t.true(result.content[0].text.includes('iron_sword x1'));
});

test('list-current-window reports no window', async (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {
    currentWindow: null
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerWindowTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'list-current-window');
  const result = await executor({});

  t.true(result.content[0].text.includes('No window is currently open'));
});

test('list-current-window lists current window including empty slots', async (t) => {
  const { mockServer, factory } = createFactory();
  const mockBot = {
    currentWindow: {
      id: 8,
      type: 'minecraft:anvil',
      title: 'Repair & Name',
      slots: [
        null,
        { name: 'iron_sword', count: 1 }
      ]
    }
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerWindowTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'list-current-window');
  const result = await executor({ includeEmpty: true });

  t.true(result.content[0].text.includes('slot 0: empty'));
  t.true(result.content[0].text.includes('slot 1: iron_sword x1'));
});

test('click-window-slot clicks selected slot', async (t) => {
  const { mockServer, factory } = createFactory();
  const clickWindowStub = sinon.stub().resolves();
  const rightMouse = sinon.stub().resolves();
  const mockBot = {
    currentWindow: {
      id: 9,
      type: 'minecraft:generic_9x3',
      title: 'Barrel',
      slots: [
        { name: 'iron_sword', count: 1 }
      ]
    },
    clickWindow: clickWindowStub,
    simpleClick: { leftMouse: sinon.stub().resolves(), rightMouse },
    waitForTicks: sinon.stub().resolves()
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerWindowTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'click-window-slot');
  const result = await executor({ slot: 0, mouseButton: 1, mode: 0 });

  t.true(rightMouse.calledOnceWith(0));
  t.false(clickWindowStub.called);
  t.true(result.content[0].text.includes('Clicked slot 0'));
});

test('click-window-slot clears Mineflayer predicted cursor when Paper restores a cancelled GUI click', async (t) => {
  const { mockServer, factory } = createFactory();
  const icon = { name: 'enchanted_book', count: 1, metadata: 0 };
  const window = { id: 14, type: 'custom', title: 'Plugin GUI', slots: [icon], selectedItem: null as typeof icon | null };
  const leftMouse = sinon.stub().callsFake(async () => { window.selectedItem = icon; });
  const mockBot = {
    currentWindow: window,
    clickWindow: sinon.stub().resolves(),
    simpleClick: { leftMouse, rightMouse: sinon.stub().resolves() },
    waitForTicks: sinon.stub().resolves()
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  const result = await toolExecutor(mockServer, 'click-window-slot')({ slot: 0, mouseButton: 0, mode: 0 });
  t.is(window.selectedItem, null);
  t.true(result.content[0].text.includes('cursor empty'));
});

test('click-window-slot waits for a delayed Paper GUI slot restoration', async (t) => {
  const { mockServer, factory } = createFactory();
  const icon = { name: 'lime_dye', count: 1, metadata: 0 };
  const window = { id: 16, type: 'custom', title: 'Plugin GUI', slots: [icon as typeof icon | null], selectedItem: null as typeof icon | null };
  const leftMouse = sinon.stub().callsFake(async () => { window.slots[0] = null; window.selectedItem = icon; });
  const waitForTicks = sinon.stub().callsFake(async () => {
    if (waitForTicks.callCount === 3) window.slots[0] = icon;
  });
  const mockBot = {
    currentWindow: window,
    clickWindow: sinon.stub().resolves(),
    simpleClick: { leftMouse, rightMouse: sinon.stub().resolves() },
    waitForTicks
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  const result = await toolExecutor(mockServer, 'click-window-slot')({ slot: 0, mouseButton: 0, mode: 0 });
  t.is(waitForTicks.callCount, 3);
  t.is(window.selectedItem, null);
  t.true(result.content[0].text.includes('cursor empty'));
});

test('click-window-slot preserves cursor for a real item pickup', async (t) => {
  const { mockServer, factory } = createFactory();
  const item = { name: 'iron_sword', count: 1, metadata: 0 };
  const window = { id: 15, type: 'custom', title: 'Container', slots: [item as typeof item | null], selectedItem: null as typeof item | null };
  const leftMouse = sinon.stub().callsFake(async () => { window.slots[0] = null; window.selectedItem = item; });
  const mockBot = {
    currentWindow: window,
    clickWindow: sinon.stub().resolves(),
    simpleClick: { leftMouse, rightMouse: sinon.stub().resolves() },
    waitForTicks: sinon.stub().resolves()
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  await toolExecutor(mockServer, 'click-window-slot')({ slot: 0, mouseButton: 0, mode: 0 });
  t.is(window.selectedItem, item);
});

test('click-window-slot reports success when the server closes the GUI during the click', async (t) => {
  const { mockServer, factory } = createFactory();
  const window = { id: 17, type: 'custom', title: 'Commit GUI', slots: [{ name: 'lime_dye', count: 1 }], selectedItem: null };
  const mockBot = {
    currentWindow: window as typeof window | null,
    clickWindow: sinon.stub().resolves(),
    simpleClick: {
      leftMouse: sinon.stub().callsFake(async () => { mockBot.currentWindow = null; }),
      rightMouse: sinon.stub().resolves()
    },
    waitForTicks: sinon.stub().resolves()
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);

  const result = await toolExecutor(mockServer, 'click-window-slot')({ slot: 0, mouseButton: 0, mode: 0 });

  t.true(result.content[0].text.includes('window closed by server'));
});

test('click-window-slot preserves raw Mineflayer modes for advanced clicks', async (t) => {
  const { mockServer, factory } = createFactory();
  const clickWindow = sinon.stub().resolves();
  const mockBot = {
    currentWindow: { id: 13, type: 'custom', title: 'Test', slots: [{ name: 'paper', count: 1 }] },
    clickWindow,
    simpleClick: { leftMouse: sinon.stub().resolves(), rightMouse: sinon.stub().resolves() }
  } as unknown as mineflayer.Bot;
  registerWindowTools(factory, () => mockBot);
  await toolExecutor(mockServer, 'click-window-slot')({ slot: 0, mouseButton: 0, mode: 1 });
  t.true(clickWindow.calledOnceWith(0, 0, 1));
});

test('close-current-window closes open window', async (t) => {
  const { mockServer, factory } = createFactory();
  const window = {
    id: 10,
    type: 'minecraft:grindstone',
    slots: []
  };
  const closeWindowStub = sinon.stub();
  const mockBot = {
    currentWindow: window,
    closeWindow: closeWindowStub
  } as unknown as mineflayer.Bot;
  const getBot = () => mockBot;

  registerWindowTools(factory, getBot);

  const executor = toolExecutor(mockServer, 'close-current-window');
  const result = await executor({});

  t.true(closeWindowStub.calledOnceWith(window));
  t.true(result.content[0].text.includes('Closed window id=10'));
});
