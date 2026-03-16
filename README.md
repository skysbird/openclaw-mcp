# 🦞 OpenClaw MCP Server

一个为 [OpenClaw](https://openclaw.ai) 构建的 MCP (Model Context Protocol) 服务器，让 Claude Code 和其他 MCP 兼容的 AI 助手能够与你的 OpenClaw 网关交互。

## ✨ 功能特性

### 🤖 Agent 交互
- 向你的 AI 助手发送消息并获取响应
- 管理多个代理/工作空间
- 配置代理身份和路由绑定

### 📱 多频道消息
- 支持 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等多个平台
- 直接发送和读取消息

### 💬 会话管理
- 查看和管理对话会话
- 重置、压缩会话上下文
- 查看会话历史和 token 使用量

### 📲 设备节点控制
- 控制配对的 macOS、iOS、Android 设备
- 拍照、录屏、发送通知
- 执行命令、获取位置

### 🧠 记忆搜索
- 搜索 OpenClaw 的知识库
- 索引和添加记忆内容

### ⏰ 定时任务
- 创建和管理 Cron 作业
- 自动触发代理任务

### 🌐 浏览器控制
- 控制内置浏览器
- 导航、截图、点击、执行 JS

## 📦 安装

### 前置要求
- Node.js 22+
- OpenClaw 网关运行中 (默认: `ws://127.0.0.1:18789`)

### 从源码安装

```bash
git clone https://github.com/skysbird/openclaw-mcp.git
cd openclaw-mcp
npm install
npm run build
```

### 全局安装

```bash
npm install -g @openclaw/mcp-server
```

## ⚙️ 配置

### 传输模式

支持两种传输模式：

1. **stdio 模式** (默认) - 本地使用，适合 Claude Code 本机配置
2. **HTTP 模式** - 远程访问，支持 Token 认证

### Claude Code 本机配置 (stdio)

编辑 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "node",
      "args": ["/path/to/openclaw-mcp/dist/index.js", "--stdio"],
      "env": {
        "OPENCLAW_GATEWAY_URL": "ws://127.0.0.1:18789",
        "OPENCLAW_GATEWAY_TOKEN": "your-gateway-token"
      }
    }
  }
}
```

> **注意**: `OPENCLAW_GATEWAY_TOKEN` 是必需的，用于认证 MCP 服务器与 OpenClaw 网关的连接。

### HTTP 远程访问配置

启动 HTTP 服务器：

```bash
# 启动 HTTP 服务器，监听 3000 端口
OPENCLAW_GATEWAY_TOKEN=your-gateway-token \
node dist/index.js --port 3000 --token your-mcp-token

# 或者绑定所有网卡（允许外网访问）
OPENCLAW_GATEWAY_TOKEN=your-gateway-token \
node dist/index.js --port 3000 --host 0.0.0.0 --token your-mcp-token
```

然后在 Claude Code 中配置远程 MCP：

```json
{
  "mcpServers": {
    "openclaw": {
      "url": "http://your-server:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-mcp-token"
      },
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "your-gateway-token"
      }
    }
  }
}
```

> **双重认证**: HTTP 模式需要两个 Token：
> - `OPENCLAW_GATEWAY_TOKEN`: 用于连接 OpenClaw 网关
> - `--token` / `Authorization`: 用于 MCP 客户端认证

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCLAW_GATEWAY_URL` | OpenClaw 网关 WebSocket 地址 | `ws://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | OpenClaw 网关认证 Token | - |
| `OPENCLAW_MCP_TOKEN` | MCP 服务器 API Token (HTTP 模式) | - |

### 连接远程 OpenClaw 网关

```bash
# 通过 CLI 参数
node dist/index.js --gateway-url wss://your-gateway.com/ws --gateway-token your-gw-token

# 或通过环境变量
OPENCLAW_GATEWAY_URL=wss://your-gateway.com/ws \
OPENCLAW_GATEWAY_TOKEN=your-gw-token \
node dist/index.js --stdio
```

## 🚀 命令行参数

```
Usage:
  openclaw-mcp [options]

