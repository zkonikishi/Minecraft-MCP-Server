# Minecraft MCP Server

A Model Context Protocol (MCP) server that lets AI clients control a real Minecraft Java Edition player through [Mineflayer](https://github.com/PrismarineJS/mineflayer).

This fork extends the original [`yuniko-software/minecraft-mcp-server`](https://github.com/yuniko-software/minecraft-mcp-server) with tools intended for repeatable Paper plugin testing: inventory and item metadata inspection, custom GUI interaction, container transfers, entity interaction, player-state diagnostics, and command-response waiting.

## Requirements

- Node.js 20.10 or newer
- A reachable Minecraft Java Edition server
- An MCP-compatible client such as Codex or Claude Desktop
- An offline-mode test account, or a Microsoft account when `--auth microsoft` is used

The current codebase targets Minecraft protocol version `1.21.11`. You can explicitly select another Mineflayer-supported protocol with `--version`.

## Quick start

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "minecraft": {
      "command": "npx",
      "args": [
        "-y",
        "github:zkonikishi/minecraft-mcp-server",
        "--host",
        "localhost",
        "--port",
        "25565",
        "--username",
        "MCPBot",
        "--auth",
        "offline"
      ]
    }
  }
}
```

Restart the MCP client after changing its configuration. Restarting Minecraft is not required when only the MCP process has changed.

### Microsoft authentication

For an online-mode server, use Microsoft authentication and a persistent token directory:

```json
{
  "mcpServers": {
    "minecraft": {
      "command": "npx",
      "args": [
        "-y",
        "github:zkonikishi/minecraft-mcp-server",
        "--host",
        "localhost",
        "--port",
        "25565",
        "--username",
        "MCPBot",
        "--auth",
        "microsoft",
        "--profiles-folder",
        "D:/MinecraftMcpProfiles"
      ]
    }
  }
}
```

Do not commit authentication caches or server credentials.

## Command-line options

| Option | Default | Description |
| --- | --- | --- |
| `--host` | `localhost` | Minecraft server hostname or IP address |
| `--port` | `25565` | Minecraft server port |
| `--username` | `LLMBot` | Bot username |
| `--version` | auto-detect | Minecraft protocol version |
| `--auth` | `offline` | Authentication mode: `offline` or `microsoft` |
| `--profiles-folder` | unset | Microsoft authentication token cache directory |

## Available tools

### Movement and world interaction

- `get-position` — read the bot position
- `move-to-position` — pathfind to coordinates with timeout handling
- `look-at` — look at coordinates
- `jump` — jump once
- `move-in-direction` — move in a direction for a duration
- `fly-to` — fly to coordinates in a compatible game mode
- `place-block` — place a block
- `dig-block` — dig a block
- `get-block-info` — inspect a block
- `find-blocks` — find nearby blocks by type

### Inventory and item verification

- `list-inventory` — list inventory stacks and slot indexes
- `find-item` — find an inventory item by name
- `equip-item` — equip an item to a supported equipment destination
- `set-quickbar-slot` — select hotbar slot `0` through `8`
- `drop-item` — drop all or part of a matching stack
- `drop-selected-item` — drop the held stack or a specified amount
- `pickup-nearest-item` — pathfind to and collect a dropped item
- `inspect-item` — inspect display name, lore, NBT, data components, enchantments, and durability
- `inspect-held-item` — inspect complete main-hand item metadata
- `use-held-item` — activate a main-hand or offhand item for an optional number of ticks

The inspection tools are suitable for verifying plugin-managed item identity and visible upgrade markers such as `+1` name prefixes without relying only on screenshots.

### Containers and custom GUIs

- `list-container` — list items in a container at world coordinates
- `deposit-to-container` — deposit a matching item into a container
- `withdraw-from-container` — withdraw a matching item from a container
- `open-block-window` — open an interactive block GUI such as a chest, barrel, anvil, or grindstone
- `list-current-window` — inspect the current window title, type, cursor stack, and slots
- `click-window-slot` — perform a normal or right click with a Mineflayer click mode
- `move-window-slot` — move a complete stack between two window slots
- `quick-move-window-slot` — Shift-click a slot between the GUI and player inventory
- `close-current-window` — close the current window

These generic window tools can also operate plugin-created inventory GUIs once the bot has opened them through an in-game command, item, NPC, or block interaction.

### Entities and diagnostics

- `find-entity` — find the nearest matching entity
- `list-nearby-entities` — list nearby entity IDs, types, positions, and distances
- `interact-entity` — attack, activate, or use the held item on an entity
- `get-player-state` — read health, food, oxygen, experience, effects, game mode, position, and held item
- `detect-gamemode` — read the current game mode
- `wait-ticks` — wait a precise number of client ticks before the next assertion

### Chat and command automation

- `send-chat` — send chat or a slash command
- `read-chat` — read recent player, plugin, command, and system messages captured by the MCP bot
- `run-command-and-wait` — run a command and wait for a case-insensitive matching response, with timeout diagnostics

`run-command-and-wait` allows an AI test flow to distinguish success, missing permissions, missing currency, invalid equipment, and other plugin responses without requiring a player to copy messages manually.

### Crafting and furnaces

- `list-recipes` — list recipes craftable from the current inventory
- `get-recipe` — inspect a recipe
- `can-craft` — check whether required ingredients are available
- `craft-item` — craft an item
- `smelt-item` — load and operate a furnace-like block

## Example plugin test flow

An automated equipment-upgrade test can:

1. Run the plugin command that opens its GUI with `run-command-and-wait`.
2. Inspect the GUI using `list-current-window`.
3. Move equipment and materials using `move-window-slot` or `quick-move-window-slot`.
4. Click the confirmation slot with `click-window-slot`.
5. Wait for server processing using `wait-ticks`.
6. Inspect the resulting item with `inspect-item`.
7. Assert the name prefix, lore, NBT, components, material consumption, and command response.

The bot must have the same permissions and resources that the test scenario requires. Grant elevated permissions only on isolated development servers.

## Local development

```bash
npm install
npm run build
npm test
npm run lint
```

Current validation baseline: TypeScript build succeeds, lint succeeds, and 147 automated tests pass.

Run the built MCP server locally:

```bash
node dist/main.js --host localhost --port 25565 --username MCPBot --auth offline
```

## Safety notes

- Use a dedicated bot account on development servers.
- Back up worlds before destructive block or inventory tests.
- Do not store RCON passwords, Microsoft tokens, or other secrets in scripts, logs, documentation, or Git.
- Prefer full MCP process restarts after rebuilding. Avoid using Minecraft `/reload` as a plugin deployment mechanism.

## License and attribution

This project is based on [`yuniko-software/minecraft-mcp-server`](https://github.com/yuniko-software/minecraft-mcp-server) and uses Mineflayer and the Model Context Protocol SDK. See [LICENSE](LICENSE) for license terms and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.
