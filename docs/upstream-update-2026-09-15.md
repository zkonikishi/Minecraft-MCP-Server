# September 15 Mineflayer integration acceptance

Pinned fork: fac945d449bea06b8e3db482f6e5122bf74a0d40.
Integrated login resets for team/scoreboard, bounded physics tick backlog, enumerable control properties, non-enumerable scoreboard aliases, descriptive pre-login chat errors, abilities flags/speeds, ChatMessage window titles and corrected server held-slot no-echo handling. MCP formats ChatMessage window titles as readable text.

Validation:
- Fork lint passed; 22 pre-existing reported cases/assertions and 14 new regression cases passed.
- MCP build/lint passed; 178 AVA cases passed, zero failures, using installed pinned dependency.
- Candidate and installed-package Paper 26.2-92 isolated offline 127.0.0.1:29565 gates each passed 8/8. Native protocol, no ViaVersion. Checked recovery from initially unavailable server, state, plugin menus/items/entities, multiline /mm version response and absence of team/metadata/parser exceptions.
- Client and Paper exit codes 0 for both gates; 29565 listener absent afterward. Production 25565 untouched. Server shutdown used stdin stop; no force termination.
- /zapptest unavailable because that plugin was removed; /mm version provided actual multiline validation.
- Only Mineflayer changed in dependency lockfile. Reviewed native data installer explicitly executed; no global script-approval changes.

Limits: abilities state is exposed, but pinned physics does not simulate creative flying from those fields. No graphical/model rendering claim. Creative statistics acknowledgement and upstream test-only changes remain excluded.

Evidence: D:/Servers/AI/Data/Codex/tests/mineflayer-update-20260915/installed-result.json
SHA256: 342D22CBF2AF84A898FD7BC9EC811D1048D1334656A81098136A1A509F0D3977
