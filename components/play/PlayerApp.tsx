"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { usePlayer } from "@/lib/usePlayer";
import { getBrowserClient } from "@/lib/supabase/browser";
import { QuestionView } from "./QuestionView";
import { answerText } from "@/lib/quiz/answerText";
import type { Answer, Question } from "@/lib/quiz/types";
import type { PublicQuestion } from "@/lib/quiz/public";

type CurrentQuestion = {
  phase?: string;
  question: PublicQuestion & { explanation: string };
  timerSeconds: number;
  startedAt: string;
};

export function PlayerApp({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [username, setUsername] = useState("");
  const { player, join } = usePlayer(code);
  const { session } = useSession(code);
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  const [answered, setAnswered] = useState<{ correct: boolean; points: number } | null>(null);

  useEffect(() => {
    if (!session || !player) return;
    setAnswered(null);
    fetch(`/api/session/${code}/current`, { cache: "no-store" }).then((r) => r.json()).then(setCurrent);
  }, [session?.phase, session?.current_index, player, code, session]);

  async function submit(answer: Answer) {
    if (!current) return;
    const db = getBrowserClient();
    const { data } = await db.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/answer", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, questionId: current.question.id, answer }),
    });
    if (res.ok) setAnswered(await res.json());
  }

  if (!player) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-3xl font-bold">Entrar a la trivia</h1>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código" className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu nombre" className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" />
        <button onClick={() => username && code && join(username)} className="rounded-xl bg-emerald-500 p-4 font-semibold text-neutral-950">Entrar</button>
      </main>
    );
  }

  const phase = session?.phase ?? "lobby";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      {phase === "lobby" && <p className="text-center text-xl text-neutral-400">Hola {player.username} — esperando al presentador…</p>}
      {phase === "question" && current?.question && !answered && (
        <QuestionView question={current.question} timerSeconds={current.timerSeconds} startedAt={current.startedAt} onSubmit={submit} />
      )}
      {phase === "question" && answered && <p className="text-center text-xl">Respuesta enviada ✓ (+{answered.points})</p>}
      {phase === "reveal" && current?.phase === "reveal" && current?.question && (
        <div className="flex flex-col gap-3 text-center">
          <div className={`text-2xl font-bold ${answered?.correct ? "text-emerald-400" : "text-rose-400"}`}>
            {answered ? (answered.correct ? `¡Correcto! +${answered.points}` : "Incorrecto") : "Respuesta"}
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-300">{answerText(current.question as Question)}</div>
          <p className="text-neutral-300">{current.question.explanation}</p>
        </div>
      )}
      {phase === "standings" && <p className="text-center text-xl text-neutral-300">📊 Puntuación parcial — mira la pantalla</p>}
      {phase === "ended" && <a href={`/screen/${code}`} className="text-center text-emerald-400 underline">Ver resultados</a>}
    </main>
  );
}
