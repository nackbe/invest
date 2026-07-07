import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";
import { assembleSet } from "@/lib/quiz/assemble";
import { QUESTION_BANK } from "@/data/questions";
import type { SessionConfig } from "@/lib/supabase/types";

function makeCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = (await req.json()) as SessionConfig;
  const set = assembleSet(QUESTION_BANK, config);
  const db = getServiceClient();
  const code = makeCode();
  const { data: session, error } = await db
    .from("sessions").insert({ code, status: "lobby", phase: "lobby", config, current_index: -1 })
    .select().single();
  if (error || !session) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  const rows = set.map((q, i) => ({ session_id: session.id, question_id: q.id, order_index: i }));
  const { error: e2 } = await db.from("session_questions").insert(rows);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ code, id: session.id });
}
