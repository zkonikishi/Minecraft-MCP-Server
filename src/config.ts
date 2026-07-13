import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface ServerConfig {
  host: string;
  port: number;
  username: string;
  version?: string;
  auth: 'offline' | 'microsoft';
  profilesFolder?: string;
}

export function parseConfig(): ServerConfig {
  return yargs(hideBin(process.argv))
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
      description: 'Minecraft protocol version (for example, 1.21.11)'
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
}
