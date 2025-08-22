#!/usr/bin/env node

/**
 * MCP Integration Test Script
 * 
 * This script simulates MCP client interactions to test the currentdt-mcp server
 * without needing a full MCP client like Cursor or Claude Desktop.
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVER_PATH = path.join(__dirname, '..', 'dist', 'index.js');

function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration for @strix-ai/currentdt-mcp\n');

  // Test 1: Basic server startup
  console.log('1. Testing server startup...');
  
  const server = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  
  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  // Test 2: Send MCP initialization
  console.log('2. Sending MCP initialization...');
  
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Test 3: List tools
  setTimeout(() => {
    console.log('3. Requesting tool list...');
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 1000);

  // Test 4: Call datetime tool
  setTimeout(() => {
    console.log('4. Calling get_current_datetime tool...');
    
    const toolCallRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_current_datetime',
        arguments: {
          format: 'YYYY-MM-DD HH:mm:ss'
        }
      }
    };

    server.stdin.write(JSON.stringify(toolCallRequest) + '\n');
  }, 2000);

  // Test 5: Another tool call with different format
  setTimeout(() => {
    console.log('5. Testing custom format...');
    
    const toolCallRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_current_datetime',
        arguments: {
          format: 'filename'
        }
      }
    };

    server.stdin.write(JSON.stringify(toolCallRequest) + '\n');
  }, 3000);

  // Cleanup and results
  setTimeout(() => {
    console.log('\n📋 Server Output:');
    console.log(serverOutput);
    
    server.kill('SIGTERM');
    
    setTimeout(() => {
      console.log('\n✅ MCP Integration test completed!');
      console.log('\nTo test with real MCP clients:');
      console.log('- Use the configuration files in examples/mcp-configs/');
      console.log('- Install globally: npm install -g @strix-ai/currentdt-mcp');
      console.log('- Configure your MCP client and restart it');
    }, 500);
  }, 4000);
}

// Run the test
if (require.main === module) {
  testMCPIntegration();
}

module.exports = { testMCPIntegration };