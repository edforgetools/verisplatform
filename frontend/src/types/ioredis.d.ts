declare module "ioredis" {
  export default class Redis {
    constructor(url: string);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline(): any;
    get(key: string): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    del(key: string): Promise<number>;
    // Add other methods as needed
  }
}
