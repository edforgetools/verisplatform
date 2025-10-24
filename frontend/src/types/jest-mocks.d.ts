import { jest } from '@jest/globals';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> {
      mockResolvedValue(value: T | PromiseLike<T>): this;
      mockRejectedValue(value: any): this;
      mockReturnValue(value: T): this;
      mockImplementation(fn: (...args: Y) => T): this;
      mockResolvedValueOnce(value: T | PromiseLike<T>): this;
      mockRejectedValueOnce(value: any): this;
      mockReturnValueOnce(value: T): this;
    }
  }
}

// Extend the jest namespace for better mock typing
declare module '@jest/globals' {
  interface Mock<T = any, Y extends any[] = any[]> {
    mockResolvedValue(value: T | PromiseLike<T>): this;
    mockRejectedValue(value: any): this;
    mockReturnValue(value: T): this;
    mockImplementation(fn: (...args: Y) => T): this;
    mockResolvedValueOnce(value: T | PromiseLike<T>): this;
    mockRejectedValueOnce(value: any): this;
    mockReturnValueOnce(value: T): this;
  }
}

export {};
