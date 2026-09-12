declare const __SITE_ORDERING_ENABLED__: boolean;
declare const __MP_PUBLIC_KEY_TEST__: string;

const enabled = typeof __SITE_ORDERING_ENABLED__ === "boolean" && __SITE_ORDERING_ENABLED__;
const mercadoPagoPublicKey = typeof __MP_PUBLIC_KEY_TEST__ === "string"
  ? __MP_PUBLIC_KEY_TEST__.trim()
  : "";

export function getCommercePublicConfiguration() {
  return {
    siteOrderingEnabled: enabled,
    mercadoPagoPublicKey,
    onlinePaymentsEnabled: enabled && Boolean(mercadoPagoPublicKey),
  } as const;
}
