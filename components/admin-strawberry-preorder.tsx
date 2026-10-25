"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RefreshCw } from "lucide-react";

type Stock = {
  active: boolean;
  capacity: number;
  site_reserved: number;
  external_reserved: number;
  remaining: number;
  ready_at?: string;
};

function validStock(value: unknown): value is Stock {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Stock>;
  return typeof s.active === "boolean" && [s.capacity,s.site_reserved,s.external_reserved,s.remaining]
    .every(x=>typeof x==="number" && Number.isSafeInteger(x) && x>=0);
}

export function AdminStrawberryPreorder({ client, onChanged }: {
  client: SupabaseClient;
  onChanged: () => Promise<void>;
}) {
  const [stock,setStock] = useState<Stock|null>(null);
  const [draft,setDraft] = useState("0");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const refresh = useCallback(async () => {
    const {data,error:rpcError}=await client.rpc("admin_strawberry_preorder_status");
    if (rpcError) throw rpcError;
    if (!validStock(data)) throw new Error("Não foi possível validar a quantidade de fatias.");
    setStock(data);
    setDraft(String(data.external_reserved));
  },[client]);
  useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Falha ao carregar reservas."));},[refresh]);

  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stock || busy) return;
    const next=Number(draft);
    if (!/^\d+$/.test(draft.trim()) || !Number.isSafeInteger(next) || next<0) {
      setError("Informe um número inteiro de fatias.");return;
    }
    if (next>stock.capacity-stock.site_reserved) {
      setError("O total excede as fatias ainda disponíveis. Confira as reservas feitas pelo site.");return;
    }
    setBusy(true);setError("");setNotice("");
    try {
      const {error:rpcError}=await client.rpc("admin_set_strawberry_external_units",{
        p_expected_units:stock.external_reserved,p_new_units:next,
      });
      if (rpcError) throw rpcError;
      await refresh();
      setNotice("Controle atualizado. As fatias do WhatsApp já foram descontadas do site.");
      await onChanged();
    } catch(e) {
      setError("Não foi possível salvar. Confira se outras reservas entraram e atualize os números.");
      await refresh().catch(()=>{});
    } finally {setBusy(false);}
  }
  if (!stock) return <section className="admin-preorder-stock" aria-label="Controle de reservas externas">
    <span className="preorder-eyebrow">Pré-reserva · Chocolate com Morango</span>
    <p>{error || "Carregando quantidade do lote…"}</p>
    <button type="button" onClick={()=>void refresh().catch(e=>setError(String(e)))}>Tentar novamente</button>
  </section>;
  return <section className="admin-preorder-stock" aria-label="Controle de fatias reservadas fora do site">
    <span className="preorder-eyebrow">Última fornada de hoje · Controle interno</span>
    <h3>Chocolate com Morango</h3>
    <p>Desconte aqui as fatias vendidas ou reservadas <strong>diretamente no WhatsApp</strong>, fora do site.</p>
    <div className="admin-preorder-numbers">
      <div><strong>{stock.site_reserved}</strong><span>Reservadas pelo site</span></div>
      <div><strong>{stock.external_reserved}</strong><span>Fechadas fora do site</span></div>
      <div><strong>{stock.remaining}</strong><span>Ainda disponíveis</span></div>
    </div>
    <form onSubmit={save}>
      <label htmlFor="strawberry-external-total">Total de fatias comprometidas fora do site</label>
      <div className="admin-preorder-entry">
        <input id="strawberry-external-total" inputMode="numeric" type="number" min={0} max={stock.capacity-stock.site_reserved} step={1} value={draft} disabled={busy||!stock.active} onChange={e=>setDraft(e.target.value)} />
        <button type="submit" disabled={busy||!stock.active||draft===String(stock.external_reserved)}>{busy?"Salvando…":"Salvar total"}</button>
        <button type="button" disabled={busy} onClick={()=>void refresh().catch(e=>setError(String(e)))} title="Atualizar quantidades" aria-label="Atualizar quantidades"><RefreshCw size={17}/></button>
      </div>
    </form>
    {error && <p role="alert" className="preorder-error">{error}</p>}
    {notice && <p role="status" className="preorder-feedback">{notice}</p>}
    <p className="preorder-note">Informe o total acumulado, não apenas a última venda. Pedidos feitos pelo site já são descontados automaticamente. Para corrigir uma venda externa cancelada, diminua esse total.</p>
    {!stock.active && <p className="preorder-note">Lote de pré-reserva inativo ou encerrado. Nenhuma alteração externa está disponível agora.</p>}
  </section>;
}
