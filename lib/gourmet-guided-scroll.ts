/**
 * Calcula a rolagem para que o pote e a primeira escolha de recheio fiquem
 * visíveis juntos, quando o tamanho da tela permitir.
 * Função pura: os outros passos do checkout não são afetados.
 */
export function gourmetFlavorScrollTop({
  scrollY,
  stageY,
  firstFlavorY,
  viewportHeight,
}: {
  scrollY: number;
  stageY: number;
  firstFlavorY: number;
  viewportHeight: number;
}): number {
  const topInset = Math.max(52, Math.min(84, Math.round(viewportHeight * 0.1)));
  const firstControlLimit = Math.max(260, Math.min(viewportHeight - 118, Math.round(viewportHeight * 0.58)));
  return Math.max(0, Math.round(scrollY + Math.max(stageY - topInset, firstFlavorY - firstControlLimit)));
}
