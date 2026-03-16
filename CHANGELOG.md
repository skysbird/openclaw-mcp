# OpenClaw MCP Server - Changelog

## [1.0.1] - 2026-03-16

### Fixed
- Fixed parameter mapping in `sendMessage` and `sendChannelMessage` methods
- Correctly pass `accountId` to Gateway API instead of `account`
- Fixed issue where Gateway rejected requests due to unexpected properties

### Added
- Documentation for multi-account channel support (account_id parameter)
- Comprehensive configuration examples with OPENCLAW_GATEWAY_TOKEN
- HTTP mode dual authentication documentation

## [1.0.0] - 2026-03-10

### Added
- Initial release
- Agent interaction tools (send, list, add, delete, bind/unbind)
- Message tools (send, read)
- Session management tools (list, get, reset, compact, history)
- Channel tools (list, status, login, logout)
- Node control tools (camera, screen record, notify, run, location)
- Memory tools (search, index, add)
- Cron job tools (list, create, delete, enable, disable)
- Configuration tools (get, set, validate)
- Gateway tools (health, restart, logs, pairing)
- Browser control tools (navigate, screenshot, click, type, evaluate)
- Resources for reading config, status, sessions, channels, agents
- WebSocket-based RPC client for OpenClaw gateway
- Full TypeScript support