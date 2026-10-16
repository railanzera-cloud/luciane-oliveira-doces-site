"use client";

import "./crocante-stock.css";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  BarChart3,
  Check,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react";

import {
  CATEGORY_ITEM_KEYS,
  CROCANTES_ITEM_KEYS,
  MENU_AVAILABILITY_ITEMS,
  createFallbackAvailability,
  type AvailabilitySnapshot,
  type AvailabilityStatus,
  type MenuAvailabilityItem,
} from "@/app/menu-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOrdersPanel } from "@/components/admin-orders-panel";
import { AdminResultsPanel } from "@/components/admin-results-panel";
import {
  loadRemoteAvailability,
  loadCrocanteInventory,
  saveCrocanteInventory,
  type CrocanteInventoryRow,
  updateMenuItemStatus,
  updateOrdersOpen,
} from "@/lib/menu-availability-client";
import {
  getSupabaseClient,
  getSupabaseConfigurationIssue,
} from "@/lib/supabase";

const STATUS_OPTIONS: Array<{ value: AvailabilityStatus; label: string }> = [
  { value: "available", label: "Disponível" },
  { value: "sold_out", label: "Esgotado" },
  { value: "hidden", label: "Oculto" },
];

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: "Disponível",
  sold_out: "Esgotado",
  hidden: "Oculto",
};

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha inválidos.";
  if (/email not confirmed/i.test(message)) return "Este e-mail ainda não foi confirmado.";
  if (/failed to fetch|network/i.test(message)) return "Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.";
  return message || "Não foi possível concluir a operação.";
}

