// Pure shadow classifier. No IO, prices, consent mutation or delivery authority.
import { CATALOG_VERSION, CATEGORY_ITEM_KEYS, SLICES, CONES, CHOCOTONES, POPCORN_FLAVORS,
  POPCORN_SIZES, CROCANTES } from './commerce-catalog.mjs';
import { DRINKS } from './drinks-catalog.mjs';

export const RECOVERY_VERSION = 'shadow-1';
const categoryKey = {slice:CATEGORY_ITEM_KEYS.fatias,cone:CATEGORY_ITEM_KEYS.cones,
  christmas:CATEGORY_ITEM_KEYS.natal,package:CATEGORY_ITEM_KEYS.pipocas,gourmet:CATEGORY_ITEM_KEYS.pipocas};
export const normalizeInterest = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const contains = (text, term) => (` ${text} `).includes(` ${normalizeInterest(term)} `);
const aliasesByKey = {slice_ninho_morango:['Ninho com Morango'],
  cascao_folheado_geleia_morango_ninho:['Folheado Geleia de Morango com Ninho']};

// Names and identifiers come from the checkout contract, never a parallel menu.
export function recoveryCatalog() {
  const simple = (group, category, variant) => Object.values(group)
    .filter(p => !p.retired).map(p => ({category, product_id:p.id,
      item_key:p.itemKey, name:p.name, variant_id:variant,
      option_id:null, aliases:aliasesByKey[p.itemKey] ?? []}));
  return [
    ...simple(SLICES, 'slice', 'fatia'),
    ...simple(CONES, 'cone', 'unidade'),
    ...simple(CHOCOTONES, 'christmas', 'porcao'),
    ...Object.values(POPCORN_FLAVORS).map(p => ({category:'gourmet',
      product_id:'pipoca-gourmet', item_key:p.itemKey, name:p.name,
      variant_id:null, option_id:p.id, aliases:[]})),
    ...Object.values(CROCANTES).map(p => ({category:'package',
      product_id:p.productId, item_key:null, name:p.name, variant_id:null,
      option_id:null, sizes:p.sizes, aliases:[]})),
    ...Object.values(DRINKS).map(p => ({category:'drink',product_id:p.id,
      item_key:p.itemKey,name:p.name,variant_id:p.variantId,option_id:null,aliases:[]})),
  ];
}

