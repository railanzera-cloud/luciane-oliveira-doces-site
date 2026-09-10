"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createFallbackAvailability,
  type AvailabilitySnapshot,
} from "@/app/menu-availability";
import { loadRemoteAvailability } from "@/lib/public-menu-availability";

export type AvailabilityRefreshResult = {
  snapshot: AvailabilitySnapshot;
  usedFallback: boolean;
};

export function useMenuAvailability() {
  const [snapshot, setSnapshot] = useState<AvailabilitySnapshot>(() => createFallbackAvailability());
  const snapshotRef = useRef(snapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasResolvedAvailability, setHasResolvedAvailability] = useState(false);
  const lastReportedErrorRef = useRef("");

  const refreshAvailability = useCallback(async (): Promise<AvailabilityRefreshResult> => {
    setIsRefreshing(true);
    try {
      const remoteSnapshot = await loadRemoteAvailability();
      lastReportedErrorRef.current = "";
      snapshotRef.current = remoteSnapshot;
      setSnapshot(remoteSnapshot);
      return { snapshot: remoteSnapshot, usedFallback: false };
    } catch (error) {
      const fallback = snapshotRef.current;
      const message = error instanceof Error ? error.message : String(error);
      if (lastReportedErrorRef.current !== message) {
        console.error("[Luciane Doces] Falha ao consultar disponibilidade; mantendo o último estado seguro.", error);
        lastReportedErrorRef.current = message;
      }
      return { snapshot: fallback, usedFallback: true };
    } finally {
      setIsRefreshing(false);
      setHasResolvedAvailability(true);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshAvailability(), 0);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshAvailability();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshInterval = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshAvailability]);

  return {
    availability: snapshot,
    hasResolvedAvailability,
    isRefreshingAvailability: isRefreshing,
    refreshAvailability,
  };
}
