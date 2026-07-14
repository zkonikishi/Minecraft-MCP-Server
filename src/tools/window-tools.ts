import { z } from "zod";
import mineflayer from 'mineflayer';
import type { Item } from 'prismarine-item';
import { Vec3 } from 'vec3';
import { ToolFactory } from '../tool-factory.js';
import { coerceCoordinates } from './coordinate-utils.js';
import { itemDetails } from './item-inspection-tools.js';

type WindowLike = {
  id: number;
  type: string | number;
  title?: string;
  slots: Array<Item | null>;
  close?: () => void;
  selectedItem?: Item | null;
};

type WindowBot = mineflayer.Bot & {
  currentWindow?: WindowLike | null;
  openBlock: (
    block: ReturnType<mineflayer.Bot["blockAt"]>,
    direction?: Vec3,
    cursorPos?: Vec3
  ) => Promise<WindowLike>;
  clickWindow: (
    slot: number,
    mouseButton: number,
    mode: number
  ) => Promise<void>;
  closeWindow: (window: WindowLike) => void;
  moveSlotItem: (sourceSlot: number, destinationSlot: number) => Promise<void>;
  simpleClick: {
    leftMouse: (slot: number) => Promise<void>;
    rightMouse: (slot: number) => Promise<void>;
  };
};

function formatItem(item: Item | null, slot: number): string {
  if (!item) return `- slot ${slot}: empty`;
  return `- slot ${slot}: ${item.name} x${item.count}`;
}

function sameStack(left: Item | null | undefined, right: Item | null | undefined): boolean {
  if (!left || !right) return left == null && right == null;
  return left.name === right.name && left.count === right.count && left.metadata === right.metadata;
}

