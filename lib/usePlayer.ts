"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { PlayerRow } from "@/lib/supabase/types";

export function usePlayer(code: string) {
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  async function join(username: string) {
    const db = getBrowserClient();
    const { data: auth } = await db.auth.signInAnonymously();
    const uid = auth.user?.id;
    if (!uid) throw new Error("anon sign-in failed");
    const { data: s } = await db.from("sessions").select("id").eq("code", code).single();
    if (!s) throw new Error("sala no encontrada");
    const { data, error } = await db.from("players").insert({ id: uid, session_id: s.id, username }).select().single();
    if (error) throw error;
    setPlayer(data as PlayerRow);
  }
  return { player, join };
}
