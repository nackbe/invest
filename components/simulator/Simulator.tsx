"use client";

// Simulador participante "Tu curva" (§9.1) con revelación progresiva de modos (§8).
// El motor es el mismo en los tres modos; solo cambia cuánta complejidad se muestra.

import { useMemo } from "react";
import { useSimulator } from "./useSimulator";
import { simulate, type ContribStream } from "@/lib/finance";
import { PRODUCTS, PRODUCT_BY_KEY, DISCLAIMER, USD_DEVALUATION_RANGE } from "@/config/assumptions";
import { formatCOP } from "@/lib/format";
import { Slider, MoneySlider, Toggle, SegmentedTabs, BigNumber } from "@/components/ui/controls";
import {
  GrayVsGreen,
  StackedComposition,
  VolatilityPath,
  DollarFan,
} from "@/components/charts/views";
import type { Mode } from "@/lib/participant";

const MODES: { value: Mode; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "intermedio", label: "Intermedio" },
  { value: "experto", label: "Experto" },
];

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">{children}</section>;
}

export function Simulator({ sim }: { sim: ReturnType<typeof useSimulator> }) {
  const { state, patch, setState, input, result, realResult, reroll } = sim;

  const hasUSD = input.products.some((p) => p.currency === "USD");
  const hasVolatile = input.products.some((p) => p.rateModel === "volatile");

  // Abanico del dólar (§7.3): sólo si hay producto en USD
  const fan = useMemo(() => {
    if (!hasUSD) return null;
    return {
      favor: simulate({ ...input, usdDevaluation: USD_DEVALUATION_RANGE.favor }),
      estable: simulate({ ...input, usdDevaluation: 0 }),
      contra: simulate({ ...input, usdDevaluation: USD_DEVALUATION_RANGE.contra }),
    };
  }, [input, hasUSD]);

  const gained = result.final - result.finalContributed;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-16">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Tu curva</h1>
        <p className="text-sm text-neutral-500">¿Cuánto puede crecer tu plata si empiezas hoy?</p>
      </header>

      <SegmentedTabs options={MODES} value={state.mode} onChange={(m) => patch({ mode: m })} />

      {/* Número gigante (§5) */}
      <Card>
        <BigNumber
          caption={`A tus ${state.targetAge} años tendrías`}
          value={formatCOP(result.final)}
          sub={
            state.realValue
              ? "en pesos de hoy (descontada la inflación)"
              : `pusiste ${formatCOP(result.finalContributed)} · ganó ${formatCOP(gained)}`
          }
        />
      </Card>

      {/* Gráfico principal según modo */}
      <Card>
        {state.mode === "simple" ? (
          hasVolatile ? (
            <>
              <VolatilityPath expected={result} real={realResult} />
              <button
                onClick={reroll}
                className="mt-3 w-full rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 active:bg-neutral-800"
              >
                Otro futuro posible ↻
              </button>
            </>
          ) : (
            <GrayVsGreen result={result} />
          )
        ) : (
          <StackedComposition result={result} products={input.products} />
        )}
      </Card>

      {/* Controles por modo */}
      {state.mode === "simple" && <SimpleControls state={state} patch={patch} />}
      {state.mode === "intermedio" && <IntermedioControls state={state} patch={patch} />}
      {state.mode === "experto" && <ExpertoControls state={state} setState={setState} />}

      {/* Escenario del dólar */}
      {hasUSD && (
        <Card>
          <Slider
            label="Escenario del dólar (devaluación del peso)"
            value={state.usdDevaluation}
            min={USD_DEVALUATION_RANGE.min}
            max={USD_DEVALUATION_RANGE.max}
            step={0.005}
            onChange={(v) => patch({ usdDevaluation: v })}
            display={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
          />
          {fan && (
            <div className="mt-4">
              <div className="mb-2 text-sm text-neutral-400">Si el dólar sube, se mantiene o baja</div>
              <DollarFan favor={fan.favor} estable={fan.estable} contra={fan.contra} height={200} />
            </div>
          )}
        </Card>
      )}

      {/* Toggles transversales (§6.7, §6.8) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 text-xs text-neutral-500">Interés</div>
            <Toggle left="Reinvierte" right="Cosecha" value={!state.reinvest} onChange={(harvest) => patch({ reinvest: !harvest })} />
          </div>
          <div>
            <div className="mb-1 text-xs text-neutral-500">Valor</div>
            <Toggle left="Nominal" right="Real" value={state.realValue} onChange={(rv) => patch({ realValue: rv })} />
          </div>
        </div>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-neutral-600">{DISCLAIMER}</p>
    </main>
  );
}

// --- Controles por modo ------------------------------------------------------

type CtrlProps = { state: ReturnType<typeof useSimulator>["state"]; patch: ReturnType<typeof useSimulator>["patch"] };

function SimpleControls({ state, patch }: CtrlProps) {
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Slider label="Empiezo a los" value={state.startAge} min={15} max={70} onChange={(v) => patch({ startAge: Math.min(v, state.targetAge - 1) })} display={(v) => `${v} años`} />
          <Slider label="Meta a los" value={state.targetAge} min={state.startAge + 1} max={80} onChange={(v) => patch({ targetAge: v })} display={(v) => `${v} años`} />
        </div>
        <MoneySlider label="Aporte mensual" value={state.monthly} min={0} max={3_000_000} step={50_000} onChange={(v) => patch({ monthly: v })} />
        <MoneySlider label="Con cuánto empiezas" value={state.initial} min={0} max={50_000_000} step={500_000} onChange={(v) => patch({ initial: v })} />
        <div>
          <div className="mb-2 text-sm text-neutral-400">¿Dónde la pones?</div>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.filter((p) => p.key !== "colchon").map((p) => (
              <button
                key={p.key}
                onClick={() => patch({ productKey: p.key })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  state.productKey === p.key ? "border-neutral-500 bg-neutral-800" : "border-neutral-800"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function IntermedioControls({ state, patch }: CtrlProps) {
  const keys = PRODUCTS.filter((p) => p.key !== "colchon").map((p) => p.key);
  const total = keys.reduce((s, k) => s + (state.allocations[k] ?? 0), 0);
  const setAlloc = (k: string, v: number) => patch({ allocations: { ...state.allocations, [k]: v } });
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <MoneySlider label="Aporte mensual total" value={state.monthly} min={0} max={3_000_000} step={50_000} onChange={(v) => patch({ monthly: v })} />
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-neutral-400">Asignación</span>
            <span className={`text-sm ${total === 100 ? "text-emerald-400" : "text-amber-400"}`}>{total}%</span>
          </div>
          <div className="flex flex-col gap-4">
            {keys.map((k) => (
              <Slider
                key={k}
                label={PRODUCT_BY_KEY[k].label}
                value={state.allocations[k] ?? 0}
                min={0}
                max={100}
                step={5}
                onChange={(v) => setAlloc(k, v)}
                display={(v) => `${v}%`}
              />
            ))}
          </div>
          {total !== 100 && <p className="mt-2 text-xs text-amber-400/80">La asignación suma {total}% (los pesos se reparten sobre ese total).</p>}
        </div>
      </div>
    </Card>
  );
}

// --- Modo experto ------------------------------------------------------------

type Cadence = "mensual" | "trimestral" | "semestral" | "anual" | "primas";

function readCadence(s: ContribStream): Cadence {
  if (s.monthly) return "mensual";
  if (s.months?.length) return "primas";
  if (s.periodicEveryMonths === 3) return "trimestral";
  if (s.periodicEveryMonths === 6) return "semestral";
  return "anual";
}

function applyCadence(s: ContribStream, cadence: Cadence, amount: number): ContribStream {
  const base = { ...s, monthly: undefined, periodicAmount: undefined, periodicEveryMonths: undefined, months: undefined };
  switch (cadence) {
    case "mensual":
      return { ...base, monthly: amount };
    case "trimestral":
      return { ...base, periodicAmount: amount, periodicEveryMonths: 3 };
    case "semestral":
      return { ...base, periodicAmount: amount, periodicEveryMonths: 6 };
    case "anual":
      return { ...base, periodicAmount: amount, periodicEveryMonths: 12 };
    case "primas":
      return { ...base, periodicAmount: amount, months: [6, 12] };
  }
}

function ExpertoControls({
  state,
  setState,
}: {
  state: ReturnType<typeof useSimulator>["state"];
  setState: ReturnType<typeof useSimulator>["setState"];
}) {
  const update = (id: string, next: ContribStream) =>
    setState((st) => ({ ...st, streams: st.streams.map((s) => (s.id === id ? next : s)) }));
  const remove = (id: string) => setState((st) => ({ ...st, streams: st.streams.filter((s) => s.id !== id) }));
  const add = () =>
    setState((st) => ({
      ...st,
      streams: [...st.streams, { id: `s${st.streams.length + 1}-${st.streams.length}`, label: "Nuevo", productKey: "fondo", monthly: 100_000, startYear: 0 }],
    }));

  const inputCls = "w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm";

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-neutral-500">Cada línea es un aporte con su producto, cadencia y ventana de tiempo (§8).</p>
        {state.streams.map((s) => {
          const cadence = readCadence(s);
          const amount = s.monthly ?? s.periodicAmount ?? 0;
          return (
            <div key={s.id} className="rounded-xl border border-neutral-800 p-3">
              <div className="mb-2 flex items-center gap-2">
                <select className={inputCls} value={s.productKey} onChange={(e) => update(s.id, { ...s, productKey: e.target.value, label: PRODUCT_BY_KEY[e.target.value].label })}>
                  {PRODUCTS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                <button onClick={() => remove(s.id)} className="shrink-0 rounded-md border border-neutral-800 px-2 py-1.5 text-sm text-neutral-400">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-neutral-500">
                  Inicial
                  <input type="number" className={inputCls} value={s.initial ?? 0} onChange={(e) => update(s.id, { ...s, initial: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-neutral-500">
                  Aporte
                  <input type="number" className={inputCls} value={amount} onChange={(e) => update(s.id, applyCadence(s, cadence, Number(e.target.value)))} />
                </label>
                <label className="text-xs text-neutral-500">
                  Cadencia
                  <select className={inputCls} value={cadence} onChange={(e) => update(s.id, applyCadence(s, e.target.value as Cadence, amount))}>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="primas">Primas (jun+dic)</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <label className="text-xs text-neutral-500">
                    Desde
                    <input type="number" className={inputCls} value={s.startYear ?? 0} onChange={(e) => update(s.id, { ...s, startYear: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs text-neutral-500">
                    Hasta
                    <input type="number" className={inputCls} value={s.endYear ?? ""} placeholder="fin" onChange={(e) => update(s.id, { ...s, endYear: e.target.value ? Number(e.target.value) : undefined })} />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={add} className="rounded-lg border border-dashed border-neutral-700 py-2 text-sm text-neutral-400">+ Agregar aporte</button>
      </div>
    </Card>
  );
}
