"use client";
import { useEffect, useState } from "react";
import { QRCode } from "@/components/present/QRCode";
import { useSession } from "@/lib/useSession";
import { usePlayers } from "@/lib/usePlayers";
import { useRanking } from "@/lib/useRanking";
import { DEFAULT_DIST } from "@/lib/quiz/assemble";
import { answerText } from "@/lib/quiz/answerText";
import type { Category, Question } from "@/lib/quiz/types";

type Current = {
  phase: string;
  index: number;
  answered?: number;
  timerSeconds?: number;
  startedAt?: string;
  question?: Question & { explanation?: string };
};

const CATS: Category[] = ["inversiones", "mundial", "curiosos", "geografia", "arte", "salud", "gastronomia", "cine", "belleza"];

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [cfg, setCfg] = useState({ numQuestions: 12, categories: CATS, difficultyDist: DEFAULT_DIST, timerSeconds: 20 });
  const { session } = useSession(code ?? "");
  const players = usePlayers(session?.id);
  const ranking = useRanking(session?.id);
  const [current, setCurrent] = useState<Current | null>(null);
  const [remaining, setRemaining] = useState(0);

  // pregunta actual (poll: refresca conteo de respondidos y el reveal)
  useEffect(() => {
    if (!code || !session || session.phase === "lobby") { setCurrent(null); return; }
    const load = () => fetch(`/api/session/${code}/current`, { cache: "no-store" }).then((r) => r.json()).then(setCurrent);
    load();
    const iv = setInterval(load, 1500);
    return () => clearInterval(iv);
  }, [code, session?.phase, session?.current_index, session]);

  // cuenta regresiva del timer durante la pregunta
  useEffect(() => {
    if (current?.phase !== "question" || !current.startedAt || !current.timerSeconds) return;
    const t = setInterval(() => {
      const left = current.timerSeconds! - (Date.now() - new Date(current.startedAt!).getTime()) / 1000;
      setRemaining(Math.max(0, left));
    }, 200);
    return () => clearInterval(t);
  }, [current?.phase, current?.startedAt, current?.timerSeconds]);

  async function login() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
    setAuthed(r.ok);
  }
  async function create() {
    const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await r.json(); setCode(j.code);
  }
  const control = (action: "launch" | "reveal" | "standings" | "end") =>
    fetch("/api/admin/control", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, action }) });

  if (!authed) return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Clave" className="rounded-xl border border-neutral-700 bg-neutral-900 p-3" />
      <button onClick={login} className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950">Entrar</button>
    </main>
  );

  if (!code) return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Nueva sala</h1>
      <label className="flex justify-between">Preguntas <input type="number" value={cfg.numQuestions} onChange={(e) => setCfg({ ...cfg, numQuestions: +e.target.value })} className="w-20 rounded bg-neutral-900 p-1 text-right" /></label>
      <label className="flex justify-between">Timer (s) <input type="number" value={cfg.timerSeconds} onChange={(e) => setCfg({ ...cfg, timerSeconds: +e.target.value })} className="w-20 rounded bg-neutral-900 p-1 text-right" /></label>
      <div className="flex flex-wrap gap-2">{CATS.map((c) => (
        <button key={c} onClick={() => setCfg({ ...cfg, categories: cfg.categories.includes(c) ? cfg.categories.filter((x) => x !== c) : [...cfg.categories, c] })}
          className={`rounded-full border px-3 py-1 ${cfg.categories.includes(c) ? "border-emerald-500 text-emerald-300" : "border-neutral-700"}`}>{c}</button>
      ))}</div>
      <div className="flex gap-2 text-sm">
        {(["facil", "media", "dificil"] as const).map((d) => (
          <label key={d} className="flex-1">{d}<input type="number" value={cfg.difficultyDist[d]} onChange={(e) => setCfg({ ...cfg, difficultyDist: { ...cfg.difficultyDist, [d]: +e.target.value } })} className="w-full rounded bg-neutral-900 p-1" /></label>
        ))}
      </div>
      <button onClick={create} className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950">Crear sala</button>
    </main>
  );

  const phase = session?.phase ?? "lobby";
  const inLobby = phase === "lobby";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">Código</div>
          <div className="text-3xl font-bold tracking-widest">{code}</div>
        </div>
        <div className="text-right text-sm text-neutral-400">
          <div>{players.length} jugador{players.length === 1 ? "" : "es"}</div>
          <div className="text-xs">Fase: {phase} · #{(session?.current_index ?? -1) + 1}</div>
        </div>
      </div>

      {inLobby && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 p-5">
          <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={160} />
          <div className="text-sm text-neutral-400">Escanea para entrar · {players.length} conectado{players.length === 1 ? "" : "s"}</div>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => <span key={p.id} className="rounded-full border border-neutral-700 px-3 py-1 text-sm">{p.username}</span>)}
          </div>
        </div>
      )}

      {!inLobby && current?.question && (
        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-neutral-500">
            <span>{current.question.category} · {current.question.difficulty}</span>
            {current.phase === "question" && <span className="tabular-nums text-emerald-400">⏱ {Math.ceil(remaining)}s</span>}
          </div>
          <div className="text-lg font-semibold">{current.question.prompt}</div>
          {current.phase === "reveal" ? (
            <div className="mt-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-300/70">Respuesta correcta</div>
              <div className="font-bold text-emerald-300">{answerText(current.question)}</div>
              {current.question.explanation && <p className="mt-1 text-sm text-neutral-400">{current.question.explanation}</p>}
            </div>
          ) : (
            <div className="mt-2 text-sm text-neutral-500">Respondieron: <b className="text-neutral-200">{current.answered ?? 0}</b> / {players.length}</div>
          )}
        </div>
      )}

      {phase === "standings" && (
        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="mb-3 text-center text-xl font-bold">📊 Puntuación parcial</div>
          <div className="flex flex-col gap-2">
            {ranking.slice(0, 8).map((r, i) => (
              <div key={r.player_id} className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-2">
                <span><span className="mr-3 text-neutral-500">{i + 1}</span>{r.username}</span>
                <span className="font-bold tabular-nums text-emerald-400">{r.points}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-neutral-500">Los jugadores lo ven en pantalla. Pulsa Siguiente para continuar.</p>
        </div>
      )}

      {phase === "ended" && (
        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="mb-3 text-center text-2xl font-bold">🏆 Podio final</div>
          <div className="flex flex-col gap-2">
            {ranking.map((r, i) => (
              <div key={r.player_id} className={`flex items-center justify-between rounded-xl px-4 py-2 ${i === 0 ? "bg-emerald-500/15" : "bg-neutral-900"}`}>
                <span><span className="mr-3 text-neutral-500">{i + 1}</span>{r.username} <span className="ml-2 text-xs text-neutral-500">({r.correct_count} ✓)</span></span>
                <span className="font-bold tabular-nums text-emerald-400">{r.points}</span>
              </div>
            ))}
            {ranking.length === 0 && <p className="text-center text-neutral-500">Sin jugadores.</p>}
          </div>
          <a href={`/screen/${code}`} target="_blank" className="mt-3 block text-center text-sm text-emerald-400 underline">Ver podio en proyector</a>
        </div>
      )}

      <div className="sticky bottom-4 mt-auto flex flex-col gap-2">
        <div className="flex gap-2">
          <button onClick={() => control("launch")} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950">
            {inLobby ? "Empezar ▶" : "Siguiente ▶"}
          </button>
          {phase === "question" && <button onClick={() => control("reveal")} className="rounded-xl border border-neutral-700 px-5 py-3">Revelar</button>}
          <button onClick={() => control("end")} className="rounded-xl border border-rose-800 px-4 py-3 text-rose-300">Fin</button>
        </div>
        {!inLobby && phase !== "ended" && phase !== "standings" && (
          <button onClick={() => control("standings")} className="rounded-xl border border-amber-600/60 py-2.5 text-amber-300">📊 Mostrar podio parcial</button>
        )}
      </div>
      <a href={`/screen/${code}`} target="_blank" className="text-center text-sm text-neutral-500 underline">Abrir proyector</a>
    </main>
  );
}
