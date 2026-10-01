"use client";

import { useEffect, useState } from "react";
import { LAST_ORDER_KEY, lastOrderToken } from "@/lib/site-order";
import { resolveHomeLastOrder, clearHomeLastOrder, type HomeLastOrder } from "@/lib/home-last-order";

export function HomeLastOrderLink({ token }: { token: string }) {
  const [order, setOrder] = useState<HomeLastOrder | null>(null);
  useEffect(() => {
    let disposed = false;
    let running = false;
    let queued = false;
    let expiryTimer: number | undefined;
    async function refresh() {
      if (document.visibilityState === "hidden" || disposed) return;
      if (running) { queued = true; return; }
      running = true;
      const before = lastOrderToken();
      const result = await resolveHomeLastOrder();
      if (!disposed) {
        window.clearTimeout(expiryTimer);
        setOrder(result);
        if (result) expiryTimer = window.setTimeout(() => {
          if (disposed) return;
          clearHomeLastOrder(result.token);
          setOrder(null);
        }, Math.max(0, result.expiresAt - Date.now()));
      }
      running = false;
      if (!disposed && (queued || (lastOrderToken() && lastOrderToken() !== before))) {
        queued = false;
        void refresh();
      }
    }
    function onStorage(event: StorageEvent) {
      if (event.key === LAST_ORDER_KEY || event.key === null) {
        window.clearTimeout(expiryTimer);
        setOrder(null);
        void refresh();
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.clearTimeout(expiryTimer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token]);

  if (!order) return null;
  return <div className="page-shell home-last-order-shell">
    <a className="home-last-order" href={`/pedido?token=${order.token}`}>
      <span>Pedido #{order.number}</span>
      <strong>Ver meu último pedido <span aria-hidden="true">→</span></strong>
    </a>
  </div>;
}
