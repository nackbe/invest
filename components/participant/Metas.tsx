"use client";

// §9.3 Selector de metas + §6.8 costo de esperar + §10.7 arquetipos 25 vs 40.

import type { useSimulator } from "@/components/simulator/useSimulator";
import { GOALS, applyGoal } from "@/lib/goals";
import { costOfWaiting, archetypes } from "@/lib/insights";
import { formatCOP } from "@/lib/format";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      {title && <h2 className="mb-3 text-sm font-medium text-neutral-300">{title}</h2>}
      {children}
    </section>
  );
}

export function Metas({ sim }: { sim: ReturnType<typeof useSimulator> }) {
  const { state, setState, input } = sim;

  const wait = costOfWaiting(input, 5);
  const arch = archetypes(input, state.targetAge, [25, 40]);
  const archMax = Math.max(...arch.map((a) => a.final), 1);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">¿Para qué inviertes?</h1>
        <p className="text-sm text-neutral-500">Elige una meta y ajusta tu curva.</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {GOALS.map((g) => {
          const active = state.startAge === g.startAge && state.targetAge === g.targetAge;
          return (
            <button
              key={g.key}
              onClick={() => setState((s) => applyGoal(s, g.key))}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left ${active ? "border-neutral-500 bg-neutral-800" : "border-neutral-800 bg-neutral-950"}`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="text-sm font-medium">{g.label}</span>
              <span className="text-xs text-neutral-500">{g.startAge}→{g.targetAge} años</span>
            </button>
          );
        })}
      </div>

      <Card title="El costo de esperar 5 años">
        <div className="text-center">
          <div className="text-4xl font-bold tracking-tight text-rose-400 tabular-nums">
            −{formatCOP(wait.difference)}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Es lo que dejas de ganar si empiezas en 5 años en vez de hoy (misma meta).
          </p>
        </div>
      </Card>

      <Card title="Empezar a los 25 vs a los 40">
        <div className="flex flex-col gap-3">
          {arch.map((a) => (
            <div key={a.startAge}>
              <div className="mb-1 flex justify-between text-sm">
                <span>A los {a.startAge} ({a.years} años)</span>
                <span className="font-semibold tabular-nums">{formatCOP(a.final)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(a.final / archMax) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-neutral-500">Mismo aporte mensual. El que empieza antes gana por tiempo, no por plata.</p>
        </div>
      </Card>
    </main>
  );
}
