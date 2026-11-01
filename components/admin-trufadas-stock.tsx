"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
import { TRUFADA_STOCK_ITEM_KEYS } from "@/app/menu-availability";
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

type Draft = { total: string; enabled: boolean };
const FLAVORS = Object.values(TRUFADAS_VARIANTS).flatMap((product) =>
  TRUFADAS_SIZES.map((size: string) => ({
    itemKey: product.sizes[size as keyof typeof product.sizes].itemKey,
    name: product.name,
    sizeLabel: `Pacote ${size.toUpperCase()}`,
  })),
);

function validatedRows(data: unknown): InventoryRow[] {
  if (!Array.isArray(data)) throw new Error("A resposta de estoque não é válida.");
  const rows = data.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("Estoque incompleto.");
    const item = row as Record<string, unknown>;
    const numbers = ["total", "version", "reserved", "available", "shortages"] as const;
    for (const field of numbers) {
      if (!Number.isSafeInteger(item[field]) || (item[field] as number) < 0) throw new Error("Estoque incompleto.");
    }
    if (typeof item.item_key !== "string" || typeof item.enabled !== "boolean") throw new Error("Estoque incompleto.");
    return item as InventoryRow;
  });
  if (rows.length < TRUFADA_STOCK_ITEM_KEYS.length || FLAVORS.some(({ itemKey }) => rows.filter(row => row.item_key === itemKey).length !== 1)) {
    throw new Error("Estoque dos nove pacotes ainda não está configurado no servidor.");
  }
  return rows;
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/crocante_inventory_conflict_reload|40001/i.test(raw)) return "O estoque foi alterado em outra sessão. Atualize os dados antes de salvar novamente.";
  if (/crocante_inventory_below_reserved/i.test(raw)) return "Não é possível definir quantidade menor que os pacotes já reservados.";
  if (/permission denied|not authorized|authentication|jwt/i.test(raw)) return "Sua sessão não tem permissão para alterar o estoque. Entre novamente com uma conta administrativa.";
  return raw || "Não foi possível atualizar o estoque.";
}

export function AdminTrufadasStock({ onChanged }: { onChanged?: () => Promise<void> }) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyRows = useCallback((next: InventoryRow[]) => {
    setRows(next);
    setDrafts(Object.fromEntries(next.map(row => [row.item_key, { total: String(row.total), enabled: row.enabled }])));
  }, []);

  const refresh = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) { setError("Supabase indisponível."); setLoading(false); return; }
    setLoading(true);
    setError("");
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
    const value = draft.total.trim();
    const total = /^[0-9]+$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(total) || total < 0 || total > 100000) {
      setError("Informe uma quantidade inteira entre 0 e 100.000 pacotes.");
      return;
    }
    if (total < row.reserved) {
      setError("A quantidade não pode ser menor que as reservas em andamento.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) { setError("Supabase indisponível."); return; }
    setPendingKey(row.item_key);
    setError("");
    setNotice("");
    try {
      const { data, error: rpcError } = await client.rpc("admin_set_trufadas_pmg_inventory", {
        p_item_key: row.item_key,
        p_total: total,
        p_version: row.version,
        p_enabled: draft.enabled,
      });
      if (rpcError) throw rpcError;
      applyRows(validatedRows(data));
      setNotice("Estoque atualizado com sucesso. A vitrine acompanhará a nova disponibilidade.");
      try { await onChanged?.(); } catch { /* O salvamento já foi confirmado no servidor. */ }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="admin-category-section admin-trufadas-stock" aria-labelledby="admin-trufadas-stock-title">
      <div className="admin-category-heading">
        <div><p className="eyebrow">Produção por sabor</p><h2 id="admin-trufadas-stock-title">Pipocas Trufadas</h2></div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading || Boolean(pendingKey)}>
          {loading ? <LoaderCircle className="admin-spinner" size={16} /> : <RefreshCw size={16} />} Atualizar
        </Button>
      </div>
      <p className="admin-stock-intro">Cadastre somente pacotes prontos. Cada sabor e tamanho tem estoque independente; venda bloqueada sem saldo validado.</p>
      {error && <p className="admin-load-error" role="alert"><AlertCircle size={17}/>{error}</p>}
      {notice && <p className="admin-stock-notice" role="status"><Check size={17}/>{notice}</p>}
      <div className="admin-stock-grid" aria-busy={loading}>
        {FLAVORS.map(({ itemKey, name, sizeLabel }) => {
          const row = rows.find(item => item.item_key === itemKey);
          const draft = drafts[itemKey];
          const busy = pendingKey === itemKey;
          const otherPending = Boolean(pendingKey) && !busy;
          return (
            <article className="admin-stock-card" key={itemKey}>
              <strong>{name} · {sizeLabel}</strong>
              {row && draft ? (
                <>
                  <div className="admin-stock-summary">
                    <span><small>Disponíveis</small><b>{row.available}</b></span>
                    <span><small>Reservados</small><b>{row.reserved}</b></span>
                  </div>
                  <label className="admin-stock-label" htmlFor={`stock-${itemKey}`}>Pacotes {sizeLabel.replace("Pacote ", "")} em estoque</label>
                  <input id={`stock-${itemKey}`} className="admin-stock-input" type="number" inputMode="numeric" min="0" max="100000" step="1" value={draft.total} disabled={busy || otherPending || loading} onChange={event => setDrafts(current => ({ ...current, [itemKey]: { ...current[itemKey], total: event.target.value } }))} />
                  <label className="admin-stock-toggle">
                    <input type="checkbox" checked={draft.enabled} disabled={busy || otherPending || loading} onChange={event => setDrafts(current => ({ ...current, [itemKey]: { ...current[itemKey], enabled: event.target.checked } }))} />
                    <span>Permitir vendas deste sabor</span>
                  </label>
                  <Button type="button" onClick={() => void save(row)} disabled={busy || otherPending || loading || (draft.total === String(row.total) && draft.enabled === row.enabled)}>
                    {busy ? <LoaderCircle className="admin-spinner" size={16} /> : <Check size={16} />} {busy ? "Salvando…" : "Salvar estoque"}
                  </Button>
                  {row.shortages > 0 && <small className="admin-stock-warning">Há {row.shortages} pedido(s) com falta registrada para conferir.</small>}
                </>
              ) : <span className="admin-stock-placeholder">{loading ? "Consultando estoque…" : "Estoque indisponível para consulta."}</span>}
            </article>
          );
        })}
      </div>
      <p className="admin-stock-footnote">Os pacotes reservados por pedidos em andamento são considerados no saldo disponível. Uma reserva não significa pagamento confirmado. As alterações de estoque são validadas pelo servidor.</p>
    </section>
  );
}
