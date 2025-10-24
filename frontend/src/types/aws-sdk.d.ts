declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }

  export class GetObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
    });
  }

  export class PutObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
      Body?: any;
      ContentType?: string;
      ContentEncoding?: string;
    });
  }

  export class HeadObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
    });
  }

  export class ListObjectsV2Command {
    constructor(input: {
      Bucket: string;
      Prefix?: string;
    });
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  export function getSignedUrl(
    client: any,
    command: any,
    options?: any
  ): Promise<string>;
}
