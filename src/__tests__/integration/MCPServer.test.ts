import { MCPServer } from '../../server/MCPServer';
import { DateTimeService } from '../../services/DateTimeService';
import { ToolRegistry } from '../../server/ToolRegistry';

describe('MCPServer Integration', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer();
  });

  afterEach(async () => {
    // Clean up if server was started
    try {
      await server.stop();
    } catch {
      // Server might not be running
    }
  });

  describe('Server Initialization', () => {
    it('should create server with correct components', () => {
      expect(server).toBeInstanceOf(MCPServer);
      expect(server.getDateTimeService()).toBeInstanceOf(DateTimeService);
      expect(server.getToolRegistry()).toBeInstanceOf(ToolRegistry);
    });

    it('should have get_current_datetime tool registered', () => {
      const toolRegistry = server.getToolRegistry();
      expect(toolRegistry.has('get_current_datetime')).toBe(true);
      
      const tool = toolRegistry.get('get_current_datetime');
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('get_current_datetime');
    });

    it('should have correct tool schema', () => {
      const toolRegistry = server.getToolRegistry();
      const tool = toolRegistry.get('get_current_datetime');
      
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.inputSchema.properties).toHaveProperty('format');
      expect(tool!.inputSchema.properties).toHaveProperty('provider');
      expect(tool!.inputSchema.required).toEqual([]);
    });
  });

  describe('Tool Integration', () => {
    it('should list tools correctly', async () => {
      const toolRegistry = server.getToolRegistry();
      const tools = toolRegistry.getAllAsTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get_current_datetime');
      expect(tools[0].description).toContain('current date and time');
    });

    it('should have valid tool schema structure', () => {
      const toolRegistry = server.getToolRegistry();
      const tools = toolRegistry.getAllAsTools();
      const tool = tools[0];
      
      expect(tool.inputSchema.properties.format).toBeDefined();
      expect(tool.inputSchema.properties.provider).toBeDefined();
      expect(tool.inputSchema.properties.format.type).toBe('string');
      expect(tool.inputSchema.properties.provider.type).toBe('string');
    });
  });

  describe('Service Integration', () => {
    it('should integrate datetime service correctly', async () => {
      const dateTimeService = server.getDateTimeService();
      
      const result = await dateTimeService.getCurrentDateTime();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle service configuration', () => {
      const dateTimeService = server.getDateTimeService();
      const providers = dateTimeService.getSupportedProviders();
      
      expect(providers).toContain('local');
      expect(Array.isArray(providers)).toBe(true);
    });
  });
});