import { MessageCircle } from "lucide-react";
import { BUSINESS_IDENTITY } from "@/lib/company-identity";

export function StorefrontLegalFooter() {
  return (
    <footer className="storefront-legal-footer">
      <div className="page-shell footer-content">
        <div className="footer-business">
          <strong>{BUSINESS_IDENTITY.tradeName}</strong>
          <span>{BUSINESS_IDENTITY.city}–{BUSINESS_IDENTITY.state}</span>
          <span className="footer-legal-id">Razão social: {BUSINESS_IDENTITY.legalName}</span>
          <span className="footer-legal-id">CNPJ: {BUSINESS_IDENTITY.taxId}</span>
          <a className="footer-company-link" href="/informacoes-da-empresa">
            Informações da empresa
          </a>
        </div>
        <div className="footer-details">
          <span className="footer-phone">
            <MessageCircle size={16} aria-hidden="true" /> {BUSINESS_IDENTITY.phone}
          </span>
          <a className="footer-contact-email" href={"mailto:" + BUSINESS_IDENTITY.email}>
            {BUSINESS_IDENTITY.email}
          </a>
          <span>Entrega a partir de R$8.</span>
          <span>Retirada disponível.</span>
        </div>
      </div>
    </footer>
  );
}
