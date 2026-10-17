"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  belemToday, formatResultsRange, resultsPresetRange, resultsRangeError,
  type ResultsPreset, type ResultsRange,
} from "@/lib/admin-results-dates";
import { loadAdminResults } from "@/lib/admin-results-client";
import { loadAdminSalesSummary } from "@/lib/admin-sales-client";
import type { AdminSalesSummary } from "@/lib/admin-sales-model";
import {
  channelDescription, resultsMoney, trackingEvidenceDescription,
  trackingEvidenceExplanation, type ResultsOverview,
  type TrackingEvidenceKind,
} from "@/lib/admin-results-model";

const PERIODS: Array<{ id: ResultsPreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "tomorrow", label: "Amanhã" },
  { id: "last7", label: "7 dias" },
  { id: "last30", label: "30 dias" },
  { id: "last90", label: "90 dias" },
  { id: "custom", label: "Personalizado" },
];
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
  const [preset, setPreset] = useState<ResultsPreset>("today");
  const [range, setRange] = useState<ResultsRange>(() => resultsPresetRange("today"));
  const [draft, setDraft] = useState<ResultsRange>(() => resultsPresetRange("today"));
  const [dateError, setDateError] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<"sales" | "signals" | "site">("sales");
  const [overview, setOverview] = useState<ResultsOverview | null>(null);
  const [sales, setSales] = useState<AdminSalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError("");
      setOverview(null);
      setSales(null);
      // Amanhã é apenas uma prévia: RPCs não devem consultar datas futuras.
      if (preset === "tomorrow") {
        setLoading(false);
        return;
      }
      try {
        const [next, nextSales] = await Promise.all([
          loadAdminResults(client, range),
          loadAdminSalesSummary(client, range),
        ]);
        if (active) {
          setOverview(next);
          setSales(nextSales);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os resultados.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [client, range, preset, revision]);

  const today = belemToday();
  function choosePreset(next: ResultsPreset) {
    setPreset(next);
    setDateError("");
    if (next === "custom") {
      setDraft(range);
    } else {
      setRange(resultsPresetRange(next));
    }
  }
  function applyCustomRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = resultsRangeError(draft);
    if (problem) {
      setDateError(problem);
      return;
    }
    setDateError("");
    setRange({ ...draft });
  }

  const s = overview?.summary;
  return (
    <section className="admin-results" aria-labelledby="admin-results-heading">
      <header className="admin-results-heading">
        <div>
          <p className="eyebrow">Pedidos e mensuração</p>
          <h1 id="admin-results-heading">Resultados</h1>
          <p>Confira as vendas dos pedidos registrados no painel. Vendas fora do sistema não estão incluídas.</p>
        </div>
        <Button type="button" variant="outline" disabled={loading}
          onClick={() => setRevision(n => n + 1)}>
          <RefreshCw size={16} className={loading ? "admin-spinner" : ""} /> Atualizar
        </Button>
      </header>

      <div className="admin-results-date-filter">
        <div className="admin-results-periods" role="group" aria-label="Período do relatório">
          {PERIODS.map(period => (
            <button key={period.id} type="button"
              className={preset === period.id ? "is-selected" : ""}
              aria-pressed={preset === period.id}
              onClick={() => choosePreset(period.id)}>{period.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <form className="admin-results-custom-dates" onSubmit={applyCustomRange}>
            <div className="admin-results-date-fields">
              <label htmlFor="results-date-from">De
                <Input id="results-date-from" type="date" value={draft.startDate}
                  max={today} required
                  onChange={event => { setDateError(""); setDraft(current => ({ ...current, startDate: event.target.value })); }} />
              </label>
              <label htmlFor="results-date-to">Até
                <Input id="results-date-to" type="date" value={draft.endDate}
                  max={today} required
                  onChange={event => { setDateError(""); setDraft(current => ({ ...current, endDate: event.target.value })); }} />
              </label>
            </div>
            {dateError && <p className="admin-results-date-error" role="alert">{dateError}</p>}
            <Button type="submit" className="admin-results-date-apply">Aplicar período</Button>
          </form>
        )}
        <p className="admin-results-range-active" role="status">
          <strong>Período exibido:</strong> {formatResultsRange(range)} · Datas de criação dos pedidos (horário de Paragominas).
        </p>
      </div>

      <div className="admin-results-views" role="group" aria-label="Tipo de relatório">
        <button type="button" className={view === "sales" ? "is-selected" : ""}
          aria-label="Vendas concluídas" aria-pressed={view === "sales"}
          onClick={() => setView("sales")}>Vendas</button>
        <button type="button" className={view === "signals" ? "is-selected" : ""}
          aria-label="Sinais de anúncios" aria-pressed={view === "signals"}
          onClick={() => setView("signals")}>Anúncios</button>
        <button type="button" className={view === "site" ? "is-selected" : ""}
          aria-label="Registros do site" aria-pressed={view === "site"}
          onClick={() => setView("site")}>Registros</button>
      </div>

      {preset === "tomorrow" && (
        <p className="admin-results-caution" role="status">
          <strong>Amanhã ainda não possui resultados realizados.</strong> Os pagamentos e as entregas
          desse dia só poderão ser contabilizados quando ocorrerem. Amanhã, consulte “Hoje”
          para conferir os valores reais. Este relatório não é uma previsão de vendas.
        </p>
      )}
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

      {overview && sales && s && (
        <>
          {view === "signals" && <p className="admin-results-caution" role="note">
            <strong>Dados parciais.</strong> A integração recente com o Tintim ainda não cobre
            o histórico completo de conversas e pagamentos. “Origem não identificada” não é
            sinônimo de venda orgânica, e um sinal da Meta não comprova sozinho venda causada por anúncio.
          </p>}

          {view === "sales" ? (
            <div className="admin-results-sales">
              <div className="admin-results-sales-heading">
                <h2>Vendas concluídas e pagas</h2>
                <p>Dos <strong>{sales.orders_created} pedidos criados no período</strong>, estes já estão marcados
                  como concluídos e com pagamento confirmado no painel.</p>
              </div>
              <div className="admin-results-sales-total">
                <span>Valor dos pedidos concluídos e pagos</span>
                <strong>{resultsMoney(sales.completed_paid_amount)}</strong>
                <small>{sales.completed_paid_orders} {sales.completed_paid_orders === 1 ? "pedido concluído e pago" : "pedidos concluídos e pagos"}</small>
              </div>
              <div className="admin-results-stats">
                <Stat title="Concluídos sem pagamento confirmado"
                  value={String(sales.completed_unpaid_orders)}
                  subtitle={`${resultsMoney(sales.completed_unpaid_amount)} fora do total de vendas confirmadas.`} />
                <Stat title="Pagos, mas ainda não concluídos"
                  value={String(sales.paid_in_progress_orders)}
                  subtitle={`${resultsMoney(sales.paid_in_progress_amount)} fora do total de vendas concluídas.`} />
              </div>
              <p className="admin-results-sales-note">
                O valor acima considera somente pedidos <strong>criados nas datas escolhidas</strong> e que
                agora estão concluídos e pagos. Não inclui cancelados nem os sem confirmação de pagamento.
                O registro do pagamento e da entrega precisa estar correto no painel.
              </p>
              {sales.previous_completed_paid_orders > 0 && (
                <details className="admin-results-more">
                  <summary>Pedidos anteriores finalizados neste período</summary>
                  <p className="admin-results-help">
                    Além do total acima, {sales.previous_completed_paid_orders} pedidos criados antes da data inicial foram
                    marcados como concluídos neste período, com pagamento confirmado:
                    {" "}<strong>{resultsMoney(sales.previous_completed_paid_amount)}</strong>.
                    Aparecem separados para não misturar pedidos antigos com pedidos feitos nas datas escolhidas.
                  </p>
                </details>
              )}
            </div>
          ) : view === "signals" ? (
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
