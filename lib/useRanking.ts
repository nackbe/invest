"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { RankingRow } from "@/lib/supabase/types";

export function useRanking(sessionId: string | undefined) {
  const [rows, setRows] = useState<RankingRow[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    const db = getBrowserClient();
    const load = () => db.from("ranking").select("*").eq("session_id", sessionId).then(({ data }) =>
      setRows(((data ?? []) as RankingRow[]).sort((a, b) => b.points - a.points || a.total_ms - b.total_ms)));
    load();
    const ch = db.channel(`ans:${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` }, load)
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [sessionId]);
  return rows;
}
