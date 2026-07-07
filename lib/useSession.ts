"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { SessionRow } from "@/lib/supabase/types";

export function useSession(code: string) {
  const [session, setSession] = useState<SessionRow | null>(null);
  useEffect(() => {
    if (!code) return;
    const db = getBrowserClient();
    let active = true;
    db.from("sessions").select("*").eq("code", code).single().then(({ data }) => { if (active) setSession(data as SessionRow | null); });
    const ch = db
      .channel(`session:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `code=eq.${code}` },
        (payload) => setSession(payload.new as SessionRow))
      .subscribe();
    return () => { active = false; db.removeChannel(ch); };
  }, [code]);
  return { session };
}
