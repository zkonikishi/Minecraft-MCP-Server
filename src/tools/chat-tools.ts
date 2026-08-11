import { z } from "zod";
import mineflayer from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { MessageStore } from '../message-store.js';

export function registerChatTools(factory: ToolFactory, getBot: () => mineflayer.Bot, messageStore: MessageStore): void {
  factory.registerTool(
    "send-chat",
    "Send a chat message in-game",
    {
      message: z.string().describe("Message to send in chat")
    },
    async ({ message }) => {
      const bot = getBot();
      bot.chat(message);
      return factory.createResponse(`Sent message: "${message}"`);
    }
  );

  factory.registerTool(
    "read-chat",
    "Get recent chat messages from players",
    {
      count: z.number().optional().describe("Number of recent messages to retrieve (default: 10, max: 100)")
    },
    async ({ count = 10 }) => {
      const maxCount = Math.min(count, messageStore.getMaxMessages());
      const messages = messageStore.getRecentMessages(maxCount);

      if (messages.length === 0) {
        return factory.createResponse("No chat messages found");
      }

      let output = `Found ${messages.length} chat message(s):\n\n`;
      messages.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toISOString();
        output += `${index + 1}. ${timestamp} - ${msg.username}: ${msg.content}\n`;
      });

      return factory.createResponse(output);
    }
  );

  factory.registerTool(
    "run-command-and-wait",
    "Run a slash command as the bot and wait for a matching chat or command response",
    {
      command: z.string().min(1).describe("Command with or without a leading slash"),
      match: z.string().optional().describe("Case-insensitive response substring; omit to collect all responses"),
      timeoutMs: z.number().int().min(100).max(60000).optional().describe("Maximum wait, default 3000 ms")
    },
    async ({ command, match, timeoutMs = 3000 }) => {
      const bot = getBot();
      const started = Date.now();
      bot.chat(command.startsWith("/") ? command : `/${command}`);
      const deadline = started + timeoutMs;
      const normalized = match?.toLowerCase();
      let lastMessageCount = 0;
      let quietSince: number | null = null;
      const settleMs = 250;

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const messages = messageStore.getMessagesSince(started);
        const hasMatch = !normalized || messages.some(message => message.content.toLowerCase().includes(normalized));

        if (messages.length !== lastMessageCount) {
          lastMessageCount = messages.length;
          quietSince = hasMatch ? Date.now() : null;
        } else if (messages.length > 0 && hasMatch && quietSince === null) {
          quietSince = Date.now();
        }

        // Plugin commands commonly emit several lines in separate packets. Wait
        // for a short quiet period so callers receive the complete response.
        if (quietSince !== null && Date.now() - quietSince >= settleMs) {
          return factory.createResponse(messages.map(message => `${message.username}: ${message.content}`).join("\n"));
        }
      }

      const responses = messageStore.getMessagesSince(started);
      return factory.createErrorResponse(`Timed out after ${timeoutMs}ms waiting for ${match ? `'${match}'` : "a command response"}${responses.length ? `; received: ${responses.map(message => message.content).join(" | ")}` : ""}`);
    }
  );
}
