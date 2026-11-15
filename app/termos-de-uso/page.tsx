import type { Metadata } from "next";
import { BUSINESS_IDENTITY } from "@/lib/company-identity";

export const metadata: Metadata = {
  title: "Termos de Uso | Luciane Oliveira Doces",
  description: "Condições gerais de utilização do cardápio e dos canais de atendimento da Luciane Oliveira Doces.",
  alternates: { canonical: BUSINESS_IDENTITY.website + "/termos-de-uso" },
};

export default function TermosDeUso() {
  return (
    <main className="company-page">
      <div className="company-page__shell">
        <nav className="company-page__nav" aria-label="Navegação">
          <a href="/" className="company-page__brand">{BUSINESS_IDENTITY.tradeName}</a>
          <a href="/" className="company-page__back">Voltar ao cardápio</a>
        </nav>
        <header className="company-page__heading">
          <p className="company-page__eyebrow">Informações comerciais</p>
          <h1>Termos de Uso</h1>
          <p>Condições gerais para navegar no cardápio e solicitar produtos da {BUSINESS_IDENTITY.tradeName}. Atualizado em 14 de novembro de 2026.</p>
        </header>
        <section className="company-page__card">
          <h2>1. Identificação</h2>
          <p>{BUSINESS_IDENTITY.tradeName}, razão social {BUSINESS_IDENTITY.legalName}, CNPJ {BUSINESS_IDENTITY.taxId}, com atendimento em {BUSINESS_IDENTITY.city}–{BUSINESS_IDENTITY.state}. Contato: <a href={"mailto:" + BUSINESS_IDENTITY.email}>{BUSINESS_IDENTITY.email}</a> ou telefone {BUSINESS_IDENTITY.phone}.</p>
        </section>
        <section className="company-page__card">
          <h2>2. Cardápio e disponibilidade</h2>
          <p>O site apresenta produtos, preços, opções e condições de entrega ou retirada. A oferta depende da disponibilidade, das opções selecionadas e da confirmação pela loja. Informações e disponibilidade podem ser atualizadas, sem prejuízo de pedidos já confirmados.</p>
        </section>
        <section className="company-page__card">
          <h2>3. Solicitação e confirmação do pedido</h2>
          <p>O site permite montar o pedido e, conforme a opção disponível, continuar pelo WhatsApp ou utilizar um fluxo de pagamento oferecido. A montagem do carrinho, por si só, não equivale à aceitação definitiva do pedido. A confirmação depende da validação das condições e do pagamento aplicável.</p>
        </section>
        <section className="company-page__card">
          <h2>4. Pagamentos, entrega e atendimento</h2>
          <p>Formas de pagamento e eventuais taxas de entrega são informadas durante o pedido. Prazos apresentados são estimativas e podem variar por demanda, endereço e produção. Em caso de dúvida, alteração ou problema com o pedido, entre em contato pelos canais oficiais da loja.</p>
        </section>
        <section className="company-page__card">
          <h2>5. Direitos do consumidor</h2>
          <p>Pedidos, cancelamentos, reclamações e eventuais reembolsos serão avaliados conforme as condições do pedido e a legislação de defesa do consumidor aplicável, considerando a natureza e a perecibilidade dos produtos. Estes termos não afastam direitos garantidos por lei.</p>
        </section>
        <section className="company-page__card">
          <h2>6. Privacidade e contato</h2>
          <p>O uso de dados pessoais está descrito na <a href="/politica-de-privacidade">Política de Privacidade</a>. Para exercer direitos sobre suas informações, consulte <a href="/exclusao-de-dados">Exclusão de Dados</a>.</p>
          <p><a href="/informacoes-da-empresa">Informações da empresa</a></p>
        </section>
      </div>
    </main>
  );
}
