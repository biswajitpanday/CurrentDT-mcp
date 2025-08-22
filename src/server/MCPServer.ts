import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DateTimeService } from '../services/DateTimeService';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { ToolRegistry, GET_CURRENT_DATETIME_TOOL } from './ToolRegistry';
import { RequestHandler } from './RequestHandler';
import { Logger } from '../utils/Logger';

export class MCPServer {
  private server: Server;
  private dateTimeService: DateTimeService;
  private configManager: ConfigurationManager;
  private toolRegistry: ToolRegistry;
  private requestHandler: RequestHandler;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    this.configManager = ConfigurationManager.getInstance();
    this.toolRegistry = new ToolRegistry();
    
    // Initialize services with configuration
    const config = this.configManager.getConfig();
    this.dateTimeService = new DateTimeService(config);
    this.requestHandler = new RequestHandler(this.dateTimeService, this.toolRegistry);

    // Create MCP server
    this.server = new Server(
      {
        name: '@strix-ai/currentdt-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.registerTools();
    this.setupConfigurationWatcher();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await this.requestHandler.handleListTools();
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.requestHandler.handleToolCall(request);
    });

    this.logger.debug('MCP server handlers configured');
  }

  private registerTools(): void {
    this.toolRegistry.register(GET_CURRENT_DATETIME_TOOL);
    
    this.logger.info('Tools registered', { 
      toolCount: this.toolRegistry.getAll().length,
      tools: this.toolRegistry.getAll().map(t => t.name)
    });
  }

  private setupConfigurationWatcher(): void {
    this.configManager.onConfigChange((newConfig) => {
      this.logger.info('Configuration changed, updating services');
      this.dateTimeService.updateConfiguration(newConfig);
    });
  }

  async start(): Promise<void> {
    try {
      // Load configuration
      await this.configManager.loadConfig();
      this.configManager.watchConfig();

      // Create transport and connect
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('MCP server started successfully', {
        name: '@strix-ai/currentdt-mcp',
        version: '1.0.0',
        capabilities: ['tools'],
        toolCount: this.toolRegistry.getAll().length
      });

      // Keep the process running
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      this.logger.fatal('Failed to start MCP server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      this.logger.info('MCP server stopped gracefully');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error stopping MCP server', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  }

  getServer(): Server {
    return this.server;
  }

  getDateTimeService(): DateTimeService {
    return this.dateTimeService;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}