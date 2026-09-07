# Compatibility acceptance — 2026-09-08

## Scope

Mineflayer is a protocol client library; Minecraft MCP exposes headless operations. A graphical Minecraft client, texture rendering and visual model QA are NOT completion gates for these projects (confirmed by the user). Resource-pack protocol handling remains distinct from rendering.

## Complete internal version matrix

Source snapshot: Mineflayer 635d93bcb250d17a2b6ea1089a97f2e2a224e015. Original local deleted tests were left untouched; the tracked snapshot was exported into a separate Codex test workspace.

28 versions from lib/version.js: 616 cases, 576 passed, 40 not-applicable skips, zero failures. Skips are the existing protocol guards: dimension type lookup (21) and use_item rotation (19).

The initial run had two failures (26.2 chat and teardown). Root cause: minecraft-protocol's mock server success packet omitted the new sessionId UUID. The test-only preload supplies it; it does not change the production bot. Complete rerun then passed. Adapter regression: 2/2. No process was forcibly exited.

Reproduce from a Mineflayer source checkout (not the MCP checkout) that contains the tracked upstream tests:

```sh
node tools/native-test-server-regression.js
node --require ./tools/native-test-server.js node_modules/mocha/bin/mocha.js test/internalTest.js --reporter json
```

Do not restore deleted user files just to run this command; use a separate source snapshot when needed. Do not preload native-test-server.js in a production client/server.

## Larger native plugin composition

A fresh isolated Paper26.2-92 server loaded the same 40 JAR files as the production inventory after excluding ViaVersion/ViaBackwards. Every copied JAR hash matches its source. No production world, account data, credentials, database or business configuration was copied. CoreTools/MySQL/Redis and other storage defaults were reviewed for isolation.

Eight MCP checks passed: startup recovery, Mythic GUI, dungeon GUI, item components, entity observation, multiline response, ModelEngine load and no parser errors. MCP/Paper exited0. This is a composition/operation test, not a claim that every plugin business feature passed.

Observed configuration limits: ZMythicManaBridge disables because isolated defaults lack the production ZMana reagent. MMOItems/PlayerTitle economy integration reports no available provider at its initialization point. These are plugin/configuration findings, not Mineflayer parsing failures; production configuration was not altered to hide them.

Artifacts: Codex tests/mineflayer-legacy-matrix-20260907/internal-final.json and internal-summary.json; tests/minecraft-mcp-fullstack-20260907/result.json; plugin-inventory.json and plugin-copy-verification.json. The real-server matrix is recorded separately in matrix-live-results.json with official server SHA1s in downloads.json.

## Final real-server matrix

All 27 advertised pre-26.2 versions passed native vanilla-server smoke tests: spawn, position/health/inventory/time state and server-to-client chat. The 26.2 Paper gate is separate and also passed. This covers the 28 advertised test versions, not every patch release or every plugin business behavior.

All downloaded server JARs matched the SHA1 in official Mojang version metadata. 1.20.6's initial metadata/download attempt timed out; its independently prefetched verified JAR was retested successfully. Raw first-attempt failure remains recorded. Final 27/27 pass, all servers exited0 without kills. 29565 released; no owned marked Java remains.

Final matrix SHA256: F303A555B7DE4E3D99DBC2D56636A64197DFEB3DC18E9F5E0730221479D848DB.
Internal raw output SHA256: F04BEF3027B26D3691DCDEAD692C1929EC8BEDC07F42362CC7A934F5C1B96E64.
MCP build, both typechecks, lint and 175 AVA tests were rerun successfully. Test-only adapter: 2/2 and fork lint passed.

The runtime dependency remains 635d93bc; this followup only adds test tooling/documentation, not a new client implementation. No visual-client gate is pending for these headless projects.
