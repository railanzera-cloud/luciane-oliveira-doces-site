// Assisted workflow: no API transport, no background opens, no implicit send.
export type AssistedReview = {
  eligible: boolean;
  reasons: string[];
  checked_at: string;
  follow_up_id: string;
  conversation_id: string;
  phone_e164: string | null;
  customer_name: string | null;
  interest_label: string | null;
};
export const assistedBlockerLabels: Record<string, string> = {
  not_found: "Lembrete não encontrado. Atualize a fila.",
  not_pending: "Este lembrete já foi finalizado.",
  not_due: "Aguarde o horário do lembrete.",
  not_waiting_customer: "O cliente respondeu ou o atendimento foi encerrado.",
  commercial_opt_out: "O cliente pediu para não receber mensagens.",
  consent_not_verified: "Registre a autorização comercial com evidência real.",
  outside_verified_service_window: "Horário fora da janela verificada de atendimento.",
  not_waiting_after_business_reply: "Confira a resposta mais recente do cliente e da loja.",
  inbound_timestamp_unverified: "O provedor ainda não confirmou o horário original da mensagem.",
  purchase_signal_review: "Possível compra: confira antes de qualquer novo contato.",
  product_not_confirmed: "Confirme e salve o produto após revisar a conversa.",
  already_contacted_since_reply: "Já houve follow-up manual desde a última resposta do cliente.",
};
export function assistedReviewProblems(value: unknown, expected: {
  conversationId: string; followUpId: string; phone: string; interest: string | null;
}, nowMs = Date.now()): string[] {
  const review = value as AssistedReview | null;
  if (!review || !Array.isArray(review.reasons) ||
      review.reasons.some(reason => typeof reason !== "string") ||
      typeof review.eligible !== "boolean" ||
      review.follow_up_id !== expected.followUpId ||
      review.conversation_id !== expected.conversationId ||
      !Number.isFinite(Date.parse(review.checked_at)) ||
      Math.abs(nowMs - Date.parse(review.checked_at)) > 60000) {
    return ["Não foi possível validar este atendimento. Atualize a fila e tente novamente."];
  }
  if (review.reasons.length) return review.reasons.map(reason =>
    assistedBlockerLabels[reason] ?? "Contato bloqueado: " + reason);
  if (!review.eligible || review.phone_e164 !== expected.phone ||
      !/^55[1-9][0-9]{9,10}$/.test(review.phone_e164 ?? "") ||
      !review.interest_label?.trim() || review.interest_label !== expected.interest) {
    return ["O telefone ou produto mudou. Atualize a fila e revise o atendimento."];
  }
  return [];
}
export function assistedTiming(due: string | null, outbound: string | null, nowMs: number) {
  const dueMs = Date.parse(due ?? "");
  const outboundMs = Date.parse(outbound ?? "");
  if (!Number.isFinite(dueMs)) return "Horário do lembrete indisponível";
  const difference = Math.ceil(Math.abs(dueMs - nowMs) / 60000);
  const elapsed = Number.isFinite(outboundMs) && outboundMs <= nowMs
    ? `${Math.floor((nowMs - outboundMs) / 60000)} min desde a resposta da loja · ` : "";
  return elapsed + (dueMs <= nowMs ? `Vencido há ${difference} min` : `Lembrete em ${difference} min`);
}
