// Catálogo de busca, separado da tabela de preços do servidor.
// Fontes: Plano Diretor Municipal 2023 (SEPLAN), diretórios postais e regras legadas.
// Uma localidade sem zoneId nunca recebe R$ 8 por omissão: exige confirmação da loja.
// Associações "cidade" derivam da regra geral informada pelo proprietário para a zona urbana;
// conferir limites e exceções antes do rollout. IDs de zonas comerciais legadas não mudam.
const ROWS = "aeroporto|Aeroporto|aeroporto|\namper-elisa-empresa|Amper Elisa Empresa|amper-elisa-empresa|\nacaizal|Açaizal|acaizal|Açaisal,Acaisal,Saisal,Saizal,Assaizal\nbairro-novo-canaa|Bairro Novo Canaã|novo-canaa|Novo Canaã,Novo Canaa\nbambu|Bambu|bambu|\ncolonia-do-uraim|Colônia do Uraim|colonia-uraim|\ncondominio-rural|Condomínio Rural|condominio-rural|\ncoopernorte-km-15|Coopernorte KM 15|coopernorte-km-15|\netepa|ETEPA|etepa|\nfloraplac-mdf|Floraplac MDF|floraplac-mdf|\nfrigorifico|Frigorífico|frigorifico|\nintegral-mix|Integral Mix|integral-mix|\njuparana-empresa|Juparanã Empresa|juparana-empresa|Juparana Empresa\nkm-12|KM 12|km-12|\nkm-15|KM 15|km-15|\nnagibao|Nagib Demachki (Nagibão)|nagibao|Nagibão,Nagib Demachki\npandolfe|Pandolfe|pandolfe|Pandolf\npromissao-i|Promissão I|cidade|Promissão 1\npromissao-ii|Promissão II|cidade|Promissão 2\npromissao-iii|Promissão III|cidade|Promissão 3\nresort-toddys|Resort Toddys|resort-toddys|\ntiao-mineiro|Tião Mineiro|cidade|\ntraterra|Traterra|traterra|\nufra|UFRA|ufra|\nalan-kardec|Alan Kardec||\naldeia-indigena-canide|Aldeia Indígena Canidé||\nalto-do-vale|Alto do Vale|cidade|\nandradina|Andradina|cidade|\nangelim|Angelim|cidade|\naragao|Aragão||\nbela-vista|Bela Vista||\nbonaparte|Bonaparte||\ncamboata|Camboatã|cidade|\ncamboata-i|Camboatã I|cidade|\ncamboata-ii|Camboatã II|cidade|\ncarvalho|Carvalho||\ncidade-jardim|Cidade Jardim|cidade|\ncidade-nova|Cidade Nova|cidade|\nclube-do-cavalo|Clube do Cavalo|cidade|\ncondominio-residencial-alto-do-lago|Condomínio Residencial Alto do Lago||\ncondominio-residencial-tropical|Condomínio Residencial Tropical||\ncelio-miranda|Célio Miranda|cidade|\ndistrito-industrial-moveleiro|Distrito Industrial Moveleiro||\nescadinha|Escadinha||\nflamboyant|Flamboyant|cidade|Florboiante,Florbiante\nflor-de-lis|Flor de Lis||\nflorbiante-grafia-a-confirmar|Florbiante (grafia a confirmar)||\nguanabara|Guanabara|cidade|\nguilherme-gabriel|Guilherme Gabriel||\nindependencia|Independência||\nindustrial|Industrial||\ninocencio-oliveira|Inocêncio Oliveira|cidade|\njaderlandia|Jaderlândia|cidade|\njardelandia|Jardelandia|cidade|\njardim-amazonico|Jardim Amazônico||\njardim-atlantico|Jardim Atlântico|cidade|\njardim-bela-vista|Jardim Bela Vista||\njardim-camboata|Jardim Camboatã|cidade|\njardim-camboata-ii|Jardim Camboatã II|cidade|\njardim-elandia-grafia-a-confirmar|Jardim Elândia (grafia a confirmar)||\njuparana|Juparanã|cidade|\nlaercio-cabeline|Laércio Cabeline||\nlaercio-cabeline-ii|Laércio Cabeline II||\nmanoel-nahor-de-lima|Manoel Nahor de Lima|cidade|\nmarisa-rocha|Marisa Rocha|cidade|\nmariza-rocha|Mariza Rocha|cidade|\nmorada-do-sol|Morada do Sol|cidade|\nmorada-dos-ventos|Morada dos Ventos|cidade|\nmorada-verde|Morada Verde|cidade|\nmodulo-i-centro|Módulo I (Centro)|cidade|\nmodulo-ii|Módulo II|cidade|\nnova-conquista|Nova Conquista|cidade|\nnova-esperanca|Nova Esperança|cidade|\nnovo-camboata|Novo Camboatã||\nnovo-horizonte|Novo Horizonte|cidade|\nolga-moreira|Olga Moreira|cidade|\nouro-preto|Ouro Preto|cidade|\nouro-verde|Ouro Verde|cidade|\nparaiso|Paraíso||\nparica|Paricá|cidade|\nparque-das-americas|Parque das Américas|cidade|\nparque-iv|Parque IV|cidade|\nparque-village-flamboyant|Parque Village Flamboyant||\npresidente-juscelino|Presidente Juscelino Kubitschek (JK)|cidade|JK,Presidente Juscelino Kubitschek\npromissao|Promissão|cidade|\npromissao-iv|Promissão IV||\nresidencial-cidade-jardim|Residencial Cidade Jardim|cidade|\nresidencial-helena-coutinho|Residencial Helena Coutinho|cidade|\nresidencial-jardim-america|Residencial Jardim América|cidade|\nresidencial-jose-alberto|Residencial José Alberto|cidade|\nresidencial-maria-de-lourdes-sobrinho|Residencial Maria de Lourdes Sobrinho|cidade|\nresidencial-nilma-dias|Residencial Nilma Dias|cidade|\nresidencial-olga-moreira|Residencial Olga Moreira|cidade|\nresidencial-pandolfi|Residencial Pandolfi||\nresidencial-selectas|Residencial Selectas|cidade|\nresidencial-zeno-azeredo|Residencial Zeno Azeredo|cidade|\nsanta-rosa|Santa Rosa|cidade|\nsetor-industrial|Setor Industrial||\nsidilandia-i|Sidilândia I||\nsidilandia-ii|Sidilândia II||\nsidney-rosa|Sidney Rosa||\nsol-nascente|Sol Nascente|cidade|\ntrecho-seco|Trecho Seco||\ntropical|Tropical|cidade|Bairro Tropical\nuraim|Uraim|cidade|\nuraim-i|Uraim I|cidade|\nuraim-ii|Uraim II|cidade|\nuraim-iii|Uraim III|cidade|\nvale-do-uraim|Vale do Uraim||\nvale-dos-lirios|Vale dos Lírios||\nvila-cabral|Vila Cabral|cidade|\nvila-caip|Vila CAIP||\nvila-rica|Vila Rica||\narea-rural-de-paragominas|Área Rural de Paragominas||";
const NUMERALS = Object.freeze({ i: "1", ii: "2", iii: "3", iv: "4" });

