"use client";

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
  UsersRound,
} from "lucide-react";

import {
  CATEGORY_ITEM_KEYS,
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
import { AdminCrmPanel } from "@/components/admin-crm-panel";
import { AdminTrufadasStock } from "@/components/admin-trufadas-stock";
import "./availability.css";
import { AdminStrawberryPreorder } from "@/components/admin-strawberry-preorder";
import {
  loadRemoteAvailability,
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
  disabled = false,
  onChange,
  preorderActive = false,
}: {
  item: MenuAvailabilityItem;
  status: AvailabilityStatus;
  pending: boolean;
  disabled?: boolean;
  onChange: (status: AvailabilityStatus) => void;
  preorderActive?: boolean;
}) {
  return (
    <article className={`admin-item admin-compact-item status-${status}`} aria-busy={pending}>
      <div className="admin-item-heading">
        <div>
          <strong>{item.name}</strong>
          <span>{preorderActive ? "Esgotado para pronta-entrega · pré-reserva ativa" : STATUS_LABELS[status]}</span>
        </div>
        {pending ? <LoaderCircle className="admin-spinner" size={18} aria-label="Salvando" /> : status === "available" ? <Check size={16} aria-hidden="true" /> : null}
      </div>
      <div className="admin-status-options" aria-label={`Disponibilidade de ${item.name}`}>
        {STATUS_OPTIONS.map((option) => (
          <button
            type="button"
            className={status === option.value ? "is-selected" : ""}
            aria-pressed={status === option.value}
            disabled={pending || disabled || (preorderActive && option.value==="available")}
            title={preorderActive && option.value==="available" ? "Encerre primeiro o lote de pré-reserva; ainda não é estoque pronto." : undefined}
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
  const [availabilitySection, setAvailabilitySection] = useState<"trufadas" | "gourmet" | "fatias">("trufadas");

  const categoryItems = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "category");
  const popcornSizes = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "popcorn_size");
  const popcornFlavors = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "popcorn_flavor");
  const slices = MENU_AVAILABILITY_ITEMS.filter((item) => item.itemType === "slice");
  const gourmetItems = [...popcornSizes, ...popcornFlavors];
  const countReady = (items: MenuAvailabilityItem[]) => items.filter(item => availability.statuses[item.itemKey] === "available").length;
  const controlsUnavailable = loadingMenu || availability.source !== "supabase" || Boolean(loadError);

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
      const snapshot = await loadRemoteAvailability();
      // A loja permite reservar, mas o painel deve mostrar o estoque imediato REAL.
      if (snapshot.slicePreorder?.active && supabase) {
        const { data, error } = await supabase.from("menu_availability")
          .select("status").eq("item_key", "slice_chocolate_morango").single();
        if (error) throw error;
        snapshot.statuses.slice_chocolate_morango = data.status as AvailabilityStatus;
      }
      setAvailability(snapshot);
    } catch (error) {
      setLoadError(friendlyError(error));
    } finally {
      setLoadingMenu(false);
    }
  }, [session, supabase]);

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
    if (!session || controlsUnavailable || pendingKeys.includes("orders_open") || availability.ordersOpen === nextValue) return;
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
    if (!session || controlsUnavailable || pendingKeys.includes(item.itemKey)) return;
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
          <TabsTrigger value="crm"><UsersRound size={17} /> Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="admin-content">
          <AdminOrdersPanel client={supabase!} session={session} />
        </TabsContent>

        <TabsContent value="crm" className="admin-content">
          <AdminCrmPanel client={supabase!} />
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

        <div className="admin-availability-welcome">
          <p>CONTROLE DO CARDÁPIO</p>
          <h1>Disponibilidade, sem complicação.</h1>
          <span>Gerencie o que pode ser pedido. Estoque comprometido e pagamentos continuam separados.</span>
        </div>
        <section className="admin-store-card admin-orders-compact" aria-labelledby="orders-status-title">
          <div className="admin-section-heading">
            <span className="admin-section-icon"><Store size={20} /></span>
            <div><small>PEDIDOS</small><h1 id="orders-status-title">{availability.ordersOpen ? "Disponíveis" : "Fechados"}</h1></div>
            {loadingMenu && <LoaderCircle className="admin-spinner" size={19} aria-label="Atualizando" />}
          </div>
          <div className="admin-store-options" aria-label="Estado geral dos pedidos">
            <button type="button" className={availability.ordersOpen ? "is-selected is-open" : ""} aria-pressed={availability.ordersOpen} disabled={controlsUnavailable || pendingKeys.includes("orders_open")} onClick={() => changeOrdersOpen(true)}>Disponíveis</button>
            <button type="button" className={!availability.ordersOpen ? "is-selected is-closed" : ""} aria-pressed={!availability.ordersOpen} disabled={controlsUnavailable || pendingKeys.includes("orders_open")} onClick={() => changeOrdersOpen(false)}>Fechados</button>
          </div>
          <p>{availability.ordersOpen ? "O cardápio aceita novas finalizações." : "O cardápio continua visível, mas não finaliza novos pedidos."}</p>
        </section>

        <section className="admin-availability-scope" aria-label="Controle geral das categorias">
          <div className="admin-scope-heading">
            <h2>Categorias no cardápio</h2>
            <p>A seção Pipocas é compartilhada por Gourmet e Trufadas. Pausá-la afeta as duas.</p>
          </div>
          <div className="admin-compact-grid admin-scope-grid">
            {categoryItems.map(item => (
              <AvailabilityControl
                key={item.itemKey}
                item={item.itemKey === CATEGORY_ITEM_KEYS.pipocas ? { ...item, name: "Pipocas · Gourmet e Trufadas" } : item}
                status={categoryStatus(item.itemKey)}
                pending={pendingKeys.includes(item.itemKey)} disabled={controlsUnavailable}
                onChange={status => changeItemStatus(item, status)}
              />
            ))}
          </div>
        </section>

        <div className="admin-availability-nav" role="tablist" aria-label="Escolha a categoria para configurar">
          <button type="button" role="tab" id="admin-availability-tab-trufadas"
            aria-selected={availabilitySection === "trufadas"} aria-controls="admin-availability-panel-trufadas"
            className={availabilitySection === "trufadas" ? "is-active" : ""}
            onClick={() => setAvailabilitySection("trufadas")}>
            <strong>Trufadas</strong><small>3 sabores · P/M/G</small>
          </button>
          <button type="button" role="tab" id="admin-availability-tab-gourmet"
            aria-selected={availabilitySection === "gourmet"} aria-controls="admin-availability-panel-gourmet"
            className={availabilitySection === "gourmet" ? "is-active" : ""}
            onClick={() => setAvailabilitySection("gourmet")}>
            <strong>Gourmet</strong><small>{countReady(gourmetItems)}/{gourmetItems.length} liberados</small>
          </button>
          <button type="button" role="tab" id="admin-availability-tab-fatias"
            aria-selected={availabilitySection === "fatias"} aria-controls="admin-availability-panel-fatias"
            className={availabilitySection === "fatias" ? "is-active" : ""}
            onClick={() => setAvailabilitySection("fatias")}>
            <strong>Fatias</strong><small>{countReady(slices)}/{slices.length} liberadas</small>
          </button>
        </div>

        {availabilitySection === "trufadas" && (
          <div role="tabpanel" id="admin-availability-panel-trufadas" aria-labelledby="admin-availability-tab-trufadas">
            <AdminTrufadasStock
              onChanged={reloadMenu}
              ordersOpen={availability.ordersOpen}
              pipocasStatus={categoryStatus(CATEGORY_ITEM_KEYS.pipocas)}
            />
          </div>
        )}

        {availabilitySection === "gourmet" && (
          <section className="admin-category-section admin-category-compact" role="tabpanel" id="admin-availability-panel-gourmet"
            aria-labelledby="admin-availability-tab-gourmet">
            <div className="admin-category-heading">
              <div><p className="eyebrow">Pote recheado</p><h2 id="admin-popcorn-title">Pipocas Gourmet</h2></div>
            </div>
            <p className="admin-category-explanation">Ative ou pause cada tamanho e sabor. As alterações são salvas ao tocar numa opção.</p>
            <div className="admin-group-title"><h3>Tamanhos</h3><span>{countReady(popcornSizes)}/{popcornSizes.length} liberados</span></div>
            <div className="admin-compact-grid">
              {popcornSizes.map(item => (
                <AvailabilityControl item={item} status={categoryStatus(item.itemKey)}
                  pending={pendingKeys.includes(item.itemKey)} disabled={controlsUnavailable}
                  onChange={status => changeItemStatus(item, status)} key={item.itemKey} />
              ))}
            </div>
            <div className="admin-group-title"><h3>Sabores</h3><span>{countReady(popcornFlavors)}/{popcornFlavors.length} liberados</span></div>
            <div className="admin-compact-grid">
              {popcornFlavors.map(item => (
                <AvailabilityControl item={item} status={categoryStatus(item.itemKey)}
                  pending={pendingKeys.includes(item.itemKey)} disabled={controlsUnavailable}
                  onChange={status => changeItemStatus(item, status)} key={item.itemKey} />
              ))}
            </div>
          </section>
        )}

        {availabilitySection === "fatias" && (
          <section className="admin-category-section admin-category-compact" role="tabpanel" id="admin-availability-panel-fatias"
            aria-labelledby="admin-availability-tab-fatias">
            <div className="admin-category-heading"><div><p className="eyebrow">Sabores individuais</p><h2 id="admin-slices-title">Fatias Artesanais</h2></div></div>
            <p className="admin-category-explanation">Escolha o que está disponível hoje. A pré-reserva de Chocolate com Morango continua separada da pronta-entrega.</p>
            {supabase && <AdminStrawberryPreorder client={supabase} onChanged={reloadMenu} />}
            <div className="admin-group-title"><h3>Fatias de pronta-entrega</h3><span>{countReady(slices)}/{slices.length} liberadas</span></div>
            <div className="admin-compact-grid">
              {slices.map(item => (
                <AvailabilityControl item={item} status={categoryStatus(item.itemKey)}
                  preorderActive={item.itemKey === "slice_chocolate_morango" && Boolean(availability.slicePreorder?.active)}
                  pending={pendingKeys.includes(item.itemKey)} disabled={controlsUnavailable}
                  onChange={status => changeItemStatus(item, status)} key={item.itemKey} />
              ))}
            </div>
          </section>
        )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
