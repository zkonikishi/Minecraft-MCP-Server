import { z } from "zod";
import mineflayer from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';

interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export function registerInventoryTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "list-inventory",
    "List all items in the bot's inventory",
    {},
    async () => {
      const bot = getBot();
      const items = bot.inventory.items();
      const itemList: InventoryItem[] = items.map((item) => ({
        name: item.name,
        count: item.count,
        slot: item.slot
      }));

      if (items.length === 0) {
        return factory.createResponse("Inventory is empty");
      }

      let inventoryText = `Found ${items.length} items in inventory:\n\n`;
      itemList.forEach(item => {
        inventoryText += `- ${item.name} (x${item.count}) in slot ${item.slot}\n`;
      });

      return factory.createResponse(inventoryText);
    }
  );

  factory.registerTool(
    "find-item",
    "Find a specific item in the bot's inventory",
    {
      nameOrType: z.string().describe("Name or type of item to find")
    },
    async ({ nameOrType }) => {
      const bot = getBot();
      const items = bot.inventory.items();
      const item = items.find((item) =>
        item.name.includes(nameOrType.toLowerCase())
      );

      if (item) {
        return factory.createResponse(`Found ${item.count} ${item.name} in inventory (slot ${item.slot})`);
      } else {
        return factory.createResponse(`Couldn't find any item matching '${nameOrType}' in inventory`);
      }
    }
  );

  factory.registerTool(
    "equip-item",
    "Equip a specific item",
    {
      itemName: z.string().describe("Name of the item to equip"),
      destination: z.string().optional().describe("Where to equip the item (default: 'hand')")
    },
    async ({ itemName, destination = 'hand' }) => {
      const bot = getBot();
      const items = bot.inventory.items();
      const item = items.find((item) =>
        item.name.includes(itemName.toLowerCase())
      );

      if (!item) {
        return factory.createResponse(`Couldn't find any item matching '${itemName}' in inventory`);
      }

      await bot.equip(item, destination as mineflayer.EquipmentDestination);
      return factory.createResponse(`Equipped ${item.name} to ${destination}`);
    }
  );

  factory.registerTool(
    "set-quickbar-slot",
    "Switch the selected hotbar slot",
    {
      slot: z.number().int().min(0).max(8).describe("Hotbar slot index to select, from 0 to 8")
    },
    async ({ slot }) => {
      const bot = getBot();
      bot.setQuickBarSlot(slot);
      return factory.createResponse(`Selected hotbar slot ${slot}`);
    }
  );

  factory.registerTool(
    "drop-item",
    "Drop an item from the bot's inventory by name",
    {
      itemName: z.string().describe("Name of the item to drop"),
      count: z.number().int().positive().optional().describe("Number of items to drop; defaults to the whole stack")
    },
    async ({ itemName, count }) => {
      const bot = getBot();
      const items = bot.inventory.items();
      const item = items.find((item) =>
        item.name.includes(itemName.toLowerCase())
      );

      if (!item) {
        return factory.createResponse(`Couldn't find any item matching '${itemName}' in inventory`);
      }

      const dropCount = count ?? item.count;
      if (dropCount > item.count) {
        return factory.createResponse(`Cannot drop ${dropCount} ${item.name}; only ${item.count} available`);
      }

      if (dropCount === item.count) {
        await bot.tossStack(item);
      } else {
        await bot.toss(item.type, null, dropCount);
      }
      return factory.createResponse(`Dropped ${dropCount} ${item.name}`);
    }
  );

  factory.registerTool(
    "drop-selected-item",
    "Drop the item currently held in the bot's main hand",
    {
      count: z.number().int().positive().optional().describe("Number of held items to drop; defaults to the whole stack")
    },
    async ({ count }) => {
      const bot = getBot();
      const item = bot.heldItem;

      if (!item) {
        return factory.createResponse("No item is currently held");
      }

      const dropCount = count ?? item.count;
      if (dropCount > item.count) {
        return factory.createResponse(`Cannot drop ${dropCount} ${item.name}; only ${item.count} held`);
      }

      if (dropCount === item.count) {
        await bot.tossStack(item);
      } else {
        await bot.toss(item.type, null, dropCount);
      }
      return factory.createResponse(`Dropped ${dropCount} held ${item.name}`);
    }
  );
}
