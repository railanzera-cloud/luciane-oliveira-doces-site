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

const categoryNames: Record<string,string> = {
  category_cones: "Cascão Trufado",
  category_fatias: "Fatia Artesanal",
  category_natal: "Fatia de Chocottone",
  category_pipocas: "Pipoca ou Trufada",
};
const knownProductAliases: Readonly<Record<string,readonly string[]>> = {
  cascao_folheado_geleia_morango_ninho: ["Folheado com Ninho e Morango"],
};
// Os aliases são pontuais e vinculados a SKUs conhecidos; não interpretar
// palavras soltas (p.ex. "morango") ou preferências de anúncio como SKU.
export function crmBusinessProductName(entry: CrmAvailabilityRow): string {
  if (entry.item_key === "cascao_folheado_geleia_morango_ninho")
    return "Folheado com Ninho e Morango";
  return entry.name;
}

export type CrmProductOption = {
  item_key: string;
  label: string;
  category_key: string;
  status: string;
};
export function crmCatalogOptions(entries: CrmAvailabilityRow[]): CrmProductOption[] {
  if (!Array.isArray(entries)) return [];
  const products = entries.filter(entry =>
    Boolean(categoryNames[entry.category_key ?? ""]) &&
    (entry.item_type === "slice" || entry.item_type === "product") &&
    ["available","sold_out","hidden"].includes(entry.status));
  // "Prestígio" pode ser Cascão ou Fatia. A escolha da equipe precisa
  // indicar explicitamente a categoria para evitar o SKU errado.
  const counts = new Map<string,number>();
  for (const entry of products) {
    const key = crmNormalizeProduct(crmBusinessProductName(entry));
    counts.set(key,(counts.get(key) ?? 0)+1);
  }
  return products.map(entry => {
    const name = crmBusinessProductName(entry);
    const label = (counts.get(crmNormalizeProduct(name)) ?? 0) > 1
      ? categoryNames[entry.category_key ?? ""] + " — " + name : name;
    return {item_key:entry.item_key,label,
      category_key:entry.category_key ?? "",status:entry.status};
  }).sort((a,b) => a.label.localeCompare(b.label,"pt-BR"));
}

export function crmCatalogAvailability(
  confirmedInterest: string | null,
  entries: CrmAvailabilityRow[],
  confirmedProductKey?: string | null,
): CrmAvailabilityRow | null {
  if (!confirmedInterest?.trim() || !Array.isArray(entries)) return null;
  const normalized = crmNormalizeProduct(confirmedInterest);
  if (!normalized) return null;
  const options = crmCatalogOptions(entries);
  if (confirmedProductKey) {
    const candidate = options.find(option => option.item_key === confirmedProductKey);
    if (!candidate || crmNormalizeProduct(candidate.label) !== normalized) return null;
    return entries.find(row => row.item_key === confirmedProductKey) ?? null;
  }
  const exactOptionMatches = options.filter(option =>
    crmNormalizeProduct(option.label) === normalized);
  if (exactOptionMatches.length === 1) {
    return entries.find(entry => entry.item_key === exactOptionMatches[0].item_key) ?? null;
  }
  if (exactOptionMatches.length > 1) return null;
  const rawMatches = entries.filter(entry =>
    crmNormalizeProduct(entry.name) === normalized &&
    options.some(option => option.item_key === entry.item_key));
  if (rawMatches.length === 1) return rawMatches[0];
  if (rawMatches.length > 1) return null;
  const aliasMatches = entries.filter(entry =>
    options.some(option => option.item_key === entry.item_key) &&
    (knownProductAliases[entry.item_key] ?? [])
      .some(alias => crmNormalizeProduct(alias) === normalized));
  return aliasMatches.length === 1 ? aliasMatches[0] : null;
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
