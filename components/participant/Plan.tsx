"use client";

// §9.4 Plan / compromiso — resumen + "Descargar mi plan" (PNG en cliente). Leave-behind.

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { useSimulator } from "@/components/simulator/useSimulator";
import { PRODUCT_BY_KEY, DISCLAIMER } from "@/config/assumptions";
import { formatCOP } from "@/lib/format";

function planSummary(sim: ReturnType<typeof useSimulator>): string {
  const { state, input } = sim;
  if (state.mode === "simple") return `${formatCOP(state.monthly)}/mes en ${PRODUCT_BY_KEY[state.productKey].label}`;
  if (state.mode === "intermedio") {
    const parts = Object.entries(state.allocations)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v}% ${PRODUCT_BY_KEY[k].label}`);
    return `${formatCOP(state.monthly)}/mes · ${parts.join(" · ")}`;
  }
  return `${input.streams.length} aportes en ${input.products.length} productos`;
}

export function Plan({ sim }: { sim: ReturnType<typeof useSimulator> }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { state, input, result } = sim;
  const gained = result.final - result.finalContributed;

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#0a0a0a", cacheBust: true });
      const a = document.createElement("a");
      a.download = "mi-plan-invierte.png";
      a.href = url;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Mi plan</h1>
        <p className="text-sm text-neutral-500">Tu compromiso, para llevar.</p>
      </header>

      {/* Tarjeta que se exporta a PNG */}
      <div ref={cardRef} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="text-xs uppercase tracking-widest text-emerald-400">Invierte</div>
        <div className="mt-6 text-center">
          <div className="text-sm text-neutral-400">A mis {state.targetAge} años tendría</div>
          <div className="text-5xl font-bold tracking-tight text-emerald-400 tabular-nums">{formatCOP(result.final)}</div>
          <div className="mt-1 text-sm text-neutral-500">
            {input.years} años · empiezo a los {state.startAge}
          </div>
        </div>
        <dl className="mt-6 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">Mi plan</dt><dd className="text-right">{planSummary(sim)}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Voy a poner</dt><dd className="tabular-nums">{formatCOP(result.finalContributed)}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Trabaja por mí</dt><dd className="tabular-nums text-emerald-400">{formatCOP(gained)}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Interés</dt><dd>{state.reinvest ? "Reinvierte (compuesto)" : "Cosecha (simple)"}</dd></div>
        </dl>
        <p className="mt-6 border-t border-neutral-800 pt-3 text-[10px] leading-relaxed text-neutral-600">{DISCLAIMER}</p>
      </div>

      <button
        onClick={download}
        disabled={busy}
        className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 active:bg-emerald-600 disabled:opacity-60"
      >
        {busy ? "Generando…" : "Descargar mi plan"}
      </button>
    </main>
  );
}
