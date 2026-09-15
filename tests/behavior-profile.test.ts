import test from 'ava';
import type { Bot } from 'mineflayer';
import { behaviorProfile, requestProfileGameMode } from '../src/behavior-profile.js';
import type { ServerConfig } from '../src/config.js';
const base: ServerConfig = { host: 'localhost', port: 29567, username: 'Bot', auth: 'offline' };

test('default player profile requests survival but does not claim deop', t => {
  const p = behaviorProfile(base);
  t.is(p.mode, 'player');
  t.is(p.desiredGameMode, 'survival');
  t.is(p.permissionVerification, 'not-probed');
});
test('developer declares creative and external administrator requirement', t => {
  const p = behaviorProfile({ ...base, behaviorMode: 'developer' });
  t.is(p.desiredGameMode, 'creative');
  t.is(p.desiredPermission, 'op-or-administrator');
});
test('maid requires a safe explicit owner identity', t => {
  t.throws(() => behaviorProfile({ ...base, behaviorMode: 'maid' }), { message: /owner/ });
  t.throws(() => behaviorProfile({ ...base, owner: 'Owner\nop Bot' }), { message: /username/ });
  const p = behaviorProfile({ ...base, behaviorMode: 'maid', owner: 'Owner' });
  t.is(p.owner, 'Owner');
  t.is(p.desiredGameMode, 'creative');
  t.true(p.instructions.includes('其他玩家'));
});
for (const behaviorMode of ['developer', 'maid', 'player'] as const) {
  test(`${behaviorMode} sends self-only mode request and never OP command`, t => {
    const commands: string[] = [];
    const config = { ...base, behaviorMode, owner: 'Owner' };
    const desired = behaviorProfile(config).desiredGameMode;
    const bot = { game: { gameMode: 'adventure' }, chat: (s: string) => commands.push(s) } as unknown as Bot;
    requestProfileGameMode(bot, config);
    t.deepEqual(commands, [`/gamemode ${desired}`]);
    bot.game.gameMode = desired;
    requestProfileGameMode(bot, config);
    t.is(commands.length, 1);
  });
}