function AvailabilityControl({
  item,
  status,
  pending,
  onChange,
}: {
  item: MenuAvailabilityItem;
  status: AvailabilityStatus;
  pending: boolean;
  onChange: (status: AvailabilityStatus) => void;
}) {
  return (
    <article className={`admin-item status-${status}`} aria-busy={pending}>
      <div className="admin-item-heading">
        <div>
          <strong>{item.name}</strong>
          <span>{STATUS_LABELS[status]}</span>
        </div>
        {pending ? <LoaderCircle className="admin-spinner" size={18} aria-label="Salvando" /> : status === "available" ? <Check size={18} aria-hidden="true" /> : null}
      </div>
      <div className="admin-status-options" aria-label={`Disponibilidade de ${item.name}`}>
        {STATUS_OPTIONS.map((option) => (
          <button
            type="button"
            className={status === option.value ? "is-selected" : ""}
            aria-pressed={status === option.value}
            disabled={pending}
            onClick={() => onChange(option.value)}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function AdminPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const configurationIssue = getSupabaseConfigurationIssue();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(supabase));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySnapshot>(() => createFallbackAvailability());
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [cupStock, setCupStock] = useState<CrocanteInventoryRow[]>([]);
  const [cupStockDraft, setCupStockDraft] = useState<Record<string, string>>({});
  const [cupStockSaving, setCupStockSaving] = useState("");

  const categoryItems = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "category");
  const popcornSizes = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "popcorn_size");
  const popcornFlavors = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "popcorn_flavor");
  const slices = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "slice");

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(friendlyError(error));
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const reloadMenu = useCallback(async () => {
    if (!session) return;
    setLoadingMenu(true);
    setLoadError("");
    try {
      const [snapshot, inventory] = await Promise.all([loadRemoteAvailability(), loadCrocanteInventory()]);
      setAvailability(snapshot);
      setCupStock(inventory);
      setCupStockDraft(Object.fromEntries(inventory.map((row) => [row.item_key, String(row.total)])));
    } catch (error) {
      setLoadError(friendlyError(error));
    } finally {
      setLoadingMenu(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const menuTimer = window.setTimeout(() => void reloadMenu(), 0);
    return () => window.clearTimeout(menuTimer);
  }, [reloadMenu, session]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 2800);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || authPending) return;
    setAuthPending(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setAuthError(friendlyError(error));
    setAuthPending(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    setPendingKeys(["sign_out"]);
    const { error } = await supabase.auth.signOut();
    if (error) setLoadError(friendlyError(error));
    setPendingKeys([]);
  }

  async function changeOrdersOpen(nextValue: boolean) {
    if (!session || pendingKeys.includes("orders_open") || availability.ordersOpen === nextValue) return;
    const previousValue = availability.ordersOpen;
    setPendingKeys((current) => [...current, "orders_open"]);
    setLoadError("");
    setAvailability((current) => ({ ...current, ordersOpen: nextValue }));
    try {
      await updateOrdersOpen(nextValue, session.user.id);
      showNotice(nextValue ? "Pedidos reabertos." : "Novas finalizações foram fechadas.");
    } catch (error) {
      setAvailability((current) => ({ ...current, ordersOpen: previousValue }));
      setLoadError(friendlyError(error));
    } finally {
      setPendingKeys((current) => current.filter((key) => key !== "orders_open"));
    }
  }

  async function changeItemStatus(item: MenuAvailabilityItem, nextStatus: AvailabilityStatus) {
    if (!session || pendingKeys.includes(item.itemKey)) return;
    const previousStatus = availability.statuses[item.itemKey] ?? "available";
    if (previousStatus === nextStatus) return;

    setPendingKeys((current) => [...current, item.itemKey]);
    setLoadError("");
    setAvailability((current) => ({
      ...current,
      statuses: { ...current.statuses, [item.itemKey]: nextStatus },
    }));
    try {
      await updateMenuItemStatus(item, nextStatus, session.user.id);
      showNotice(`${item.name}: ${STATUS_LABELS[nextStatus].toLowerCase()}.`);
    } catch (error) {
      setAvailability((current) => ({
        ...current,
        statuses: { ...current.statuses, [item.itemKey]: previousStatus },
      }));
      setLoadError(friendlyError(error));
    } finally {
      setPendingKeys((current) => current.filter((key) => key !== item.itemKey));
    }
  }

  async function updateCupStock(row: CrocanteInventoryRow, nextEnabled = row.enabled) {
    if (!session || cupStockSaving) return;
    const amount = Number(nextEnabled !== row.enabled ? row.total : (cupStockDraft[row.item_key] ?? row.total));
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000) {
      setLoadError("Informe uma quantidade inteira igual ou maior que zero.");
      return;
    }
    setCupStockSaving(row.item_key);
    setLoadError("");
    try {
      const updated = await saveCrocanteInventory({
        itemKey: row.item_key,
        total: amount,
        version: row.version,
        enabled: nextEnabled,
      });
      setCupStock(updated);
      setCupStockDraft(Object.fromEntries(updated.map((item) => [item.item_key, String(item.total)])));
      await reloadMenu();
      showNotice(`${row.item_key === CROCANTES_ITEM_KEYS["crocante-ninho"] ? "Ninho" : "Chocolate"}: estoque atualizado.`);
    } catch (error) {
      setLoadError(friendlyError(error));
    } finally {
      setCupStockSaving("");
    }
  }

  if (checkingSession) {
    return (
      <main className="admin-shell admin-centered" aria-busy="true">
        <LoaderCircle className="admin-spinner" size={28} />
        <p>Verificando acesso…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <div className="admin-login-mark" aria-hidden="true"><LockKeyhole size={24} /></div>
          <p className="eyebrow">Área restrita</p>
          <h1 id="admin-login-title">Luciane Oliveira Doces</h1>
          <p>Entre para controlar a disponibilidade do cardápio.</p>
          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label htmlFor="admin-email">E-mail</label>
              <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required />
            </div>
            <div className="field-group">
              <label htmlFor="admin-password">Senha</label>
              <Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </div>
            {(configurationIssue || authError) && (
              <p className="admin-error" role="alert"><AlertCircle size={16} />{authError || configurationIssue}</p>
            )}
            <Button type="submit" className="admin-login-button" disabled={!supabase || authPending}>
              {authPending ? <LoaderCircle className="admin-spinner" size={18} /> : <LockKeyhole size={18} />}
              {authPending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  const categoryStatus = (categoryKey: string) => availability.statuses[categoryKey] ?? "available";

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><strong>Luciane Oliveira Doces</strong><span>Pedidos e cardápio</span></div>
        <Button type="button" variant="ghost" size="icon" onClick={handleSignOut} disabled={pendingKeys.includes("sign_out")} aria-label="Sair do painel"><LogOut size={19} /></Button>
      </header>

      <Tabs defaultValue="orders" className="admin-workspace">
        <TabsList className="admin-main-tabs" aria-label="Áreas do painel">
          <TabsTrigger value="orders"><ShoppingBag size={17} /> Pedidos</TabsTrigger>
          <TabsTrigger value="availability"><Store size={17} /> Disponibilidade</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 size={17} /> Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="admin-content">
          <AdminOrdersPanel client={supabase!} session={session} />
        </TabsContent>

        <TabsContent value="results" className="admin-content">
          <AdminResultsPanel client={supabase!} />
        </TabsContent>

        <TabsContent value="availability" className="admin-content">
        {notice && <div className="admin-notice" role="status"><Check size={16} />{notice}</div>}
        {loadError && (
          <div className="admin-load-error" role="alert">
            <AlertCircle size={18} />
            <span>{loadError}</span>
            <Button type="button" variant="outline" onClick={reloadMenu} disabled={loadingMenu}><RefreshCw size={16} /> Tentar novamente</Button>
          </div>
        )}

        <section className="admin-store-card" aria-labelledby="orders-status-title">
          <div className="admin-section-heading">
            <span className="admin-section-icon"><Store size={20} /></span>
            <div><small>PEDIDOS</small><h1 id="orders-status-title">{availability.ordersOpen ? "Disponíveis" : "Fechados"}</h1></div>
            {loadingMenu && <LoaderCircle className="admin-spinner" size={19} aria-label="Atualizando" />}
          </div>
          <div className="admin-store-options" aria-label="Estado geral dos pedidos">
            <button type="button" className={availability.ordersOpen ? "is-selected is-open" : ""} aria-pressed={availability.ordersOpen} disabled={pendingKeys.includes("orders_open")} onClick={() => changeOrdersOpen(true)}>Disponíveis</button>
            <button type="button" className={!availability.ordersOpen ? "is-selected is-closed" : ""} aria-pressed={!availability.ordersOpen} disabled={pendingKeys.includes("orders_open")} onClick={() => changeOrdersOpen(false)}>Fechados</button>
          </div>
          <p>{availability.ordersOpen ? "O cardápio aceita novas finalizações." : "O cardápio continua visível, mas não finaliza novos pedidos."}</p>
        </section>

        <section className="admin-category-section" aria-labelledby="admin-popcorn-title">
          <div className="admin-category-heading"><div><p className="eyebrow">Categoria</p><h2 id="admin-popcorn-title">Pipocas Gourmet</h2></div></div>
          {categoryItems.filter((item) => item.itemKey === CATEGORY_ITEM_KEYS.pipocas).map((item) => (
            <AvailabilityControl item={item} status={categoryStatus(item.itemKey)} pending={pendingKeys.includes(item.itemKey)} onChange={(status) => changeItemStatus(item, status)} key={item.itemKey} />
          ))}
          <h3 className="admin-subheading">Tamanhos</h3>
          <div className="admin-item-list">
            {popcornSizes.map((item) => <AvailabilityControl item={item} status={categoryStatus(item.itemKey)} pending={pendingKeys.includes(item.itemKey)} onChange={(status) => changeItemStatus(item, status)} key={item.itemKey} />)}
          </div>
          <h3 className="admin-subheading">Sabores</h3>
          <div className="admin-item-list">
            {popcornFlavors.map((item) => <AvailabilityControl item={item} status={categoryStatus(item.itemKey)} pending={pendingKeys.includes(item.itemKey)} onChange={(status) => changeItemStatus(item, status)} key={item.itemKey} />)}
          </div>
        </section>

        <section className="admin-category-section" aria-labelledby="admin-crocantes-title">
          <div className="admin-category-heading">
            <div>
              <p className="eyebrow">Estoque por sabor · 400 ml</p>
              <h2 id="admin-crocantes-title">Copos Crocantes</h2>
              <p>Independente dos potes Gourmet. Quando o saldo chega a zero, o copo fica esgotado automaticamente.</p>
            </div>
          </div>
          <div className="admin-item-list">
            {cupStock.map((row) => {
              const flavor = row.item_key === CROCANTES_ITEM_KEYS["crocante-ninho"] ? "Caramelo com Ninho" : "Caramelo com Chocolate";
              const busy = cupStockSaving === row.item_key;
              return (
                <article className={`admin-item status-${row.available > 0 && row.enabled ? "available" : "sold_out"}`} key={row.item_key} aria-busy={busy}>
                  <div className="admin-item-heading">
                    <div>
                      <strong>{flavor}</strong>
                      <span>{row.enabled && row.available > 0 ? `${row.available} disponível(is)` : "Indisponível"} · {row.reserved} reservada(s)</span>
                    </div>
                  </div>
                  <div className="admin-crocante-stock-editor">
                    <label htmlFor={`stock-${row.item_key}`}>Unidades físicas restantes (inclui reservas)</label>
                    <div className="admin-crocante-stock-actions">
                      <Input
                        id={`stock-${row.item_key}`}
                        type="number" inputMode="numeric" min={0} max={100000} step={1}
                        value={cupStockDraft[row.item_key] ?? String(row.total)}
                        disabled={Boolean(cupStockSaving)}
                        onChange={(event) => setCupStockDraft((previous) => ({ ...previous, [row.item_key]: event.target.value }))}
                      />
                      <Button type="button" disabled={Boolean(cupStockSaving)} onClick={() => void updateCupStock(row)}>
                        {busy ? <LoaderCircle className="admin-spinner" size={16} /> : <Check size={16} />} Salvar estoque
                      </Button>
                    </div>
                    <div className="admin-crocante-stock-meta">
                      <span>{row.available} para novos pedidos</span>
                      <button type="button" disabled={Boolean(cupStockSaving)} onClick={() => void updateCupStock(row, !row.enabled)}>
                        {row.enabled ? "Pausar apenas este sabor" : "Retomar este sabor"}
                      </button>
                    </div>
                    {row.shortages > 0 && <p role="alert" className="admin-error">
                      <AlertCircle size={16} /> {row.shortages} pedido(s) pago(s) sem unidade reservada: confira no painel antes de produzir.
                    </p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="admin-category-section" aria-labelledby="admin-slices-title">
          <div className="admin-category-heading"><div><p className="eyebrow">Categoria</p><h2 id="admin-slices-title">Fatias Artesanais</h2></div></div>
          {categoryItems.filter((item) => item.itemKey === CATEGORY_ITEM_KEYS.fatias).map((item) => (
            <AvailabilityControl item={item} status={categoryStatus(item.itemKey)} pending={pendingKeys.includes(item.itemKey)} onChange={(status) => changeItemStatus(item, status)} key={item.itemKey} />
          ))}
          <h3 className="admin-subheading">Fatias</h3>
          <div className="admin-item-list">
            {slices.map((item) => <AvailabilityControl item={item} status={categoryStatus(item.itemKey)} pending={pendingKeys.includes(item.itemKey)} onChange={(status) => changeItemStatus(item, status)} key={item.itemKey} />)}
          </div>
        </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
