"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { useRanking } from "@/lib/useRanking";
import { QRCode } from "@/components/present/QRCode";
import type { PublicQuestion } from "@/lib/quiz/public";

type CurrentQuestion = {
  question: PublicQuestion & { explanation: string };
  timerSeconds: number;
  startedAt: string;
};

export function ScreenApp({ code }: { code: string }) {
  const { session } = useSession(code);
  const ranking = useRanking(session?.id);
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  useEffect(() => {
    if (!session) return;
    fetch(`/api/session/${code}/current`).then((r) => r.json()).then(setCurrent);
  }, [session?.phase, session?.current_index, code, session]);

  const phase = session?.phase ?? "lobby";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-12 text-center">
      {phase === "lobby" && (<>
        <div className="text-2xl uppercase tracking-[0.3em] text-emerald-400">Únete</div>
        <div className="text-8xl font-bold tracking-widest">{code}</div>
        <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={260} />
      </>)}
      {phase === "question" && current?.question && (
        <h1 className="max-w-5xl text-6xl font-bold leading-tight">{current.question.prompt}</h1>
      )}
      {phase === "reveal" && current?.question && (<>
        <h2 className="max-w-4xl text-4xl font-semibold">{current.question.prompt}</h2>
        <p className="max-w-3xl text-2xl text-neutral-300">{current.question.explanation}</p>
        <Ranking rows={ranking.slice(0, 5)} />
      </>)}
      {phase === "ended" && (<>
        <h1 className="text-5xl font-bold">🏆 Podio</h1>
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
