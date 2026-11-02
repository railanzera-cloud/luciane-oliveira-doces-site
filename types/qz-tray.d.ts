/** QZ Tray 2.x contract used by the Windows 58 mm kitchen station.
 * Browser runtime is the qz-tray package; types never enable anonymous printing.
 */
declare module "qz-tray" {
  const qz: {
    websocket: {
      isActive(): boolean;
      connect(options?: { retries?: number; delay?: number }): Promise<void>;
      disconnect(): Promise<void>;
    };
    security: {
      setCertificatePromise(handler: (
        resolve: (value: string) => void, reject: (reason: unknown) => void,
      ) => void): void;
      setSignatureAlgorithm(algorithm: string): void;
      setSignaturePromise(handler: (request: string) => (
        resolve: (value: string) => void, reject: (reason: unknown) => void,
      ) => void): void;
    };
    printers: {
      find(query?: string): Promise<string | string[]>;
      getDefault(): Promise<string>;
    };
    configs: {
      create(printer: string, options?: { encoding?: string; copies?: number; jobName?: string }): unknown;
    };
    print(config: unknown, data: Array<{ type: string; format: string; data: string }>): Promise<void>;
  };
  export default qz;
}
