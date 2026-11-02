"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, ChevronRight, CircleHelp, LoaderCircle, RefreshCw, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
import { TRUFADA_STOCK_ITEM_KEYS, type AvailabilityStatus } from "@/app/menu-availability";
import { TRUFADAS_VARIANTS, TRUFADAS_SIZES } from "../supabase/functions/_shared/trufadas-variants.mjs";

type InventoryRow = {
  item_key: string;
  total: number;
  enabled: boolean;
  version: number;
  reserved: number;
  available: number;
  shortages: number;
};
type Draft = { free: string; enabled: boolean };

const FLAVOR_GROUPS = Object.values(TRUFADAS_VARIANTS).map(product => ({
  id: product.productId,
  name: product.name,
  sizes: TRUFADAS_SIZES.map(size => ({
    size,
    itemKey: product.sizes[size as keyof typeof product.sizes].itemKey,
  })),
}));

function freePackages(row: InventoryRow): number {
  return Math.max(0, row.total - row.reserved);
}

function validatedRows(data: unknown): InventoryRow[] {
  if (!Array.isArray(data)) throw new Error("A resposta de estoque não é válida.");
  const rows = data.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("Estoque incompleto.");
    const item = row as Record<string, unknown>;
    for (const field of ["total", "version", "reserved", "available", "shortages"] as const) {
      if (!Number.isSafeInteger(item[field]) || (item[field] as number) < 0) throw new Error("Estoque incompleto.");
    }
    if (typeof item.item_key !== "string" || typeof item.enabled !== "boolean") throw new Error("Estoque incompleto.");
    return item as InventoryRow;
  });
  if (rows.length < TRUFADA_STOCK_ITEM_KEYS.length || FLAVOR_GROUPS.some(group =>
    group.sizes.some(({ itemKey }) => rows.filter(row => row.item_key === itemKey).length !== 1)
  )) throw new Error("O servidor ainda não retornou os nove pacotes P, M e G.");
  return rows;
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/crocante_inventory_conflict_reload|40001/i.test(raw)) return "O estoque mudou em outra sessão. Atualize antes de tentar novamente.";
  if (/crocante_inventory_below_reserved/i.test(raw)) return "Há mais pacotes comprometidos em pedidos. Atualize o estoque e confira novamente.";
  if (/permission denied|not authorized|authentication|jwt/i.test(raw)) return "Sua sessão não tem permissão para alterar o estoque. Entre novamente no painel.";
  return raw || "Não foi possível atualizar o estoque.";
}

