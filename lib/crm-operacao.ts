// Regras de apresentação do CRM: nenhum resultado aqui autoriza disparo.
// Disponibilidade do catálogo é diferente de estoque físico e quantidade.
export type CrmAvailabilityRow = {
  item_key: string;
  name: string;
  status: string;
  item_type?: string | null;
  category_key?: string | null;
};

export const crmNormalizeProduct = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

export function crmCatalogAvailability(
  confirmedInterest: string | null,
  entries: CrmAvailabilityRow[],
  confirmedProductKey?: string | null,
): CrmAvailabilityRow | null {
  if (!confirmedInterest?.trim() || !Array.isArray(entries)) return null;
  const target = crmNormalizeProduct(confirmedInterest);
  const candidates = entries.filter(entry =>
    crmNormalizeProduct(entry.name) === target &&
    ["available", "sold_out", "hidden"].includes(entry.status));
  if (candidates.length === 1) return candidates[0];
  // Nomes como "Prestígio" aparecem em categorias diferentes. Não inferir.
  if (candidates.length > 1 && confirmedProductKey) {
    return candidates.find(entry => entry.item_key === confirmedProductKey) ?? null;
  }
  return null;
}

export function crmFriendlyAge(iso: string | null, nowMs: number): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "Sem horário de mensagem";
  const minutes = Math.floor((nowMs - Date.parse(iso)) / 60000);
  if (minutes < 0) return "Horário precisa ser conferido";
  if (minutes < 2) return "Agora mesmo";
  if (minutes < 60) return "Há " + minutes + " min";
  if (minutes < 24 * 60) return "Há " + Math.floor(minutes / 60) + " h";
  if (minutes < 48 * 60) return "Ontem";
  return "Há " + Math.floor(minutes / 1440) + " dias";
}

export function crmFriendlyReminder(dueIso: string | null, nowMs: number): string {
  if (!dueIso || !Number.isFinite(Date.parse(dueIso))) return "Sem horário de lembrete";
  const minutes = Math.ceil((Date.parse(dueIso) - nowMs) / 60000);
  if (minutes > 1440) return "Lembrete para outro dia";
  if (minutes > 60) return "Lembrete em " + Math.ceil(minutes / 60) + " h";
  if (minutes > 0) return "Lembrete em " + minutes + " min";
  if (minutes >= -60) return "Lembrete para conferir agora";
  if (minutes >= -1440) return "Lembrete atrasado hoje · rever a conversa";
  return "Lembrete antigo · reavaliar antes de contatar";
}

export function crmRecentlyActive(iso: string | null, nowMs: number): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return Number.isFinite(time) && time <= nowMs + 60000 && time >= nowMs - 48 * 3600000;
}
