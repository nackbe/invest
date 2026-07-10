"use client";

import { useEffect, useState } from "react";

type Q = { id: string; order: number; prompt: string; answer: string; category: string; difficulty: string };
type P = { id: string; username: string };
type A = { player_id: string; question_id: string; correct: boolean; points: number };
type Data = { questions: Q[]; players: P[]; answers: A[] };

/** Matriz de detalle: jugadores × preguntas, verde=acertó / rojo=falló, con puntos. */
export function ResultsMatrix({ code }: { code: string }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    fetch(`/api/admin/results?code=${code}`, { cache: "no-store" }).then((r) => r.json()).then(setData);
  }, [code]);

  if (!data) return <p className="text-center text-neutral-500">Cargando detalle…</p>;

  const cell: Record<string, Record<string, A>> = {};
  for (const a of data.answers) (cell[a.player_id] ??= {})[a.question_id] = a;
  const total = (pid: string) => data.questions.reduce((s, q) => s + (cell[pid]?.[q.id]?.points ?? 0), 0);
  const hits = (pid: string) => data.questions.reduce((s, q) => s + (cell[pid]?.[q.id]?.correct ? 1 : 0), 0);
  const players = [...data.players].sort((a, b) => total(b.id) - total(a.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-neutral-950 px-2 py-1 text-left text-neutral-400">Jugador</th>
            <th className="px-2 text-neutral-400">Total</th>
            {data.questions.map((q, i) => (
              <th key={q.id} title={`${q.prompt} (${q.category}·${q.difficulty})`} className="px-2 text-neutral-500">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td className="sticky left-0 z-10 bg-neutral-950 px-2 py-1 font-medium">{p.username}<span className="ml-2 text-xs text-neutral-500">{hits(p.id)}✓</span></td>
              <td className="px-2 text-center font-bold tabular-nums text-emerald-400">{total(p.id)}</td>
              {data.questions.map((q) => {
                const a = cell[p.id]?.[q.id];
                const bg = !a ? "bg-neutral-800 text-neutral-600" : a.correct ? "bg-emerald-600/80 text-white" : "bg-rose-600/80 text-white";
                return (
                  <td key={q.id} className={`rounded px-2 py-1 text-center tabular-nums ${bg}`} title={a ? (a.correct ? "Acertó" : "Falló") : "Sin responder"}>
                    {a ? a.points : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-500">Verde = acertó · Rojo = falló · — = no respondió.</p>

      {/* Detalle de cada pregunta: enunciado + respuesta correcta */}
      <div className="mt-5 flex flex-col gap-2">
        <div className="text-sm font-medium text-neutral-300">Preguntas y respuestas</div>
        {data.questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-neutral-800 p-2 text-sm">
            <div className="flex gap-2">
              <span className="shrink-0 font-semibold text-neutral-500">{i + 1}.</span>
              <span>{q.prompt} <span className="text-xs text-neutral-600">({q.category}·{q.difficulty})</span></span>
            </div>
            <div className="mt-1 pl-5 text-emerald-400">✓ {q.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
