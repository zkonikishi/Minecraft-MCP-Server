# Minecraft MCP Server

A Model Context Protocol (MCP) server that lets AI clients control a real Minecraft Java Edition player through our [native 26.2 Mineflayer fork](https://github.com/zkonikishi/Mineflayer/tree/26.2).

This fork extends the original [`yuniko-software/minecraft-mcp-server`](https://github.com/yuniko-software/minecraft-mcp-server) with tools intended for repeatable Paper plugin testing: inventory and item metadata inspection, custom GUI interaction, container transfers, entity interaction, player-state diagnostics, and command-response waiting.

## 本 fork 的定位与验收边界

本仓库是 **MCP 服务端**，不是 Mineflayer 库。它基于 yuniko-software 的项目，增加插件测试所需的窗口、物品组件、实体、命令多行回包和重连能力。

- `26.2` 为当前主线；默认分支安装和官方 Mineflayer npm 包不能替代这里的依赖组合。
- 当前 package.json 锁定 Mineflayer fork SHA，并固定或 override 协议、数据、chunk、physics 依赖。更新机器人仓库不会自动更新本 MCP。
- 原生 Paper 26.2 不依赖 ViaVersion。其他 Minecraft 版本可指定，但不是完整兼容性承诺。
- 已提交版本曾完成隔离服原生登录恢复、MythicMobs / MythicDungeons GUI 点击、物品组件与多行响应测试。实体响应为 `Husk`，大小写断言已修正，2026-09-07 重跑 8/8 隔离服断言通过。
- ModelEngine 已验证加载及离线加入无 skin URL 异常；裸 `/meg` 处理器不发送聊天响应，等待超时不能视为 MCP 丢包；模型画面渲染不属于此无头服务的范围。已用 40 个原生插件 JAR 的独立配置组合验证 MCP 核心操作，不代表每个插件的生产业务配置均通过。
- ZAppearance 已删除，不在测试依赖或验收清单中。
- Mineflayer 生命周期修复锁定到 `635d93bcb250d17a2b6ea1089a97f2e2a224e015`；以 lockfile 与对应验收报告为准。

对照每次提交的测试报告判断可用性，不把工具存在、单元测试通过和真实插件效果混为一谈。

## Requirements

- Node.js 22.20+, 24.12+, or 26+ (matching the supported build/test toolchain)
- A reachable Minecraft Java Edition server
- An MCP-compatible client such as Codex or Claude Desktop
- An offline-mode test account, or a Microsoft account when `--auth microsoft` is used

The current codebase targets Minecraft protocol version `26.2` (protocol 776). You can explicitly select another Mineflayer-supported protocol with `--version`.

### Compiler toolchain

`npm run build` and `npm run typecheck` use native TypeScript 7. The `typescript`
dependency is intentionally an alias for the TypeScript 6 compatibility package,
which supplies the compiler API required by ESLint and other tooling. Do not
replace this alias with TypeScript 7 directly. `npm run typecheck:compat` also
checks the project with the compatibility compiler to catch divergence.

### Paper 26.2 offline integration tests

When testing against an offline-mode Paper server with ModelEngine installed, set
`Eager-Generate-Skins=false`. Offline test identities do not have a Mojang skin URL,
and ModelEngine otherwise throws `RuntimeException: Skin URL is null` during join.
Alternatively, use a test account with valid skin profile data. This is a server
plugin constraint, not a Mineflayer/MCP protocol failure.

## Quick start

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "minecraft": {
      "command": "npx",
      "args": [
        "-y",
        "github:zkonikishi/Minecraft-MCP-Server#26.2",
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
        "github:zkonikishi/Minecraft-MCP-Server#26.2",
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
- `inspect-window-slot` — inspect a GUI item's display name, lore, NBT, data components, enchantments, and durability
- `click-window-slot` — perform a normal or right click with a Mineflayer click mode
- `move-window-slot` — move a complete stack between two window slots
- `quick-move-window-slot` — Shift-click a slot between the GUI and player inventory
- `close-current-window` — close the current window

These generic window tools can also operate plugin-created inventory GUIs once the bot has opened them through an in-game command, item, NPC, or block interaction.
For cancelled Paper plugin GUI clicks, `click-window-slot` briefly waits for the server-restored slot before clearing Mineflayer's predicted cursor stack, so rejected button clicks do not leave a false cursor item in MCP state.
If an accepted plugin GUI action synchronously closes its window, the tool reports `window closed by server` as a successful click result instead of dereferencing the cleared Mineflayer window.
If Mineflayer's reconciliation tick waiter times out after the server has already accepted a click, the timeout is treated as diagnostic noise and does not replace the completed click result.

### Entities and diagnostics

- `find-entity` — find the nearest matching entity
- `list-nearby-entities` — list nearby entity IDs, types, positions, and distances
- `interact-entity` — attack, activate, or use the held item on an entity
- `get-player-state` — read health, food, oxygen, experience, effects, game mode, position, and held item
- `detect-gamemode` — read the current game mode
- `wait-ticks` — wait a precise number of client ticks before the next assertion

### Chat and command automation

- `send-chat` — send chat or a slash command
- `read-chat` — read recent player, plugin, command, and system messages while excluding high-frequency ActionBar/HUD noise
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

Validation is revision-specific. Run build, both typechecks, lint and tests for the current checkout; do not treat historical test counts as current acceptance. See the dated reports under docs/.

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

### 2026-09-07 验证结果

当前依赖提交已正式安装后重跑：build、双 typecheck、lint 通过，AVA **175/175**；原生 Paper 26.2-92 四插件隔离组合 **8/8**，客户端和服务器自然退出，29565 释放。详见 [验收记录](docs/native-lifecycle-2026-09-07.md)。这不等于完整旧版/生产插件矩阵或图形渲染验收。

如果 npm 提示安装脚本未批准，不要忽略提示后直接启动。从本仓库构建时，可明确执行 `node tools/install-minecraft-data-26.2.mjs` 后再 build；安装器遇到未知版本或数据冲突会停止，不要绕过防护。

### 2026-09-08 扩展验收

声明的 28 个版本内部矩阵：576 通过、40 项版本不适用跳过、0 失败；27 个旧版真实服务端基础测试和原生 Paper 26.2 验收通过。40 插件独立组合的 MCP 检查 8/8。具体范围、插件配置限制和 SHA 见 [完整记录](docs/compatibility-2026-09-08.md)。图形客户端不属于这两个项目的验收条件。
