import type { Metadata } from "next";
import { BUSINESS_IDENTITY } from "@/lib/company-identity";

export const metadata: Metadata = {
  title: "Exclusão e direitos sobre dados | Luciane Oliveira Doces",
  description: "Como solicitar acesso, correção, revogação de consentimento ou exclusão dos seus dados pessoais.",
  alternates: { canonical: BUSINESS_IDENTITY.website + "/exclusao-de-dados" },
};

export default function ExclusaoDeDados() {
  const subject = encodeURIComponent("Solicitação LGPD — dados pessoais");
  return (
    <main className="company-page">
      <div className="company-page__shell">
        <nav className="company-page__nav" aria-label="Navegação">
          <a href="/" className="company-page__brand">{BUSINESS_IDENTITY.tradeName}</a>
          <a href="/" className="company-page__back">Voltar ao cardápio</a>
        </nav>
        <header className="company-page__heading">
          <p className="company-page__eyebrow">Privacidade e direitos do titular</p>
          <h1>Solicitar exclusão de dados</h1>
          <p>Clientes e pessoas que entraram em contato com a {BUSINESS_IDENTITY.tradeName} podem solicitar informações sobre o uso de seus dados, correção, revogação de consentimento e exclusão quando cabível.</p>
        </header>
        <section className="company-page__card">
          <h2>Como enviar a solicitação</h2>
          <p>Envie um e-mail para <a href={"mailto:" + BUSINESS_IDENTITY.email + "?subject=" + subject}>{BUSINESS_IDENTITY.email}</a> com o assunto <strong>Solicitação LGPD — dados pessoais</strong>.</p>
          <p>Informe, de preferência, o telefone utilizado no atendimento ou pedido e descreva sua solicitação. Não envie senhas, dados completos de cartão, documentos pessoais ou outras informações sensíveis na mensagem inicial.</p>
          <p>Após receber o pedido, a equipe poderá confirmar a identidade por um meio adequado, localizar os registros pertinentes e informar o encaminhamento, observando os prazos legais.</p>
          <p><a href={"mailto:" + BUSINESS_IDENTITY.email + "?subject=" + subject}>Escrever solicitação por e-mail</a></p>
        </section>
        <section className="company-page__card">
          <h2>O que acontece depois</h2>
          <p>Após a validação, avaliaremos as informações vinculadas ao atendimento, ao CRM e aos pedidos. Dados cuja conservação não seja mais necessária poderão ser eliminados ou anonimizados, conforme o direito solicitado e a legislação.</p>
          <p>Registros de transações e outras informações podem precisar ser preservados por obrigações legais, prevenção de fraudes ou exercício regular de direitos. Nesses casos, explicaremos o motivo e limitaremos o tratamento à finalidade permitida.</p>
          <p>Para deixar de receber comunicações promocionais, você também pode manifestar sua preferência diretamente no atendimento. Esse pedido será tratado independentemente da eventual necessidade de preservar registros de compras.</p>
        </section>
        <section className="company-page__card">
          <h2>Contato e informações adicionais</h2>
          <p>Responsável comercial: {BUSINESS_IDENTITY.legalName}, CNPJ {BUSINESS_IDENTITY.taxId}, {BUSINESS_IDENTITY.city}–{BUSINESS_IDENTITY.state}.</p>
          <p>Veja a <a href="/politica-de-privacidade">Política de Privacidade</a> para entender as finalidades e os prestadores envolvidos no tratamento de informações.</p>
        </section>
      </div>
    </main>
  );
}
