import { 
  CallToolRequest, 
  CallToolResult, 
  GetPromptRequest, 
  GetPromptResult,
  ErrorCode, 
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { DateTimeService } from '../services/DateTimeService';
import { ToolRegistry } from './ToolRegistry';
import { Logger } from '../utils/Logger';
import { DateTimeError, ProviderError, ConfigurationError } from '../types/MCPTypes';

export class RequestHandler {
  private dateTimeService: DateTimeService;
  private toolRegistry: ToolRegistry;
  private logger: Logger;

  constructor(dateTimeService: DateTimeService, toolRegistry: ToolRegistry) {
    this.dateTimeService = dateTimeService;
    this.toolRegistry = toolRegistry;
    this.logger = Logger.getInstance();
  }

  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;
    
    this.logger.info('Tool call received', { 
      toolName: name, 
      arguments: args 
    });

    try {
      if (!this.toolRegistry.has(name)) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool '${name}' not found`
        );
      }

      switch (name) {
        case 'get_current_datetime':
          return await this.handleGetCurrentDateTime(args);
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Handler not implemented for tool '${name}'`
          );
      }
    } catch (error) {
      this.logger.error('Tool call failed', {
        toolName: name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof McpError) {
        throw error;
      }

      if (error instanceof DateTimeError || error instanceof ProviderError) {
        throw new McpError(
          ErrorCode.InternalError,
          error.message,
          {
            provider: error.provider,
            format: error.format,
            details: error.details
          }
        );
      }

      if (error instanceof ConfigurationError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          error.message,
          {
            configPath: error.configPath,
            validationErrors: error.validationErrors
          }
        );
      }

      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async handleGetCurrentDateTime(args: any): Promise<CallToolResult> {
    try {
      const datetime = await this.dateTimeService.getCurrentDateTime(args);

      this.logger.debug('DateTime retrieved successfully', { 
        datetime,
        format: args?.format,
        provider: args?.provider 
      });

      return {
        content: [
          {
            type: 'text',
            text: datetime
          }
        ]
      };
    } catch (error) {
      // Let the parent handler deal with error transformation
      throw error;
    }
  }

  async handleListTools(): Promise<{ tools: any[] }> {
    const tools = this.toolRegistry.getAllAsTools();
    
    this.logger.debug('Tools listed', { 
      toolCount: tools.length,
      toolNames: tools.map(t => t.name)
    });

    return { tools };
  }

  async handleListPrompts(): Promise<{ prompts: any[] }> {
    // Return empty prompts array for Cursor compatibility
    // This MCP server focuses on tools, not prompts
    this.logger.debug('Prompts listed (empty for Cursor compatibility)');
    
    return { prompts: [] };
  }

  async handleGetPrompt(request: GetPromptRequest): Promise<GetPromptResult> {
    // Since we don't have prompts, this should never be called
    // But we need it for protocol compliance
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Prompt '${request.params.name}' not found - this MCP server provides tools, not prompts`
    );
  }
}