export function AdminTrufadasStock({
  onChanged,
  ordersOpen = false,
  pipocasStatus = "available",
}: {
  onChanged?: () => Promise<void>;
  ordersOpen?: boolean;
  pipocasStatus?: AvailabilityStatus;
}) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [flavorId, setFlavorId] = useState(FLAVOR_GROUPS[0].id);
  const [sizeId, setSizeId] = useState("p");
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyRows = useCallback((next: InventoryRow[]) => {
    setRows(next);
    setDrafts(Object.fromEntries(next.map(row => [
      row.item_key, { free: String(freePackages(row)), enabled: row.enabled },
    ])));
  }, []);

  const refresh = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) { setError("Supabase indisponível."); setLoading(false); return; }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data, error: rpcError } = await client.rpc("admin_get_trufadas_pmg_inventory");
      if (rpcError) throw rpcError;
      applyRows(validatedRows(data));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [applyRows]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(row: InventoryRow) {
    const draft = drafts[row.item_key];
    if (!draft || pendingKey || loading) return;

    // O campo é "pacotes LIVRES"; a API continua exigindo a contagem física total.
    // O total inclui os pacotes retidos, cuja situação financeira é independente.
    const free = /^[0-9]+$/.test(draft.free.trim()) ? Number(draft.free.trim()) : NaN;
    const total = free + row.reserved;
    if (!Number.isSafeInteger(free) || free < 0 || !Number.isSafeInteger(total) || total > 100000) {
      setError("Informe quantos pacotes estão livres (0 a 100.000, descontados os que já estão em pedidos).");
      return;
    }
    if (total < row.reserved) {
      setError("Os pacotes em pedidos não podem ser retirados da contagem.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) { setError("Supabase indisponível."); return; }
    setPendingKey(row.item_key);
    setError("");
    setNotice("");
    try {
      // O número de pedidos pode mudar sem alterar a versão do inventário.
      // Conferimos as duas dimensões antes da RPC otimista de gravação.
      const latest = await client.rpc("admin_get_trufadas_pmg_inventory");
      if (latest.error) throw latest.error;
      const current = validatedRows(latest.data).find(item => item.item_key === row.item_key);
      if (!current || current.version !== row.version || current.reserved !== row.reserved
        || current.total !== row.total || current.enabled !== row.enabled) {
        applyRows(validatedRows(latest.data));
        setError("Entrou ou mudou um pedido enquanto você editava. Atualizei os números; confira e salve novamente.");
        return;
      }

      const { data, error: rpcError } = await client.rpc("admin_set_trufadas_pmg_inventory", {
        p_item_key: row.item_key,
        p_total: total,
        p_version: row.version,
        p_enabled: draft.enabled,
      });
      if (rpcError) throw rpcError;
      const updated = validatedRows(data);
      applyRows(updated);
      const actual = updated.find(item => item.item_key === row.item_key);
      setNotice(actual && freePackages(actual) !== free
        ? "Estoque salvo, mas houve um novo pedido durante a atualização. Confira o saldo atualizado."
        : `Pacote ${sizeId.toUpperCase()} atualizado. ${free} ${free === 1 ? "pacote livre" : "pacotes livres"} informado(s).`);
      try { await onChanged?.(); } catch { /* A gravação já foi confirmada no servidor. */ }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPendingKey(null);
    }
  }

  const selectedFlavor = FLAVOR_GROUPS.find(group => group.id === flavorId) ?? FLAVOR_GROUPS[0];
  const selectedVariant = selectedFlavor.sizes.find(item => item.size === sizeId) ?? selectedFlavor.sizes[0];
  const selectedRow = rows.find(row => row.item_key === selectedVariant.itemKey);
  const draft = drafts[selectedVariant.itemKey];
  const isEditing = Boolean(selectedRow && draft && (draft.free !== String(freePackages(selectedRow)) || draft.enabled !== selectedRow.enabled));
  const allFree = rows.filter(row => TRUFADA_STOCK_ITEM_KEYS.includes(row.item_key)).reduce((total, row) => total + freePackages(row), 0);
  const allHeld = rows.filter(row => TRUFADA_STOCK_ITEM_KEYS.includes(row.item_key)).reduce((total, row) => total + row.reserved, 0);
  const liveCount = rows.filter(row => TRUFADA_STOCK_ITEM_KEYS.includes(row.item_key) && row.enabled && row.available > 0).length;

  return (
    <section className="admin-trufadas-studio" aria-labelledby="admin-trufadas-stock-title">
      <div className="admin-studio-heading">
        <div>
          <p className="admin-studio-eyebrow"><Sparkles size={14} aria-hidden="true" /> Controle de pacotes</p>
          <h2 id="admin-trufadas-stock-title">Pipocas Trufadas</h2>
          <p>Escolha o sabor, o tamanho e informe só os pacotes que ainda não estão em pedidos.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || Boolean(pendingKey)}>
          {loading ? <LoaderCircle className="admin-spinner" size={15} /> : <RefreshCw size={15} />}
          Atualizar
        </Button>
      </div>

      {!loading && rows.length > 0 && (
        <div className="admin-stock-overview" aria-label="Resumo dos pacotes">
          <div><small>Prontos sem pedido</small><strong>{allFree}</strong></div>
          <div><small>Em pedidos</small><strong>{allHeld}</strong></div>
          <div><small>Combinações com saldo</small><strong>{liveCount} <span>/ 9</span></strong></div>
        </div>
      )}
      {!ordersOpen && <p className="admin-stock-global-note"><AlertCircle size={15} aria-hidden="true" /> Pedidos gerais fechados. Você pode preparar o estoque sem liberar compras agora.</p>}
      {pipocasStatus !== "available" && <p className="admin-stock-global-note"><AlertCircle size={15} aria-hidden="true" /> A seção geral de Pipocas está pausada. O estoque das Trufadas continua sendo registrado normalmente.</p>}
      {error && <p className="admin-load-error" role="alert"><AlertCircle size={17} />{error}</p>}
      {notice && <p className="admin-stock-notice" role="status"><Check size={17} />{notice}</p>}

      <div className="admin-stock-flavors" role="tablist" aria-label="Sabores de Pipocas Trufadas">
        {FLAVOR_GROUPS.map(group => {
          const active = group.id === flavorId;
          const free = group.sizes.reduce((sum, item) => sum + freePackages(rows.find(row => row.item_key === item.itemKey) ?? { total: 0, reserved: 0 } as InventoryRow), 0);
          return <button type="button" key={group.id} role="tab" id={`admin-stock-tab-${group.id}`}
            aria-selected={active} aria-controls={`admin-stock-panel-${group.id}`}
            className={active ? "is-current" : ""} disabled={Boolean(pendingKey)}
            onClick={() => { setFlavorId(group.id); setSizeId("p"); setError(""); setNotice(""); }}>
            <strong>{group.name}</strong><small>{loading ? "Consultando…" : `${free} livres`}</small>
          </button>;
        })}
      </div>

      <div className="admin-stock-flavor-body" role="tabpanel" id={`admin-stock-panel-${selectedFlavor.id}`}
        aria-labelledby={`admin-stock-tab-${selectedFlavor.id}`} aria-busy={loading}>
        <div className="admin-stock-step-title"><div><small>SELECIONE UM TAMANHO</small><h3>{selectedFlavor.name}</h3></div><span>P · M · G</span></div>
        <div className="admin-stock-variants" role="group" aria-label={`Tamanhos de ${selectedFlavor.name}`}>
          {selectedFlavor.sizes.map(({ itemKey, size }) => {
            const row = rows.find(item => item.item_key === itemKey);
            const free = row ? freePackages(row) : 0;
            const selected = size === sizeId;
            const isReady = row?.enabled && row.available > 0;
            return <button type="button" key={itemKey} className={selected ? "is-current" : ""}
              aria-pressed={selected} disabled={loading || Boolean(pendingKey) || !row}
              onClick={() => { setSizeId(size); setError(""); setNotice(""); }}>
              <span className="admin-stock-variant-letter">{size.toUpperCase()}</span>
              <strong>{row ? free : "—"} <small>{free === 1 ? "livre" : "livres"}</small></strong>
              <span className={`admin-stock-variant-state ${isReady ? "is-ready" : row?.enabled ? "is-empty" : "is-paused"}`}>
                {loading ? "Consultando" : !row ? "Sem dados" : !row.enabled ? "Pausado" : free > 0 ? "Liberado" : "Sem saldo"}
              </span>
              {selected && <Check className="admin-stock-variant-check" size={15} aria-hidden="true" />}
            </button>;
          })}
        </div>

        {selectedRow && draft ? (
          <div className="admin-stock-editor" key={selectedRow.item_key}>
            <div className="admin-stock-editor-heading">
              <div><small>EDITANDO</small><h3>{selectedFlavor.name} · Pacote {sizeId.toUpperCase()}</h3></div>
              <span className="admin-stock-editor-status">{selectedRow.enabled ? "Liberado" : "Pausado"}</span>
            </div>
            <div className="admin-stock-math" aria-label="Resumo da contagem">
              <div><small>Em pedidos</small><strong>{selectedRow.reserved}</strong></div>
              <ChevronRight size={16} aria-hidden="true" />
              <div><small>Livres agora</small><strong>{freePackages(selectedRow)}</strong></div>
              <ChevronRight size={16} aria-hidden="true" />
              <div><small>Total registrado</small><strong>{selectedRow.total}</strong></div>
            </div>
            <label className="admin-stock-free-label" htmlFor={`stock-free-${selectedRow.item_key}`}>
              Pacotes livres para novos pedidos
              <small>Não inclua aqui os {selectedRow.reserved} que já estão comprometidos em pedidos.</small>
            </label>
            <div className="admin-stock-free-input-row">
              <input id={`stock-free-${selectedRow.item_key}`} className="admin-stock-free-input" type="number"
                inputMode="numeric" min="0" max={100000 - selectedRow.reserved} step="1"
                value={draft.free} disabled={Boolean(pendingKey) || loading}
                onChange={event => setDrafts(current => ({
                  ...current, [selectedRow.item_key]: { ...current[selectedRow.item_key], free: event.target.value },
                }))} />
              <span>{/^\d+$/.test(draft.free) && Number.isSafeInteger(Number(draft.free))
                ? `${draft.free} livres + ${selectedRow.reserved} em pedidos = ${Number(draft.free) + selectedRow.reserved} no estoque`
                : "Informe um número inteiro"}</span>
            </div>
            <div className="admin-stock-editor-footer">
              <div className="admin-stock-state-switch" role="group" aria-label="Oferecer esta combinação no site">
                <button type="button" className={draft.enabled ? "is-current is-enabled" : ""}
                  aria-pressed={draft.enabled} disabled={Boolean(pendingKey) || loading}
                  onClick={() => setDrafts(current => ({
                    ...current, [selectedRow.item_key]: { ...current[selectedRow.item_key], enabled: true },
                  }))}>Liberar</button>
                <button type="button" className={!draft.enabled ? "is-current is-paused" : ""}
                  aria-pressed={!draft.enabled} disabled={Boolean(pendingKey) || loading}
                  onClick={() => setDrafts(current => ({
                    ...current, [selectedRow.item_key]: { ...current[selectedRow.item_key], enabled: false },
                  }))}>Pausar</button>
              </div>
              <Button type="button" className="admin-stock-save" onClick={() => void save(selectedRow)}
                disabled={Boolean(pendingKey) || loading || !isEditing}>
                {pendingKey ? <LoaderCircle className="admin-spinner" size={16} /> : <Check size={16} />}
                {pendingKey ? "Salvando…" : isEditing ? "Salvar alteração" : "Sem alterações"}
              </Button>
            </div>
            {selectedRow.shortages > 0 && (
              <p className="admin-stock-warning" role="status"><AlertCircle size={15} /> {selectedRow.shortages} pedido(s) com falta registrada para conferir.</p>
            )}
          </div>
        ) : <p className="admin-stock-placeholder">{loading ? "Consultando as nove combinações…" : "Estoque indisponível. Atualize para tentar novamente."}</p>}
      </div>

      <p className="admin-stock-explainer"><CircleHelp size={15} aria-hidden="true" />
        <span><strong>Em pedidos</strong> significa que a unidade está protegida para um pedido registrado — não que o pagamento foi confirmado.
          Ao salvar, o painel soma essa quantidade automaticamente aos pacotes livres. A confirmação do pagamento continua no painel Pedidos.</span>
      </p>
    </section>
  );
}
