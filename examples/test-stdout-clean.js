#!/usr/bin/env node

/**
 * Test script to verify stdout only contains valid JSON-RPC messages
 * This simulates exactly what an MCP client expects
 */

const { spawn } = require('child_process');
const path = require('path');

function testStdoutCleanliness() {
  console.log('🧪 Testing stdout cleanliness for MCP compatibility\n');

  const server = spawn('currentdt-mcp', [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdoutData = '';
  let stderrData = '';
  let jsonMessages = [];

  // Capture stdout (should only be JSON-RPC)
  server.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  // Capture stderr (logs should go here)
  server.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  // Send MCP initialization
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

  setTimeout(() => {
    server.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 100);

  // List tools
  setTimeout(() => {
    const listRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    };
    server.stdin.write(JSON.stringify(listRequest) + '\n');
  }, 500);

  // Call datetime tool
  setTimeout(() => {
    const toolRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_current_datetime',
        arguments: { format: 'iso' }
      }
    };
    server.stdin.write(JSON.stringify(toolRequest) + '\n');
  }, 1000);

  // Analyze results
  setTimeout(() => {
    server.kill('SIGTERM');

    console.log('📊 Analysis Results:\n');
    
    // Parse stdout messages
    const stdoutLines = stdoutData.split('\n').filter(line => line.trim());
    
    console.log(`✅ STDOUT Messages: ${stdoutLines.length}`);
    let validJsonRpc = 0;
    let invalidLines = [];

    stdoutLines.forEach((line, index) => {
      if (line.trim()) {
        try {
          const json = JSON.parse(line);
          if (json.jsonrpc === '2.0' && (json.id !== undefined || json.method !== undefined)) {
            validJsonRpc++;
            console.log(`   [${index + 1}] ✅ Valid JSON-RPC: ${json.method || 'response'}`);
          } else {
            invalidLines.push(`[${index + 1}] Invalid JSON-RPC structure`);
          }
        } catch (e) {
          invalidLines.push(`[${index + 1}] Invalid JSON: ${line.substring(0, 50)}...`);
        }
      }
    });

    if (invalidLines.length > 0) {
      console.log('\n❌ INVALID STDOUT CONTENT:');
      invalidLines.forEach(line => console.log(`   ${line}`));
    }

    // Check stderr
    const stderrLines = stderrData.split('\n').filter(line => line.trim());
    console.log(`\n📋 STDERR Messages: ${stderrLines.length}`);
    console.log(`   (Logs correctly redirected to stderr)\n`);

    // Final verdict
    if (invalidLines.length === 0 && validJsonRpc > 0) {
      console.log('🎉 SUCCESS: stdout is clean and contains only valid JSON-RPC messages!');
      console.log('✅ MCP client compatibility: FIXED');
    } else {
      console.log('❌ FAILURE: stdout contains non-JSON-RPC content');
      console.log('⚠️  MCP client compatibility: BROKEN');
    }

  }, 2000);
}

if (require.main === module) {
  testStdoutCleanliness();
}