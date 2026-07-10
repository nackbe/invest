"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { useRanking } from "@/lib/useRanking";
import { usePlayers } from "@/lib/usePlayers";
import { QRCode } from "@/components/present/QRCode";
import { answerText } from "@/lib/quiz/answerText";
import type { PublicQuestion } from "@/lib/quiz/public";
import type { Question } from "@/lib/quiz/types";

type CurrentQuestion = {
  phase?: string;
  question: (PublicQuestion & { explanation?: string }) & Partial<Question>;
  timerSeconds?: number;
  startedAt?: string;
};

/** Imagen del enunciado (mediaUrl) o de un hotspot (imageUrl). */
function Media({ q }: { q: CurrentQuestion["question"] }) {
  const src = (q as { mediaUrl?: string; imageUrl?: string }).mediaUrl ?? (q as { imageUrl?: string }).imageUrl;
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="max-h-[40vh] rounded-2xl object-contain" />;
}

export function ScreenApp({ code }: { code: string }) {
  const { session } = useSession(code);
  const ranking = useRanking(code);
  const players = usePlayers(session?.id);
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  useEffect(() => {
    if (!session) return;
    fetch(`/api/session/${code}/current`, { cache: "no-store" }).then((r) => r.json()).then(setCurrent);
  }, [session?.phase, session?.current_index, code, session]);

  const phase = session?.phase ?? "lobby";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-12 text-center">
      {phase === "lobby" && (<>
        <div className="text-2xl uppercase tracking-[0.3em] text-emerald-400">Únete</div>
        <div className="text-8xl font-bold tracking-widest">{code}</div>
        <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={220} />
        <div className="text-xl text-neutral-400">{players.length} conectado{players.length === 1 ? "" : "s"}</div>
        <div className="flex max-w-4xl flex-wrap justify-center gap-2">
          {players.map((p) => (
            <span key={p.id} className="rounded-full border border-neutral-700 px-4 py-1.5 text-xl">{p.username}</span>
          ))}
        </div>
      </>)}

      {phase === "question" && current?.question && (<>
        <Media q={current.question} />
        <h1 className="max-w-5xl text-6xl font-bold leading-tight">{current.question.prompt}</h1>
      </>)}

      {phase === "reveal" && current?.phase === "reveal" && current?.question && (<>
        <Media q={current.question} />
        <h2 className="max-w-4xl text-4xl font-semibold">{current.question.prompt}</h2>
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-8 py-4 text-3xl font-bold text-emerald-300">
          {answerText(current.question as Question)}
        </div>
        {current.question.explanation && <p className="max-w-3xl text-2xl text-neutral-300">{current.question.explanation}</p>}
        <Ranking rows={ranking.slice(0, 5)} />
      </>)}

      {phase === "standings" && (<>
        <h1 className="text-5xl font-bold">📊 Puntuación parcial</h1>
        <Ranking rows={ranking.slice(0, 8)} />
        <p className="text-xl text-neutral-500">El juego continúa…</p>
      </>)}

      {phase === "ended" && (<>
        <h1 className="text-5xl font-bold">🏆 Podio final</h1>
        <Ranking rows={ranking} />
      </>)}
    </main>
  );
}

function Ranking({ rows }: { rows: { player_id: string; username: string; points: number; correct_count: number }[] }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.player_id} className="flex items-center justify-between rounded-xl border border-neutral-800 px-5 py-3 text-2xl">
          <span><span className="mr-3 text-neutral-500">{i + 1}</span>{r.username}</span>
          <span className="font-bold tabular-nums text-emerald-400">{r.points}</span>
        </div>
      ))}
    </div>
  );
}
