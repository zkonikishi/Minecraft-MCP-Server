import test from 'ava';
import { EventEmitter } from 'node:events';
import type { Bot } from 'mineflayer';
import type { ToolFactory } from '../src/tool-factory.js';
import { registerBehaviorTools } from '../src/tools/behavior-tools.js';

test('maid follow binds only owner and stops on disappearance or explicit stop', async t => {
  const calls: unknown[] = [];
  const entity = { position: { x: 1, y: 64, z: 1 } };
  const emitter = new EventEmitter();
  const bot = Object.assign(emitter, { players: { Owner: { entity } }, pathfinder: { setGoal: (goal: unknown) => calls.push(goal) } }) as unknown as Bot;
  const handlers = new Map<string, Parameters<ToolFactory['registerTool']>[3]>();
  const factory = { registerTool: (name: string, _desc: string, _schema: unknown, fn: Parameters<ToolFactory['registerTool']>[3]) => handlers.set(name, fn), createResponse: (text: string) => ({ content: [{ type: 'text', text }] }) } as unknown as ToolFactory;
  registerBehaviorTools(factory, () => bot, { host: 'localhost', port: 29567, username: 'Bot', auth: 'offline', behaviorMode: 'maid', owner: 'Owner' });
  const follow = handlers.get('maid-follow-owner')!;
  await follow({ enabled: true, distance: 2 });
  t.is(emitter.listenerCount('entityGone'), 1);
  await follow({ enabled: true, distance: 2 });
  t.is(emitter.listenerCount('entityGone'), 1);
  emitter.emit('entityGone', entity);
  t.is(calls.at(-1), null);
  t.is(emitter.listenerCount('entityGone'), 0);
  await follow({ enabled: false });
  t.is(calls.at(-1), null);
  delete bot.players.Owner;
  await t.throwsAsync(follow({ enabled: true, distance: 2 }), { message: /not visible/ });
});
