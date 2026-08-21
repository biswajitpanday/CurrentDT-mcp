import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DateTimeService } from '../services/DateTimeService';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { ToolRegistry, GET_CURRENT_DATETIME_TOOL } from './ToolRegistry';
import { RequestHandler } from './RequestHandler';
import { Logger } from '../utils/Logger';

// Single source of truth for the version reported in the MCP handshake. Hardcoding it
// here means `npm version` bumps package.json and leaves the handshake reporting stale.
const { version: SERVER_VERSION } = require('../../package.json');
const SERVER_NAME = '@strix-ai/currentdt-mcp';

export class MCPServer {
  private server: Server;
  private dateTimeService: DateTimeService;
  private configManager: ConfigurationManager;
  private toolRegistry: ToolRegistry;
  private requestHandler: RequestHandler;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    
    // Set quiet mode for MCP server (only errors to stderr)
    // This prevents logs from interfering with JSON-RPC on stdout
    this.logger.setLogLevel('error');
    
    this.configManager = ConfigurationManager.getInstance();
    this.toolRegistry = new ToolRegistry();
    
    // Initialize services with configuration
    const config = this.configManager.getConfig();
    this.dateTimeService = new DateTimeService(config);
    this.requestHandler = new RequestHandler(this.dateTimeService, this.toolRegistry);

    // Create MCP server
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.registerTools();
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

    // Handle prompts listing (required for Cursor compatibility)
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return await this.requestHandler.handleListPrompts();
    });

    // Handle prompt requests (required for Cursor compatibility)
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await this.requestHandler.handleGetPrompt(request);
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

  async start(): Promise<void> {
    try {
      // Load configuration, then push it into the service. The constructor can only see
      // defaults because loadConfig is async; without this the config file and every
      // CURRENTDT_* variable are silently ignored for the whole process lifetime.
      await this.configManager.loadConfig();
      this.dateTimeService.updateConfiguration(this.configManager.getConfig());

      // Create transport and connect
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('MCP server started successfully', {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        capabilities: ['tools', 'prompts'],
        toolCount: this.toolRegistry.getAll().length
      });

    } catch (error) {
      this.logger.fatal('Failed to start MCP server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  }

  /**
   * Closes the transport. Deliberately does NOT terminate the process -- exiting from
   * here kills any host that embeds the server, including the Jest worker running the
   * integration suite. Process lifetime is the caller's decision (see src/index.ts).
   */
  async stop(): Promise<void> {
    await this.server.close();
    this.logger.info('MCP server stopped gracefully');
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