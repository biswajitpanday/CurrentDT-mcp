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
- **Format Support**: 
  - ISO 8601 format (default)
  - Custom formats using tokens (YYYY, MM, DD, HH, mm, ss, SSS)
  - Predefined formats (filename, logdate, simple)
- **Provider Support**:
  - Local system clock (default, priority 1)
  - Remote time services (configurable, priority 2)
  - Automatic fallback mechanisms
- **Error Handling**: Comprehensive error handling with structured responses
- **Logging**: Structured JSON logging with correlation IDs
- **Validation**: Input sanitization and format validation
- **Type Safety**: Full TypeScript implementation with Zod schemas

### Features
- ✅ Zero-configuration setup with sensible defaults
- ✅ MCP client integration (Cursor, Claude Desktop, VS Code, Windsurf)
- ✅ Configurable via JSON files and environment variables
- ✅ Extensible provider architecture
- ✅ Performance optimized with caching considerations
- ✅ Security focused with input validation
- ✅ Developer-friendly CLI with testing tools

### Documentation
- Complete API documentation
- Integration examples for all major MCP clients
- Configuration reference
- Troubleshooting guide
- Architecture documentation following SOLID principles

### Technical
- **Architecture**: Clean architecture with SOLID principles
- **Patterns**: Factory, Strategy, Singleton patterns
- **Testing**: Comprehensive unit and integration test suite
- **Build**: TypeScript compilation with ESLint and Prettier
- **Distribution**: npm package under @strix-ai organization

### Examples
- MCP client configuration files for all supported clients
- Sample configuration files
- Integration testing scripts
- CLI usage examples

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