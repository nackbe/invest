import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";
import { QUESTION_BANK } from "@/data/questions";
import { answerText } from "@/lib/quiz/answerText";

export const dynamic = "force-dynamic";

/** Detalle completo de la sala: preguntas × jugadores × respuestas (admin). */
export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "no code" }, { status: 400 });

  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("id").eq("code", code).single();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: sq } = await db.from("session_questions").select("question_id, order_index").eq("session_id", s.id).order("order_index");
  const { data: players } = await db.from("players").select("id, username").eq("session_id", s.id);
  const { data: answers } = await db.from("answers").select("player_id, question_id, correct, points").eq("session_id", s.id);

  const questions = (sq ?? []).map((r) => {
    const q = QUESTION_BANK.find((x) => x.id === r.question_id);
    return {
      id: r.question_id, order: r.order_index,
      prompt: q?.prompt ?? r.question_id,
      answer: q ? answerText(q) : "",
      category: q?.category ?? "", difficulty: q?.difficulty ?? "",
    };
  });

  return NextResponse.json({ questions, players: players ?? [], answers: answers ?? [] });
}
