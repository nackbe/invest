"use client";

// §9.2 Comparador "¿Dónde la pones?" — vehículos lado a lado, resalta el mejor.

import type { useSimulator } from "@/components/simulator/useSimulator";
import { compareProducts } from "@/lib/insights";
import { PRODUCTS, DISCLAIMER } from "@/config/assumptions";
import { formatCOP } from "@/lib/format";
import { MoneySlider } from "@/components/ui/controls";

export function Comparador({ sim }: { sim: ReturnType<typeof useSimulator> }) {
  const { state, patch, input } = sim;
  const macro = {
    ...input,
    products: [],
    streams: [{ id: "x", label: "x", productKey: "_", monthly: state.monthly, initial: state.initial }],
  };
  const rows = compareProducts(PRODUCTS, macro);
  const max = Math.max(...rows.map((r) => r.final), 1);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">¿Dónde la pones?</h1>
        <p className="text-sm text-neutral-500">
          Mismo aporte, {input.years} años. La misma plata rinde muy distinto.
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <MoneySlider label="Aporte mensual" value={state.monthly} min={0} max={3_000_000} step={50_000} onChange={(v) => patch({ monthly: v })} />
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.product.key}
            className={`rounded-xl border p-3 ${r.best ? "border-emerald-500/60 bg-emerald-500/5" : "border-neutral-800 bg-neutral-950"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: r.product.color }} />
                {r.product.label}
                {r.best && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">mejor</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatCOP(r.final)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full rounded-full" style={{ width: `${(r.final / max) * 100}%`, background: r.product.color }} />
            </div>
          </div>
        ))}
      </div>

      <p className="px-1 text-xs leading-relaxed text-neutral-600">
        Más rendimiento = más riesgo. {DISCLAIMER}
      </p>
    </main>
  );
}
