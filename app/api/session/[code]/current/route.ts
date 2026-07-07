import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { QUESTION_BANK } from "@/data/questions";
import { toPublic } from "@/lib/quiz/public";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("*").eq("code", params.code).single();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (s.phase === "lobby" || s.phase === "ended" || s.current_index < 0) {
    return NextResponse.json({ phase: s.phase, index: s.current_index });
  }
  const { data: sq } = await db.from("session_questions").select("question_id").eq("session_id", s.id).eq("order_index", s.current_index).single();
  const q = QUESTION_BANK.find((x) => x.id === sq?.question_id);
  if (!q) return NextResponse.json({ error: "question missing" }, { status: 500 });
  if (s.phase === "reveal") {
    return NextResponse.json({ phase: s.phase, index: s.current_index, question: q });
  }
  return NextResponse.json({
    phase: s.phase, index: s.current_index,
    question: toPublic(q), timerSeconds: s.config.timerSeconds, startedAt: s.question_started_at,
  });
}
