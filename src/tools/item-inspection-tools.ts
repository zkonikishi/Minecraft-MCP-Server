import { z } from "zod";
import type { Bot } from "mineflayer";
import type { Item } from "prismarine-item";
import { ToolFactory } from "../tool-factory.js";

function itemDetails(item: Item): string {
  const value = item as Item & Record<string, unknown>;
  const payload = {
    name: item.name,
    displayName: item.displayName,
    count: item.count,
    slot: item.slot,
    type: item.type,
    metadata: item.metadata,
    stackSize: item.stackSize,
    durabilityUsed: value.durabilityUsed,
    customName: value.customName,
    lore: value.lore,
    enchants: value.enchants,
    components: value.components,
    nbt: value.nbt
  };
  return JSON.stringify(payload, (_key, current) => typeof current === "bigint" ? current.toString() : current, 2);
}

export function registerItemInspectionTools(factory: ToolFactory, getBot: () => Bot): void {
  factory.registerTool("inspect-item", "Inspect an inventory item including display name, lore, NBT, components, enchantments, and durability", {
    slot: z.number().int().min(0).optional().describe("Inventory/window slot index"),
    itemName: z.string().optional().describe("Item name substring when slot is omitted")
  }, async ({ slot, itemName }) => {
    const bot = getBot();
    const item = slot === undefined
      ? bot.inventory.items().find(candidate => !itemName || candidate.name.includes(itemName.toLowerCase()))
      : bot.inventory.slots[slot];
    if (!item) return factory.createResponse("No matching item found");
    return factory.createResponse(itemDetails(item));
  });

  factory.registerTool("inspect-held-item", "Inspect the complete metadata of the main-hand item", {}, async () => {
    const item = getBot().heldItem;
    return factory.createResponse(item ? itemDetails(item) : "No item is currently held");
  });

  factory.registerTool("use-held-item", "Use or release the held item in the main hand or offhand", {
    offhand: z.boolean().optional(),
    durationTicks: z.number().int().min(0).optional().describe("Ticks before releasing; 0 performs a single activation")
  }, async ({ offhand = false, durationTicks = 0 }) => {
    const bot = getBot();
    bot.activateItem(offhand);
    if (durationTicks > 0) {
      await bot.waitForTicks(durationTicks);
      bot.deactivateItem();
    }
    return factory.createResponse(`Used ${offhand ? "offhand" : "main-hand"} item${durationTicks > 0 ? ` for ${durationTicks} ticks` : ""}`);
  });
}
