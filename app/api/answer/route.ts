import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { QUESTION_BANK } from "@/data/questions";
import { grade } from "@/lib/quiz/grade";
import { computePoints } from "@/lib/quiz/scoring";
import { optionOrder } from "@/lib/quiz/public";
import type { Answer } from "@/lib/quiz/types";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const db = getServiceClient();
  const { data: userData } = await db.auth.getUser(token);
  const playerId = userData.user?.id;
  if (!playerId) return NextResponse.json({ error: "bad token" }, { status: 401 });

  const { code, questionId, answer } = (await req.json()) as { code: string; questionId: string; answer: Answer };
  const { data: s } = await db.from("sessions").select("*").eq("code", code).single();
  if (!s || s.phase !== "question") return NextResponse.json({ error: "not accepting" }, { status: 409 });

  const q = QUESTION_BANK.find((x) => x.id === questionId);
  if (!q) return NextResponse.json({ error: "unknown question" }, { status: 400 });

  const startedAt = new Date(s.question_started_at).getTime();
  const now = Date.now();
  const ms = now - startedAt;
  const timer = s.config.timerSeconds as number;
  if (ms > timer * 1000 + 500) return NextResponse.json({ error: "too late" }, { status: 409 });

  // Las opciones 'single' se muestran permutadas (optionOrder); el índice enviado es
  // la POSICIÓN mostrada → remapear al índice original antes de calificar.
  let toGrade = answer;
  if (q.type === "single" && answer.type === "single") {
    const order = optionOrder(q.id, q.options.length);
    toGrade = { type: "single", index: order[answer.index] ?? answer.index };
  }
  const result = grade(q, toGrade);
  const remaining = Math.max(0, timer - ms / 1000);
  const points = computePoints(q.difficulty, result, remaining, timer);

  const { error } = await db.from("answers").insert({
    session_id: s.id, question_id: questionId, player_id: playerId,
    answer, correct: result.correct, points, ms,
  });
  if (error) return NextResponse.json({ error: "already answered" }, { status: 409 });
  return NextResponse.json({ correct: result.correct, points });
}
