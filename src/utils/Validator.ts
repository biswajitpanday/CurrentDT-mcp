import { z } from 'zod';
import { DateTimeOptionsSchema } from '../types/MCPTypes';
import { DateFormatter } from './DateFormatter';

export class Validator {
  static validateDateTimeOptions(options: any): { success: boolean; data?: any; errors?: string[] } {
    try {
      // Handle null/undefined by providing defaults
      const sanitizedOptions = options || {};
      
      const result = DateTimeOptionsSchema.safeParse(sanitizedOptions);
      if (result.success) {
        // Additional validation for format
        if (result.data.format && result.data.format !== 'iso' && !DateFormatter.validateFormat(result.data.format)) {
          return {
            success: false,
            errors: [`Invalid format string: ${result.data.format}`],
          };
        }
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  }

  static validateProvider(provider: string, availableProviders: string[]): boolean {
    return availableProviders.includes(provider);
  }

  static validateFormat(format: string): boolean {
    return DateFormatter.validateFormat(format);
  }

  static sanitizeInput(input: any): any {
    if (input === null || input === undefined) {
      return {};
    }

    if (typeof input !== 'object') {
      return {};
    }

    // Remove any potentially dangerous properties
    const sanitized = { ...input };
    delete sanitized.__proto__;
    delete sanitized.constructor;
    delete sanitized.prototype;

    return sanitized;
  }

  static isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static isValidDateString(dateString: string): boolean {
    if (typeof dateString !== 'string' || dateString.trim() === '') {
      return false;
    }

    const date = new Date(dateString);
    return this.isValidDate(date);
  }
}