import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
const { pathfinder, Movements } = pathfinderPkg;
import minecraftData from 'minecraft-data';
import { applyProtocolCompatibility, getSupportedMinecraftVersions } from './protocol-compatibility.js';

function getLatestSupportedMinecraftVersion(): string {
  const versions = getSupportedMinecraftVersions();
  return versions[versions.length - 1] ?? '1.21.11';
}

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

type MineflayerPluginOptions = Record<string, mineflayer.Plugin | false>;

export function getVersionSpecificPlugins(_version?: string): MineflayerPluginOptions {
  // The pinned Mineflayer fork handles native 26.2 teams as well as legacy packets.
  return { pathfinder };
}

interface BotConfig {
  host: string;
  port: number;
  username: string;
  version?: string;
  auth: 'offline' | 'microsoft';
  profilesFolder?: string;
}

interface ConnectionCallbacks {
  onLog: (level: string, message: string) => void;
  onChatMessage: (username: string, message: string) => void;
}

export class BotConnection {
  private bot: mineflayer.Bot | null = null;
  private state: ConnectionState = 'disconnected';
  private config: BotConfig;
  private callbacks: ConnectionCallbacks;
  private isReconnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reconnectDelayMs: number;

  constructor(config: BotConfig, callbacks: ConnectionCallbacks, reconnectDelayMs = 2000) {
    this.config = config;
    this.callbacks = callbacks;
    this.reconnectDelayMs = reconnectDelayMs;
  }

  getBot(): mineflayer.Bot | null {
    return this.bot;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getConfig(): BotConfig {
    return this.config;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  connect(): void {
    applyProtocolCompatibility();
    const botOptions = {
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      version: this.config.version,
      auth: this.config.auth,
      profilesFolder: this.config.profilesFolder,
      plugins: getVersionSpecificPlugins(this.config.version),
    };

    this.bot = mineflayer.createBot(botOptions);
    this.state = 'connecting';
    this.isReconnecting = false;

    this.registerEventHandlers(this.bot);
  }

  private registerEventHandlers(bot: mineflayer.Bot): void {
    bot.once('spawn', async () => {
      this.state = 'connected';
      this.callbacks.onLog('info', 'Bot spawned in world');

      const mcData = minecraftData(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);

      bot.chat('LLM-powered bot ready to receive instructions!');
      this.callbacks.onLog('info', `Bot connected successfully. Username: ${this.config.username}, Server: ${this.config.host}:${this.config.port}`);
    });

    // `chat` only contains player chat and misses command/plugin/system replies.
    // `messagestr` is the normalized Mineflayer stream for every visible message.
    // Listen to only this event to avoid storing ordinary player chat twice.
    bot.on('messagestr', (message, position) => {
      // ActionBar/HUD updates (weather, temperature, mana bars, etc.) can
      // arrive several times per second and evict useful plugin responses.
      if (position === 'game_info') return;
      const normalized = message.trim();
      if (!normalized) return;
      this.callbacks.onChatMessage(position || 'server', normalized);
    });

    bot.on('kicked', (reason) => {
      this.callbacks.onLog('error', `Bot was kicked from server: ${this.formatError(reason)}`);
      this.markDisconnected(bot);
      bot.quit();
    });

    bot.on('error', (err) => {
      const errorCode = (err as { code?: string }).code || 'Unknown error';
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.callbacks.onLog('error', `Bot error [${errorCode}]: ${errorMsg}`);

      this.markDisconnected(bot);
    });

    bot.on('login', () => {
      this.callbacks.onLog('info', 'Bot logged in successfully');
    });

    bot.on('end', (reason) => {
      this.callbacks.onLog('info', `Bot disconnected: ${this.formatError(reason)}`);

      if (this.bot === bot) {
        this.markDisconnected(bot);
        try {
          bot.removeAllListeners();
          this.bot = null;
          this.callbacks.onLog('info', 'Bot instance cleaned up after disconnect');
        } catch (err) {
          this.callbacks.onLog('warn', `Error cleaning up bot on end event: ${this.formatError(err)}`);
        }
      }
    });
  }

  private markDisconnected(bot: mineflayer.Bot): void {
    // Events from a bot retired during reconnect must not clobber the state of
    // the replacement instance.
    if (this.bot !== bot) return;
    this.state = 'disconnected';
    this.isReconnecting = false;
  }

  attemptReconnect(): void {
    if (this.isReconnecting || this.state === 'connecting') {
      return;
    }

    this.isReconnecting = true;
    this.state = 'connecting';
    this.callbacks.onLog('info', `Attempting to reconnect to Minecraft server in ${this.reconnectDelayMs}ms...`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.bot) {
        const oldBot = this.bot;
        this.bot = null;
        try {
          // Plugin end handlers release physics timers and other runtime resources.
          oldBot.once('end', () => { oldBot.removeAllListeners(); });
          oldBot.quit('Reconnecting...');
          this.callbacks.onLog('info', 'Old bot instance cleaned up');
        } catch (err) {
          this.callbacks.onLog('warn', `Error while cleaning up old bot: ${this.formatError(err)}`);
        }
      }

      this.callbacks.onLog('info', 'Creating new bot instance...');
      this.connect();
    }, this.reconnectDelayMs);
  }

  async checkConnectionAndReconnect(): Promise<{ connected: boolean; message?: string }> {
    const currentState = this.state;

    if (currentState === 'disconnected') {
      this.attemptReconnect();

      const maxWaitTime = this.reconnectDelayMs + 5000;
      const pollInterval = 100;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        if (this.state === 'connected') {
          return { connected: true };
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      const errorMessage =
        `Cannot connect to Minecraft server at ${this.config.host}:${this.config.port}\n\n` +
        `Please ensure:\n` +
        `1. Minecraft server is running on ${this.config.host}:${this.config.port}\n` +
        `2. Server is accessible from this machine\n` +
        `3. Server version is compatible (latest supported: ${getLatestSupportedMinecraftVersion()})\n\n` +
        `For setup instructions, visit: https://github.com/zkonikishi/minecraft-mcp-server`;

      return { connected: false, message: errorMessage };
    }

    if (currentState === 'connecting') {
      return { connected: false, message: 'Bot is connecting to the Minecraft server. Please wait a moment and try again.' };
    }

    return { connected: true };
  }

  cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.bot) {
      const bot = this.bot;
      this.bot = null;
      this.state = 'disconnected';
      try {
        // Remove listeners only after Mineflayer has observed transport shutdown.
        bot.once('end', () => { bot.removeAllListeners(); });
        bot.quit('Server shutting down');
      } catch (err) {
        this.callbacks.onLog('warn', `Error during cleanup: ${this.formatError(err)}`);
      }
    }
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
