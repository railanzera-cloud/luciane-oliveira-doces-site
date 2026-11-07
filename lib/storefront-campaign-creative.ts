import { POPCORN_PROMOTION } from "../supabase/functions/_shared/popcorn-promotion.mjs";

/**
 * Somente conteúdo editorial: o preço e a vigência continuam na regra autoritativa
 * do catálogo/Edge Function. Para nova campanha, crie outro objeto de apresentação.
 */
export type StorefrontCampaignCreative = Readonly<{
  id: string;
  kicker: string;
  deadline: string;
  title: string;
  description: string;
  assurance: string;
  finePrint: string;
}>;

export const GOURMET_HOLIDAY_CREATIVE: StorefrontCampaignCreative = Object.freeze({
  id: POPCORN_PROMOTION.id,
  kicker: "Sábado Gourmet · 07/11",
  deadline: "Só até 23h59",
  title: "Hoje, recheios especiais pelo preço-base do pote.",
  description: "Kinder Bueno, Choco Cookies e os outros sabores disponíveis participam. Nutella é a única exceção e mantém o preço normal, mesmo em combinações.",
  assurance: "500 ml R$ 25 · 750 ml R$ 39 · 1 litro R$ 49",
  finePrint: "Somente 07/11, horário de Paragominas. Sujeito à disponibilidade dos sabores. Nutella não participa.",
});
