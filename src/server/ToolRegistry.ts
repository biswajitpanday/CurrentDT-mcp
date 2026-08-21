import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getAllAsTools(): Tool[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }
}

// Define the get_current_datetime tool
export const GET_CURRENT_DATETIME_TOOL: ToolDefinition = {
  name: 'get_current_datetime',
  description: 'Get the current date and time with optional formatting and provider selection. Essential for creating timestamped files, logs, database migrations, and any time-sensitive development tasks. IMPORTANT: "iso" returns UTC; every token-based format returns the host machine\'s LOCAL time. Include the Z token to emit the actual UTC offset when using a token format.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Date format. "iso" (default) returns UTC, e.g. 2026-08-20T12:31:02.625Z. Any other value is a token pattern rendered in LOCAL time and must contain at least one token; free text is rejected. Tokens: YYYY, MM, DD, HH, mm, ss, SSS, Z (offset as +02:00, or Z at zero), ZZ (offset as +0200). Named patterns: filename, logdate, simple. Examples: "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD-HHmmss", "YYYY-MM-DDTHH:mm:ss.SSSZ" (local time with a correct offset).',
        default: 'iso'
      },
      provider: {
        type: 'string',
        description: 'DateTime provider: "local" for system clock (default), "remote" for network time service',
        default: 'local',
        enum: ['local', 'remote']
      }
    },
    required: []
  }
};