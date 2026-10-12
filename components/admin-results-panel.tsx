"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadAdminResults } from "@/lib/admin-results-client";
import {
  channelDescription, resultsMoney, trackingEvidenceDescription,
  trackingEvidenceExplanation, type ResultsOverview, type ResultsPeriod,
  type TrackingEvidenceKind,
} from "@/lib/admin-results-model";

const PERIODS: ResultsPeriod[] = [7, 30, 90];
const MAX_VISIBLE_CAMPAIGNS = 12;
const EVIDENCE_ORDER: TrackingEvidenceKind[] = [
  "tintim_campaign", "saved_utm_campaign", "meta_link_identifier",
  "bio_without_campaign_or_click_id", "unclassified",
];

function Stat({ title, value, subtitle }: {
  title: string; value: string; subtitle: string;
}) {
  return (
    <div className="admin-results-stat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{subtitle}</small>
    </div>
  );
}

export function AdminResultsPanel({ client }: { client: SupabaseClient }) {
  const [days, setDays] = useState<ResultsPeriod>(30);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<"signals" | "site">("signals");
  const [overview, setOverview] = useState<ResultsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      setOverview(null);
      try {
        const next = await loadAdminResults(client, days);
        if (active) setOverview(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os resultados.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [client, days, revision]);

  const s = overview?.summary;
  return (
    <section className="admin-results" aria-labelledby="admin-results-heading">
      <header className="admin-results-heading">
        <div>
          <p className="eyebrow">Pedidos e mensuração</p>
          <h1 id="admin-results-heading">Resultados</h1>
          <p>Veja os registros que o site conseguiu captar — não o faturamento total da loja.</p>
        </div>
        <Button type="button" variant="outline" disabled={loading}
          onClick={() => setRevision(n => n + 1)}>
          <RefreshCw size={16} className={loading ? "admin-spinner" : ""} /> Atualizar
        </Button>
      </header>

      <div className="admin-results-periods" role="group" aria-label="Período do relatório">
        {PERIODS.map(period => (
          <button key={period} type="button"
            className={days === period ? "is-selected" : ""}
            aria-pressed={days === period}
            onClick={() => setDays(period)}>{period} dias</button>
        ))}
      </div>

      <div className="admin-results-views" role="group" aria-label="Tipo de relatório">
        <button type="button" className={view === "signals" ? "is-selected" : ""}
          aria-pressed={view === "signals"} onClick={() => setView("signals")}>
          Sinais de anúncios
        </button>
        <button type="button" className={view === "site" ? "is-selected" : ""}
          aria-pressed={view === "site"} onClick={() => setView("site")}>
          Registros do site
        </button>
      </div>

      {loading && (
        <p className="admin-results-state" role="status">
          <LoaderCircle size={18} className="admin-spinner" /> Carregando indicadores…
        </p>
      )}
      {error && (
        <div className="admin-load-error" role="alert">
          <AlertCircle size={18} /> {error}
          <Button type="button" variant="outline" onClick={() => setRevision(n => n + 1)}>
            Tentar novamente
          </Button>
        </div>
      )}

      {overview && s && (
        <>
          <p className="admin-results-caution" role="note">
            <strong>Dados parciais.</strong> A integração recente com o Tintim ainda não cobre
            o histórico completo de conversas e pagamentos. “Origem não identificada” não é
            sinônimo de venda orgânica, e um sinal da Meta não comprova sozinho venda causada por anúncio.
          </p>

          {view === "signals" ? (
            <>
              <div className="admin-results-stats">
                <Stat title="Pedidos com algum sinal de campanha ou Meta"
                  value={String(s.orders_with_campaign_or_meta_signal)}
                  subtitle="Indícios em pedidos, não vendas atribuídas." />
                <Stat title="Campanha vinculada pelo Tintim"
                  value={String(s.with_tintim_campaign)}
                  subtitle="Cobertura do webhook atual, não todo o histórico do Tintim." />
                <Stat title="Sem evidência suficiente"
                  value={String(s.unclassified_orders)}
                  subtitle="Não significa orgânico." />
                <Stat title="Pedidos no Supabase"
                  value={String(s.orders)}
                  subtitle="Somente os pedidos criados no período selecionado." />
              </div>

              <section className="admin-results-section" aria-labelledby="admin-results-tracking">
                <h2 id="admin-results-tracking">Como os pedidos estão identificados</h2>
                <p className="admin-results-help">
                  Categorias sem duplicação: cada pedido aparece apenas uma vez.
                  A classificação indica a evidência disponível, não o efeito comprovado dos anúncios.
                </p>
                <div className="admin-results-tracking-list">
                  {EVIDENCE_ORDER.map(kind => {
                    const item = overview.tracking_evidence.find(entry => entry.kind === kind);
                    return (
                      <div className="admin-results-tracking-row" key={kind}>
                        <div>
                          <strong>{trackingEvidenceDescription(kind)}</strong>
                          <small>{trackingEvidenceExplanation(kind)}</small>
                        </div>
                        <b>{item?.orders ?? 0} {item?.orders === 1 ? "pedido" : "pedidos"}</b>
                      </div>
                    );
                  })}
                </div>
                <p className="admin-results-footnote">
                  Até agora, {s.tintim_linked_orders} {s.tintim_linked_orders === 1 ? "pedido tem" : "pedidos têm"}
                  {" "}vínculo técnico com uma conversa do Tintim. Os demais podem ter origem publicitária,
                  mas ainda não possuem essa associação no banco.
                </p>
              </section>

              <section className="admin-results-section" aria-labelledby="admin-results-bio">
                <h2 id="admin-results-bio">E o link da bio?</h2>
                <p className="admin-results-help">
                  A entrada pela bio mostra a última passagem ao site, não necessariamente
                  como a pessoa descobriu a Luciane.
                </p>
                <div className="admin-results-tracking-list">
                  <div className="admin-results-tracking-row">
                    <div><strong>Pedidos com entrada pelo link da bio</strong>
                      <small>Incluídos nas categorias acima; não são uma categoria extra de vendas.</small>
                    </div>
                    <b>{s.bio_orders}</b>
                  </div>
                  <div className="admin-results-tracking-row">
                    <div><strong>Desses, com identificador fbclid</strong>
                      <small>Pode indicar passagem por links da Meta; não comprova clique em anúncio pago.</small>
                    </div>
                    <b>{s.bio_with_fbclid}</b>
                  </div>
                </div>
              </section>

              <section className="admin-results-section" aria-labelledby="admin-results-campaigns">
                <h2 id="admin-results-campaigns">Campanhas registradas no Tintim</h2>
                <p className="admin-results-help">
                  Mostra só os pedidos que conseguimos associar a conversas do Tintim.
                  Não é o total de vendas originadas nos anúncios.
                </p>
                {overview.campaigns.length === 0 ? (
                  <p className="admin-results-empty">Nenhuma campanha vinculada aos pedidos deste período.</p>
                ) : (
                  <div className="admin-results-campaign-list">
                    {overview.campaigns.slice(0, MAX_VISIBLE_CAMPAIGNS).map((campaign, index) => (
                      <article className="admin-results-campaign"
                        key={`${campaign.campaign_id ?? campaign.campaign_name}-${campaign.evidence_kind}-${index}`}>
                        <div className="admin-results-campaign-title">
                          <strong>{campaign.campaign_name}</strong>
                          <small>{campaign.evidence_kind === "near_order"
                            ? "Registrada próxima ao pedido"
                            : "Identificada anteriormente na conversa"}</small>
                        </div>
                        <div className="admin-results-campaign-values">
                          <span><b>{campaign.orders}</b> pedidos associados</span>
                          <span><b>{campaign.paid_orders}</b> marcados pagos no site</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {overview.utm_campaigns.length > 0 && (
                <details className="admin-results-more">
                  <summary>Nomes de campanhas salvos no site, sem vínculo Tintim</summary>
                  <p className="admin-results-help">
                    Esses nomes vieram de parâmetros gravados nos pedidos.
                    Podem ser de acessos anteriores; não provam novo clique nem compra paga.
                  </p>
                  <div className="admin-results-simple-list">
                    {overview.utm_campaigns.map(item => (
                      <div key={item.campaign_name}>
                        <span>{item.campaign_name}</span>
                        <strong>{item.orders} {item.orders === 1 ? "pedido" : "pedidos"}</strong>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <details className="admin-results-more">
                <summary>Ver origem da visita ao site</summary>
                <p className="admin-results-help">
                  É a entrada registrada no site, não uma classificação definitiva
                  da origem da venda.
                </p>
                <div className="admin-results-simple-list">
                  {overview.visits.map(item => (
                    <div key={item.source}>
                      <span>{item.source}</span>
                      <strong>{item.orders} pedidos</strong>
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <>
              <p className="admin-results-caution" role="note">
                <strong>Não é o faturamento real.</strong> A Luciane pode ter recebido pagamentos
                e confirmado vendas pelo Tintim sem atualizar o pedido no painel.
                “Sem confirmação no site” não significa que o cliente não pagou.
              </p>
              <div className="admin-results-stats">
                <Stat title="Pedidos cadastrados no site" value={String(s.orders)}
                  subtitle="Inclui pedidos de teste e cancelados." />
                <Stat title="Marcados como pagos no painel" value={String(s.paid_orders)}
                  subtitle="Não inclui pagamentos confirmados somente no Tintim." />
                <Stat title="Valor marcado como pago no site" value={resultsMoney(s.paid_amount)}
                  subtitle="Não representa o faturamento total da Luciane." />
                <Stat title="Sem confirmação de pagamento no site" value={String(s.pending_orders)}
                  subtitle={`${resultsMoney(s.pending_amount)} em pedidos ainda sem confirmação neste painel.`} />
              </div>

              <section className="admin-results-section" aria-labelledby="admin-results-channels">
                <h2 id="admin-results-channels">Pedidos por forma de finalização</h2>
                <p className="admin-results-help">
                  “WhatsApp” informa o encaminhamento do pedido, não pagamento, origem
                  orgânica ou venda gerada por anúncios.
                </p>
                <div className="admin-results-simple-list">
                  {overview.channels.map(item => (
                    <div key={item.channel}>
                      <span>{channelDescription(item.channel)}</span>
                      <strong>{item.orders} pedidos</strong>
                    </div>
                  ))}
                </div>
              </section>

              <details className="admin-results-more">
                <summary>Ver cancelamentos</summary>
                <div className="admin-results-simple-list">
                  <div><span>Pedidos cancelados</span><strong>{s.cancelled_orders}</strong></div>
                  {s.paid_cancelled_orders > 0 && (
                    <div><span>Cancelados com pagamento marcado (conferir)</span>
                      <strong>{s.paid_cancelled_orders}</strong></div>
                  )}
                </div>
              </details>
            </>
          )}

          <p className="admin-results-disclaimer">
            O período é definido pela data em que o pedido foi criado. A situação do pagamento é a registrada hoje para esses pedidos.
            Os indicadores usam exclusivamente os pedidos registrados no Supabase da Luciane e podem incluir testes.
            O Tintim continua responsável pelos disparos Purchase para a Meta; este relatório não envia eventos.
            Sem integrar todas as confirmações comerciais e os custos dos anúncios, não é possível calcular faturamento real, ROAS ou lucro.
          </p>
        </>
      )}
    </section>
  );
}
