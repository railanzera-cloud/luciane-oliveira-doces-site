// Estado previsível do campo durante restauração de rascunhos e troca de bairro.
// Retornar null significa manter exatamente o texto que a pessoa acabou de digitar.
export function queryAfterDeliverySelectionChange({
  previousId, nextId, nextLabel = "", typedValue = "", clearedByTyping = false,
}) {
  if (previousId === nextId) return null;
  if (clearedByTyping && nextId === "") return null;
  return typeof nextLabel === "string" ? nextLabel : "";
}

// Mede espaço REAL disponível ao redor do campo, inclusive com teclado virtual
// e zoom do Safari iOS. Não depende de permissão de localização ou API externa.
export function deliverySuggestionLayout({
  fieldTop, fieldBottom, viewportTop = 0, viewportHeight = 0, margin = 12,
}) {
  const top = Number.isFinite(fieldTop) ? fieldTop : 0;
  const bottom = Number.isFinite(fieldBottom) ? fieldBottom : top;
  const topOfView = Number.isFinite(viewportTop) ? viewportTop : 0;
  const viewHeight = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
  const above = Math.max(0, top - topOfView - margin);
  const below = Math.max(0, topOfView + viewHeight - bottom - margin);
  const placement = below < 180 && above > below ? "above" : "below";
  const available = placement === "above" ? above : below;
  return Object.freeze({
    placement,
    maxHeight: Math.max(72, Math.min(320, Math.floor(available))),
  });
}
