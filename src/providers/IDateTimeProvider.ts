export interface IDateTimeProvider {
  getCurrentDateTime(): Promise<Date>;
  isAvailable(): Promise<boolean>;
  getName(): string;
  getPriority(): number;
}