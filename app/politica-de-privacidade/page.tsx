import type { Metadata } from "next";
import { BUSINESS_IDENTITY } from "@/lib/company-identity";

export const metadata: Metadata = {
  title: "Política de Privacidade | Luciane Oliveira Doces",
  description: "Como a Luciane Oliveira Doces utiliza dados em seu site, pedidos, WhatsApp e atendimento comercial.",
  alternates: { canonical: BUSINESS_IDENTITY.website + "/politica-de-privacidade" },
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="company-page">
      <div className="company-page__shell">
        <nav className="company-page__nav" aria-label="Navegação">
          <a href="/" className="company-page__brand">{BUSINESS_IDENTITY.tradeName}</a>
          <a href="/" className="company-page__back">Voltar ao cardápio</a>
        </nav>
        <header className="company-page__heading">
          <p className="company-page__eyebrow">Transparência e proteção de dados</p>
          <h1>Política de Privacidade</h1>
          <p>Esta política explica, de forma resumida, o tratamento de informações pessoais no site, nos pedidos e nas ferramentas de atendimento da {BUSINESS_IDENTITY.tradeName}.</p>
          <p>Atualizada em 14 de novembro de 2026.</p>
        </header>

        <section className="company-page__card">
          <h2>1. Quem é responsável pelos dados</h2>
          <p>O atendimento comercial é realizado por {BUSINESS_IDENTITY.tradeName}, nome empresarial {BUSINESS_IDENTITY.legalName}, CNPJ {BUSINESS_IDENTITY.taxId}, em {BUSINESS_IDENTITY.city}–{BUSINESS_IDENTITY.state}.</p>
          <p>Contato para dúvidas e solicitações de privacidade: <a href={"mailto:" + BUSINESS_IDENTITY.email}>{BUSINESS_IDENTITY.email}</a>. Telefone: {BUSINESS_IDENTITY.phone}.</p>
        </section>

        <section className="company-page__card">
          <h2>2. Quais dados podem ser tratados</h2>
          <p>Conforme a interação, podemos tratar nome, telefone, endereço de entrega, bairro, referências do endereço, produtos selecionados, valores, dados necessários ao pedido, confirmação ou situação do pagamento, informações fornecidas no atendimento e registros de contato.</p>
          <p>Também podem ser processados identificadores técnicos e dados de navegação, como páginas acessadas, eventos de interação com o cardápio, parâmetros de campanhas e informações técnicas necessárias à prevenção de falhas e à mensuração publicitária. Não solicitamos números completos de cartão no atendimento comum; pagamentos eletrônicos, quando disponíveis, são processados por parceiros de pagamento.</p>
        </section>

        <section className="company-page__card">
          <h2>3. Para que utilizamos essas informações</h2>
          <p>Para montar e confirmar pedidos, organizar pagamentos e entregas, prestar suporte, manter registros operacionais, prevenir fraudes, cumprir obrigações legais e melhorar o funcionamento do site e do atendimento.</p>
          <p>Podemos analisar, de forma proporcional, a origem dos atendimentos e os resultados comerciais de campanhas. Ações de acompanhamento e mensagens promocionais devem respeitar a base legal aplicável, as escolhas da pessoa e as regras do WhatsApp. <strong>O simples fato de visitar o site, pedir um orçamento ou comprar não significa autorização automática para receber campanhas.</strong></p>
        </section>

        <section className="company-page__card">
          <h2>4. Ferramentas e compartilhamento</h2>
          <p>Para executar essas atividades, utilizamos ou podemos utilizar infraestrutura de hospedagem e banco de dados (Cloudflare e Supabase), serviços de atendimento e mensuração (WhatsApp, Meta e Tintim) e processamento de pagamentos (Mercado Pago), além de prestadores estritamente necessários à entrega e ao suporte.</p>
          <p>Dados são compartilhados somente na medida necessária à finalidade respectiva e sujeitos às condições técnicas e legais aplicáveis. Parte desses serviços pode tratar informações em outros países, com as salvaguardas previstas na legislação aplicável.</p>
        </section>

        <section className="company-page__card">
          <h2>5. Cookies e mensuração</h2>
          <p>O site utiliza recursos técnicos de navegação e pode carregar tecnologias de mensuração, incluindo Pixel da Meta e recursos do Tintim, para entender interações e campanhas. Essas ferramentas podem receber identificadores e eventos conforme suas próprias políticas. Configurações de navegador podem permitir limitar cookies e rastreadores; restrições podem afetar a mensuração.</p>
        </section>

        <section className="company-page__card">
          <h2>6. Conservação e proteção dos dados</h2>
          <p>Conservamos os dados pelo período necessário ao atendimento, à operação comercial, ao cumprimento de obrigações legais e à defesa de direitos, observando a necessidade de cada categoria de informação. Aplicamos medidas de controle de acesso e proteção compatíveis com as operações. Nenhum ambiente digital é absolutamente livre de riscos.</p>
        </section>

        <section className="company-page__card">
          <h2>7. Seus direitos e suas escolhas</h2>
          <p>Você pode solicitar confirmação do tratamento, acesso, correção, informações sobre compartilhamento, revogação de consentimento quando aplicável, oposição a usos indevidos e exclusão ou anonimização de dados nas hipóteses da LGPD.</p>
          <p>Escreva para <a href={"mailto:" + BUSINESS_IDENTITY.email}>{BUSINESS_IDENTITY.email}</a> informando o direito que deseja exercer. Poderemos solicitar elementos mínimos para confirmar a titularidade, sem pedir dados excessivos. Algumas informações precisam ser preservadas quando houver obrigação legal ou outra justificativa legítima.</p>
          <p>Veja também as <a href="/exclusao-de-dados">instruções para exclusão de dados</a>.</p>
        </section>

        <section className="company-page__card">
          <h2>8. Atualizações</h2>
          <p>Esta política pode ser revisada para refletir mudanças nas funcionalidades, nos fornecedores ou na legislação. A versão vigente estará disponível nesta página.</p>
          <p><a href="/termos-de-uso">Termos de Uso</a> · <a href="/informacoes-da-empresa">Informações da empresa</a></p>
        </section>
      </div>
    </main>
  );
}
