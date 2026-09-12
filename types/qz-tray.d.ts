declare module "qz-tray" {
  type Resolver<T> = (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void;
  const qz: {
    websocket: {
      isActive(): boolean;
      connect(options?: Record<string, unknown>): Promise<void>;
      disconnect(): Promise<void>;
    };
    security: {
      setCertificatePromise(factory: () => Resolver<string>): void;
      setSignatureAlgorithm(algorithm: string): void;
      setSignaturePromise(factory: (request: string) => Resolver<string>): void;
    };
    printers: {
      find(query?: string): Promise<string | string[]>;
    };
    configs: {
      create(printer: string, options?: Record<string, unknown>): unknown;
    };
    print(config: unknown, data: Array<{ type: string; format: string; data: string }>): Promise<void>;
  };
  export default qz;
}
