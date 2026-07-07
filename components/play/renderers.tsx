"use client";
import { useState } from "react";
import type { Answer } from "@/lib/quiz/types";
import type { PublicQuestion } from "@/lib/quiz/public";

const btn = "w-full rounded-xl border border-neutral-700 p-4 text-lg text-left active:bg-neutral-800";

export function AnswerInput({ question: q, onSubmit }: { question: PublicQuestion; onSubmit: (a: Answer) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q_: any = q;
  switch (q.type) {
    case "single":
      return (
        <div className="flex flex-col gap-2">
          {q_.options.map((o: string, i: number) => (
            <button key={i} className={btn} onClick={() => onSubmit({ type: "single", index: i })}>
              <span className="mr-2 text-neutral-500">{String.fromCharCode(97 + i)}.</span>{o}
            </button>
          ))}
        </div>
      );
    case "boolean":
      return (
        <div className="grid grid-cols-2 gap-2">
          <button className={btn} onClick={() => onSubmit({ type: "boolean", value: true })}>Verdadero</button>
          <button className={btn} onClick={() => onSubmit({ type: "boolean", value: false })}>Falso</button>
        </div>
      );
    case "text": return <TextInput onSubmit={onSubmit} />;
    case "order": return <OrderInput items={q_.items} onSubmit={onSubmit} />;
    case "match": return <MatchInput lefts={q_.lefts} rights={q_.rights} onSubmit={onSubmit} />;
    case "hotspot": return <HotspotInput imageUrl={q_.imageUrl} onSubmit={onSubmit} />;
    default: return null;
  }
}

function TextInput({ onSubmit }: { onSubmit: (a: Answer) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: "text", text: v }); }} className="flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" placeholder="Tu respuesta" />
      <button className="rounded-xl bg-emerald-500 px-5 font-semibold text-neutral-950">OK</button>
    </form>
  );
}

function OrderInput({ items, onSubmit }: { items: { id: string; label: string }[]; onSubmit: (a: Answer) => void }) {
  const [order, setOrder] = useState(items);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order]; [next[i], next[j]] = [next[j], next[i]]; setOrder(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {order.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2 rounded-xl border border-neutral-700 p-3">
          <span className="text-neutral-500">{i + 1}.</span><span className="flex-1 text-lg">{it.label}</span>
          <button onClick={() => move(i, -1)} className="px-2 text-xl">▲</button>
          <button onClick={() => move(i, 1)} className="px-2 text-xl">▼</button>
        </div>
      ))}
      <button className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950" onClick={() => onSubmit({ type: "order", order: order.map((o) => o.id) })}>Confirmar orden</button>
    </div>
  );
}

function MatchInput({ lefts, rights, onSubmit }: { lefts: { id: string; label: string }[]; rights: { id: string; label: string }[]; onSubmit: (a: Answer) => void }) {
  const [map, setMap] = useState<Record<string, string>>({});
  return (
    <div className="flex flex-col gap-3">
      {lefts.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <span className="flex-1 text-lg">{l.label}</span>
          <select className="rounded-lg border border-neutral-700 bg-neutral-900 p-2" value={map[l.id] ?? ""} onChange={(e) => setMap({ ...map, [l.id]: e.target.value })}>
            <option value="">—</option>
            {rights.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      ))}
      <button className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950" onClick={() => onSubmit({ type: "match", map })}>Confirmar</button>
    </div>
  );
}

function HotspotInput({ imageUrl, onSubmit }: { imageUrl: string; onSubmit: (a: Answer) => void }) {
  return (
    <img src={imageUrl} alt="toca el lugar" className="w-full rounded-xl"
      onClick={(e) => {
        const r = (e.target as HTMLImageElement).getBoundingClientRect();
        onSubmit({ type: "hotspot", x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      }} />
  );
}
