import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface ServerConfig {
  host: string;
  port: number;
  username: string;
  version?: string;
  auth: 'offline' | 'microsoft';
  profilesFolder?: string;
  connectionMode?: 'native' | 'via-plugin' | 'via-proxy' | 'via-server-mod';
  backendVersion?: string;
}

export function validateConnectionMode(config: ServerConfig): void {
  if (config.connectionMode && !['native', 'via-plugin', 'via-proxy', 'via-server-mod'].includes(config.connectionMode)) {
    throw new Error('Unknown connection mode');
  }
  if (config.connectionMode && config.connectionMode !== 'native' && !config.version?.trim()) {
    throw new Error('Via mode requires explicit --version for the BOT client protocol, not the backend server version');
  }
  if (config.backendVersion && (!config.connectionMode || config.connectionMode === 'native')) {
    throw new Error('--backend-version is only a declared backend label for Via mode');
  }
}

export function describeConnection(config: ServerConfig, clientVersion: string) {
  return {
    mode: config.connectionMode ?? 'native',
    modeSource: 'user-declared',
    endpoint: { host: config.host, port: config.port },
    requestedClientVersion: config.version ?? null,
    clientVersion,
    declaredBackendVersion: config.backendVersion ?? null,
    translationDetection: 'not-probed',
    note: 'Mode/backend labels are configuration, not detection or proof of a translator. Via runs externally; decoded blocks/items reflect the client protocol.'
  };
}

export function parseConfig(): ServerConfig {
  const config = yargs(hideBin(process.argv))
    .version(false)
    .option('host', {
      type: 'string',
      description: 'Minecraft server host',
      default: 'localhost'
    })
    .option('port', {
      type: 'number',
      description: 'Minecraft server port',
      default: 25565
    })
    .option('username', {
      type: 'string',
      description: 'Bot username',
      default: 'LLMBot'
    })
    .option('version', {
      type: 'string',
      description: 'Bot client protocol version; required explicitly with Via modes'
    })
    .option('connection-mode', {
      type: 'string', choices: ['native', 'via-plugin', 'via-proxy', 'via-server-mod'] as const,
      default: 'native' as const, description: 'Declared connection topology; does not install or start Via components'
    })
    .option('backend-version', {
      type: 'string', description: 'Optional declared backend version for Via diagnostics; never selects the bot protocol'
    })
    .option('auth', {
      type: 'string',
      choices: ['offline', 'microsoft'] as const,
      description: 'Minecraft authentication mode',
      default: 'offline' as const
    })
    .option('profiles-folder', {
      type: 'string',
      description: 'Directory used to cache Microsoft authentication tokens'
    })
    .help()
    .alias('help', 'h')
    .parseSync();
  validateConnectionMode(config);
  return config;
}
