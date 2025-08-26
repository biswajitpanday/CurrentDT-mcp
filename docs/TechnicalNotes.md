# Technical Notes - @strix-ai/currentdt-mcp

> **Built for AI, Built with AI** - Technical insights from AI-guided development process v1.1.1

## MCP Compatibility Requirements

### Critical: stdout vs stderr
**MCP servers must only output JSON-RPC messages to stdout.** All logging, debugging, and informational output must go to stderr to maintain protocol compliance.

**Issue Fixed in v1.0.1:**
- Problem: Logger was using `console.log()` which pollutes stdout
- Solution: Changed to `process.stderr.write()` for all log output
- Result: Clean JSON-RPC communication, no more client validation errors

### JSON-RPC Protocol Compliance
- All MCP communication uses JSON-RPC 2.0
- Required fields: `jsonrpc: "2.0"`, `id`, `method` (for requests)
- Tool responses must include `content` array with `type` and `text`

## Performance Characteristics

### Tool Invocation Pattern
- **Demand-driven**: Only called when AI assistant needs datetime information
- **Not always-active**: Does not run on every user prompt
- **Typical use cases**: File naming, timestamps, date-related queries
- **Response time**: <100ms for local provider, <5s for remote provider

### Memory and Resource Usage
- **Package size**: ~20KB compressed, ~86KB unpacked
- **Runtime memory**: <10MB typical usage
- **Dependencies**: Minimal (MCP SDK + Zod only)

## Architecture Decisions

### Provider Pattern
- **Strategy Pattern**: Multiple datetime providers (local, remote, custom)
- **Factory Pattern**: Dynamic provider creation and management
- **Fallback Strategy**: Automatic degradation from remote to local

### Error Handling Strategy
- **Structured Errors**: Custom error classes with context
- **Graceful Degradation**: Continue functioning when providers fail
- **Validation**: Input sanitization and format validation
- **Logging**: Correlation IDs for request tracking

## Security Considerations

### Input Validation
- **Format Strings**: Whitelist of allowed format tokens
- **Provider Selection**: Validation against available providers
- **Sanitization**: Removal of dangerous object properties

### Network Security
- **HTTPS Only**: All remote provider communications
- **Timeouts**: Prevent hanging requests
- **Certificate Validation**: Strict SSL/TLS checking

## Development Patterns

### Code Quality Standards
- **TypeScript**: Full type safety with strict mode
- **SOLID Principles**: Clean architecture design
- **Testing**: Unit and integration test coverage
- **Documentation**: Self-documenting code

### Extension Points
- **Custom Providers**: Implement `IDateTimeProvider` interface
- **Custom Formatters**: Add new date formatting options
- **Middleware**: Request/response processing hooks
- **Configuration**: JSON config and environment variables

## Deployment Considerations

### npm Package Distribution
- **Global Installation**: System-wide MCP server access
- **Local Installation**: Project-specific usage
- **Binary CLI**: `currentdt-mcp` command available after install

### MCP Client Integration
- **Zero Configuration**: Works out-of-the-box
- **Standard Config**: JSON configuration for all major clients
- **Environment Variables**: Override defaults without config files

## Troubleshooting Common Issues

### MCP Client Not Recognizing Tool
1. Check MCP client configuration file syntax
2. Verify package is installed globally
3. Restart MCP client after configuration
4. Test with `currentdt-mcp --test`

### Invalid Format Errors
1. Validate format with `currentdt-mcp --validate-format "FORMAT"`
2. Check supported tokens: YYYY, MM, DD, HH, mm, ss, SSS
3. Use predefined formats: iso, filename, logdate, simple

### Provider Connection Issues
1. Test provider with `currentdt-mcp --test-provider PROVIDER`
2. Check network connectivity for remote providers
3. Verify provider configuration in config file

## Future Enhancements Roadmap

### Short-term (v1.1.1)
- Enhanced caching for performance
- Additional timezone support
- More predefined formats
- Improved error messages

### Medium-term (v1.2.0)
- Plugin architecture for custom providers
- Multiple remote provider support
- Advanced configuration validation
- Performance monitoring

### Long-term (v2.0.0)
- Cloud-hosted datetime services
- Team collaboration features
- Advanced analytics and monitoring
- Enterprise-grade security features