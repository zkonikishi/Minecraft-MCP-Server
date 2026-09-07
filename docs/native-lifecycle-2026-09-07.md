# Native lifecycle and real-plugin gate — 2026-09-07

## Change set

Mineflayer pin: `635d93bcb250d17a2b6ea1089a97f2e2a224e015`.

- Packet-schema and PLAY-state gated player_loaded on each spawn.
- Server world_clock IDs and dimension_type.default_clock, partial update cache and configuration reset; unknown day clock yields null, not fabricated time.
- Reviewed-version/data preflight for vendor installer. Exact known historical protocol may migrate; arbitrary different data is rejected before copy.
- MCP AVA adds installed-package lifecycle/time probes and installer rejection probe.
- Both READMEs describe actual fork identity, upstream attribution, install pin and acceptance limits.

## Evidence and limits

Candidate gate r3: native Paper26.2-92 / protocol776 / offline / 127.0.0.1:29565; 8/8 checks passed. Tested real plugins: ModelEngine R4.1.1, MythicMobs 5.13.1 snapshot, MythicDungeons 2.1 snapshot, PacketEvents 2.13. No ViaVersion. Includes startup recovery, GUI click, custom item, Husk entity, multiline chat and no parser exceptions. MCP/Paper exit code0; no production port touched.

r3 used candidate game/time files over the previous installed dependency; final package install is a separate gate, not silently equated with r3.

Bare /meg has no chat response in this ModelEngine build: MECommand.onCommand(CommandSender,String[]) bytecode is iconst_0; ireturn. MCP cannot wait for a message the plugin does not send. No timeout bypass added.

Scope not claimed: graphical client rendering, downloading/applying resource packs, full production plugin configuration, complete historical Minecraft version matrix. ZAppearance was deleted by the user and excluded. These are not represented as passed tests.

Local artifacts: Codex tests/minecraft-mcp-realplugins-20260907/result-r3.json and modelengine-command-bytecode.txt. r3 JSON SHA256: 107A66940A7499A3D8998F3E05D278244C6443BD9C9DA55E2EFA00FE3E56F1E5.

## Final installed-package gate

GitHub SHA install completed (443 packages audited, zero reported vulnerabilities). npm lifecycle-approval warning was not ignored: root native-data installer was explicitly executed and passed. Installed game/time sources match fork sources after CRLF normalization; no runtime file overlay in r4.

MCP build, native typecheck, compatibility typecheck, lint and AVA passed: 175 tests, zero failures. Fork targeted total: 15 checks passed and lint passed.

Fresh r4 with the installed SHA: 8/8 live assertions passed; MCP and Paper exited naturally with code0. Recorded PIDs 17620,19640,11748 absent and 29565 not listening. No process killed. r4 result SHA256: 9FD8AE17B5E98CE76C79F4DBFD9F16AF749D9F6A8D53B7082BF2FAF8F0799BF4.

No full historical external test suite was run: user-owned 49 upstream test deletions were preserved, not restored or committed. No graphical/model render claim is made.
