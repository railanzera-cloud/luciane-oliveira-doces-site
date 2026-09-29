// Only presencial/card-on-receipt terms. Never used by Mercado Pago.
export type ReceiptCardMode = "debit" | "credit_single" | "credit_installments";
export type ReceiptCardFeeTable = Record<ReceiptCardMode, { label: string; basisPoints: number }>;
// No rates supplied by the store. Null means no calculated surcharge is authorized.
// Before enabling rates, the server quote and customer review must consume the same approved table.
export const RECEIPT_CARD_FEES: ReceiptCardFeeTable | null = null;
export const RECEIPT_CARD_NOTICE = "Pagamento pela maquininha. Pode haver acréscimo conforme a modalidade escolhida (débito, crédito à vista ou parcelado). A loja informará qualquer acréscimo antes de você confirmar a compra.";
