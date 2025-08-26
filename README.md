[![MSeeP.ai Security Assessment Badge](https://mseep.net/pr/biswajitpanday-currentdt-mcp-badge.png)](https://mseep.ai/app/biswajitpanday-currentdt-mcp)

# @strix-ai/currentdt-mcp

> Real-time date and time access for AI assistants via Model Context Protocol (MCP)
> 
> **Built for AI, Built with AI** - Enhancing AI assistant capabilities through intelligent tooling

[![npm version](https://badge.fury.io/js/@strix-ai%2Fcurrentdt-mcp.svg)](https://www.npmjs.com/package/@strix-ai/currentdt-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Verified on MSeeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/e500e8da-135c-4995-bd94-9992706efc17)

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
- [Documentation](#documentation)
- [Support & Links](#support--links)
- [Contributing](#contributing)
- [License](#license)

## Overview

@strix-ai/currentdt-mcp is an MCP server that provides AI assistants with instant access to current date and time information. Essential for generating timestamped code, migration files, and dated documentation.

## Quick Start

```bash
# Install globally
npm install -g @strix-ai/currentdt-mcp

# Configure your MCP client (see integration guides below)
# Start using current datetime in AI conversations!
```

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

### Cursor IDE

```bash
npm install -g @strix-ai/currentdt-mcp
```

Add to `~/.cursor/mcp_servers.json`:
```json
{
  "mcpServers": {
    "currentdt": {
      "command": "npx",
      "args": ["@strix-ai/currentdt-mcp"]
    }
  }
}
```

### Claude Desktop

```bash
npm install -g @strix-ai/currentdt-mcp
```

Add to `~/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "currentdt": {
      "command": "currentdt-mcp",
      "args": []
    }
  }
}
```

### VS Code (with MCP Extension)

Install package and configure via MCP extension settings or add to VS Code settings:
```json
{
  "mcp.servers": [
    {
      "name": "currentdt", 
      "command": "currentdt-mcp"
    }
  ]
}
```

### Windsurf

Same configuration as Cursor IDE - add to Windsurf MCP settings file.

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
**Result:** Changelog entry with current date: `## [1.1.1] - 2025-08-26`

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
    "local": {
      "name": "local",
      "enabled": true,
      "priority": 1
    },
    "remote": {
      "name": "remote",
      "enabled": false,
      "priority": 2,
      "config": {
        "url": "https://worldtimeapi.org/api/timezone/UTC",
        "timeout": 5000
      }
    }
  },
  "customFormats": {
    "filename": "YYYY-MM-DD-HHmmss",
    "simple": "MM/DD/YYYY"
  },
  "cache": {
    "enabled": true,
    "ttl": 1000
  }
}
```

## Common Format Patterns

- `"iso"` → `2025-08-26T14:30:00.000Z`
- `"YYYY-MM-DD"` → `2025-08-26`
- `"YYYY-MM-DD HH:mm:ss"` → `2025-08-26 14:30:00`
- `"MM/DD/YYYY"` → `08/23/2025`
- `"YYYY-MM-DD-HHmmss"` → `2025-08-26-143000`

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

## Documentation

Detailed documentation available in `/docs`:
- [TaskList.md](docs/TaskList.md) - Development progress tracking
- [Architecture.md](docs/Architecture.md) - System architecture and design
- [SRS.md](docs/SRS.md) - Software requirements specification
- [PRD.md](docs/PRD.md) - Product requirements document

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
