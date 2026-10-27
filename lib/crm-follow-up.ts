// Identificacao conservadora a partir do NOME DO ANUNCIO (nao da conversa).
// Uma referencia de anuncio e apenas contexto, nunca prova de compra, interesse
// declarado, consentimento ou estoque. Sabores ambiguos ficam sem classificacao.
const adProductRules = [
  { id: "fatia-chocolate-morango", name: "Chocolate com Morango", pattern: /\bchocolate com morango\b/ },
  { id: "fatia-ninho-morango", name: "Ninho com Morango", pattern: /\bninho com morango\b/ },
  { id: "fatia-prestigio", name: "Prestígio", pattern: /\bprestigio\b/ },
  { id: "fatia-chocolate-maracuja", name: "Chocolate com Maracujá", pattern: /\bmaracuja\b/ },
  { id: "fatia-chocolatudo", name: "Chocolatudo", pattern: /\bchocolatudo\b/ },
  { id: "fatia-coco-cremoso-morango", name: "Coco Cremoso com Morango", pattern: /\bcoco cremoso\b/ },
  { id: "fatia-chocolate-cenoura", name: "Chocolate com Cenoura", pattern: /\bchocolate com cenoura\b|\bbolo de cenoura com chocolate\b/ },
] as const;

export function crmAdSliceHint(adName: string | null | undefined):
  { id: string; name: string; basis: "ad_hint_only" } | null {
  if (!adName || adName.length > 250) return null;
  const normalized = adName.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized || /\bpipoca(s)?\b/.test(normalized)) return null;
  const matches = adProductRules.filter(rule => rule.pattern.test(normalized));
  // Exemplos inseguros: "MORANGO" isolado ou criativos com varios sabores.
  return matches.length === 1
    ? { id: matches[0].id, name: matches[0].name, basis: "ad_hint_only" }
    : null;
}

// Os IDs são os do catálogo comercial; o corpo privado não entra no frontend.
const mentionedNames: Record<string,string> = {
  "fatia-chocolate-morango": "Chocolate com Morango",
  "fatia-ninho-morango": "Ninho com Morango",
  "fatia-prestigio": "Prestígio",
  "fatia-chocolate-maracuja": "Chocolate com Maracujá",
  "fatia-chocolatudo": "Chocolatudo",
  "fatia-coco-cremoso-morango": "Coco Cremoso com Morango",
  "fatia-chocolate-cenoura": "Chocolate com Cenoura",
};
export function crmMentionedProductName(id: string | null | undefined): string | null {
  return id && Object.prototype.hasOwnProperty.call(mentionedNames,id) ? mentionedNames[id] : null;
}

// Texto de follow-up assistido. Nao presume estoque, preco ou envio real.
// Interesse vem de confirmacao da equipe; sinais de origem/UTM nao sao produtos.
export function crmSuggestedMessage(
  interest: string | null | undefined,
  adName?: string | null,
  mentionedProductId?: string | null
): string {
  const product = (interest ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!product) {
    const mentioned = crmMentionedProductName(mentionedProductId);
    if (mentioned) {
      // O cliente MENCIONOU o sabor, não se confirmou compra ou intenção final.
      return "Oi! 😊 Sobre a fatia " + mentioned +
        " que você mencionou: posso confirmar a disponibilidade para hoje?";
    }
    const hint = crmAdSliceHint(adName);
    if (hint) {
      // "Viu o anuncio" e verificavel como origem de trafego; jamais dizer
      // "voce queria comprar" apenas porque o contato veio pelo anuncio.
      return "Oi! 😊 Vi que você chegou pelo anúncio da fatia " + hint.name +
        ". Posso confirmar para você a disponibilidade de hoje?";
    }
    return "Oi! 😊 Passando pra saber se você ainda tem interesse nas nossas delícias. Se quiser, te confirmo as opções disponíveis hoje.";
  }
  return "Oi! 😊 Passando pra saber se você ainda tem interesse em " +
    product + ". Se quiser, te confirmo a disponibilidade de hoje.";
}

export function crmWhatsAppLink(
  phoneE164: string,
  interest: string | null | undefined,
  adName?: string | null,
  mentionedProductId?: string | null
): string {
  if (!/^55[1-9][0-9]{9,10}$/.test(phoneE164)) throw new Error("Telefone inválido.");
  return "https://wa.me/" + phoneE164 + "?text=" + encodeURIComponent(crmSuggestedMessage(interest, adName, mentionedProductId));
}

// Frases de template de API devem ser mantidas separadas: o wa.me acima
// apenas abre o WhatsApp da operadora e NAO dispara mensagens.
