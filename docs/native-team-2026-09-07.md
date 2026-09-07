# Native team support and shutdown repair

## Team parser

Minecraft 26.2 wire data was already decoded with `displayName`, nullable `color`
and a flags object. Mineflayer still read `name`, `formatting` and `friendlyFire`.
This sent undefined to prismarine-chat and reproduced the original TypeError.

Fork commit `56b64fae1a019eb08a088b9b1b20bc223342add9` normalizes those fields,
preserves legacy fields, uses reset for absent color, and emits the actual
removed team object. MCP no longer disables the built-in team plugin for 26.2.

The fork regression covers 1.8.9, 1.21.11 and 26.2 team lifecycle, including native
serializer/deserializer round trips. MCP also invokes this regression against
its installed, pinned dependency. The fork's existing 49 deleted upstream test
files were preserved and not committed; these targeted checks are not a claim
that the full upstream external-server suite ran.

## Shutdown issue found during acceptance

The first live attempt completed team create/update/join/leave/remove but hung
on cleanup. Investigation showed that `BotConnection.cleanup()` and reconnect
retirement removed all bot listeners before quit, including Mineflayer's physics
timer cleanup and the harness end listener. Two new tests reproduced this defect.

Both paths now remove listeners after the end event instead. The first test's
owned children were shut down through their stdin after marker, command line,
start-time and ancestry verification. Its leaked doPhysics timer was cleared in
that identified harness through the local Node inspector; no process was killed.
The incomplete first harness then exited with code 13 and is not an acceptance
pass. The second run completed all team assertions and normal cleanup with exit 0.

## Verification scope

The isolated Paper 26.2-92 server uses port 29565 without ViaVersion. Assertions
cover display name, prefix/suffix, gold color, flags=2, visibility/collision rules,
membership addition/removal and removal event identity, alongside the existing
native login/recovery/player-state and synthetic multiline MCPGate response.
Production 25565, real Microsoft login and the production plugin stack are not
part of this test. Local source validation passed build, both TS7/TS6 TypeChecks,
lint and 172 MCP tests. The fork passed lint, three team tests and five existing
window/resource-pack regression checks.

Final acceptance was repeated after installing the pushed Git dependency rather
than the temporary local test copy. Installed team source and regression script
bytes match the committed Git blobs. Build, both TypeChecks, lint and all 172 MCP
tests passed again; npm audit reports zero known vulnerabilities. The final live
run passed all assertions with no parser errors, MCP/Paper/harness exit code 0,
zero owned processes and zero listeners on 29565.

Evidence: `D:/Servers/AI/Data/Codex/tests/minecraft-mcp-team-20260907/native-result-r3.json`
(SHA256 `E6E95725322713EF5C984146D726EFA0CCF1857CE9FA445E7DEFCE0B3400A1F0`).
The directory also retains the incomplete first-attempt log, corrected harnesses,
the second successful run and the final audit JSON.
