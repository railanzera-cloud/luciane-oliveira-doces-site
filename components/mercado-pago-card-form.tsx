"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";

import type { MercadoPagoCardData } from "@/lib/site-order";

type BrickController = { unmount: () => void };
type MercadoPagoInstance = {
  bricks: () => {
    create: (
      type: "cardPayment",
      containerId: string,
      settings: Record<string, unknown>,
    ) => Promise<BrickController>;
  };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options: { locale: string }) => MercadoPagoInstance;
    __mercadoPagoSdkPromise?: Promise<void>;
  }
}

function loadMercadoPagoSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  if (window.__mercadoPagoSdkPromise) return window.__mercadoPagoSdkPromise;
  window.__mercadoPagoSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.mercadopago.com/js/v2"]');
    const script = existing ?? document.createElement("script");
    const onLoad = () => window.MercadoPago ? resolve() : reject(new Error("SDK do Mercado Pago indisponível."));
    const onError = () => reject(new Error("Não foi possível carregar o pagamento seguro."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });
  return window.__mercadoPagoSdkPromise;
}

function normalizeCardData(value: unknown, additionalValue?: unknown): MercadoPagoCardData {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const additional = additionalValue && typeof additionalValue === "object" ? additionalValue as Record<string, unknown> : {};
  const payer = data.payer && typeof data.payer === "object" ? data.payer as Record<string, unknown> : {};
  const identification = payer.identification && typeof payer.identification === "object"
    ? payer.identification as Record<string, unknown>
    : null;
  const paymentMethodId = data.payment_method_id ?? data.paymentMethodId;
  const type = additional.paymentTypeId ?? data.payment_type_id ?? data.paymentTypeId;
  const issuerId = data.issuer_id ?? data.issuerId;
  if (typeof data.token !== "string" || typeof paymentMethodId !== "string"
    || (type !== "credit_card" && type !== "debit_card") || !Number.isInteger(Number(data.installments))) {
    throw new Error("Confira os dados do cartão e tente novamente.");
  }
  return {
    token: data.token,
    payment_method_id: paymentMethodId,
    payment_type_id: type,
    installments: Number(data.installments),
    ...(typeof issuerId === "string" || typeof issuerId === "number" ? { issuer_id: String(issuerId) } : {}),
    ...(typeof payer.email === "string" ? { payer_email: payer.email } : {}),
    ...(identification && typeof identification.type === "string" && typeof identification.number === "string"
      ? { identification: { type: identification.type, number: identification.number } }
      : {}),
  };
}

export function MercadoPagoCardForm({
  publicKey,
  amount,
  disabled,
  onSubmit,
}: {
  publicKey: string;
  amount: number;
  disabled: boolean;
  onSubmit: (card: MercadoPagoCardData) => Promise<void>;
}) {
  const reactId = useId();
  const containerId = `mp-card-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const controllerRef = useRef<BrickController | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setReady(false);
      setError("");
      await loadMercadoPagoSdk();
      if (!active || !window.MercadoPago) return;
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      const controller = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount },
          customization: {
            visual: { style: { theme: "default" } },
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => { if (active) setReady(true); },
            onSubmit: async (formData: unknown, additionalData: unknown) => {
              if (disabledRef.current) return;
              setError("");
              try { await submitRef.current(normalizeCardData(formData, additionalData)); }
              catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Não foi possível processar o cartão.");
                throw submitError;
              }
            },
            onError: (brickError: unknown) => {
              console.error("Mercado Pago Card Brick", brickError instanceof Error ? brickError.name : "erro");
              if (active) setError("Não foi possível carregar o formulário seguro. Atualize a página e tente novamente.");
            },
          },
        });
      if (!active) controller.unmount();
      else controllerRef.current = controller;
    }).catch((sdkError) => {
      if (active) setError(sdkError instanceof Error ? sdkError.message : "Pagamento seguro indisponível.");
    });
    return () => {
      active = false;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [amount, containerId, publicKey]);

  return (
    <div className="mp-card-box" aria-busy={!ready || disabled}>
      <div className="mp-card-heading">
        <CreditCard size={19} aria-hidden="true" />
        <div><strong>Pagamento seguro</strong><span>Os dados do cartão são enviados diretamente ao Mercado Pago.</span></div>
      </div>
      {!ready && !error && <p className="mp-card-loading"><LoaderCircle className="admin-spinner" size={18} /> Carregando formulário seguro…</p>}
      <div id={containerId} />
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="mp-security-note"><ShieldCheck size={15} aria-hidden="true" /> A loja não recebe nem armazena número completo ou código de segurança do cartão.</p>
    </div>
  );
}
