import { z } from 'zod';
import type { Bot } from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import type { ServerConfig } from '../config.js';
import { behaviorProfile, requestProfileGameMode } from '../behavior-profile.js';
import type { ToolFactory } from '../tool-factory.js';

export function registerBehaviorTools(factory: ToolFactory, getBot: () => Bot, config: ServerConfig): void {
  const followCleanup = new WeakMap<Bot, () => void>();
  factory.registerTool('get-behavior-profile', 'Read AI role, owner, desired and observed game mode; permissions are NOT verified', {}, async () => {
    return factory.createResponse(JSON.stringify({ ...behaviorProfile(config), actualGameMode: getBot().game?.gameMode ?? null }));
  });
  factory.registerTool('apply-behavior-defaults', 'Request role game mode again after an administrator grants permission; does not grant OP', {}, async () => {
    requestProfileGameMode(getBot(), config);
    return factory.createResponse('Game mode requested if needed; use get-behavior-profile to verify. OP/admin must be granted by server console or permission manager.');
  });
  factory.registerTool('maid-follow-owner', 'Start or stop following the bound owner; no automatic chat command execution', {
    enabled: z.boolean(), distance: z.number().min(1).max(10).default(2)
  }, async ({ enabled, distance }) => {
    const profile = behaviorProfile(config);
    if (profile.mode !== 'maid' || !profile.owner) throw new Error('Requires maid mode and bound owner');
    const bot = getBot();
    followCleanup.get(bot)?.();
    if (!enabled) {
      bot.pathfinder.setGoal(null);
      return factory.createResponse('Owner following stopped');
    }
    const entity = bot.players[profile.owner]?.entity;
    if (!entity) throw new Error('Owner is not visible in the loaded world');
    const cleanup = () => {
      bot.removeListener('entityGone', onGone);
      bot.removeListener('end', cleanup);
      followCleanup.delete(bot);
    };
    const onGone = (gone: typeof entity) => {
      if (gone !== entity) return;
      bot.pathfinder.setGoal(null);
      cleanup();
    };
    bot.on('entityGone', onGone);
    bot.once('end', cleanup);
    followCleanup.set(bot, cleanup);
    // No digging/building merely to keep up with the owner.
    bot.pathfinder.setGoal(new pathfinderPkg.goals.GoalFollow(entity, distance), true);
    return factory.createResponse('Following bound owner; use enabled=false to stop. Other movement tools may replace this goal.');
  });
}
