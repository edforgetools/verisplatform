/// <reference types="jest" />

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> {
      mockResolvedValue(value: T | PromiseLike<T>): this;
      mockRejectedValue(value: any): this;
      mockReturnValue(value: T): this;
      mockImplementation(fn: (...args: Y) => T): this;
    }
  }
}

// Extend Jest mock types for better compatibility
declare module "@jest/globals" {
  interface Mock<T = any, Y extends any[] = any[]> {
    mockResolvedValue(value: T | PromiseLike<T>): this;
    mockRejectedValue(value: any): this;
    mockReturnValue(value: T): this;
    mockImplementation(fn: (...args: Y) => T): this;
  }
}

export {};
