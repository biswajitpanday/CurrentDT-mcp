import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MCPServer } from '../../server/MCPServer';
import { GET_CURRENT_DATETIME } from '../../server/tools';

/**
 * Drives the server through the real protocol: a Client on one end of an in-memory
 * transport, the production MCPServer on the other. Anything a stdio client would see
 * -- capability negotiation, schema validation, structuredContent, isError -- goes
 * through the same code path here.
 */
describe('MCPServer over the MCP protocol', () => {
  let server: MCPServer;
  let client: Client;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = new MCPServer();
    await server.connect(serverTransport);
    client = new Client({ name: 'integration-test', version: '0.0.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.stop(); // must not exit the process -- see MCPServer.stop()
  });

  const call = (args: Record<string, unknown> = {}) =>
    client.callTool({ name: GET_CURRENT_DATETIME, arguments: args }) as Promise<CallToolResult>;

  const textOf = (result: CallToolResult): string => {
    const block = result.content[0];
    if (block.type !== 'text') throw new Error(`expected text block, got ${block.type}`);
    return block.text;
  };

  describe('handshake', () => {
    it('advertises tools and prompts, and sends instructions', () => {
      const caps = client.getServerCapabilities();
      expect(caps?.tools).toBeDefined();
      expect(caps?.prompts).toBeDefined();
      expect(client.getInstructions()).toMatch(/get_current_datetime/);
    });

    it('reports the package.json version, not a hardcoded one', () => {
      const { version } = require('../../../package.json');
      expect(client.getServerVersion()?.version).toBe(version);
    });

    it('returns an empty prompt list rather than method-not-found', async () => {
      const { prompts } = await client.listPrompts();
      expect(prompts).toEqual([]);
    });
  });

  describe('tools/list', () => {
    it('exposes exactly one tool with input schema, output schema and annotations', async () => {
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(1);

      const [tool] = tools;
      expect(tool.name).toBe(GET_CURRENT_DATETIME);
      expect(tool.inputSchema.properties).toHaveProperty('format');
      expect(tool.inputSchema.properties).toHaveProperty('provider');
      expect(tool.outputSchema?.properties).toHaveProperty('iso');
      expect(tool.outputSchema?.properties).toHaveProperty('local');
      expect(tool.outputSchema?.properties).toHaveProperty('timezone');
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(false);
    });

    it('does not declare a default for format -- the default is configuration-driven', async () => {
      const { tools } = await client.listTools();
      const format = tools[0].inputSchema.properties?.format as Record<string, unknown>;
      expect(format).not.toHaveProperty('default');
    });
  });

  describe('tools/call', () => {
    it('returns the formatted string as text AND the full instant as structuredContent', async () => {
      const result = await call();
      expect(result.isError).toBeFalsy();

      const sc = result.structuredContent as Record<string, unknown>;
      expect(textOf(result)).toBe(sc.formatted);
      expect(sc.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(sc.utc).toBe(sc.iso);
      expect(sc.local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/);
      expect(sc.offset).toMatch(/^[+-]\d{2}:\d{2}$/);
      expect(typeof sc.timezone).toBe('string');
      expect(typeof sc.epochMs).toBe('number');
      expect(sc.provider).toBe('local');
    });

    it('states one instant from every clock -- iso, local and epochMs agree', async () => {
      const sc = (await call()).structuredContent as Record<string, string | number>;
      expect(new Date(sc.iso as string).getTime()).toBe(sc.epochMs);
      expect(new Date(sc.local as string).getTime()).toBe(sc.epochMs);
    });

    it('honours a token format in the text content while structuredContent stays complete', async () => {
      const result = await call({ format: 'YYYY-MM-DD' });
      expect(textOf(result)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc.iso).toMatch(/Z$/);
    });

    it('ignores unknown arguments instead of failing the call', async () => {
      // v1's schema was .strict(); a client that sent an extra key got a hard error.
      const result = await call({ timezone: 'Asia/Tokyo' });
      expect(result.isError).toBeFalsy();
    });

    it('rejects a token-less format as a tool error, never echoes it', async () => {
      const result = await call({ format: 'what time is it' });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toMatch(/Invalid format string/);
      expect(textOf(result)).not.toBe('what time is it');
    });

    it('rejects prototype-chain names cleanly', async () => {
      const result = await call({ format: 'constructor' });
      expect(result.isError).toBe(true);
      expect(textOf(result)).not.toMatch(/is not a function/);
    });

    it('rejects a provider outside the enum with a readable tool error', async () => {
      // The SDK validates against inputSchema and reports the failure as an isError
      // result, so the model sees the allowed values and can retry.
      const result = await call({ provider: 'nonexistent' });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toMatch(/'local' \| 'remote'/);
    });
  });
});
