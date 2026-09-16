# @strix-ai/currentdt-mcp

> Real-time date and time access for AI assistants via Model Context Protocol (MCP)
> 
> **Built for AI, Built with AI** - Enhancing AI assistant capabilities through intelligent tooling

[![npm version](https://img.shields.io/npm/v/@strix-ai/currentdt-mcp)](https://www.npmjs.com/package/@strix-ai/currentdt-mcp)
[![node](https://img.shields.io/node/v/@strix-ai/currentdt-mcp)](https://www.npmjs.com/package/@strix-ai/currentdt-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

<a href="https://mseep.ai/app/biswajitpanday-currentdt-mcp">
  <img src="https://mseep.net/pr/biswajitpanday-currentdt-mcp-badge.png" alt="MSeeP.ai Security Assessment Badge" width="150"/>
</a>

## 📑 Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [User Flow](#user-flow)
- [Core Features](#core-features)
- [MCP Client Integration](#mcp-client-integration)
- [Real-World Usage Examples](#real-world-usage-examples)
- [API Reference](#api-reference)
- [Configuration](#configuration-optional)
- [Common Format Patterns](#common-format-patterns)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Support & Links](#support--links)
- [Contributing](#contributing)
- [License](#license)

## Overview

@strix-ai/currentdt-mcp is an MCP server that provides AI assistants with instant access to current date and time information. Essential for generating timestamped code, migration files, and dated documentation.

## Quick Start

```bash
# No install required -- point your MCP client at npx (see integration guides below)
npx -y @strix-ai/currentdt-mcp

# Or install globally
npm install -g @strix-ai/currentdt-mcp
```

Requires **Node.js 18 or newer**.

## User Flow

```
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│ User Asks for       │───▶│ AI Assistant    │───▶│ get_current_        │
│ Timestamped Code    │    │                 │    │ datetime Tool       │
└─────────────────────┘    └─────────────────┘    └─────────────────────┘
                                                            │
                                                            ▼
┌─────────────────────┐    ┌─────────────────┐    ┌─────────────────────┐
│ Timestamped Output  │◀───│ Current Time    │◀───│ CurrentDT MCP       │
│ Generated           │    │ Returned        │    │ Server              │
└─────────────────────┘    └─────────────────┘    └─────────────────────┘
                                                            │
                                                            ▼
                           ┌─────────────────┐    ┌─────────────────────┐
                           │ Formatted       │◀───│ Local/Remote        │
                           │ DateTime        │    │ Time Provider       │
                           └─────────────────┘    └─────────────────────┘
```

## Core Features

- **Zero Configuration** - Works immediately after installation
- **Multiple Formats** - ISO 8601, custom formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
- **Provider System** - Local system clock with remote fallback
- **MCP Compatible** - Cursor, Claude Desktop, VS Code, Windsurf
- **TypeScript Native** - Full type safety and IntelliSense

## MCP Client Integration

Every client below uses the same server entry. `npx -y` fetches the package on first
use and suppresses the install prompt, so nothing needs to be installed beforehand.

```json
{
  "command": "npx",
  "args": ["-y", "@strix-ai/currentdt-mcp"]
}
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in a project:
```json
{
  "mcpServers": {
    "currentdt": {
      "command": "npx",
      "args": ["-y", "@strix-ai/currentdt-mcp"]
    }
  }
}
```

### Claude Desktop

Edit `claude_desktop_config.json` -- on macOS at
`~/Library/Application Support/Claude/`, on Windows at `%APPDATA%\Claude\`:
```json
{
  "mcpServers": {
    "currentdt": {
      "command": "npx",
      "args": ["-y", "@strix-ai/currentdt-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in a workspace, or under `"mcp"` in user `settings.json`:
```json
{
  "servers": {
    "currentdt": {
      "command": "npx",
      "args": ["-y", "@strix-ai/currentdt-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`, same `mcpServers` shape as Cursor.

### Installed globally instead

If you prefer a fixed install over `npx`, run `npm install -g @strix-ai/currentdt-mcp`
and use `"command": "currentdt-mcp"` with no `args` in any of the configs above.

## Real-World Usage Examples

### 1. SQL Migration Files
**User:** "Create a migration to add user preferences table"  
**Result:** Migration file named `2025-08-26-143000_add_user_preferences.sql` with current timestamp

**MCP Tool Call Example:**
```json
{
  "tool": "get_current_datetime",
  "arguments": {
    "format": "YYYY-MM-DD-HHmmss",
    "provider": "local"
  }
}
```

### 2. Timestamped Logging
**User:** "Generate a logger that includes timestamps"  
**Result:** Logger implementation with current ISO datetime format

### 3. Dated Documentation
**User:** "Update the changelog with today's date"  
**Result:** Changelog entry with current date: `## [Unreleased] - 2026-09-16`

## API Reference

### Tool: `get_current_datetime`

**Parameters:**
- `format` (optional): `"iso"` (default) or custom format like `"YYYY-MM-DD HH:mm:ss"`
- `provider` (optional): `"local"` (default) or `"remote"`

**Returns:** Formatted datetime string

**Example:**
```json
{
  "tool": "get_current_datetime",
  "arguments": {
    "format": "YYYY-MM-DD HH:mm:ss",
    "provider": "local"
  }
}
```

## Configuration (Optional)

Create `currentdt-config.json` for custom settings:

```json
{
  "defaultFormat": "iso",
  "defaultProvider": "local",
  "providers": {
    "local": { "name": "local", "priority": 1 },
    "remote": {
      "name": "remote",
      "priority": 2,
      "config": {
        "url": "https://worldtimeapi.org/api/timezone/UTC",
        "timeout": 5000
      }
    }
  },
  "debug": false,
  "logLevel": "info"
}
```

Environment variables override the file: `CURRENTDT_FORMAT`, `CURRENTDT_PROVIDER`,
`CURRENTDT_DEBUG`, `CURRENTDT_CONFIG`.

## Common Format Patterns

> **Timezone:** `"iso"` returns **UTC**. Every token pattern renders the host machine's
> **local** time. Add the `Z` token to emit the real UTC offset -- never write a literal
> `Z` into a pattern, since that would label local digits as UTC.

For a host at UTC+02:00, at the instant `2025-08-26T14:30:00.123Z`:

| format | output | zone |
|---|---|---|
| `"iso"` | `2025-08-26T14:30:00.123Z` | UTC |
| `"YYYY-MM-DD"` | `2025-08-26` | local |
| `"YYYY-MM-DD HH:mm:ss"` | `2025-08-26 16:30:00` | local |
| `"MM/DD/YYYY"` | `08/26/2025` | local |
| `"YYYY-MM-DD-HHmmss"` | `2025-08-26-163000` | local |
| `"YYYY-MM-DDTHH:mm:ss.SSSZ"` | `2025-08-26T16:30:00.123+02:00` | local + offset |

**Tokens:** `YYYY` `MM` `DD` `HH` `mm` `ss` `SSS` `Z` (`+02:00`) `ZZ` (`+0200`).
**Named patterns:** `filename`, `logdate`, `simple`.

A pattern must contain at least one token. Free text such as `"what time is it"` is
rejected rather than echoed back.

## Troubleshooting

### Tool Not Available
```bash
# Verify installation
npm list -g @strix-ai/currentdt-mcp

# Test server directly
npx @strix-ai/currentdt-mcp --test
```

### Debug Mode
```bash
export CURRENTDT_DEBUG=true
npx @strix-ai/currentdt-mcp
```

## Development

```bash
git clone https://github.com/biswajitpanday/CurrentDT-mcp.git
cd currentdt-mcp
npm install
npm run dev
```

### npm Scripts
- `npm run build` - Build TypeScript
- `npm test` - Run all tests  
- `npm run lint` - ESLint check
- `npm run format` - Prettier format

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Support & Links

- **Issues:** [GitHub Issues](https://github.com/biswajitpanday/CurrentDT-mcp/issues)
- **Documentation:** [GitHub Repository](https://github.com/biswajitpanday/CurrentDT-mcp)
- **npm Package:** [@strix-ai/currentdt-mcp](https://www.npmjs.com/package/@strix-ai/currentdt-mcp)
- **Author:** [Biswajit Panday](https://biswajitpanday.github.io) - AI-Assisted Development Enthusiast
- **Contributor:** Abdullah Saleh Robin <robinabdullah@yahoo.com>

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [Biswajit Panday](https://biswajitpanday.github.io)**
