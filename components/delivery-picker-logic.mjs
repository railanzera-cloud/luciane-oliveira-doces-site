import { normalizeDeliverySearch } from "../supabase/functions/_shared/delivery-localities.mjs";

// Estado previsível do campo durante restauração de rascunhos e troca de bairro.
// Retornar null significa manter exatamente o texto que a pessoa acabou de digitar.
export function queryAfterDeliverySelectionChange({
  previousId, nextId, nextLabel = "", clearedByTyping = false,
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


// Uma numeração diferente é um bairro diferente. Busca aproximada por
// caracteres pode confundir "Parque 3" e "Parque IV"; nunca oferecer uma
// localidade com número divergente. IDs, status e tarifas seguem no backend.
export function filterDeliveryNumberConflicts(query, localities) {
  if (!Array.isArray(localities)) return [];
  const requestedNumbers = normalizeDeliverySearch(query).match(/\b\d+\b/g) ?? [];
  if (!requestedNumbers.length) return localities;
  return localities.filter(locality =>
    [locality.label, ...(locality.aliases ?? [])].some(name => {
      const optionNumbers = normalizeDeliverySearch(name).match(/\b\d+\b/g) ?? [];
      return requestedNumbers.every(number => optionNumbers.includes(number));
    }));
}


// Nomes de condomínio/empreendimento já situados dentro de outro bairro.
// Permanecem no registro interno para sessões antigas; não aparecem como opção
// de bairro com frete próprio sem homologação expressa da loja.
export const SECONDARY_DELIVERY_PLACE_IDS = Object.freeze([
  "alan-kardec",
  "condominio-residencial-alto-do-lago",
  "condominio-residencial-tropical",
  "distrito-industrial-moveleiro",
]);
const SECONDARY_PLACE_SET = new Set(SECONDARY_DELIVERY_PLACE_IDS);
export function filterSecondaryDeliveryPlaces(localities) {
  return Array.isArray(localities) ? localities.filter(item => !SECONDARY_PLACE_SET.has(item.id)) : [];
}
export function isSecondaryDeliveryPlaceQuery(query, localities) {
  const normalized = normalizeDeliverySearch(query);
  if (!Array.isArray(localities) || normalized.length < 6) return false;
  return localities.some(item => SECONDARY_PLACE_SET.has(item.id)
    && [item.label, ...(item.aliases ?? [])].some(term => {
      const name = normalizeDeliverySearch(term);
      return normalized === name || (normalized.includes(" ") && name.includes(normalized));
    }));
}
