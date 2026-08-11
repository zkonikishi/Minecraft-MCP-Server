import test from 'ava';
import minecraftData from 'minecraft-data';
import { applyProtocolCompatibility, getSupportedMinecraftVersions, NATIVE_PROTOCOL_TARGET_VERSION, NATIVE_PROTOCOL_FALLBACK_VERSION } from '../src/protocol-compatibility.js';

test('getSupportedMinecraftVersions includes 26.2 compatibility target', (t) => {
  const modules = {
    mineflayerVersion: {
      testedVersions: ['1.21.11'],
      latestSupportedVersion: '1.21.11'
    },
    minecraftData: {
      versionsByMinecraftVersion: {
        pc: {
          '1.21.11': {
            minecraftVersion: '1.21.11',
            version: 774,
            dataVersion: 4671,
            majorVersion: '1.21'
          }
        }
      },
      versions: {
        pc: [
          {
            minecraftVersion: '1.21.11',
            version: 774,
            dataVersion: 4671,
            majorVersion: '1.21'
          }
        ]
      },
      data: {
        pc: {
          '1.21.11': { blocks: {} }
        }
      },
      registry: {
        pc: {
          '1.21.11': { blocks: {} }
        }
      },
      supportedVersions: {
        pc: ['1.21.11']
      },
      postNettyVersionsByProtocolVersion: {
        pc: {
          774: [
            {
              minecraftVersion: '1.21.11',
              version: 774,
              dataVersion: 4671,
              majorVersion: '1.21'
            }
          ],
          776: [
            {
              minecraftVersion: NATIVE_PROTOCOL_TARGET_VERSION,
              version: 776,
              dataVersion: 4903,
              majorVersion: NATIVE_PROTOCOL_TARGET_VERSION
            }
          ]
        }
      }
    },
    minecraftProtocol: {
      supportedVersions: ['1.21.11']
    }
  };
  applyProtocolCompatibility({
    modules
  });
  const supportedVersions = getSupportedMinecraftVersions(modules);

  t.true(supportedVersions.includes(NATIVE_PROTOCOL_TARGET_VERSION));
  t.true(supportedVersions.includes(NATIVE_PROTOCOL_FALLBACK_VERSION));
  t.is(supportedVersions.filter((version) => version === NATIVE_PROTOCOL_TARGET_VERSION).length, 1);
  t.true(Object.prototype.hasOwnProperty.call(modules.minecraftData.registry.pc, NATIVE_PROTOCOL_TARGET_VERSION));
  t.true(modules.mineflayerVersion.latestSupportedVersion === NATIVE_PROTOCOL_TARGET_VERSION);
  t.true(modules.minecraftData.supportedVersions.pc.includes(NATIVE_PROTOCOL_TARGET_VERSION));
});

test('applying compatibility does not duplicate protocol lists', (t) => {
  const modules = {
    mineflayerVersion: {
      testedVersions: ['1.21.11', NATIVE_PROTOCOL_TARGET_VERSION],
      latestSupportedVersion: NATIVE_PROTOCOL_TARGET_VERSION
    },
    minecraftData: {
      versionsByMinecraftVersion: {
        pc: {
          '1.21.11': {
            minecraftVersion: '1.21.11',
            version: 774,
            dataVersion: 4671,
            majorVersion: '1.21'
          },
          [NATIVE_PROTOCOL_TARGET_VERSION]: {
            minecraftVersion: NATIVE_PROTOCOL_TARGET_VERSION,
            version: 776,
            dataVersion: 4903,
            majorVersion: NATIVE_PROTOCOL_TARGET_VERSION
          }
        }
      },
      versions: {
        pc: [
          {
            minecraftVersion: '1.21.11',
            version: 774,
            dataVersion: 4671,
            majorVersion: '1.21'
          },
          {
            minecraftVersion: NATIVE_PROTOCOL_TARGET_VERSION,
            version: 776,
            dataVersion: 4903,
            majorVersion: NATIVE_PROTOCOL_TARGET_VERSION
          }
        ]
      },
      data: {
        pc: {
          '1.21.11': { blocks: {} },
          [NATIVE_PROTOCOL_TARGET_VERSION]: { blocks: {} }
        }
      },
      registry: {
        pc: {
          '1.21.11': { blocks: {} },
          [NATIVE_PROTOCOL_TARGET_VERSION]: { blocks: {} }
        }
      },
      supportedVersions: {
        pc: ['1.21.11', NATIVE_PROTOCOL_TARGET_VERSION]
      },
      postNettyVersionsByProtocolVersion: {
        pc: {
          776: [
            {
              minecraftVersion: NATIVE_PROTOCOL_TARGET_VERSION,
              version: 776,
              dataVersion: 4903,
              majorVersion: NATIVE_PROTOCOL_TARGET_VERSION
            }
          ]
        }
      }
    },
    minecraftProtocol: {
      version: {
        supportedVersions: ['1.21.11', NATIVE_PROTOCOL_TARGET_VERSION]
      },
      supportedVersions: ['1.21.11', NATIVE_PROTOCOL_TARGET_VERSION]
    }
  };
  applyProtocolCompatibility({
    modules
  });

  const supportedVersions = getSupportedMinecraftVersions(modules);
  t.is(supportedVersions.filter((version) => version === NATIVE_PROTOCOL_TARGET_VERSION).length, 1);
  t.is(supportedVersions.length, 2);
});

test('supported versions query includes 26.2 after default apply', (t) => {
  applyProtocolCompatibility();
  const versions = getSupportedMinecraftVersions();
  t.true(versions.includes(NATIVE_PROTOCOL_TARGET_VERSION));
  t.true((versions.filter((version) => version === NATIVE_PROTOCOL_TARGET_VERSION).length) >= 1);
  t.true(minecraftData.versionsByMinecraftVersion.pc?.[NATIVE_PROTOCOL_TARGET_VERSION]?.minecraftVersion === NATIVE_PROTOCOL_TARGET_VERSION);
  t.true(minecraftData.supportedVersions.pc.includes(NATIVE_PROTOCOL_TARGET_VERSION));
});
