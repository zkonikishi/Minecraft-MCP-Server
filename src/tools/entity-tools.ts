import { z } from "zod";
import type { Bot } from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import { ToolFactory } from '../tool-factory.js';

const { goals } = pathfinderPkg;
type Entity = ReturnType<Bot['nearestEntity']>;

function inventoryItemCount(bot: Bot): number {
  return bot.inventory.items().reduce((total, item) => total + item.count, 0);
}

export function registerEntityTools(factory: ToolFactory, getBot: () => Bot): void {
  factory.registerTool(
    "find-entity",
    "Find the nearest entity of a specific type",
    {
      type: z.string().optional().describe("Type of entity to find (empty for any entity)"),
      maxDistance: z.coerce.number().finite().optional().describe("Maximum search distance (default: 16)")
    },
    async ({ type = '', maxDistance = 16 }) => {
      const bot = getBot();
      const entityFilter = (entity: NonNullable<Entity>) => {
        if (!type) return true;
        if (type === 'player') return entity.type === 'player';
        if (type === 'mob') return entity.type === 'mob';
        return Boolean(entity.name && entity.name.includes(type.toLowerCase()));
      };

      const entity = bot.nearestEntity(entityFilter);

      if (!entity || bot.entity.position.distanceTo(entity.position) > maxDistance) {
        return factory.createResponse(`No ${type || 'entity'} found within ${maxDistance} blocks`);
      }

      const entityName = entity.name || (entity as { username?: string }).username || entity.type;
      return factory.createResponse(`Found ${entityName} at position (${Math.floor(entity.position.x)}, ${Math.floor(entity.position.y)}, ${Math.floor(entity.position.z)})`);
    }
  );

  factory.registerTool(
    "pickup-nearest-item",
    "Move to the nearest dropped item entity and wait for pickup",
    {
      maxDistance: z.coerce.number().finite().positive().optional().describe("Maximum search distance (default: 16)"),
      range: z.coerce.number().finite().positive().optional().describe("How close to move to the item (default: 1)"),
      waitMs: z.number().int().min(0).optional().describe("Milliseconds to wait after reaching the item (default: 1500)"),
      timeoutMs: z.number().int().min(50).optional().describe("Timeout in milliseconds before cancelling movement (default: 10000)")
    },
    async ({ maxDistance = 16, range = 1, waitMs = 1500, timeoutMs = 10000 }) => {
      const bot = getBot();
      const droppedItem = bot.nearestEntity((entity: NonNullable<Entity>) =>
        entity.name === 'item' || entity.type === 'object'
      );

      if (!droppedItem || bot.entity.position.distanceTo(droppedItem.position) > maxDistance) {
        return factory.createResponse(`No dropped item found within ${maxDistance} blocks`);
      }

      const beforeCount = inventoryItemCount(bot);
      const x = droppedItem.position.x;
      const y = droppedItem.position.y;
      const z = droppedItem.position.z;
      const goal = new goals.GoalNear(x, y, z, range);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Pickup movement timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      const gotoPromise = bot.pathfinder.goto(goal);

      try {
        await Promise.race([gotoPromise, timeoutPromise]);
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      } catch (error) {
        if (timedOut) {
          bot.pathfinder.stop();
          gotoPromise.catch(() => {});
          throw new Error(`Pickup movement timed out after ${timeoutMs}ms`);
        }
        throw error;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      const afterCount = inventoryItemCount(bot);
      const itemName = droppedItem.name || droppedItem.type || 'item';
      const positionText = `(${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)})`;
      if (afterCount > beforeCount) {
        return factory.createResponse(`Picked up ${afterCount - beforeCount} item(s) near ${positionText}`);
      }
      return factory.createResponse(`Reached dropped ${itemName} near ${positionText}; inventory count did not increase`);
    }
  );
}