function formatWindow(window: WindowLike, includeEmpty: boolean): string {
  const title = typeof window.title === "string" ? window.title : JSON.stringify(window.title ?? "");
  const lines = [
    `Window id=${window.id} type=${window.type} title=${title}`,
    `Slots: ${window.slots.length}`,
    `Cursor: ${window.selectedItem ? `${window.selectedItem.name} x${window.selectedItem.count}` : "empty"}`
  ];

  const entries = window.slots
    .map((item, slot) => ({ item, slot }))
    .filter(({ item }) => includeEmpty || item !== null);

  if (entries.length === 0) {
    lines.push("No visible item stacks");
  } else {
    lines.push(...entries.map(({ item, slot }) => formatItem(item, slot)));
  }

  return lines.join("\n");
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

export function registerWindowTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "open-block-window",
    "Open an interactive block window such as a chest, barrel, anvil, or grindstone",
    {
      x: z.coerce.number().describe("X coordinate"),
      y: z.coerce.number().describe("Y coordinate"),
      z: z.coerce.number().describe("Z coordinate")
    },
    async ({ x, y, z }) => {
      ({ x, y, z } = coerceCoordinates(x, y, z));

      const bot = getBot() as WindowBot;
      const block = bot.blockAt(new Vec3(x, y, z));
      if (!block) {
        return factory.createResponse(`No interactive block found at (${x}, ${y}, ${z})`);
      }

      const direction = clickDirectionFromBot(bot, block.position);
      const window = await bot.openBlock(block, direction, new Vec3(0.5, 0.5, 0.5));
      return factory.createResponse(`Opened ${block.name} at (${x}, ${y}, ${z})\n${formatWindow(window, false)}`);
    }
  );

  factory.registerTool(
    "list-current-window",
    "List the currently open Minecraft window slots",
    {
      includeEmpty: z.boolean().optional().describe("Whether to include empty slots")
    },
    async ({ includeEmpty }) => {
      const bot = getBot() as WindowBot;
      const window = bot.currentWindow;
      if (!window) {
        return factory.createResponse("No window is currently open");
      }

      return factory.createResponse(formatWindow(window, includeEmpty ?? false));
    }
  );

  factory.registerTool(
    "inspect-window-slot",
    "Inspect display name, lore, NBT, data components, enchantments, and durability for an item in the current window",
    { slot: z.number().int().min(0).describe("Current window slot index") },
    async ({ slot }) => {
      const window = (getBot() as WindowBot).currentWindow;
      if (!window) return factory.createResponse("No window is currently open");
      if (slot >= window.slots.length) return factory.createResponse(`Slot ${slot} is outside this window (0-${window.slots.length - 1})`);
      const item = window.slots[slot];
      return factory.createResponse(item ? itemDetails(item) : `Window slot ${slot} is empty`);
    }
  );

  factory.registerTool(
    "click-window-slot",
    "Click a slot in the currently open Minecraft window",
    {
      slot: z.number().int().min(0).describe("Window slot index"),
      mouseButton: z.number().int().min(0).max(1).optional().describe("0 = left click, 1 = right click"),
      mode: z.number().int().min(0).optional().describe("Mineflayer click mode; defaults to 0 normal click")
    },
    async ({ slot, mouseButton, mode }) => {
      const bot = getBot() as WindowBot;
      if (!bot.currentWindow) {
        return factory.createResponse("No window is currently open");
      }

      if (slot >= bot.currentWindow.slots.length) {
        return factory.createResponse(`Slot ${slot} is outside this window (0-${bot.currentWindow.slots.length - 1})`);
      }

      const resolvedButton = mouseButton ?? 0;
      const resolvedMode = mode ?? 0;
      const beforeSlot = bot.currentWindow.slots[slot] ?? null;
      const beforeCursor = bot.currentWindow.selectedItem ?? null;
      if (resolvedMode === 0) {
        if (resolvedButton === 0) await bot.simpleClick.leftMouse(slot);
        else await bot.simpleClick.rightMouse(slot);
        await bot.waitForTicks(2);

        // Mineflayer 4.35 ignores the modern cursor correction packet
        // (set_slot window=-1 slot=-1). When a Paper GUI cancels a click,
        // the server restores the source slot but Mineflayer keeps its local
        // predicted cursor stack. Reconcile only this cancelled-click shape;
        // a real item pickup leaves the source slot changed and is preserved.
        const restoredSlot = bot.currentWindow?.slots[slot] ?? null;
        const predictedCursor = bot.currentWindow?.selectedItem ?? null;
        if (!beforeCursor && sameStack(restoredSlot, beforeSlot) && sameStack(predictedCursor, beforeSlot) && bot.currentWindow) {
          bot.currentWindow.selectedItem = null;
        }
      } else {
        await bot.clickWindow(slot, resolvedButton, resolvedMode);
      }
      const item = bot.currentWindow.slots[slot] ?? null;
      const cursor = bot.currentWindow.selectedItem;
      return factory.createResponse(`Clicked slot ${slot}; now ${formatItem(item, slot)}; cursor ${cursor ? `${cursor.name} x${cursor.count}` : "empty"}`);
    }
  );

  factory.registerTool(
    "close-current-window",
    "Close the currently open Minecraft window",
    {},
    async () => {
      const bot = getBot() as WindowBot;
      const window = bot.currentWindow;
      if (!window) {
        return factory.createResponse("No window is currently open");
      }

      bot.closeWindow(window);
      return factory.createResponse(`Closed window id=${window.id} type=${window.type}`);
    }
  );

  factory.registerTool(
    "move-window-slot",
    "Move a complete item stack between two slots in the current window",
    {
      sourceSlot: z.number().int().min(0).describe("Source window slot index"),
      destinationSlot: z.number().int().min(0).describe("Destination window slot index")
    },
    async ({ sourceSlot, destinationSlot }) => {
      const bot = getBot() as WindowBot;
      const window = bot.currentWindow;
      if (!window) return factory.createResponse("No window is currently open");
      if (!window.slots[sourceSlot]) return factory.createResponse(`Source slot ${sourceSlot} is empty`);

      await bot.moveSlotItem(sourceSlot, destinationSlot);
      return factory.createResponse(`Moved slot ${sourceSlot} to ${destinationSlot}\n${formatWindow(window, false)}`);
    }
  );

  factory.registerTool(
    "quick-move-window-slot",
    "Shift-click a slot in the current window to transfer it between the GUI and player inventory",
    { slot: z.number().int().min(0).describe("Window slot index") },
    async ({ slot }) => {
      const bot = getBot() as WindowBot;
      const window = bot.currentWindow;
      if (!window) return factory.createResponse("No window is currently open");
      await bot.clickWindow(slot, 0, 1);
      return factory.createResponse(`Quick-moved slot ${slot}\n${formatWindow(window, false)}`);
    }
  );
}
