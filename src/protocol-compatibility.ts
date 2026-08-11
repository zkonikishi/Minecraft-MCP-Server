import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const NATIVE_PROTOCOL_TARGET_VERSION = '26.2';

interface MineflayerVersionModule {
  testedVersions: string[];
  latestSupportedVersion: string;
}

interface MinecraftDataVersion {
  minecraftVersion: string;
  version: number;
  dataVersion: number;
  majorVersion: string;
}

interface MinecraftDataModule {
  registry: {
    pc: Record<string, unknown>;
  };
  versionsByMinecraftVersion: {
    pc: Record<string, MinecraftDataVersion>;
  };
  versions: {
    pc: MinecraftDataVersion[];
  };
  data: {
    pc: Record<string, unknown>;
  };
  supportedVersions: {
    pc: string[];
  };
  postNettyVersionsByProtocolVersion: {
    pc: Record<number, MinecraftDataVersion[]>;
  };
}

interface MinecraftProtocolModule {
  supportedVersions?: string[];
  version?: {
    supportedVersions: string[];
  };
}

interface ProtocolCompatibilityModules {
  mineflayerVersion: MineflayerVersionModule;
  minecraftData: MinecraftDataModule;
  minecraftProtocol: MinecraftProtocolModule;
}

interface ApplyProtocolCompatibilityOptions {
  targetVersion?: string;
  modules?: Partial<ProtocolCompatibilityModules>;
}

const compatibilityModules: ProtocolCompatibilityModules = {
  mineflayerVersion: require('mineflayer/lib/version.js'),
  minecraftData: require('minecraft-data'),
  minecraftProtocol: require('minecraft-protocol')
};
compatibilityModules.minecraftData.registry = {
  pc: require('minecraft-data/data.js').pc,
};

let hasPatched = false;

function ensureArrayItem(target: string[], item: string): void {
  if (!target.includes(item)) {
    target.push(item);
  }
}

function applyMineflayerCompatibility(modules: ProtocolCompatibilityModules, targetVersion: string): void {
  const { mineflayerVersion } = modules;

  ensureArrayItem(mineflayerVersion.testedVersions, targetVersion);
  mineflayerVersion.latestSupportedVersion = targetVersion;
}

function assertNativeMinecraftData(modules: ProtocolCompatibilityModules, targetVersion: string): void {
  const { minecraftData } = modules;
  const metadata = minecraftData.versionsByMinecraftVersion.pc[targetVersion];
  const registry = minecraftData.registry.pc[targetVersion];
  if (!metadata || !registry || metadata.version !== 776) {
    throw new Error(`Native minecraft-data for ${targetVersion} (protocol 776) is not installed`);
  }
  ensureArrayItem(minecraftData.supportedVersions.pc, targetVersion);
}

function applyMinecraftProtocolCompatibility(modules: ProtocolCompatibilityModules, targetVersion: string): void {
  const { minecraftProtocol } = modules;
  if (Array.isArray(minecraftProtocol.version?.supportedVersions)) {
    ensureArrayItem(minecraftProtocol.version.supportedVersions, targetVersion);
  }
  if (Array.isArray(minecraftProtocol.supportedVersions)) {
    ensureArrayItem(minecraftProtocol.supportedVersions, targetVersion);
  }
}

export function applyProtocolCompatibility(options: ApplyProtocolCompatibilityOptions = {}): void {
  const targetVersion = options.targetVersion ?? NATIVE_PROTOCOL_TARGET_VERSION;
  const modules: ProtocolCompatibilityModules = {
    mineflayerVersion: options.modules?.mineflayerVersion ?? compatibilityModules.mineflayerVersion,
    minecraftData: options.modules?.minecraftData ?? compatibilityModules.minecraftData,
    minecraftProtocol: options.modules?.minecraftProtocol ?? compatibilityModules.minecraftProtocol
  };

  if (options.modules === undefined && hasPatched) {
    return;
  }

  applyMineflayerCompatibility(modules, targetVersion);
  assertNativeMinecraftData(modules, targetVersion);
  applyMinecraftProtocolCompatibility(modules, targetVersion);

  if (options.modules === undefined) {
    hasPatched = true;
  }
}

export function getSupportedMinecraftVersions(modules = compatibilityModules): string[] {
  return [
    ...new Set([...modules.mineflayerVersion.testedVersions, NATIVE_PROTOCOL_TARGET_VERSION])
  ];
}
