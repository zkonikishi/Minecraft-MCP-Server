# Experimental visual preview (phase 1)

`get-bot-view` returns a standard MCP `image/png` content block plus JSON metadata. It reads the connected bot's native world data. It does not open a game client, start a web server, download textures, move the bot, or send its data to an external vision service.

## What the image means

This is **collision-geometry visualization**, not a screenshot of the Minecraft client. Block collision shapes (including partial blocks) are ray traced from an approximate eye position. Synthetic material colors, face shading and grid lines make structure and occlusion visible. Fluids are opaque simplified cubes.

- Purple stripes mean unloaded/unknown chunks; they are not air.
- Blue means the ray reached the requested distance limit, not necessarily sky.
- JSON lists the camera pose, image size, render time, visible block names and counts of unknown/hit pixels.
- Colors are deliberately synthetic: similarly colored blocks need not have the same identity. Read `visibleBlocks` for the sampled block names.
- Rendering samples live chunk data across several event-loop turns, not a single atomic server tick.

**Not included:** textures, entities, player skins, signs/text, inventory screens, light simulation, resource packs, custom ModelEngine/BetterModel models, animations or automatic image interpretation. Blocks with no collision shape (such as some plants) may not appear. Do not use the image alone to conclude an area has no entities, hazards or decorations.

## Tool arguments

```json
{"width":320,"distance":24,"fov":70}
```

Width is 160, 320 or 480; height is 9/16 of width. Distance is 4–48 blocks. Horizontal FOV is 30–100 degrees. Defaults are shown above. Orientation follows the bot's current look direction. Use existing movement/look tools separately when an actual orientation change is wanted.

One capture runs at a time. Invalid inputs, an unloaded camera chunk, a changed/disconnected bot or a capture taking over 15 seconds produce errors. Work yields every eight image rows to avoid monopolizing the event loop. Caches are per capture and discarded afterward. No persistent browser or render worker requires shutdown.

## Why not claim prismarine-viewer 26.2 support?

The [reference viewer README](https://github.com/PrismarineJS/prismarine-viewer) inspected on 2026-09-15 lists assets through 1.21.4 and nearest-version fallback within a major version. That is not evidence of faithful 26.2 rendering. This initial renderer avoids substituting old block IDs or assets: it uses the native stack's decoded block names and collision shapes directly. It does not implement the reference viewer's textured renderer.

## Acceptance

- Automated coverage: PNG encoding, projection direction, occlusion, partial shapes, unknown chunks, input bounds, cancellation, MCP image payload and concurrent requests.
- Real native Paper 26.2-92 scene: stone floor/wall and oak planks, captured through the MCP tool, with unchanged bot position and normal process shutdown.
- Test data: `D:/Servers/AI/Data/Codex/tests/minecraft-visual-20260915/`.
- Dedicated isolated server used **29566** because 29565 belonged to another Java process. Neither that process nor production 25565 was modified.

Next phases are textured block rendering, supported entity geometry, and explicit custom-resource/model adapters. They are not acceptance claims for this prototype.

### 2026-09-15 verified phase-1 result

Build, lint and full typecheck passed; all 187 AVA tests passed (9 new visual tests). Native Paper 26.2-92 tool gate passed 6/6 checks. Final 320x180 PNG took 491 ms in this test scene, showing stone and oak-plank collision geometry. Image was opened and visually checked. Both test processes exited with code 0, and 29566 was released.

Result SHA256: `9AC693D512A9009BEF9CFCD95422FF177460B2C3FA514F9BD0F7C521C2BA8A69`.
PNG SHA256: `8D914B6C06372278C3D12554E7F045ACB0693F4DE4E59FBF67835B7505E3B9F6`.
