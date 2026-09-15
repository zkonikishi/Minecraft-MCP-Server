import { z } from 'zod';
import type { Bot } from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { renderBlockView } from '../visual/block-view.js';

export function registerVisualTools(factory: ToolFactory, getBot: () => Bot): void {
  let busy = false;
  factory.registerTool('get-bot-view',
    'Return an experimental first-person PNG of loaded block collision geometry, not a textured client screenshot. No entities, GUI or custom models. Does not move the bot.',
    { width: z.union([z.literal(160), z.literal(320), z.literal(480)]).default(320),
      distance: z.number().int().min(4).max(48).default(24), fov: z.number().min(30).max(100).default(70) },
    async ({ width, distance, fov }) => {
      if (busy) throw new Error('Another visual capture is in progress');
      const bot = getBot();
      if (!bot?.entity?.position || bot._client.state !== 'play') throw new Error('Bot is not ready for visual capture');
      busy = true;
      try {
        const p = bot.entity.position;
        const result = await renderBlockView({
          origin: { x: p.x, y: p.y + (bot.entity.height ?? 1.8) * 0.9, z: p.z },
          yaw: bot.entity.yaw, pitch: bot.entity.pitch,
          blockAt: position => bot.blockAt(position, false),
          isCurrent: () => getBot() === bot && bot._client.state === 'play'
        }, { width, distance, fov });
        return factory.createImageResponse(result.png, JSON.stringify({
          ...result.metadata,
          clientVersion: bot.version,
          dataSpace: 'Decoded client-protocol world; Via translation may substitute backend blocks/items.'
        }));
      } finally { busy = false; }
    });
}
