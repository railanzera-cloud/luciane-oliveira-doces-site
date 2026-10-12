"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, BarChart3, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadAdminResults } from "@/lib/admin-results-client";
import {
  channelDescription, evidenceDescription, resultsMoney,
  type ResultsOverview, type ResultsPeriod,
} from "@/lib/admin-results-model";

const PERIODS: ResultsPeriod[] = [7, 30, 90];
const MAX_VISIBLE_CAMPAIGNS = 12;

function Stat({
  title, value, subtitle,
}: {
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
          <p className="eyebrow">Acompanhamento</p>
          <h1 id="admin-results-heading">Resultados</h1>
          <p>Veja os pedidos, pagamentos registrados e campanhas identificadas.</p>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => setRevision(n => n + 1)}>
          <RefreshCw size={16} className={loading ? "admin-spinner" : ""} />
          Atualizar
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

      {loading && (
        <p className="admin-results-state" role="status">
          <LoaderCircle size={18} className="admin-spinner" /> Carregando indicadores…
        </p>
      )}
      {error && (
        <div className="admin-load-error" role="alert">
          <AlertCircle size={18} /> {error}
          <Button type="button" variant="outline" onClick={() => setRevision(n => n + 1)}>Tentar novamente</Button>
        </div>
      )}

      {overview && s && (
        <>
          <div className="admin-results-stats">
            <Stat title="Pedidos recebidos" value={String(s.orders)}
              subtitle="Inclui pedidos pendentes e cancelados." />
            <Stat title="Pagamentos confirmados" value={String(s.paid_orders)}
              subtitle="Exclui pedidos cancelados." />
            <Stat title="Valor registrado como pago" value={resultsMoney(s.paid_amount)}
              subtitle="Conforme o painel, sem conciliação bancária." />
            <Stat title="Aguardando pagamento" value={String(s.pending_orders)}
              subtitle={`${resultsMoney(s.pending_amount)} em pedidos não pagos.`} />
          </div>

          {s.orders === 0 ? (
            <p className="admin-results-state">Nenhum pedido cadastrado neste período.</p>
          ) : (
            <>
              <section className="admin-results-section" aria-labelledby="admin-results-tracking">
                <h2 id="admin-results-tracking">Rastreamento dos pedidos</h2>
                <p className="admin-results-help">A campanha pode ter sido registrada perto do pedido ou em uma conversa anterior. O rastreamento não é confirmação de pagamento.</p>
                <div className="admin-results-tracking-list">
                  {overview.evidence.map(item => (
                    <div className="admin-results-tracking-row" key={item.kind}>
                      <div>
                        <strong>{evidenceDescription(item.kind)}</strong>
                        <small>{item.paid_orders} com pagamento confirmado · {resultsMoney(item.paid_amount)} registrados como pagos</small>
                      </div>
                      <b>{item.orders} {item.orders === 1 ? "pedido" : "pedidos"}</b>
                    </div>
                  ))}
                </div>
                {s.without_tintim_link > 0 && (
                  <p className="admin-results-footnote">
                    {s.without_tintim_link} {s.without_tintim_link === 1 ? "pedido ainda não tem" : "pedidos ainda não têm"} vínculo de mensuração com o Tintim neste período.
                  </p>
                )}
              </section>

              <section className="admin-results-section" aria-labelledby="admin-results-campaigns">
                <h2 id="admin-results-campaigns">Campanhas registradas no Tintim</h2>
                <p className="admin-results-help">
                  Contagem de pedidos associados a registros da campanha, não vendas causadas pelo anúncio. Um pedido entra somente uma vez na classificação do rastreamento.
                </p>
                {overview.campaigns.length === 0 ? (
                  <p className="admin-results-empty">Nenhuma campanha vinculada a pedidos neste período.</p>
                ) : (
                  <div className="admin-results-campaign-list">
                    {overview.campaigns.slice(0, MAX_VISIBLE_CAMPAIGNS).map((campaign, index) => (
                      <article key={`${campaign.campaign_id ?? campaign.campaign_name}-${campaign.evidence_kind}-${index}`}
                        className="admin-results-campaign">
                        <div className="admin-results-campaign-title">
                          <strong>{campaign.campaign_name}</strong>
                          <small>{campaign.evidence_kind === "near_order" ? "Registro próximo ao pedido" : "Campanha anterior na conversa"}</small>
                        </div>
                        <div className="admin-results-campaign-values">
                          <span><b>{campaign.orders}</b> pedidos associados</span>
                          <span><b>{campaign.paid_orders}</b> pagamentos confirmados</span>
                          <span><b>{resultsMoney(campaign.paid_amount)}</b> valor pago registrado</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-results-section" aria-labelledby="admin-results-visits">
                <h2 id="admin-results-visits">Origem das visitas ao site</h2>
                <p className="admin-results-help">Mostra apenas o que ficou registrado na visita do pedido. Pode ser diferente da origem histórica da conversa no Tintim.</p>
                <div className="admin-results-simple-list">
                  {overview.visits.map(item => (
                    <div key={item.source}>
                      <span>{item.source}</span>
                      <strong>{item.orders} pedidos</strong>
                    </div>
                  ))}
                </div>
              </section>

              <details className="admin-results-more">
                <summary>Ver detalhes dos canais e cancelamentos</summary>
                <div className="admin-results-simple-list">
                  {overview.channels.map(item => (
                    <div key={item.channel}>
                      <span>{channelDescription(item.channel)}</span>
                      <strong>{item.orders} pedidos · {item.paid_orders} pagos</strong>
                    </div>
                  ))}
                  <div><span>Pedidos cancelados</span><strong>{s.cancelled_orders}</strong></div>
                  {s.paid_cancelled_orders > 0 && (
                    <div><span>Cancelados com pagamento registrado (conferir)</span><strong>{s.paid_cancelled_orders}</strong></div>
                  )}
                </div>
              </details>
            </>
          )}

          <p className="admin-results-disclaimer">
            Os indicadores usam exclusivamente os pedidos registrados no Supabase da Luciane. Podem incluir testes.
            Pagamento confirmado significa status “pago” no painel, não depósito conciliado no banco.
            O Tintim continua responsável pelos disparos Purchase para a Meta; este relatório não envia eventos.
            Sem os custos dos anúncios, não é possível calcular ROAS ou lucro.
          </p>
        </>
      )}
    </section>
  );
}
