"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { PlayerRow } from "@/lib/supabase/types";

/** Jugadores de la sala, en vivo (poll cada 2s). Para el lobby y el conteo. */
export function usePlayers(sessionId: string | undefined) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    const db = getBrowserClient();
    let active = true;
    const load = () =>
      db.from("players").select("*").eq("session_id", sessionId).order("joined_at").then(({ data }) => {
        if (active) setPlayers((data ?? []) as PlayerRow[]);
      });
    load();
    const iv = setInterval(load, 2000);
    return () => { active = false; clearInterval(iv); };
  }, [sessionId]);
  return players;
}
