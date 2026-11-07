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
  description: "Kinder Bueno, Choco Cookies e outros sabores disponíveis participam. Nutella é a única exceção: mantém o preço normal, mesmo em combinações.",
  assurance: "Escolha seu tamanho logo abaixo.",
  finePrint: "Sujeito à disponibilidade dos sabores.",
});
