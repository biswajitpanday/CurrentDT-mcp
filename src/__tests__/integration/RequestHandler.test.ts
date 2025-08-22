import { RequestHandler } from '../../server/RequestHandler';
import { DateTimeService } from '../../services/DateTimeService';
import { ToolRegistry, GET_CURRENT_DATETIME_TOOL } from '../../server/ToolRegistry';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

describe('RequestHandler Integration', () => {
  let requestHandler: RequestHandler;
  let dateTimeService: DateTimeService;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    dateTimeService = new DateTimeService();
    toolRegistry = new ToolRegistry();
    toolRegistry.register(GET_CURRENT_DATETIME_TOOL);
    requestHandler = new RequestHandler(dateTimeService, toolRegistry);
  });

  describe('Tool Call Handling', () => {
    it('should handle get_current_datetime with no arguments', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_current_datetime',
          arguments: {}
        }
      };

      const result = await requestHandler.handleToolCall(request);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle get_current_datetime with format argument', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_current_datetime',
          arguments: {
            format: 'YYYY-MM-DD'
          }
        }
      };

      const result = await requestHandler.handleToolCall(request);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle get_current_datetime with provider argument', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_current_datetime',
          arguments: {
            provider: 'local'
          }
        }
      };

      const result = await requestHandler.handleToolCall(request);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should handle get_current_datetime with both arguments', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_current_datetime',
          arguments: {
            format: 'YYYY-MM-DD HH:mm:ss',
            provider: 'local'
          }
        }
      };

      const result = await requestHandler.handleToolCall(request);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should throw error for unknown tool', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      await expect(requestHandler.handleToolCall(request)).rejects.toThrow();
    });

    it('should handle invalid arguments gracefully', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_current_datetime',
          arguments: {
            format: 'INVALID_FORMAT'
          }
        }
      };

      await expect(requestHandler.handleToolCall(request)).rejects.toThrow();
    });
  });

  describe('Tool Listing', () => {
    it('should list available tools', async () => {
      const result = await requestHandler.handleListTools();
      
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('get_current_datetime');
      expect(result.tools[0].description).toContain('current date and time');
    });

    it('should return tools with correct schema', async () => {
      const result = await requestHandler.handleListTools();
      const tool = result.tools[0];
      
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('format');
      expect(tool.inputSchema.properties).toHaveProperty('provider');
    });
  });
});