# 2026-09-13 selective Mineflayer update acceptance

Pinned Mineflayer: 1eaa341700df0e55b00c967fc42ef16674a458a4.

- Changes: container replacement lid-state cleanup, development self-dependency path compatibility, regression coverage and documentation. Native protocol overrides remain pinned and unchanged.
- MCP build/lint passed; AVA 176 passed, zero failed.
- Mineflayer lint and eight focused scripts passed (22 reported tests/assertions).
- Candidate and installed-package Paper 26.2-92 gates each passed 8/8 on localhost:29565, offline, without ViaVersion. The installed gate used the installed dependency, no candidate preload.
- Checked unavailable-server recovery, player state, real plugin GUIs/items/entities, multiline /mm version replies and absence of parser errors.
- Both gates closed clients and stopped Paper through stdin stop; both exit codes 0. Port 29565 listener absent afterward. Production 25565 untouched.
- /zapptest was not available (plugin removed); multiline coverage used /mm version, not a fabricated /zapptest result. No graphical validation claimed.
- npm installation succeeded; explicitly executed the reviewed native data installer after npm warned about unapproved install scripts. Full pnpm installation was not tested.
- Creative statistics acknowledgement upstream change excluded because late responses can be associated with newer requests after timeout removal. Existing creative behavior remains; this is not a claim all upstream changes were merged.

Evidence: D:/Servers/AI/Data/Codex/tests/mineflayer-update-20260913/installed-result.json

SHA256: 9F3D1CED8782B58758E1B8248D10635970E6594BB5923FE325A362976BE8C0C7
