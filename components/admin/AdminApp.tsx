"use client";
import { useState } from "react";
import { QRCode } from "@/components/present/QRCode";
import { useSession } from "@/lib/useSession";
import { DEFAULT_DIST } from "@/lib/quiz/assemble";
import type { Category } from "@/lib/quiz/types";

const CATS: Category[] = ["inversiones", "mundial", "curiosos", "geografia", "arte", "salud", "gastronomia"];

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [cfg, setCfg] = useState({ numQuestions: 12, categories: CATS, difficultyDist: DEFAULT_DIST, timerSeconds: 20 });
  const { session } = useSession(code ?? "");

  async function login() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
    setAuthed(r.ok);
  }
  async function create() {
    const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await r.json(); setCode(j.code);
  }
  const control = (action: "launch" | "reveal" | "end") =>
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="text-sm text-neutral-500">Código</div>
      <div className="text-5xl font-bold tracking-widest">{code}</div>
      <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={180} />
      <div className="text-neutral-400">Fase: {session?.phase ?? "…"} · pregunta {(session?.current_index ?? -1) + 1}</div>
      <div className="flex gap-3">
        <button onClick={() => control("launch")} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-neutral-950">Siguiente ▶</button>
        <button onClick={() => control("reveal")} className="rounded-xl border border-neutral-700 px-5 py-3">Revelar</button>
        <button onClick={() => control("end")} className="rounded-xl border border-rose-700 px-5 py-3 text-rose-300">Terminar</button>
      </div>
      <a href={`/screen/${code}`} target="_blank" className="text-sm text-neutral-500 underline">Abrir proyector</a>
    </main>
  );
}