// Bairros urbanos citados expressamente pelo proprietário como dentro da cidade
// (tarifa geral R$ 8). Os demais 54 vínculos "cidade" são CANDIDATOS,
// ainda sem homologação individual e NÃO podem gerar cobrança automática.
const OWNER_URBAN_EXAMPLES = new Set([
  "promissao-i", "promissao-ii", "promissao-iii", "tiao-mineiro", "flamboyant",
]);

export function normalizeDeliverySearch(input) {
  if (typeof input !== "string") return "";
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(?:iv|iii|ii|i)\b/g, value => NUMERALS[value] ?? value)
    .replace(/\s+/g, " ").trim();
}

export const DELIVERY_LOCALITIES = Object.freeze(ROWS.split("\n").map(row => {
  const [id, label, zoneId, aliases] = row.split("|");
  const tarifed = Boolean(zoneId && (zoneId !== "cidade" || OWNER_URBAN_EXAMPLES.has(id)));
  return Object.freeze({ id, label, zoneId: zoneId || null, aliases: Object.freeze(aliases ? aliases.split(",") : []),
    status: tarifed ? "quoted" : "needs_review" });
}));
const BY_ID = new Map(DELIVERY_LOCALITIES.map(locality => [locality.id, locality]));

export function deliveryLocalityCanQuote(locality) {
  return Boolean(locality && locality.zoneId && locality.status === "quoted");
}

