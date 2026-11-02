import { Check, Clock3, Sparkles } from "lucide-react";
import type { StorefrontCampaignCreative } from "@/lib/storefront-campaign-creative";

/**
 * Aviso editorial, não é área de escolha. Os preços aparecem somente nos
 * cartões interativos reais, logo abaixo. Reutilizável em futuras campanhas.
 */
export function StorefrontCampaignEditorial({ campaign }: { campaign: StorefrontCampaignCreative }) {
  return (
    <aside className="gourmet-feriado-edition" aria-label={campaign.kicker}>
      <div className="gourmet-feriado-edition-top">
        <span className="gourmet-feriado-kicker"><Sparkles size={15} aria-hidden="true" />{campaign.kicker}</span>
        <span className="gourmet-feriado-deadline"><Clock3 size={13} aria-hidden="true" />{campaign.deadline}</span>
      </div>
      <h4>{campaign.title}</h4>
      <p className="gourmet-feriado-description">{campaign.description}</p>
      <div className="gourmet-feriado-bottom">
        <span><Check size={14} aria-hidden="true" />{campaign.assurance}</span>
        <small>{campaign.finePrint}</small>
      </div>
    </aside>
  );
}
