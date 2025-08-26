# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@biswajitpanday/currentdt-mcp is an MCP (Model Context Protocol) server that provides AI assistants with real-time access to current date and time information. The project is implemented in TypeScript and distributed as an npm package under the @strix-ai organization.

## Development Commands

Since this is a new project, standard npm development commands will be needed:

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
```

## Architecture Overview

The project follows clean architecture principles with these core layers:

### Core Components
- **MCP Server**: Handles MCP protocol communication and tool registration
- **DateTime Service**: Core business logic for datetime operations
- **Provider System**: Pluggable datetime sources (local, remote, custom)
- **Configuration Manager**: Handles config loading and validation
- **Tool Registry**: Manages MCP tool definitions and routing

### Key Design Patterns
- **Factory Pattern**: For provider creation and management (`ProviderFactory`)
- **Strategy Pattern**: For multiple datetime providers (`IDateTimeProvider` implementations)
- **Singleton Pattern**: For configuration management and server instance

### Project Structure
```
src/
├── server/           # MCP server implementation
├── services/         # Core business logic (DateTimeService, ConfigurationManager)
├── providers/        # DateTime provider implementations
├── types/            # TypeScript type definitions
├── utils/            # Utilities (formatting, validation, logging)
└── index.ts          # Entry point
```

## Key Interfaces

The project is built around these core abstractions:

```typescript
interface IDateTimeProvider {
  getCurrentDateTime(): Promise<Date>;
  isAvailable(): Promise<boolean>;
  getName(): string;
  getPriority(): number;
}

interface IDateTimeService {
  getCurrentDateTime(options?: DateTimeOptions): Promise<string>;
  validateFormat(format: string): boolean;
  getSupportedProviders(): string[];
}
```

## MCP Tool Implementation

The main MCP tool is `get_current_datetime` which:
- Accepts optional `format` parameter (iso/custom formats)
- Accepts optional `provider` parameter (local/remote/custom)
- Returns formatted datetime string via MCP protocol

## Configuration System

Supports multiple configuration sources:
- `currentdt-config.json` files (project root or home directory)
- Environment variables (CURRENTDT_*)
- Runtime configuration via MCP tool parameters

## Testing Strategy

Following testing pyramid approach:
- **70% Unit Tests**: Individual components (services, providers, utilities)
- **20% Integration Tests**: Component interactions and MCP protocol
- **10% E2E Tests**: Full workflow with MCP clients

## Extension Points

The architecture supports extensibility through:
- Custom datetime providers via `IDateTimeProvider`
- Custom date formatters
- Plugin system for additional functionality
- Middleware hooks for request/response processing

## Development Priorities

1. **Clean Code**: Follow SOLID principles and maintain readable code
2. **Type Safety**: Comprehensive TypeScript usage
3. **Error Handling**: Robust error handling with fallback mechanisms
4. **Performance**: Caching strategies and efficient provider switching
5. **Documentation**: Self-documenting code and comprehensive API docs

## Common Tasks

When working on this project:
- New providers should implement `IDateTimeProvider` interface
- All datetime operations should go through `DateTimeService`
- Configuration changes should be validated via schema
- MCP tools should be registered through `ToolRegistry`
- Use the provider factory for creating provider instances

## Distribution

The project targets npm distribution with:
- Global installation for system-wide MCP server access
- Local installation for project-specific usage
- Integration with major MCP clients (Cursor, Claude Desktop, VS Code, Windsurf)