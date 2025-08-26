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
  description: 'Get the current date and time with optional formatting and provider selection. Essential for creating timestamped files, logs, database migrations, and any time-sensitive development tasks. Supports ISO format (default) and custom formats using tokens like YYYY, MM, DD, HH, mm, ss, SSS.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Date format: "iso" for ISO 8601 (default), or custom format using tokens (YYYY, MM, DD, HH, mm, ss, SSS). Common examples: "iso", "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "MM/DD/YYYY", "YYYY-MM-DD-HHmmss"',
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