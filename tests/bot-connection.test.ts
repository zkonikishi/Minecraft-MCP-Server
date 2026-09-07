import test from 'ava';
import sinon from 'sinon';
import { EventEmitter } from 'node:events';
import type mineflayer from 'mineflayer';
import { BotConnection, getVersionSpecificPlugins } from '../src/bot-connection.js';

function fakeBot(): mineflayer.Bot {
  const emitter = new EventEmitter() as unknown as mineflayer.Bot;
  Object.assign(emitter, { username: 'TestBot', quit: sinon.stub() });
  return emitter;
}

test('26.2 disables only the incompatible team plugin', (t) => {
  const plugins26 = getVersionSpecificPlugins('26.2');
  const pluginsOld = getVersionSpecificPlugins('1.21.11');

  t.is(plugins26.team, false);
  t.truthy(plugins26.pathfinder);
  t.false(Object.prototype.hasOwnProperty.call(pluginsOld, 'team'));
  t.truthy(pluginsOld.pathfinder);
});

test('constructor initializes with correct state', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  t.is(connection.getState(), 'disconnected');
  t.deepEqual(connection.getConfig(), config);
  t.is(connection.getBot(), null);
  t.false(connection.isConnected());
});

test('constructor accepts custom reconnect delay', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const customDelay = 5000;
  const connection = new BotConnection(config, callbacks, customDelay);

  t.is(connection.getState(), 'disconnected');
});

test('getState returns current state', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  t.is(connection.getState(), 'disconnected');
});

test('getConfig returns configuration', (t) => {
  const config = { host: 'example.com', port: 30000, username: 'MyBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  const returnedConfig = connection.getConfig();
  t.is(returnedConfig.host, 'example.com');
  t.is(returnedConfig.port, 30000);
  t.is(returnedConfig.username, 'MyBot');
});

test('getBot returns null initially', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  t.is(connection.getBot(), null);
});

test('isConnected returns false when state is disconnected', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  t.false(connection.isConnected());
});

test('formatError handles Error objects', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  const error = new Error('Test error');
  const formatted = (connection as unknown as { formatError: (error: unknown) => string }).formatError(error);

  t.is(formatted, 'Test error');
});

test('formatError handles plain objects', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  const errorObj = { code: 'ECONNREFUSED', message: 'Connection refused' };
  const formatted = (connection as unknown as { formatError: (error: unknown) => string }).formatError(errorObj);

  t.true(formatted.includes('ECONNREFUSED'));
  t.true(formatted.includes('Connection refused'));
});

test('formatError handles strings', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  const formatted = (connection as unknown as { formatError: (error: unknown) => string }).formatError('Simple error');

  t.is(formatted, '"Simple error"');
});

test('formatError handles non-serializable objects', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  const formatted = (connection as unknown as { formatError: (error: unknown) => string }).formatError(circular);

  t.is(typeof formatted, 'string');
});

test('checkConnectionAndReconnect returns connected when already connected', async (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);
  
  (connection as unknown as { state: string }).state = 'connected';

  const result = await connection.checkConnectionAndReconnect();

  t.true(result.connected);
  t.is(result.message, undefined);
});

test('checkConnectionAndReconnect returns message when connecting', async (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  (connection as unknown as { state: string }).state = 'connecting';

  const result = await connection.checkConnectionAndReconnect();

  t.false(result.connected);
  t.true(result.message!.includes('connecting'));
});

test('checkConnectionAndReconnect includes setup instructions on failure', async (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks, 100);

  (connection as unknown as { state: string }).state = 'disconnected';

  // Stub attemptReconnect to prevent actual connection attempt
  const attemptReconnectStub = sinon.stub(connection as unknown as { attemptReconnect: () => void }, 'attemptReconnect').callsFake(() => {
    (connection as unknown as { state: string }).state = 'connecting';
  });

  const result = await connection.checkConnectionAndReconnect();

  t.true(attemptReconnectStub.calledOnce);
  t.false(result.connected);
  t.true(result.message!.includes('Cannot connect'));
  t.true(result.message!.includes('localhost:25565'));
  t.true(result.message!.includes('github.com'));

  attemptReconnectStub.restore();
});

test('cleanup clears reconnect timer', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  (connection as unknown as { reconnectTimer: ReturnType<typeof setTimeout> }).reconnectTimer = setTimeout(() => {}, 10000);

  t.notThrows(() => {
    connection.cleanup();
  });
});

test('cleanup does not throw when no bot exists', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);

  t.notThrows(() => {
    connection.cleanup();
  });
});

test('message stream captures plugin and command replies without chat-only listener', (t) => {
  const config = { host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' as const };
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection(config, callbacks);
  const emitter = new EventEmitter() as unknown as mineflayer.Bot;
  Object.assign(emitter, { username: 'TestBot' });

  (connection as unknown as { registerEventHandlers: (bot: mineflayer.Bot) => void }).registerEventHandlers(emitter);
  const events = emitter as unknown as EventEmitter;
  events.emit('messagestr', 'MythicReforge 0.1.0 | effective-safe-mode=true', 'system');
  events.emit('messagestr', '[ 23°C ]', 'game_info');
  events.emit('messagestr', '   ', 'system');

  t.true(callbacks.onChatMessage.calledOnceWith(
    'system',
    'MythicReforge 0.1.0 | effective-safe-mode=true'
  ));
  t.is(emitter.listenerCount('chat'), 0);
});

test('connecting bot end restores disconnected state and permits reconnect', async (t) => {
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection({ host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' }, callbacks);
  const bot = fakeBot();
  (connection as unknown as { bot: mineflayer.Bot; state: string }).bot = bot;
  (connection as unknown as { bot: mineflayer.Bot; state: string }).state = 'connecting';
  (connection as unknown as { registerEventHandlers: (bot: mineflayer.Bot) => void }).registerEventHandlers(bot);

  bot.emit('end', 'socketClosed');
  t.is(connection.getState(), 'disconnected');
  t.is(connection.getBot(), null);

  const reconnect = sinon.stub(connection, 'attemptReconnect').callsFake(() => {
    (connection as unknown as { state: string }).state = 'connected';
  });
  await connection.checkConnectionAndReconnect();
  t.true(reconnect.calledOnce);
  reconnect.restore();
});

test('stale bot end cannot disconnect a replacement bot', (t) => {
  const callbacks = { onLog: sinon.stub(), onChatMessage: sinon.stub() };
  const connection = new BotConnection({ host: 'localhost', port: 25565, username: 'TestBot', auth: 'offline' }, callbacks);
  const staleBot = fakeBot();
  const currentBot = fakeBot();
  (connection as unknown as { registerEventHandlers: (bot: mineflayer.Bot) => void }).registerEventHandlers(staleBot);
  (connection as unknown as { bot: mineflayer.Bot; state: string }).bot = currentBot;
  (connection as unknown as { bot: mineflayer.Bot; state: string }).state = 'connected';

  staleBot.emit('end', 'replaced');
  t.is(connection.getState(), 'connected');
  t.is(connection.getBot(), currentBot);
});
