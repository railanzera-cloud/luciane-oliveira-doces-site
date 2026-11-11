/** Passagem única após registrar o pedido.
 * Um link Tintim HTTP(S) usa a mesma rota da ação manual já aprovada.
 * Se o browser bloquear a navegação, a tela de recuperação continua disponível.
 * Nunca chamar durante reidratação ou render, para evitar loops e pedidos duplicados.
 */
export function navigateToWhatsAppHandoff(url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const destination = new URL(url);
    if (destination.protocol !== "https:" || destination.hostname !== "tintim.link"
      || !destination.pathname.startsWith("/whatsapp/") || !destination.searchParams.has("text")
      || !destination.searchParams.get("text")?.trim()) return false;
    window.location.assign(destination.href);
    return true;
  } catch {
    // Safari/Instagram pode bloquear a passagem após a resposta assíncrona.
    // O fallback mantém o link original visível para um toque explícito.
    return false;
  }
}