export function classifyRecoveryInterest(text, catalog = recoveryCatalog()) {
  const base = {version:RECOVERY_VERSION,catalog_version:CATALOG_VERSION,
    status:'unconfirmed',intent:'unknown',categories:[],candidates:[],
    variant_ids:[],option_ids:[],availability_keys:[],reason:'no_evidence'};
  if (typeof text !== 'string' || !text.trim() || text.length > 4096)
    return {...base,reason:'unsupported_text'};
  const t = normalizeInterest(text);
  if (/\b(?:pare de (?:me )?mandar|nao (?:me )?(?:mande|envie)|nao quero receber|nao quero (?:mais )?(?:mensagens|contato)|remov[ae] meu|sair da lista)\b/.test(t))
    return {...base,intent:'opt_out',reason:'explicit_opt_out'};
  if (/\b(?:ja paguei|ja comprei|pagamento (?:feito|realizado)|pix (?:feito|enviado))\b/.test(t))
    return {...base,intent:'possible_purchase',reason:'purchase_statement_not_payment'};
  if (/\b(?:nao quero|nao vou querer|nao tenho interesse|nao preciso|deixa pra la|so (?:estou )?olhando|desisti|cancelar|cancela)\b/.test(t))
    return {...base,intent:'declined',reason:'negative_or_mixed_intent'};
  if (/https?:\/\/|www\./i.test(text)) return {...base,reason:'link_context_unverified'};
  if (!/\b(?:quero|queria|gostaria|tem|teria|quanto|preco|valor|comprar|pedir|pedido|disponivel|separa)\b/.test(t))
    return {...base,reason:'commercial_intent_missing'};

  const categories = [];
  if (/\b(?:cascao|cascoes|cone|cones)\b/.test(t)) categories.push('cone');
  // Chocottone also occurs in a cone name; do not override an explicit cone.
  if (/\b(?:chocotone|chocottone|natal)\b/.test(t) && !categories.includes('cone')) categories.push('christmas');
  if (/\b(?:fatia|fatias)\b/.test(t) && !categories.includes('christmas')) categories.push('slice');
  const popcorn = /\b(?:pipoca|pipocas|gourmet)\b/.test(t);
  if (popcorn) {
    if (/\b(?:pacote|pacotes|ziper)\b/.test(t) || /\bpipocas? trufadas?\b/.test(t)) categories.push('package');
    if (/\b(?:gourmet|pote|potes|500\s?ml|750\s?ml|1\s?l|1 litro)\b/.test(t)) categories.push('gourmet');
    if (!categories.some(c => c === 'package' || c === 'gourmet')) categories.push('package','gourmet');
  }
  if (/\b(?:refrigerante|refrigerantes|coca|fanta|guarana)\b/.test(t)) categories.push('drink');
  const scope = catalog.filter(p => !categories.length || categories.includes(p.category));
  let matches = scope.flatMap(p => [p.name,...(p.aliases ?? [])]
    .filter(name => contains(t,name)).map(name => ({p,term:normalizeInterest(name)})));
  // Within each category a full name wins over its nested short flavor.
  matches = matches.filter(a => !matches.some(b => a.p.category === b.p.category &&
    b.term.length > a.term.length && contains(b.term,a.term)));
  const candidates = [...new Map(matches.map(({p}) => [`${p.category}:${p.product_id}:${p.option_id}`,p])).values()];
  const foundCategories = [...new Set(candidates.map(p => p.category))];
  const result = {...base,intent:'interest',categories:categories.length ? categories : foundCategories,
    candidates:candidates.map(({sizes,aliases,...p}) => p)};
  const selectedCategory = foundCategories.length === 1 ? foundCategories[0] : null;
  if (categories.length > 1 || /\b(?:sem|troca|substitui|tirar|retira)\b/.test(t))
    return {...result,status:'ambiguous',reason:'multiple_categories_or_customization'};
  if (!selectedCategory) return {...result,status:candidates.length ? 'ambiguous' : 'unconfirmed',
    reason:candidates.length ? 'category_ambiguous' : 'product_not_identified'};
  if (selectedCategory === 'gourmet') {
    const sizes = Object.values(POPCORN_SIZES).filter(s => contains(t,s.id) ||
      contains(t,s.label) || s.id === '1l' && /\b(?:1 l|um litro)\b/.test(t));
    const option_ids = candidates.map(p => p.option_id);
    const keys = [categoryKey.gourmet,...candidates.map(p => p.item_key),...sizes.map(s => s.itemKey)];
    let remaining = ` ${t} `;
    for (const {term} of matches) remaining = remaining.replaceAll(` ${term} `,' ');
    remaining = remaining.replace(/\b(?:500|750)\s?ml\b/g,' ');
    remaining = remaining.replace(/\b(?:quero|queria|gostaria|tem|teria|quanto|preco|valor|comprar|pedir|pedido|disponivel|separa|uma?|de|do|da|com|e|ou|pipocas?|gourmet|potes?|500|750|ml|1l|1|l|litro|por|favor)\b/g,'').trim();
    const valid = !remaining && !/\bou\b/.test(t) && sizes.length === 1 && option_ids.length <= sizes[0].maxOptions;
    return {...result,status:valid ? 'resolved' : 'partial',option_ids,
      variant_ids:sizes.map(s => s.id),availability_keys:keys,
      reason:valid ? 'explicit_combination' : 'size_or_combination_unresolved'};
  }
  if (selectedCategory === 'package') {
    const variant_ids = ['p','m','g'].filter(s => contains(t,`pacote ${s}`) ||
      contains(t,`tamanho ${s}`) || contains(t,` ${s} `));
    if (variant_ids.length !== 1 || candidates.length !== 1)
      return {...result,status:'partial',variant_ids,reason:'package_or_size_unresolved'};
    const item_key = candidates[0].sizes[variant_ids[0]].itemKey;
    return {...result,status:'resolved',variant_ids,availability_keys:[categoryKey.package,item_key],
      candidates:result.candidates.map(p => ({...p,item_key,variant_id:variant_ids[0]})),reason:'explicit_package'};
  }
  if (/\b(?:500\s?ml|750\s?ml|1\s?l|1 litro|pacote [pmg]|tamanho [pmg])\b/.test(t) && selectedCategory !== 'drink')
    return {...result,status:'partial',reason:'variant_incompatible_with_product'};
  return {...result,status:candidates.length === 1 ? 'resolved' : 'ambiguous',
    variant_ids:[...new Set(candidates.map(p => p.variant_id))],
    availability_keys:[categoryKey[selectedCategory],...candidates.map(p => p.item_key)].filter(Boolean),
    reason:candidates.length === 1 ? 'explicit_product' : 'multiple_products'};
}
