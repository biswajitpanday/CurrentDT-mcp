import { IDateTimeProvider } from './IDateTimeProvider';

export class LocalProvider implements IDateTimeProvider {
  private readonly name = 'local';
  private readonly priority = 1;

  async getCurrentDateTime(): Promise<Date> {
    return new Date();
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return this.name;
  }

  getPriority(): number {
    return this.priority;
  }
}