import { z } from "zod";
import type { Bot } from "mineflayer";
import { ToolFactory } from "../tool-factory.js";

function entityName(entity: Record<string, unknown>): string {
  return String(entity.username ?? entity.displayName ?? entity.name ?? entity.type ?? entity.id ?? "unknown");
}

export function registerDiagnosticTools(factory: ToolFactory, getBot: () => Bot): void {
  factory.registerTool("get-player-state", "Read health, food, oxygen, experience, position, effects, held item, and game mode", {}, async () => {
    const bot = getBot();
    const effects = Object.values(bot.entity.effects ?? {}).map(effect => ({
      id: effect.id, amplifier: effect.amplifier, duration: effect.duration
    }));
    return factory.createResponse(JSON.stringify({
      username: bot.username,
      health: bot.health,
      food: bot.food,
      foodSaturation: bot.foodSaturation,
      oxygenLevel: bot.oxygenLevel,
      experience: bot.experience,
      gameMode: bot.game.gameMode,
      position: bot.entity.position,
      onGround: bot.entity.onGround,
      heldItem: bot.heldItem?.name ?? null,
      effects
    }, null, 2));
  });

  factory.registerTool("list-nearby-entities", "List nearby players, mobs, objects, and dropped items with ids and distances", {
    maxDistance: z.coerce.number().positive().optional(),
    type: z.string().optional()
  }, async ({ maxDistance = 32, type = "" }) => {
    const bot = getBot();
    const entities = Object.values(bot.entities)
      .filter(entity => entity !== bot.entity)
      .map(entity => ({ entity, distance: bot.entity.position.distanceTo(entity.position) }))
      .filter(({ entity, distance }) => distance <= maxDistance && (!type || entity.type === type || entity.name?.includes(type.toLowerCase())))
      .sort((a, b) => a.distance - b.distance);
    if (!entities.length) return factory.createResponse(`No matching entities within ${maxDistance} blocks`);
    return factory.createResponse(entities.map(({ entity, distance }) =>
      `- id=${entity.id} ${entityName(entity as unknown as Record<string, unknown>)} type=${entity.type} distance=${distance.toFixed(2)} position=${entity.position.floored()}`
    ).join("\n"));
  });

  factory.registerTool("interact-entity", "Attack, activate, or use the held item on a nearby entity selected by id or name", {
    entityId: z.number().int().optional(),
    name: z.string().optional(),
    action: z.enum(["attack", "activate", "use-on"]),
    maxDistance: z.coerce.number().positive().optional()
  }, async ({ entityId, name, action, maxDistance = 6 }) => {
    const bot = getBot();
    const entity = Object.values(bot.entities).find(candidate =>
      (entityId !== undefined ? candidate.id === entityId : entityName(candidate as unknown as Record<string, unknown>).toLowerCase().includes((name ?? "").toLowerCase()))
    );
    if (!entity) return factory.createResponse("No matching entity found");
    const distance = bot.entity.position.distanceTo(entity.position);
    if (distance > maxDistance) return factory.createResponse(`Entity is ${distance.toFixed(2)} blocks away, beyond limit ${maxDistance}`);
    await bot.lookAt(entity.position.offset(0, entity.height / 2, 0), true);
    if (action === "attack") bot.attack(entity);
    else if (action === "activate") await bot.activateEntity(entity);
    else bot.useOn(entity);
    return factory.createResponse(`${action} sent to entity id=${entity.id} ${entityName(entity as unknown as Record<string, unknown>)}`);
  });

  factory.registerTool("wait-ticks", "Wait for a precise number of Minecraft client ticks before the next test assertion", {
    ticks: z.number().int().min(1).max(1200)
  }, async ({ ticks }) => {
    await getBot().waitForTicks(ticks);
    return factory.createResponse(`Waited ${ticks} ticks`);
  });
}
