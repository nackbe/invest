"use client";
import { useEffect, useState } from "react";
import type { RankingRow } from "@/lib/supabase/types";

/**
 * Ranking de la sala por POLLING del endpoint AUTORITATIVO del servidor
 * (/api/session/[code]/ranking, service-role → salta RLS). Admin, proyector y
 * jugadores consultan la MISMA fuente, así siempre ven lo mismo y sincronizado.
 * (No consultamos la vista `ranking` desde el cliente: la RLS puede devolver
 * distinto según el contexto de auth → desincronización.)
 */
export function useRanking(code: string | undefined) {
  const [rows, setRows] = useState<RankingRow[]>([]);
  useEffect(() => {
    if (!code) {
      setRows([]);
      return;
    }
    let active = true;
    const load = () =>
      fetch(`/api/session/${code}/ranking`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (active) setRows((j.rows ?? []) as RankingRow[]);
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 1200);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [code]);
  return rows;
}
