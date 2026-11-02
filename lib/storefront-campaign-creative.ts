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
  kicker: "Edição especial · 02/11",
  deadline: "Só até 23h59",
  title: "Hoje, qualquer recheio pelo preço do pote.",
  description: "Nutella, Kinder Bueno e os outros sabores disponíveis sem pagar mais pelo recheio especial.",
  assurance: "Escolha o tamanho abaixo e combine seus favoritos.",
  finePrint: "Somente 02/11, horário de Paragominas. Sujeito à disponibilidade dos sabores.",
});