Options:
  --stdio              Use stdio transport (default)
  --port <number>      Start HTTP server on port (for remote access)
  --host <string>      Host to bind (default: 127.0.0.1, use 0.0.0.0 for all)
  --token <string>     API token for authentication (required for HTTP mode)
  --gateway-url <url>  OpenClaw gateway URL (default: ws://127.0.0.1:18789)
  --gateway-token      OpenClaw gateway token (or set OPENCLAW_GATEWAY_TOKEN)
  --help, -h           Show this help
```

## 🛠️ 可用工具

### Agent 工具

| 工具 | 说明 |
|------|------|
| `openclaw_agent_send` | 向 AI 助手发送消息 |
| `openclaw_agent_list` | 列出所有代理/工作空间 |
| `openclaw_agent_add` | 创建新代理 |
| `openclaw_agent_set_identity` | 更新代理身份 |
| `openclaw_agent_delete` | 删除代理 |
| `openclaw_agent_bind` | 添加频道路由绑定 |
| `openclaw_agent_unbind` | 移除频道路由绑定 |

### Message 工具

| 工具 | 说明 |
|------|------|
| `openclaw_message_send` | 直接发送消息到指定频道 |
| `openclaw_message_read` | 读取频道消息 |

> **多账号频道说明**: 当频道有多个账号配置时（如飞书），需要指定 `account_id` 参数来确保正确的路由。使用 `openclaw_channel_list` 查看各频道可用的账号列表。
>
> 示例：
> ```json
> {
>   "channel": "feishu",
>   "to": "oc_xxxxx",
>   "message": "Hello",
>   "account_id": "main"
> }
> ```

### Session 工具

| 工具 | 说明 |
|------|------|
| `openclaw_session_list` | 列出所有会话 |
| `openclaw_session_get` | 获取会话详情 |
| `openclaw_session_reset` | 重置会话 |
| `openclaw_session_compact` | 压缩会话上下文 |
| `openclaw_session_history` | 获取会话历史 |

### Channel 工具

| 工具 | 说明 |
|------|------|
| `openclaw_channel_list` | 列出已连接的频道 |
| `openclaw_channel_status` | 获取频道状态 |
| `openclaw_channel_login` | 登录频道 |
| `openclaw_channel_logout` | 登出频道 |

### Node 工具

| 工具 | 说明 |
|------|------|
| `openclaw_node_list` | 列出已配对设备 |
| `openclaw_node_info` | 获取设备信息 |
| `openclaw_node_camera` | 拍照 |
| `openclaw_node_screen_record` | 录屏 |
| `openclaw_node_notify` | 发送通知 |
| `openclaw_node_run` | 执行命令 (macOS) |
| `openclaw_node_location` | 获取设备位置 |

### Memory 工具

| 工具 | 说明 |
|------|------|
| `openclaw_memory_search` | 搜索知识库 |
| `openclaw_memory_index` | 重建索引 |
| `openclaw_memory_add` | 添加记忆内容 |

### Cron 工具

| 工具 | 说明 |
|------|------|
| `openclaw_cron_list` | 列出定时任务 |
| `openclaw_cron_create` | 创建定时任务 |
| `openclaw_cron_delete` | 删除定时任务 |
| `openclaw_cron_enable` | 启用任务 |
| `openclaw_cron_disable` | 禁用任务 |

### Config 工具

| 工具 | 说明 |
|------|------|
| `openclaw_config_get` | 获取配置 |
| `openclaw_config_set` | 设置配置 |
| `openclaw_config_validate` | 验证配置 |

### Gateway 工具

| 工具 | 说明 |
|------|------|
| `openclaw_gateway_health` | 获取网关健康状态 |
| `openclaw_gateway_restart` | 重启网关 |
| `openclaw_gateway_logs` | 获取网关日志 |
| `openclaw_pairing_list` | 列出配对请求 |
| `openclaw_pairing_approve` | 批准配对 |
| `openclaw_pairing_reject` | 拒绝配对 |

### Browser 工具

| 工具 | 说明 |
|------|------|
| `openclaw_browser_state` | 获取浏览器状态 |
| `openclaw_browser_navigate` | 导航到 URL |
| `openclaw_browser_screenshot` | 截图 |
| `openclaw_browser_click` | 点击元素 |
| `openclaw_browser_type` | 输入文本 |
| `openclaw_browser_evaluate` | 执行 JavaScript |

## 📚 资源

服务器还提供以下资源供读取：

| 资源 | 说明 |
|------|------|
| `openclaw://config` | 当前网关配置 |
| `openclaw://status` | 网关状态和健康信息 |
| `openclaw://sessions` | 活跃会话列表 |
| `openclaw://channels` | 已连接频道列表 |
| `openclaw://agents` | 已配置代理列表 |

## 💡 使用示例

配置完成后，你可以让 Claude 与 OpenClaw 交互：

```
"向我的助手发送消息，询问今天的日程"
"列出所有活跃的会话"
"在我的记忆中搜索项目 X 的相关信息"
"用我的 iPhone 拍一张照片"
"在 Telegram 上给 John 发送消息"
"创建一个每天早上 9 点提醒我的定时任务"
```

## 🔐 安全说明

### HTTP 模式安全

- **务必设置 Token**: 使用 `--token` 参数或 `OPENCLAW_MCP_TOKEN` 环境变量
- **使用 HTTPS**: 在生产环境中，建议通过反向代理（如 Nginx）添加 HTTPS
- **限制访问**: 使用防火墙限制访问来源 IP

### Token 配置

OpenClaw 网关 Token 获取方式：
```bash
# 查看 OpenClaw 配置
openclaw config get gateway.auth.token

# 或直接查看配置文件
cat ~/.openclaw/openclaw.json | grep -A5 '"auth"'
```

## 🔧 开发

```bash
# 构建
npm run build

# 监听模式
npm run dev

# 清理
npm run clean
```

## 📁 项目结构

```
openclaw-mcp/
├── src/
│   ├── index.ts          # 主入口
│   ├── client.ts         # WebSocket 客户端
│   ├── handlers.ts       # 工具处理器
│   ├── constants.ts      # 常量
│   └── tools/
│       └── index.ts      # 工具定义
├── dist/                 # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 许可证

MIT

## 🔗 相关链接

- [OpenClaw 官网](https://openclaw.ai)
- [OpenClaw 文档](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [MCP 文档](https://modelcontextprotocol.io)