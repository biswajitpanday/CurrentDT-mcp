# @strix-ai/currentdt-mcp

> Current DateTime MCP Server - Provide real-time date and time to AI assistants via Model Context Protocol

**Author:** Biswajit Panday  
**Email:** biswajitmailid@gmail.com  
**Website:** [biswajitpanday.github.io](https://biswajitpanday.github.io)

[![npm version](https://badge.fury.io/js/@strix-ai%2Fcurrentdt-mcp.svg)](https://www.npmjs.com/package/@strix-ai/currentdt-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Overview

@strix-ai/currentdt-mcp is an MCP (Model Context Protocol) server that provides AI assistants with real-time access to current date and time information. This eliminates the need for manual datetime input during AI-assisted development workflows.

### Key Features

- **Real-time DateTime Access:** AI assistants can get current date/time instantly
- **Configurable Formats:** Support for ISO 8601 and custom date formats  
- **Multiple Providers:** Local system clock and remote time services
- **MCP Compatible:** Works with Cursor, Claude Desktop, VS Code, and other MCP clients
- **Zero Configuration:** Works out-of-the-box with sensible defaults
- **Extensible Architecture:** Plugin support for custom providers and formats

### Use Cases

- **Date-stamped File Generation:** Create files with current timestamps
- **SQL Migration Scripts:** Generate migration files with accurate dates
- **Log Entry Creation:** Add current timestamps to generated log statements
- **Documentation Updates:** Auto-date README files and documentation
- **Code Comments:** Insert current date/time in generated code comments

## Quick Start

### Installation

```bash
# Install globally for system-wide access
npm install -g @strix-ai/currentdt-mcp

# Or install locally in your project
npm install @strix-ai/currentdt-mcp
```

### Basic Usage

Once installed, the MCP server exposes a `get_current_datetime` tool that AI assistants can use:

```javascript
// The AI assistant can call this tool to get current datetime
{
  "tool": "get_current_datetime",
  "arguments": {
    "format": "iso",           // optional: 'iso' (default) or custom format
    "provider": "local"        // optional: 'local' (default) or 'remote'
  }
}

// Returns
{
  "content": [
    {
      "type": "text",
      "text": "2025-08-22T14:30:00.000Z"
    }
  ]
}
```

## MCP Client Integration

### Cursor IDE

1. Install the package:
   ```bash
   npm install -g @strix-ai/currentdt-mcp
   ```

2. Add to your Cursor MCP settings (`~/.cursor/mcp_servers.json`):
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

3. Restart Cursor and start using datetime in conversations:
   ```
   You: "Create a SQL migration file for adding user preferences"
   Claude: "I'll create a migration file with the current timestamp..."
   ```

### Claude Desktop

1. Install the package globally:
   ```bash
   npm install -g @strix-ai/currentdt-mcp
   ```

2. Edit Claude Desktop config (`~/claude_desktop_config.json`):
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

3. Restart Claude Desktop and the datetime tool will be available automatically.

### VS Code (with MCP Extension)

1. Install the package and MCP extension:
   ```bash
   npm install -g @strix-ai/currentdt-mcp
   ```

2. Configure in VS Code settings or via MCP extension:
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

1. Install globally:
   ```bash
   npm install -g @strix-ai/currentdt-mcp
   ```

2. Add to Windsurf MCP configuration:
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

## Configuration

### Configuration File

Create a `currentdt-config.json` file in your project root or home directory:

```json
{
  "defaultFormat": "iso",
  "defaultProvider": "local",
  "providers": {
    "local": {
      "enabled": true,
      "priority": 1
    },
    "remote": {
      "enabled": false,
      "url": "https://worldtimeapi.org/api/timezone/UTC",
      "timeout": 5000,
      "priority": 2
    }
  },
  "customFormats": {
    "filename": "YYYY-MM-DD-HHmmss",
    "logdate": "YYYY/MM/DD HH:mm:ss",
    "simple": "MM/DD/YYYY"
  },
  "cache": {
    "enabled": true,
    "ttl": 1000
  }
}
```

### Environment Variables

```bash
# Override default format
export CURRENTDT_FORMAT="YYYY-MM-DD HH:mm:ss"

# Override default provider
export CURRENTDT_PROVIDER="local"

# Enable debug logging
export CURRENTDT_DEBUG="true"

# Custom config file location
export CURRENTDT_CONFIG="/path/to/config.json"
```

### Date Format Options

#### ISO Format (Default)
```javascript
// format: "iso"
"2025-08-22T14:30:00.000Z"
```

#### Custom Formats
Use standard format tokens:

```javascript
// format: "YYYY-MM-DD HH:mm:ss"
"2025-08-22 14:30:00"

// format: "MM/DD/YYYY"
"08/22/2025"

// format: "YYYY-MM-DD-HHmmss"
"2025-08-22-143000"

// format: "dddd, MMMM Do YYYY"
"Thursday, August 22nd 2025"
```

#### Format Tokens
- `YYYY` - 4-digit year
- `MM` - 2-digit month
- `DD` - 2-digit day
- `HH` - 24-hour format hour
- `mm` - 2-digit minutes
- `ss` - 2-digit seconds
- `SSS` - 3-digit milliseconds

## Real-World Examples

### Example 1: SQL Migration Files

**User Prompt:**
```
Create a new database migration file for adding a user_preferences table
```

**AI Response with @strix-ai/currentdt-mcp:**
```sql
-- File: migrations/2025-08-22-143000_add_user_preferences.sql

CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration created on: 2025-08-22T14:30:00.000Z
```

### Example 2: Log File Generation

**User Prompt:**
```
Generate a logging function that includes timestamps
```

**AI Response:**
```typescript
// Generated on: 2025-08-22T14:30:00.000Z

export function createLogger(module: string) {
  return {
    info: (message: string) => {
      console.log(`[${new Date().toISOString()}] INFO [${module}]: ${message}`);
    },
    error: (message: string) => {
      console.error(`[${new Date().toISOString()}] ERROR [${module}]: ${message}`);
    }
  };
}

// Usage example with current timestamp context
const logger = createLogger('UserService');
logger.info('Service initialized'); // [2025-08-22T14:30:00.000Z] INFO [UserService]: Service initialized
```

### Example 3: README Updates

**User Prompt:**
```
Update the README with current date in the changelog
```

**AI Response:**
```markdown
# Changelog

## [1.2.0] - 2025-08-22
- Added user authentication system
- Improved error handling
- Updated dependencies

## [1.1.0] - 2025-08-15
- Initial release
```

## Advanced Usage

### Custom Provider Implementation

```typescript
import { IDateTimeProvider } from '@strix-ai/currentdt-mcp';

class CustomTimeProvider implements IDateTimeProvider {
  async getCurrentDateTime(): Promise<Date> {
    // Your custom implementation
    const response = await fetch('https://your-time-api.com/now');
    const data = await response.json();
    return new Date(data.timestamp);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await fetch('https://your-time-api.com/health');
      return true;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'custom';
  }

  getPriority(): number {
    return 3;
  }
}

// Register the provider
import { ProviderFactory } from '@strix-ai/currentdt-mcp';
ProviderFactory.register('custom', () => new CustomTimeProvider());
```

### Programmatic Usage

```typescript
import { DateTimeService } from '@strix-ai/currentdt-mcp';

const service = new DateTimeService();

// Get current datetime with default format
const now = await service.getCurrentDateTime();
console.log(now); // "2025-08-22T14:30:00.000Z"

// Get with custom format
const formatted = await service.getCurrentDateTime({
  format: 'YYYY-MM-DD HH:mm:ss'
});
console.log(formatted); // "2025-08-22 14:30:00"

// Get with specific provider
const remote = await service.getCurrentDateTime({
  provider: 'remote'
});
console.log(remote); // "2025-08-22T14:30:00.000Z"
```

## npm Scripts

When developing or contributing to the project, use these npm scripts:

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run watch        # Watch mode for development

# Testing
npm test             # Run all tests
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests
npm run test:coverage     # Run tests with coverage report

# Quality Assurance
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Run Prettier formatter
npm run type-check   # TypeScript type checking

# Release
npm run prepublish   # Pre-publish checks and build
npm run publish      # Publish to npm registry
npm run docs         # Generate API documentation
```

## Troubleshooting

### Common Issues

#### Tool Not Available in AI Assistant

1. **Check Installation:**
   ```bash
   npm list -g @strix-ai/currentdt-mcp
   ```

2. **Verify MCP Configuration:**
   - Ensure correct JSON syntax in configuration file
   - Check file paths and permissions
   - Restart your MCP client after configuration changes

3. **Test Server Directly:**
   ```bash
   npx @strix-ai/currentdt-mcp --test
   ```

#### Incorrect DateTime Format

1. **Validate Format String:**
   ```bash
   npx @strix-ai/currentdt-mcp --validate-format "YYYY-MM-DD"
   ```

2. **Check Configuration:**
   - Verify `defaultFormat` setting
   - Ensure custom formats are properly defined

#### Provider Connection Issues

1. **Test Provider Availability:**
   ```bash
   npx @strix-ai/currentdt-mcp --test-provider local
   npx @strix-ai/currentdt-mcp --test-provider remote
   ```

2. **Check Network Connectivity:**
   - Verify internet connection for remote providers
   - Check firewall settings
   - Validate remote provider URLs

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export CURRENTDT_DEBUG=true
npx @strix-ai/currentdt-mcp
```

Or in configuration file:
```json
{
  "debug": true,
  "logLevel": "debug"
}
```

### Performance Issues

1. **Disable Unnecessary Providers:**
   ```json
   {
     "providers": {
       "remote": {
         "enabled": false
       }
     }
   }
   ```

2. **Adjust Cache Settings:**
   ```json
   {
     "cache": {
       "enabled": true,
       "ttl": 5000
     }
   }
   ```

## API Reference

### Tool: get_current_datetime

**Description:** Get the current date and time

**Parameters:**
- `format` (optional): Date format specification
  - `"iso"` (default): ISO 8601 format
  - Custom format string using standard tokens
- `provider` (optional): DateTime provider selection
  - `"local"` (default): System clock
  - `"remote"`: Network time service
  - Custom provider name

**Returns:**
- `string`: Formatted current datetime

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

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. **Clone Repository:**
   ```bash
   git clone https://github.com/strix-ai/currentdt-mcp.git
   cd currentdt-mcp
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Development:**
   ```bash
   npm run dev
   ```

4. **Run Tests:**
   ```bash
   npm test
   ```

### Code Quality

- Follow TypeScript best practices
- Maintain test coverage above 90%
- Use ESLint and Prettier for code formatting
- Document all public APIs
- Follow semantic versioning

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/strix-ai/currentdt-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/strix-ai/currentdt-mcp/discussions)
- **Email:** biswajitmailid@gmail.com
- **Website:** [biswajitpanday.github.io](https://biswajitpanday.github.io)

## Changelog

### [1.0.0] - 2025-08-22
- Initial release
- Core datetime functionality
- MCP protocol support
- Configurable formats and providers
- Support for major MCP clients

---

**Made with ❤️ by [Biswajit Panday](https://biswajitpanday.github.io)**