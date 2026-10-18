/**
 * Assinatura de impressão do QZ Tray.
 *
 * A API do QZ usa duas assinaturas DIFERENTES:
 *   setCertificatePromise((resolve, reject) => { ... })
 *   setSignaturePromise((request) => (resolve, reject) => { ... })
 *
 * Não confundir: retornar uma segunda função no certificado deixa a conexão
 * anônima; o QZ ignora esse retorno.
 * @see https://qz.io/docs/signing
 */
export interface KitchenQzSecurity {
  setCertificatePromise(handler: (
    resolve: (value: string) => void,
    reject: (reason: unknown) => void,
  ) => void): void;
  setSignatureAlgorithm(algorithm: string): void;
  setSignaturePromise(handler: (request: string) => (
    resolve: (value: string) => void,
    reject: (reason: unknown) => void,
  ) => void): void;
}

export function validKitchenQzCertificate(value: string): boolean {
  const normalized = value.trim();
  return normalized.includes("-----BEGIN CERTIFICATE-----")
    && normalized.includes("-----END CERTIFICATE-----")
    && !normalized.includes("PRIVATE KEY");
}

export function installKitchenQzSecurity(
  security: KitchenQzSecurity,
  certificate: string,
  sign: (request: string) => Promise<string>,
): void {
  if (!validKitchenQzCertificate(certificate)) {
    throw new Error("Certificado de impressão QZ ausente ou inválido no Supabase. Não autorize solicitações anônimas.");
  }

  // Esta função RECEBE resolve/reject diretamente: é diferente da assinatura.
  security.setCertificatePromise((resolve, reject) => {
    try {
      resolve(certificate);
    } catch (error) {
      reject(error);
    }
  });
  security.setSignatureAlgorithm("SHA512");

  // A assinatura, ao contrário do certificado, retorna o callback resolve/reject.
  security.setSignaturePromise((request) => (resolve, reject) => {
    void Promise.resolve()
      .then(() => sign(request))
      .then((signature) => {
        if (typeof signature !== "string" ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(signature.trim())) {
          throw new Error("O Supabase retornou uma assinatura QZ inválida.");
        }
        resolve(signature.trim());
      })
      .catch(reject);
  });
}
