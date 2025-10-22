declare module 'ioredis' {
  export default class Redis {
    constructor(url: string);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline(): any;
    // Add other methods as needed
  }
}
