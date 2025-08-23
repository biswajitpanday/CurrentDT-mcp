#!/usr/bin/env node

import { MCPServer } from './server/MCPServer';
import { Logger } from './utils/Logger';

async function main() {
  const logger = Logger.getInstance();
  
  try {
    // Handle CLI arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
@strix-ai/currentdt-mcp - Current DateTime MCP Server

USAGE:
  currentdt-mcp [OPTIONS]

OPTIONS:
  --help, -h          Show this help message
  --version, -v       Show version information
  --test              Test the datetime service
  --validate-format   Validate a format string
  --test-provider     Test a specific provider

EXAMPLES:
  currentdt-mcp                                    # Start MCP server
  currentdt-mcp --test                            # Test functionality
  currentdt-mcp --validate-format "YYYY-MM-DD"   # Validate format
  currentdt-mcp --test-provider local             # Test provider

ENVIRONMENT VARIABLES:
  CURRENTDT_FORMAT     Override default date format
  CURRENTDT_PROVIDER   Override default provider
  CURRENTDT_DEBUG      Enable debug logging (true/false)
  CURRENTDT_CONFIG     Custom configuration file path

For more information, visit: https://github.com/biswajitpanday/CurrentDT-mcp
      `);
      process.exit(0);
    }
    
    if (args.includes('--version') || args.includes('-v')) {
      const packageJson = require('../package.json');
      console.log(`@strix-ai/currentdt-mcp v${packageJson.version}`);
      process.exit(0);
    }

    if (args.includes('--test')) {
      await runTests();
      process.exit(0);
    }

    const formatIndex = args.indexOf('--validate-format');
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      await validateFormat(args[formatIndex + 1]);
      process.exit(0);
    }

    const providerIndex = args.indexOf('--test-provider');
    if (providerIndex !== -1 && args[providerIndex + 1]) {
      await testProvider(args[providerIndex + 1]);
      process.exit(0);
    }

    // Start MCP server
    const server = new MCPServer();
    await server.start();
    
  } catch (error) {
    logger.fatal('Application startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

async function runTests() {
  const { DateTimeService } = await import('./services/DateTimeService');
  const { ConfigurationManager } = await import('./services/ConfigurationManager');
  
  console.log('🧪 Testing @strix-ai/currentdt-mcp...\n');
  
  try {
    // Test configuration loading
    console.log('1. Testing configuration...');
    const configManager = ConfigurationManager.getInstance();
    await configManager.loadConfig();
    const config = configManager.getConfig();
    console.log(`   ✅ Configuration loaded (format: ${config.defaultFormat}, provider: ${config.defaultProvider})\n`);
    
    // Test datetime service
    console.log('2. Testing datetime service...');
    const service = new DateTimeService(config);
    
    // Test default (ISO) format
    const isoDateTime = await service.getCurrentDateTime();
    console.log(`   ✅ ISO format: ${isoDateTime}`);
    
    // Test custom format
    const customDateTime = await service.getCurrentDateTime({ format: 'YYYY-MM-DD HH:mm:ss' });
    console.log(`   ✅ Custom format: ${customDateTime}`);
    
    // Test filename format
    const filenameDateTime = await service.getCurrentDateTime({ format: 'YYYY-MM-DD-HHmmss' });
    console.log(`   ✅ Filename format: ${filenameDateTime}\n`);
    
    // Test providers
    console.log('3. Testing providers...');
    const providers = service.getSupportedProviders();
    console.log(`   ✅ Available providers: ${providers.join(', ')}\n`);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function validateFormat(format: string) {
  const { DateFormatter } = await import('./utils/DateFormatter');
  
  console.log(`🔍 Validating format: "${format}"\n`);
  
  const isValid = DateFormatter.validateFormat(format);
  
  if (isValid) {
    const example = DateFormatter.getFormatExample(format);
    console.log(`✅ Format is valid`);
    console.log(`📋 Example output: ${example}`);
  } else {
    console.log(`❌ Format is invalid`);
    console.log(`📚 Supported tokens: ${Object.keys(DateFormatter.getSupportedTokens()).join(', ')}`);
    process.exit(1);
  }
}

async function testProvider(providerName: string) {
  const { ProviderFactory } = await import('./providers/ProviderFactory');
  
  console.log(`🔍 Testing provider: "${providerName}"\n`);
  
  try {
    const factory = new ProviderFactory();
    const provider = factory.create(providerName);
    
    console.log(`📋 Provider: ${provider.getName()}`);
    console.log(`⚡ Priority: ${provider.getPriority()}`);
    
    const isAvailable = await provider.isAvailable();
    console.log(`🔗 Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    
    if (isAvailable) {
      const datetime = await provider.getCurrentDateTime();
      console.log(`🕐 Current time: ${datetime.toISOString()}`);
    }
    
  } catch (error) {
    console.error(`❌ Provider test failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = Logger.getInstance();
  logger.fatal('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const logger = Logger.getInstance();
  logger.fatal('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
  process.exit(1);
});

if (require.main === module) {
  main();
}