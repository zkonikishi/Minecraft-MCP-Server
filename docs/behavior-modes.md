# 三种行为模式

用 `--behavior-mode developer|maid|player` 选择，与 `--connection-mode`（原生/Via）独立。
默认是 `player`。切换模式需重启 MCP，避免正在运行的建造/移动任务被隐式改变。

| 模式 | 默认请求 | AI 职责 |
| --- | --- | --- |
| developer 开发者 | 创造；服主授予 OP 或管理员权限 | 插件/模组验收、地下城设计、复杂建筑、红石工程 |
| maid 女仆 | 创造；服主授予 OP 或管理员权限 | 服务绑定服主、跟随、协助与聊天 |
| player 玩家 | 生存；普通玩家权限 | 探索、采集、合成、建造和战斗 |

```powershell
node dist/main.js --behavior-mode developer --host localhost --port 29567 --version 26.2
node dist/main.js --behavior-mode maid --owner YourName --host localhost --port 29567 --version 26.2
node dist/main.js --behavior-mode player --host localhost --port 29567 --version 26.2
```

## 权限与实际游戏模式

出生时仅发送针对机器人自己的 `/gamemode creative` 或 `/gamemode survival` 请求；已匹配则不发送。
服务端可以拒绝。由服主通过控制台 `op BotName` 或权限插件授予所需权限，客户端不能自行提权。
授权后调用 `apply-behavior-defaults` 重试，再用 `get-behavior-profile` 查看真实游戏模式。
管理员权限没有通用的可靠客户端检测，因此状态明确标记 `not-probed`，不假装已获得 OP。
玩家模式不会自动撤销已有 OP；要真实普通玩家权限，必须由服主在服务端撤权。

## 女仆模式

必须明确绑定 `--owner`。AI 通过 MCP initialization instructions 接收角色和信任边界；
不会将其他玩家或插件文本自动当成控制指令，也不会直接执行游戏聊天中的命令。
`maid-follow-owner` 的 `enabled=true` 开始跟随已加载范围内的服主，`enabled=false` 停止。
服主实体离开已加载范围时停止，不自动传送；重新可见后可以再次启动。其他移动工具可以替换跟随目标。
女仆寻路默认禁止挖掘、搭桥和柱跳，避免跟班行为破坏世界。
聊天生成、意图理解、任务安排仍依赖外部 MCP 宿主 AI；未实现独立常驻聊天模型或离线自主服务。
离线服用户名不是安全身份认证，绑定名字不是对抗冒名的认证系统。

## 当前范围

验证：build/lint/typecheck 通过，201 项 AVA 测试通过。隔离 Paper 26.2-92 三模式登录验证 3/3，实际游戏模式分别为创造、创造、生存；女仆拒绝跟随未出现的服主。跟随实体消失、重复启动与停止已做单元测试，尚未完成真人跟随和聊天端到端验收。

这是角色配置、初始化指令、默认模式请求及跟随工具的实现，不是三个独立游戏智能体。
角色指令不是安全沙箱，现有工具不会按角色从 MCP 中删除；连接 MCP 的客户端仍可直接调用工具。
地下城/高级建筑通过 AI 规划和现有建造、命令工具执行；红石在真实服务端运行验证，未新增独立红石模拟器。
插件和模组是否兼容仍需逐项测试，选择开发者模式不会解决客户端模组协议或渲染依赖。
