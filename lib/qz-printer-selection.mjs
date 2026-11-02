/**
 * Escolha segura de impressora no QZ Tray.
 * A lista vem do Windows do notebook; nunca a partir do pedido ou do servidor.
 */

/** @param {string} name */
function normalizedPrinterName(name) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/**
 * @param {readonly string[]} names - lista de impressoras instaladas no Windows
 * @param {string} saved - nome armazenado antes da reconexão
 * @param {string|undefined} explicit - seleção feita pela operadora na lista
 * @param {string|null} fallback - impressora padrão apenas na primeira conexão
 * @returns {string}
 */
export function chooseKitchenPrinter(names, saved, explicit, fallback) {
  const unique = [...new Set(names.filter(name => typeof name === "string" && name.trim()))];
  const exact = name => unique.find(candidate => normalizedPrinterName(candidate) === normalizedPrinterName(name));
  if (explicit) {
    const selected = exact(explicit);
    if (!selected) throw new Error("A impressora escolhida não aparece mais no Windows. Consulte a lista e tente novamente.");
    return selected;
  }
  const original = saved ? exact(saved) : null;
  if (original) return original;

  const thermal = unique.filter(name => /(?:pos[ -]?58|58[ -]?mm|xp[ -]?58|thermal[ -]?58)/i.test(name));
  if (thermal.length === 1) return thermal[0];
  // Nunca enviar ESC/POS automaticamente a PDF, XPS, Fax ou OneNote.
  const virtual = name => /(?:pdf|xps|fax|onenote)/i.test(name);
  if (!saved && fallback && exact(fallback) && !virtual(fallback)) return exact(fallback);
  if (unique.length === 1 && !saved && !virtual(unique[0])) return unique[0];
  if (saved) throw new Error(`A impressora salva "${saved}" não foi encontrada. Selecione uma das impressoras detectadas abaixo. Nenhuma comanda foi enviada.`);
  throw new Error("O QZ Tray conectou, mas há mais de uma impressora possível ou nenhuma foi identificada. Escolha a POS-58 na lista abaixo.");
}
