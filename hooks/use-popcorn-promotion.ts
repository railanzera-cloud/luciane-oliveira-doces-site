"use client";

import { useCallback, useEffect, useState } from "react";
import { POPCORN_PROMOTION } from "../supabase/functions/_shared/popcorn-promotion.mjs";

export function usePopcornPromotion() {
  // Neutral SSR snapshot: a static build never freezes the promotion as active.
  const [promotionTime, setPromotionTime] = useState(0);
  const refreshPromotionTime = useCallback(() => setPromotionTime(Date.now()), []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      setPromotionTime(now);
      const next = [POPCORN_PROMOTION.startsAt, POPCORN_PROMOTION.endsAt].find(time => time > now);
      if (next) timer = setTimeout(refresh, Math.min(next - now, 2_147_483_647));
    };
    timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return { promotionTime, refreshPromotionTime };
}