export function deliveryLocalityById(id) {
  return typeof id === "string" ? BY_ID.get(id) ?? null : null;
}

export function deliveryLocalityByExactName(name, zoneId = null) {
  const query = normalizeDeliverySearch(name);
  if (!query) return null;
  const matches = DELIVERY_LOCALITIES.filter(locality =>
    (zoneId === null || locality.zoneId === zoneId)
      && [locality.label, ...locality.aliases].some(candidate => normalizeDeliverySearch(candidate) === query));
  // Nomes ambíguos não devem gerar cobrança automaticamente.
  return matches.length === 1 ? matches[0] : null;
}

// Busca aproximada serve apenas para SUGERIR nomes. Não altera a lógica
// de cotação: o cliente precisa escolher uma localidade válida explicitamente.
function editDistanceAtMost(left, right, max) {
  if (Math.abs(left.length - right.length) > max) return max + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    let smallest = i;
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current.push(value);
      smallest = Math.min(smallest, value);
    }
    if (smallest > max) return max + 1;
    previous = current;
  }
  return previous[right.length];
}

function deliverySearchTerms(locality) {
  return [locality.label, ...locality.aliases].map(normalizeDeliverySearch);
}

export function deliveryLocalityTextMatches(query, locality) {
  const normalized = normalizeDeliverySearch(query);
  if (!normalized || !locality) return false;
  return deliverySearchTerms(locality).some(term => term.includes(normalized));
}

export function searchDeliveryLocalities(query, limit = 8) {
  const normalized = normalizeDeliverySearch(query);
  const size = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 8, 20));
  const defaults = ["promissao-i", "promissao-ii", "promissao-iii", "tiao-mineiro", "acaizal"];
  if (!normalized) return DELIVERY_LOCALITIES.filter(locality => defaults.includes(locality.id))
    .sort((left, right) => defaults.indexOf(left.id) - defaults.indexOf(right.id)).slice(0, size);
  const scored = DELIVERY_LOCALITIES.map(locality => {
    const terms = deliverySearchTerms(locality);
    const score = terms.some(term => term === normalized) ? 0
      : terms.some(term => term.startsWith(normalized)) ? 1
      : terms.some(term => term.includes(normalized)) ? 2 : 9;
    return { locality, score };
  });
  const direct = scored.filter(match => match.score < 9);
  if (direct.length) return direct
    .sort((a, b) => a.score - b.score || a.locality.label.localeCompare(b.locality.label, "pt-BR"))
    .slice(0, size).map(match => match.locality);

  // Não sugerir nomes muito curtos, nem disparar trabalho excessivo com texto colado.
  if (normalized.length < 5 || normalized.length > 50) return [];
  const maxEdits = normalized.length >= 9 ? 2 : 1;
  return scored
    .map(({ locality }) => {
      const terms = deliverySearchTerms(locality);
      const distance = Math.min(...terms.map(term => editDistanceAtMost(normalized, term, maxEdits)));
      return { locality, distance };
    })
    .filter(match => match.distance <= maxEdits)
    .sort((a, b) => a.distance - b.distance || a.locality.label.localeCompare(b.locality.label, "pt-BR"))
    .slice(0, size)
    .map(match => match.locality);
}

export function deliveryLegacyLocality(zoneId, neighborhood) {
  if (typeof zoneId !== "string") return null;
  if (zoneId !== "cidade") return DELIVERY_LOCALITIES.find(locality => locality.zoneId === zoneId) ?? null;
  return deliveryLocalityByExactName(neighborhood, "cidade");
}
