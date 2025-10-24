declare module "arweave" {
  export default class Arweave {
    constructor(config?: any);
    static init(config?: any): Arweave;
    arql(query: any): Promise<any[]>;
    createTransaction(data: any, wallet?: any): any;
    transactions: {
      post(transaction: any): Promise<any>;
      get(id: string): Promise<any>;
      sign(transaction: any, wallet: any): Promise<void>;
    };
    wallets: {
      generate(): any;
      jwkToAddress(jwk: any): string;
    };
    crypto: {
      hash(data: any): Promise<Uint8Array>;
    };
  }
}
