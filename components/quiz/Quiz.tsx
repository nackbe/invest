"use client";

// Quiz autoevaluado (§11, v1). Una pregunta por pantalla, revela la correcta y
// la explicación. El puntaje mide conocimiento, nunca la situación financiera (§13).

import { useState } from "react";
import { QUIZ } from "@/data/quiz";

type Phase = "playing" | "done";

const DIFFICULTY_STYLE: Record<string, string> = {
  fácil: "bg-emerald-500/15 text-emerald-300",
  media: "bg-amber-500/15 text-amber-300",
  difícil: "bg-rose-500/15 text-rose-300",
};

export function Quiz() {
  const [phase, setPhase] = useState<Phase>("playing");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const q = QUIZ[i];
  const answered = picked !== null;
  const correct = picked === q.correctIndex;

  const pick = (idx: number) => {
    if (answered) return;
    setPicked(idx);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 >= QUIZ.length) {
      setPhase("done");
      return;
    }
    setI((n) => n + 1);
    setPicked(null);
  };

  const restart = () => {
    setPhase("playing");
    setI(0);
    setPicked(null);
    setScore(0);
  };

  if (phase === "done") {
    const pct = Math.round((score / QUIZ.length) * 100);
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-sm text-neutral-400">Tu resultado</div>
        <div className="text-6xl font-bold tracking-tight text-emerald-400 tabular-nums">
          {score}<span className="text-neutral-600">/{QUIZ.length}</span>
        </div>
        <div className="text-neutral-400">
          {pct >= 80 ? "¡Crack de las inversiones! 🚀" : pct >= 50 ? "Buen camino, sigue aprendiendo. 💪" : "Apenas empiezas — y eso ya cuenta. 🌱"}
        </div>
        <button onClick={restart} className="mt-4 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-neutral-950 active:bg-emerald-600">
          Volver a intentar
        </button>
        <a href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">Ir al simulador</a>
        <p className="mt-2 max-w-xs text-xs text-neutral-600">Este puntaje mide conocimiento, no tu situación financiera.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-4">
      {/* Progreso */}
      <div className="pt-2">
        <div className="mb-2 flex items-center justify-between text-sm text-neutral-500">
          <span>Pregunta {i + 1} de {QUIZ.length}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${DIFFICULTY_STYLE[q.difficulty]}`}>{q.difficulty}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} />
        </div>
      </div>

      <h1 className="text-xl font-semibold leading-snug">{q.prompt}</h1>

      <div className="flex flex-col gap-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.correctIndex;
          const isPicked = idx === picked;
          let cls = "border-neutral-800 bg-neutral-950";
          if (answered && isCorrect) cls = "border-emerald-500 bg-emerald-500/10";
          else if (answered && isPicked) cls = "border-rose-500 bg-rose-500/10";
          else if (answered) cls = "border-neutral-800 bg-neutral-950 opacity-60";
          return (
            <button
              key={idx}
              onClick={() => pick(idx)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${cls}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-neutral-700 text-xs">
                {String.fromCharCode(97 + idx)}
              </span>
              <span>{opt}</span>
              {answered && isCorrect && <span className="ml-auto text-emerald-400">✓</span>}
              {answered && isPicked && !isCorrect && <span className="ml-auto text-rose-400">✕</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-sm">
          <div className={`mb-1 font-medium ${correct ? "text-emerald-400" : "text-rose-400"}`}>
            {correct ? "¡Correcto!" : "No exactamente"}
          </div>
          <p className="text-neutral-400">{q.explanation}</p>
        </div>
      )}

      <div className="mt-auto pb-4">
        <button
          onClick={next}
          disabled={!answered}
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 transition active:bg-emerald-600 disabled:opacity-40"
        >
          {i + 1 >= QUIZ.length ? "Ver resultado" : "Siguiente"}
        </button>
      </div>
    </main>
  );
}
