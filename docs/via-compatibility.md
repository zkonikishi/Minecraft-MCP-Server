# Via 系列跨版本接入

MCP 不在 Node 内加载 Java 插件/模组，也不自动下载或启动 Via。
Via 在服务器、代理或服务端模组环境运行，MCP 使用明确指定的客户端协议连接它。

```powershell
# 较旧机器人连接装有 ViaVersion + ViaBackwards 的较新服务器
node dist/main.js --host 127.0.0.1 --port 29567 --version 1.21.11 --connection-mode via-plugin --backend-version 26.2 --auth offline

# 较新机器人连接 ViaProxy，再转至较旧服务器
node dist/main.js --host 127.0.0.1 --port 29568 --version 26.2 --connection-mode via-proxy --backend-version 1.20.1 --auth offline
```

- `--version` 始终是机器人客户端协议，不能填成与机器人实际使用不同的后端版本。
- Via 模式必须显式填写 `--version`，避免服务器探测值选错协议。
- `--backend-version` 只是可选诊断标签，不参与协议选择。
- `get-player-state.connection` 返回请求/实际客户端版本、入口和声明模式；`translationDetection: not-probed` 明确表示未自动检测转译器。
- `native` 是默认连接声明，不证明线路上没有代理或 Via；原生验收仍需独立确认环境。
- 1.8.9 可能显示为 1.8.8，两者协议号均为 47；验收应比较协议号而不是版本别名字符串。

## 组件边界

| 组件 | 接法 | 状态 |
| --- | --- | --- |
| ViaVersion + ViaBackwards | 服务端插件，`via-plugin` | 隔离 Paper 跨版本实测 |
| ViaRewind | 配合前两者覆盖更旧客户端 | 1.8.9 客户端实测，不代表所有旧版本 |
| ViaProxy | 连接代理监听端口，`via-proxy` | 隔离旧服链路测试 |
| ViaFabric 服务端模式 | `via-server-mod` | 配置支持，尚未实机验收 |
| ViaFabric / ViaFabricPlus 客户端模式 | 必须运行真实 Java 客户端 | 无法直接装进 Mineflayer/Node |

Via 只解决其支持范围内的协议转译，不提供 Forge/NeoForge/Fabric 内容模组的客户端实现、注册表或自定义握手。
较旧客户端可能看到替代方块/物品；MCP 的物品、碰撞和实验性视觉均基于转译后的客户端数据，不是后端内容的无损表达。
特别是 1.16 及更旧客户端无法完整呈现新版扩展世界高度；本次 1.8 验收使用 Y=64 固定平台，不能据此宣称负 Y 区域可用。首次复跑的负 Y 开箱失败已保留记录：动态出生坐标还可能将箱子放到被地面遮住的位置。
资源包接受、模型渲染、模组专有界面不因 Via 连通而自动支持。

## 2026-09-15 测试与根因

使用 Paper 26.2-92、ViaVersion 5.11.0、ViaBackwards 5.11.0、ViaRewind 4.1.3，
以及 ViaProxy 3.4.12 → vanilla 1.20.1，隔离端口 29567/29568/29569。
测试覆盖登录、诊断标签、多行聊天响应、物品、真实方块开箱、实验性 PNG、解析错误检查。
修复后四条链路均通过（每条 7 项，共 28/28）；三个 Java 进程与四个 MCP 客户端均正常退出，退出码为 0。
不涉及生产端口 25565。这里的多行测试使用 tellraw，不冒充已删除的 ZAppearance /zapptest 测试。

首次测试发现 26.2 数据集混淆新增 spectator_action 与旧 teleport_to_entity：
缺少一个映射槽位，arm_animation 及后续交互包错位；block_place 被服务端当成 test_instance_block_action 解码并踢出。
已按 Paper GameProtocols 注册顺序修正 0x3e–0x44，并区分 optional-varint 和 UUID 载荷。
安装器只允许已审查历史数据集的精确哈希迁移，未知差异仍拒绝覆盖。

官方项目：[ViaVersion](https://github.com/ViaVersion/ViaVersion)、[ViaBackwards](https://github.com/ViaVersion/ViaBackwards)、[ViaRewind](https://github.com/ViaVersion/ViaRewind)、[ViaProxy](https://github.com/ViaVersion/ViaProxy)、[ViaFabric](https://github.com/ViaVersion/ViaFabric)、[ViaFabricPlus](https://github.com/ViaVersion/ViaFabricPlus)。
