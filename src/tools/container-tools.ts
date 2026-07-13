import { z } from "zod";
import mineflayer from 'mineflayer';
import type { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { ToolFactory } from '../tool-factory.js';
import { coerceCoordinates } from './coordinate-utils.js';

type ContainerWindow = mineflayer.Chest & {
  containerItems: () => Item[];
};

type ContainerBot = mineflayer.Bot & {
  openChest?: (
    block: ReturnType<mineflayer.Bot["blockAt"]>,
    direction?: Vec3,
    cursorPos?: Vec3
  ) => Promise<ContainerWindow>;
};

function shouldUseChestApi(blockName: string): boolean {
  return blockName.includes("chest")
    || blockName.includes("barrel")
    || blockName.includes("shulker_box");
}

function clickDirectionFromBot(bot: mineflayer.Bot, blockPosition: Vec3): Vec3 {
  const botPosition = bot.entity.position;
  const dx = botPosition.x - (blockPosition.x + 0.5);
  const dy = (botPosition.y + bot.entity.height * 0.75) - (blockPosition.y + 0.5);
  const dz = botPosition.z - (blockPosition.z + 0.5);

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const az = Math.abs(dz);

  if (ay >= ax && ay >= az) return new Vec3(0, Math.sign(dy) || 1, 0);
  if (ax >= az) return new Vec3(Math.sign(dx) || 1, 0, 0);
  return new Vec3(0, 0, Math.sign(dz) || 1);
}

function findItem(items: Item[], itemName: string): Item | undefined {
  const normalized = itemName.toLowerCase();
  return items.find((item) => item.name.includes(normalized));
}

function formatItems(items: Item[]): string {
  if (items.length === 0) return "Container is empty";

  let text = `Found ${items.length} item stack(s) in container:\n\n`;
  for (const item of items) {
    text += `- ${item.name} (x${item.count}) in slot ${item.slot}\n`;
  }
  return text;
}

async function openContainerAt(bot: mineflayer.Bot, x: number, y: number, z: number): Promise<ContainerWindow | null> {
  const block = bot.blockAt(new Vec3(x, y, z));
  if (!block) return null;

  const containerBot = bot as ContainerBot;
  const direction = clickDirectionFromBot(bot, block.position);
  const cursorPos = new Vec3(0.5, 0.5, 0.5);
  if (shouldUseChestApi(block.name) && typeof containerBot.openChest === "function") {
    return await containerBot.openChest(block, direction, cursorPos) as ContainerWindow;
  }

  return await bot.openContainer(block, direction, cursorPos) as ContainerWindow;
}

export function registerContainerTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "list-container",
    "List items in a container block at a position",
    {
      x: z.coerce.number().describe("X coordinate"),
      y: z.coerce.number().describe("Y coordinate"),
      z: z.coerce.number().describe("Z coordinate")
    },
    async ({ x, y, z }) => {
      ({ x, y, z } = coerceCoordinates(x, y, z));

      const bot = getBot();
      const container = await openContainerAt(bot, x, y, z);
      if (!container) {
        return factory.createResponse(`No container block found at (${x}, ${y}, ${z})`);
      }

      try {
        return factory.createResponse(formatItems(container.containerItems()));
      } finally {
        container.close();
      }
    }
  );

  factory.registerTool(
    "deposit-to-container",
    "Deposit an item from the bot inventory into a container block",
    {
      x: z.coerce.number().describe("X coordinate"),
      y: z.coerce.number().describe("Y coordinate"),
      z: z.coerce.number().describe("Z coordinate"),
      itemName: z.string().trim().min(1).describe("Name of the inventory item to deposit"),
      count: z.number().int().positive().optional().describe("Amount to deposit; defaults to the whole stack")
    },
    async ({ x, y, z, itemName, count }) => {
      ({ x, y, z } = coerceCoordinates(x, y, z));

      const bot = getBot();
      const item = findItem(bot.inventory.items(), itemName);
      if (!item) {
        return factory.createResponse(`Couldn't find any item matching '${itemName}' in inventory`);
      }

      const depositCount = count ?? item.count;
      if (depositCount > item.count) {
        return factory.createResponse(`Cannot deposit ${depositCount} ${item.name}; only ${item.count} available`);
      }

      const container = await openContainerAt(bot, x, y, z);
      if (!container) {
        return factory.createResponse(`No container block found at (${x}, ${y}, ${z})`);
      }

      try {
        await container.deposit(item.type, item.metadata ?? null, depositCount);
        return factory.createResponse(`Deposited ${depositCount} ${item.name} into container at (${x}, ${y}, ${z})`);
      } finally {
        container.close();
      }
    }
  );

  factory.registerTool(
    "withdraw-from-container",
    "Withdraw an item from a container block into the bot inventory",
    {
      x: z.coerce.number().describe("X coordinate"),
      y: z.coerce.number().describe("Y coordinate"),
      z: z.coerce.number().describe("Z coordinate"),
      itemName: z.string().trim().min(1).describe("Name of the container item to withdraw"),
      count: z.number().int().positive().optional().describe("Amount to withdraw; defaults to the whole stack")
    },
    async ({ x, y, z, itemName, count }) => {
      ({ x, y, z } = coerceCoordinates(x, y, z));

      const bot = getBot();
      const container = await openContainerAt(bot, x, y, z);
      if (!container) {
        return factory.createResponse(`No container block found at (${x}, ${y}, ${z})`);
      }

      try {
        const item = findItem(container.containerItems(), itemName);
        if (!item) {
          return factory.createResponse(`Couldn't find any item matching '${itemName}' in container`);
        }

        const withdrawCount = count ?? item.count;
        if (withdrawCount > item.count) {
          return factory.createResponse(`Cannot withdraw ${withdrawCount} ${item.name}; only ${item.count} available`);
        }

        await container.withdraw(item.type, item.metadata ?? null, withdrawCount);
        return factory.createResponse(`Withdrew ${withdrawCount} ${item.name} from container at (${x}, ${y}, ${z})`);
      } finally {
        container.close();
      }
    }
  );
}
