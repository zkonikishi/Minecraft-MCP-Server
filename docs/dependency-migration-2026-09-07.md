# Dependency migration: 2026-09-07

Scope: Minecraft MCP branch `26.2`; the standalone Mineflayer repository is not changed.

## Selected updates

| Package | Before | After |
| --- | --- | --- |
| minecraft-data | 3.113.0 | 3.116.0 |
| vec3 | 0.1.10 | 0.2.0 |
| zod | 3.25.76 | 4.5.4 |
| TypeScript | 5.9.3 | 6.0.3 |
| AVA / @ava/typescript | 6.4.1 / 6.0.0 | 8.0.1 / 7.0.0 |
| ESLint / eslint-plugin-ava | 9.39.5 / 15.1.0 | 10.10.0 / 17.0.1 |
| Sinon / @types/sinon | 21.1.2 / 21.0.1 | 22.1.0 / 22.0.0 |
| @types/node | 25.9.5 | 26.4.1 |

`@eslint/js` is now an explicit dependency rather than relying on a transitive install. Node engines match the new AVA toolchain: 22.20+, 24.12+, or 26+. CI now includes branch 26.2 and a 22/24/26 matrix; configuring that matrix is not evidence of completed remote runs.

The initial migration excluded a direct TypeScript 7.0.2 replacement: the installed typescript-eslint peer range is `>=4.8.4 <6.1.0`. The subsequent dual-compiler migration below resolves this boundary without a peer-check bypass or force install.

## Native protocol safeguards

Mineflayer remains pinned to `1675d3f6`; minecraft-protocol, prismarine-chunk and prismarine-physics Git resolutions are unchanged. UUID security overrides remain in place.

The root minecraft-data update initially introduced a nested 3.113.0 copy under Mineflayer. A root `$minecraft-data` override now ensures the native stack resolves one shared registry, and the existing postinstall applies the repository's 26.2 data and metadata serializer ordering. This is not a replacement of the native compatibility layer with unmodified upstream data.

Vec3 0.2 adds angleTo and retains the existing operations. Consumers that require 0.1 retain their nested versions; a regression checks vector interoperability without globally overriding their dependency contracts.

## Regression coverage

Added three tests covering shared native registry resolution, old/new Vec3 interoperability, and a real in-memory MCP client/server exchange for Zod 4 tool discovery, defaults, valid input and invalid input rejection. The original 165 tests plus these three pass (168 total).

Full test-source type checking also exposed incomplete legacy BotConfig fixtures and deliberately partial entity/event mocks. The fixtures now supply offline authentication and mark their partial mocks explicitly; runtime validation was not weakened.

Migration references: [Zod 4 migration](https://zod.dev/v4/changelog), [ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0). Compatibility versions were checked against npm package metadata on this date.

## Final local acceptance

- `npm ci` completed with the native postinstall and build; `tsc --noEmit`, lint and all 168 tests passed again after reinstall (zero failures).
- Full `npm audit`: zero known vulnerabilities. `npm ls --depth=0`: no invalid dependencies.
- Paper 26.2-92 at 127.0.0.1:29565: initial connection refused before server startup, automatic recovery, native player-state retrieval, and all four expected MCPGate response lines passed. No team/painting metadata/PartialReadError was observed. No ViaVersion was installed.
- Both MCP and Paper exited naturally with code 0. Harness exited with code 0. Post-run process count and port-29565 listener count were both zero. Production 25565 was not used.
- Evidence: `D:/Servers/AI/Data/Codex/tests/minecraft-mcp-deps-20260907/native-result.json`, SHA256 `D33CFF44A1DBEA0CE0485B7FBB6D35E6F5639889FF9D3C8CB8138413F1163C19`. Audit JSON and the natural-shutdown harness are in the same directory.

Limits: local execution used Node 26.5.0 on Windows. Remote CI matrix results, real Microsoft account authentication, the real ZAppearance plugin, proxy transfer and production plugin-stack behavior are not claimed. The command response came from the isolated synthetic MCPGate plugin.

## TypeScript 7 follow-up

Following the [official side-by-side migration](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), the compiler dependencies are now:

- `@typescript/native`: `npm:typescript@7.0.2`, providing `tsc` for build and TypeCheck.
- `typescript`: `npm:@typescript/typescript6@6.0.2`, providing the JavaScript compiler API and `tsc6` for tooling. The compatibility package reports compiler version 6.0.3 at runtime.

No production source or native protocol pin changed. A regression invokes both CLIs and exercises the compatibility AST API. Both TypeCheck commands and lint passed, and the test count is now 169. CI includes both TypeCheck commands.

Independent TS6 and TS7 builds each emitted 44 files (JavaScript and declarations), with identical SHA256 hashes for every corresponding file. Comparison outputs are under `D:/Servers/AI/Data/Codex/builds/minecraft-mcp-ts7-20260907/`. This validates this project's output, not a general equivalence guarantee or a performance benchmark.

Final TS7 gate: a fresh `npm ci` ran the native postinstall and TS7 build successfully. Both TypeChecks, lint, all 169 tests and zero-vulnerability npm audit passed after reinstall. Paper 26.2-92 native login, recovery after initial refusal, player-state retrieval and synthetic four-line command response passed again. No forbidden team/metadata errors occurred. MCP/Paper/harness exited naturally with code 0; remaining owned processes and 29565 listeners were zero. Production 25565 was not used.

TS7 evidence: `D:/Servers/AI/Data/Codex/tests/minecraft-mcp-ts7-20260907/native-result.json`, SHA256 `B0D553B3EF9DB907FC256A5588F24AF3A84D9C7C671766B5BF6A93B1A9DFD800`. The same directory contains audit JSON, compiler hash comparison and the natural-shutdown harness. Remote CI matrix and the previously listed live-test limitations remain unverified.
