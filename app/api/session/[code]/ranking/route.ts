import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import type { RankingRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Ranking AUTORITATIVO de la sala (service-role → salta RLS). Todos (admin,
 * proyector, jugadores) consultan esto, así ven EXACTAMENTE lo mismo y sincronizado.
 */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("id").eq("code", params.code).single();
  if (!s) return NextResponse.json({ rows: [] });
  const { data } = await db.from("ranking").select("*").eq("session_id", s.id);
  const rows = ((data ?? []) as RankingRow[]).sort((a, b) => b.points - a.points || a.total_ms - b.total_ms);
  return NextResponse.json({ rows });
}
