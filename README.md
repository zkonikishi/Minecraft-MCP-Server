# Minecraft MCP Server · 原生协议自动化与实验性视觉

面向 Minecraft Java Edition 的 AI 操作与插件测试工具。AI 客户端通过 MCP 控制一个真实连接到服务器的机器人玩家，读取状态、操作菜单、检查物品和执行可验证的测试流程。

**这是 zkonikishi 独立维护的派生项目，不是原版项目的镜像，也不是完全重写的协议客户端。** 当前主线为 `26.2`，仍使用我们维护的 Mineflayer 作为连接底层。架构独立化、跨模组适配是后续方向，尚未完成。

## 两个项目如何分工

现已接入 Via 系列的显式连接配置与诊断；插件/代理仍在外部运行。版本矩阵、命令和限制见 [Via 跨版本接入](docs/via-compatibility.md)。这不是任意内容模组兼容层。

| 项目 | 职责 |
| --- | --- |
| **本仓库：Minecraft MCP Server** | MCP 工具、连接与重连、命令回复收集、插件 GUI/物品检查、实验性 PNG 结构视图 |
| [Mineflayer 原生兼容库](https://github.com/zkonikishi/Mineflayer/tree/26.2) | Minecraft 协议连接、世界与实体数据、玩家操作、版本兼容和底层状态修复 |

当前调用路径是 **AI 客户端 → MCP 工具 → Mineflayer → Minecraft 服务器**。MCP 的图像能力在本仓库实现，不属于 Mineflayer 库自带功能。

## 与原版项目的主要差异

本项目基于 [yuniko-software/minecraft-mcp-server](https://github.com/yuniko-software/minecraft-mcp-server)，目前重点已扩展为原生协议适配、服务器插件自动化与可核验状态反馈：

| 方向 | 本维护版本的实现 |
| --- | --- |
| 原生 26.2 | 固定并验证数据、协议、区块、物理及机器人依赖组合；不使用 ViaVersion 冒充原生支持 |
| 连接生命周期 | 连接失败恢复、重连状态清理、避免旧实例事件覆盖新连接，保留插件退出处理 |
| 插件菜单 | 查看窗口、槽位、光标物品，点击与搬运；处理 Paper 拒绝点击、服务端关窗及状态恢复 |
| 物品验证 | 读取名称、lore、NBT、数据组件、附魔、耐久等，验证插件奖励和装备变化 |
| 命令回包 | 收集多行命令/插件回复，支持匹配和超时诊断；区分聊天与高频 ActionBar 噪声 |
| 实验性视觉 | `get-bot-view` 返回第一人称方块碰撞结构 PNG 与元数据 |
| 工程验证 | 原生数据安装防护、回归测试、独立 Paper 实机验证和按日期保存的验收说明 |

这些是本项目已实现的维护重点，不表示上游未来永远不会加入相同能力。

## 当前能力：45 个 MCP 工具

| 类别 | 工具 |
| --- | --- |
| 移动与朝向 | `get-position`、`move-to-position`、`look-at`、`jump`、`move-in-direction`、`fly-to` |
| 方块 | `place-block`、`dig-block`、`get-block-info`、`find-blocks` |
| 背包与物品 | `list-inventory`、`find-item`、`equip-item`、`set-quickbar-slot`、`drop-item`、`drop-selected-item`、`pickup-nearest-item`、`inspect-item`、`inspect-held-item`、`use-held-item` |
| 容器 | `list-container`、`deposit-to-container`、`withdraw-from-container` |
| 窗口与插件 GUI | `open-block-window`、`list-current-window`、`inspect-window-slot`、`click-window-slot`、`move-window-slot`、`quick-move-window-slot`、`close-current-window` |
| 实体与状态 | `find-entity`、`list-nearby-entities`、`interact-entity`、`get-player-state`、`detect-gamemode`、`wait-ticks` |
| 聊天与命令 | `send-chat`、`read-chat`、`run-command-and-wait` |
| 合成与熔炉 | `list-recipes`、`get-recipe`、`can-craft`、`craft-item`、`smelt-item` |
| 实验性图像 | `get-bot-view` |

例如：发送打开强化菜单的命令 → 查看槽位 → 放入武器与材料 → 点击确认 → 等待处理 → 检查武器数据和材料数量。仅打开 GUI 而不发送聊天回复的命令应配合 `send-chat` 和窗口检查，不应把等待聊天超时当成失败。

机器人仍受服务端权限、游戏模式和资源限制；它不是不受限制的管理员，也不是服务器进程管理器。

## 视觉能力：已能生成图像，但不是完整游戏画面

`get-bot-view` 示例参数：

```json
{"width":320,"distance":24,"fov":70}
```

返回标准 MCP PNG 图像和相机位置、朝向、可见方块、未知区域等元数据。不需要启动图形客户端、浏览器或额外端口，也不会自动调用外部图像识别服务。

- **已实现：** 原生世界数据驱动的方块碰撞形状、透视、遮挡、合成色彩和辅助网格。
- **尚未实现：** 真实纹理、实体/皮肤、GUI 画面、光照、资源包、自定义模型和动画、自动图像识别。
- 无碰撞形状的装饰可能不显示；紫色代表未知区块，蓝色代表视距上限。不能凭图像判断没有怪物或危险。
- 玩家能力字段已支持，不代表物理引擎已实现完整创造飞行模拟；既有 `fly-to` 与该能力字段不是同一项功能。

参数范围、限制和实测记录见 [视觉说明](docs/visual-preview.md)。

## 跨版本、插件和模组：支持边界

| 场景 | 当前状态 |
| --- | --- |
| Minecraft Java / Paper 26.2 | 当前原生维护主线，协议 776；有实机验收 |
| 旧版 Java 服务端 | 保留底层版本分派，历史矩阵验证过一组版本；不是所有历史版本、所有工具的兼容保证 |
| 使用标准协议的服务端插件 | 通用命令、GUI、物品和实体工具可用于测试；特殊业务仍需具体适配和验收 |
| 允许普通客户端连接的服务端模组 | 可能通过通用能力工作，尚未建立专门的模组兼容矩阵 |
| 要求客户端模组的 Fabric / Forge / NeoForge 服务端 | 尚无专用握手、注册表和自定义通信适配，不声明支持 |
| 自定义模型、资源包与基岩版 | 不声明完整模型/资源包渲染；基岩版不在当前范围 |

曾验证 MythicMobs / MythicDungeons 菜单、插件物品和实体，以及 ModelEngine 加载与离线加入。**这不等于验证了模型画面，也不等于所有插件组合及生产配置都兼容。**

## 安装与启动

需要与 [package.json](package.json) engines 匹配的 Node.js（22.20+ 的 22.x、24.12+ 的 24.x，或 26+）、可连接的 Java 服务器及支持 MCP 的客户端。

推荐从本仓库的 `26.2` 分支构建，不要用原版 npm 包或其他分支替换原生依赖组合：

```sh
git clone --branch 26.2 https://github.com/zkonikishi/Minecraft-MCP-Server.git
cd Minecraft-MCP-Server
npm ci
node tools/install-minecraft-data-26.2.mjs
npm run build
node dist/main.js --host 127.0.0.1 --port 29565 --username MCPBot --auth offline --version 26.2
```

`29565` 仅为测试端口示例，需要先启动对应服务器。命令最后一行启动的是 stdio MCP 服务，不是 Minecraft 服务器。让 MCP 客户端启动同一 Node 程序并传入这些参数，才能调用工具；重新构建后需重启 MCP 进程。

安装器会检查并安装随仓库提供的原生数据。若 npm 提示安装脚本未批准，应明确执行上述已审查的安装器，不要跳过，也不要全局放行所有脚本。遇到未知数据版本或覆盖冲突应停止排查。

### 启动参数

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `--host` | `localhost` | 服务器地址 |
| `--port` | `25565` | 服务器端口；测试时请显式设置 |
| `--username` | `LLMBot` | 机器人账号 |
| `--version` | 自动探测 | 目标协议版本，26.2 测试建议显式设置 |
| `--auth` | `offline` | `offline` 或 `microsoft` |
| `--profiles-folder` | 未设置 | Microsoft 认证缓存目录 |

离线认证只适用于允许离线身份的测试服；正版服使用 `--auth microsoft` 并持久化认证缓存。令牌、账号缓存、服务器凭据不能提交到 Git。

离线测试 ModelEngine 时应设置 `Eager-Generate-Skins=false`，或使用有合法皮肤资料的测试账号；离线身份缺少皮肤 URL 的异常不是 MCP 协议故障。

### 依赖与工具链

当前 Mineflayer 锁定为 `f9e7db4447afda7838f08aa13430ec768738c178`；后续以 package.json 和 lockfile 为准。更新 Mineflayer 仓库**不会自动更新本 MCP**，必须重新锁定、安装并验收。

编译使用 native TypeScript 7，工具链的 `typescript` 别名提供 TypeScript 6 API 兼容。不要直接互换；协议、数据、区块和物理依赖也不能按 npm 最新版本盲目替换。

## 验证与开发

```sh
npm run build
npm run typecheck
npm run typecheck:compat
npm run lint
npm test
```

| 已记录的验收 | 范围 |
| --- | --- |
| 2026-09-15 视觉第一阶段 | build/lint/typecheck 通过，187 项 AVA 测试通过；独立 Paper 26.2-92 图像实测 6/6 |
| 2026-09-15 Via 接入 | build/lint/typecheck 通过，194 项 AVA 测试通过；修正 26.2 出站交互包编号，跨版本边界见 Via 文档 |
| 2026-09-15 底层更新 | 安装版重连、GUI/物品/实体、多行回复和解析异常检查 8/8 |
| 2026-09-08 历史矩阵 | 28 版本内部矩阵：576 通过、40 不适用跳过；27 个旧版实际服务端基础测试及独立插件组合验证 |

这些是**对应修订的历史结果**，不是任意未来提交的保证。本次 README 更新不代表重跑了全部服务端矩阵。

- [视觉验收](docs/visual-preview.md)
- [9 月 15 日底层更新](docs/upstream-update-2026-09-15.md)
- [历史兼容范围](docs/compatibility-2026-09-08.md)
- [测试脚本说明](scripts/README.md)

实机测试必须使用独立世界、明确的空闲测试端口和测试账号；退出机器人后通过 `stop` 正常关闭自己的服务器。不要修改正式服，不要批量终止 Java 进程。

## 独立化路线（规划，未完成）

1. 提取稳定的游戏连接接口，减少工具层对 Mineflayer 内部对象的直接依赖。
2. 建立版本能力检测和插件/模组适配器规范，按版本与能力声明支持范围。
3. 扩展视觉到纹理、实体，再对自定义资源与模型单独适配。
4. 在兼容接口和测试充分后，逐步允许替换连接后端，而非立即重写所有协议。

当前仍依赖 Mineflayer，没有完成完全解耦，也没有实现“所有插件、所有模组通用”。

## 许可证与来源

本项目派生自 [yuniko-software/minecraft-mcp-server](https://github.com/yuniko-software/minecraft-mcp-server)，并使用 Mineflayer、PrismarineJS 生态及 MCP SDK。独立维护不抹去上游来源、版权和许可证义务。见 [LICENSE](LICENSE) 与 [CONTRIBUTING.md](CONTRIBUTING.md)。
