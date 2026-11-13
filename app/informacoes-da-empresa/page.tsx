import type { Metadata } from "next";
import { BUSINESS_IDENTITY } from "@/lib/company-identity";

export const metadata: Metadata = {
  title: "Informações da empresa | Luciane Oliveira Doces",
  description:
    "Identificação jurídica e contato comercial da Luciane Oliveira Doces, em Paragominas, Pará.",
  alternates: {
    canonical: "https://lucianeoliveiradoces.com.br/informacoes-da-empresa",
  },
};

export default function InformacoesDaEmpresa() {
  return (
    <main className="company-page">
      <div className="company-page__shell">
        <nav className="company-page__nav" aria-label="Navegação">
          <a href="/" className="company-page__brand">{BUSINESS_IDENTITY.tradeName}</a>
          <a href="/" className="company-page__back">Voltar ao cardápio</a>
        </nav>

        <div className="company-page__heading">
          <p className="company-page__eyebrow">Transparência e identificação</p>
          <h1>Informações da empresa</h1>
          <p>
            {BUSINESS_IDENTITY.tradeName} é a marca comercial do empreendimento
            identificado abaixo. Estas são as informações de identificação e
            contato do responsável pela loja.
          </p>
        </div>

        <section className="company-page__card" aria-labelledby="company-legal-heading">
          <h2 id="company-legal-heading">Identificação jurídica</h2>
          <dl className="company-page__details">
            <div>
              <dt>Nome comercial</dt>
              <dd>{BUSINESS_IDENTITY.tradeName}</dd>
            </div>
            <div>
              <dt>Razão social / Nome empresarial</dt>
              <dd>{BUSINESS_IDENTITY.legalName}</dd>
            </div>
            <div>
              <dt>CNPJ</dt>
              <dd>{BUSINESS_IDENTITY.taxId}</dd>
            </div>
            <div>
              <dt>Localidade de atuação</dt>
              <dd>{BUSINESS_IDENTITY.city} – {BUSINESS_IDENTITY.state}</dd>
            </div>
          </dl>
        </section>

        <section className="company-page__card" aria-labelledby="company-contact-heading">
          <h2 id="company-contact-heading">Contato comercial</h2>
          <dl className="company-page__details">
            <div>
              <dt>E-mail da empresa</dt>
              <dd><a href={"mailto:" + BUSINESS_IDENTITY.email}>{BUSINESS_IDENTITY.email}</a></dd>
            </div>
            <div>
              <dt>Telefone de atendimento</dt>
              <dd>{BUSINESS_IDENTITY.phone}</dd>
            </div>
            <div>
              <dt>Site oficial</dt>
              <dd><a href={BUSINESS_IDENTITY.website}>{BUSINESS_IDENTITY.website.replace("https://", "")}</a></dd>
            </div>
          </dl>
        </section>
        <p className="company-page__note">
          Para informações sobre pedidos e entregas, utilize os canais comerciais
          indicados acima.
        </p>
      </div>
    </main>
  );
}
