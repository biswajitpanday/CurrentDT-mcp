# Changelog

All notable changes to @strix-ai/currentdt-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-23

### Fixed
- **Critical MCP Fix**: Redirect all logs to stderr to prevent stdout pollution
- **JSON-RPC Compatibility**: Ensure only valid JSON-RPC messages on stdout
- **Client Validation**: Fix Zod validation errors in MCP clients
- **Logging Level**: Set default log level to 'error' for MCP server mode

### Technical Details
- Logger now uses `process.stderr.write()` instead of `console.log()`
- MCP server constructor sets quiet mode (error-level logging only)
- Configuration manager uses debug-level logging to prevent noise
- Maintains full functionality while fixing client compatibility

## [1.0.0] - 2025-08-22

### Added
- **Core MCP Server**: Full MCP protocol compliance with tool registration and request handling
- **DateTime Service**: Configurable datetime formatting and provider support
- **Provider System**: Local system clock and remote time service providers with fallback
- **Configuration Management**: JSON config files and environment variable support
- **CLI Interface**: Command-line tools for testing, validation, and help
- **MCP Tool**: `get_current_datetime` with optional format and provider parameters
- **Format Support**: ISO 8601, custom tokens (YYYY-MM-DD), predefined formats
- **Provider Support**: Local system clock, remote time services, automatic fallback
- **Error Handling**: Comprehensive error handling with structured responses
- **Type Safety**: Full TypeScript implementation with Zod schemas

### Features
- ✅ Zero-configuration setup with sensible defaults
- ✅ MCP client integration (Cursor, Claude Desktop, VS Code, Windsurf)
- ✅ Configurable via JSON files and environment variables
- ✅ Extensible provider architecture
- ✅ Security focused with input validation
- ✅ Developer-friendly CLI with testing tools

## [Unreleased]

### Planned for v1.1.0
- Enhanced remote provider configurations
- Timezone management improvements
- Performance optimizations with caching
- Additional predefined format options
- Plugin architecture for custom providers

### Planned for v2.0.0
- Multiple remote provider support with load balancing
- Advanced caching strategies
- Cloud integration options
- Team collaboration features
- Analytics and monitoring capabilities