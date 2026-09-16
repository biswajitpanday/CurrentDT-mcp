import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { DateTimeService } from '../services/DateTimeService';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { registerDateTimeTools } from './tools';
import { Logger } from '../utils/Logger';

// Single source of truth for the version reported in the MCP handshake. Hardcoding it
// here means `npm version` bumps package.json and leaves the handshake reporting stale.
const { version: SERVER_VERSION } = require('../../package.json');
const SERVER_NAME = '@strix-ai/currentdt-mcp';

// Sent to the client on initialize. Static text only: a date placed here at startup
// would go stale across midnight in a long-lived session, which is exactly the class
// of silent wrong data v1 shipped. Always-fresh date context is Phase 3 (resources).
const INSTRUCTIONS =
  'This server provides the current date and time. Your training data predates today, so ' +
  'never guess a date -- call get_current_datetime before writing any date, timestamp, year, ' +
  'changelog entry, migration filename or copyright line. Read the structuredContent of the ' +
  'result: `iso` and `utc` are UTC; `local`, `offset` and `timezone` describe the host clock.';

export class MCPServer {
  private server: McpServer;
  private dateTimeService: DateTimeService;
  private configManager: ConfigurationManager;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();

    // Quiet by default: stdout is JSON-RPC, and anything above error on stderr is
    // noise in a client's log pane. CURRENTDT_DEBUG re-raises the level after config
    // loads (DateTimeService.updateConfiguration).
    this.logger.setLogLevel('error');

    this.configManager = ConfigurationManager.getInstance();
    this.dateTimeService = new DateTimeService(this.configManager.getConfig());

    this.server = new McpServer(
      { name: SERVER_NAME, version: SERVER_VERSION },
      {
        instructions: INSTRUCTIONS,
        // Advertised explicitly even though no prompt is registered yet: some clients
        // call prompts/list unconditionally on connect and surface a -32601 as an error.
        capabilities: { prompts: {} },
      }
    );

    registerDateTimeTools(this.server, this.dateTimeService);

    // Empty prompt list for the clients described above. Phase 3 registers a real
    // prompt through McpServer, which owns this handler from then on -- remove this
    // block at that point, or McpServer will refuse to set its own.
    this.server.server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
  }

  /**
   * Load configuration and attach the given transport. Separated from start() so the
   * integration suite can drive the server over an in-memory transport.
   */
  async connect(transport: Transport): Promise<void> {
    // Config loads asynchronously, so the constructor only ever saw defaults. Without
    // this push the config file and every CURRENTDT_* variable are silently ignored.
    await this.configManager.loadConfig();
    this.dateTimeService.updateConfiguration(this.configManager.getConfig());

    await this.server.connect(transport);

    this.logger.info('MCP server connected', {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      transport: transport.constructor.name,
    });
  }

  /** Production entry point: stdio. Throws on failure; src/index.ts decides the exit. */
  async start(): Promise<void> {
    try {
      await this.connect(new StdioServerTransport());
    } catch (error) {
      this.logger.fatal('Failed to start MCP server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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

  getDateTimeService(): DateTimeService {
    return this.dateTimeService;
  }
}
