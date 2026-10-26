// Texto de follow-up assistido. Nao presume estoque, preco ou envio real.
// Interesse vem de confirmacao da equipe; sinais de origem/UTM nao sao produtos.
export function crmSuggestedMessage(interest: string | null | undefined): string {
  const product = (interest ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!product) {
    return "Oi! 😊 Passando pra saber se você ainda tem interesse nas nossas delícias. Se quiser, te confirmo as opções disponíveis hoje.";
  }
  return "Oi! 😊 Passando pra saber se você ainda tem interesse em " +
    product + ". Se quiser, te confirmo a disponibilidade de hoje.";
}

export function crmWhatsAppLink(phoneE164: string, interest: string | null | undefined): string {
  if (!/^55[1-9][0-9]{9,10}$/.test(phoneE164)) throw new Error("Telefone inválido.");
  return "https://wa.me/" + phoneE164 + "?text=" + encodeURIComponent(crmSuggestedMessage(interest));
}

// Frases de template de API devem ser mantidas separadas: o wa.me acima
// apenas abre o WhatsApp da operadora e NAO dispara mensagens.
