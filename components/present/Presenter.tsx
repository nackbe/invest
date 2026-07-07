"use client";

// Modo presentador (§10): 12 pantallas (6 slides + 6 en vivo), navegación con
// flechas/espacio, pantalla completa, tema oscuro. QR + print-to-PDF de respaldo.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSimulator } from "@/components/simulator/useSimulator";
import { simulate } from "@/lib/finance";
import { costOfWaiting, archetypes, compareProducts } from "@/lib/insights";
import { PRODUCTS, PRODUCT_BY_KEY, CHART, DISCLAIMER } from "@/config/assumptions";
import { formatCOP } from "@/lib/format";
import { SimChart } from "@/components/charts/SimChart";
import { GrayVsGreen } from "@/components/charts/views";
import { QRCode } from "./QRCode";

function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-screen w-full flex-col items-center justify-center gap-8 p-10 text-center print:min-h-0 print:break-after-page print:py-16 ${className}`}>
      {children}
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="text-sm uppercase tracking-[0.3em] text-emerald-400">{children}</div>;
}

export function Presenter() {
  const sim = useSimulator();
  const [idx, setIdx] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  // toggles locales de los módulos en vivo
  const [colchonReal, setColchonReal] = useState(true);

  useEffect(() => {
    setAppUrl(`${window.location.origin}/`);
    const s = Number(new URLSearchParams(window.location.search).get("s"));
    if (Number.isFinite(s) && s >= 1) setIdx(s - 1);
  }, []);

  // Colchón nominal vs real (§10.4): $20M quietos
  const colchon = useMemo(() => {
    const input = {
      years: 20, startMonth: 1, products: [PRODUCT_BY_KEY.colchon],
      streams: [{ id: "c", label: "Colchón", productKey: "colchon", initial: 20_000_000 }],
      inflation: 0.06, usdDevaluation: 0, reinvest: true, realValue: false,
    };
    const nominal = simulate(input);
    const real = simulate({ ...input, realValue: true });
    return { nominal, real };
  }, []);

  const wait = useMemo(() => costOfWaiting(sim.input, 5), [sim.input]);
  const arch = useMemo(() => archetypes(sim.input, sim.state.targetAge, [25, 40]), [sim.input, sim.state.targetAge]);
  const compare = useMemo(
    () => compareProducts(PRODUCTS, { ...sim.input, products: [], streams: [{ id: "x", label: "x", productKey: "_", monthly: sim.state.monthly, initial: sim.state.initial }] }),
    [sim.input, sim.state.monthly, sim.state.initial]
  );

  // --- las 12 pantallas ------------------------------------------------------
  const screens: React.ReactNode[] = [
    // 1. Portada + promesa
    <Screen key="portada">
      <Kicker>Invierte</Kicker>
      <h1 className="max-w-4xl text-6xl font-bold leading-tight tracking-tight">Tu plata quieta se derrite.</h1>
      <p className="text-2xl text-neutral-400">El enemigo no es el riesgo. Es el tiempo que dejas pasar.</p>
    </Screen>,

    // 2. Encuesta (v1 externo)
    <Screen key="encuesta">
      <Kicker>Encuesta</Kicker>
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight">¿Dónde tienes tu plata hoy?</h1>
      <div className="grid max-w-2xl grid-cols-2 gap-4 text-xl text-neutral-300">
        {["Cuenta de ahorros / colchón", "CDT o fondo", "Acciones o cripto", "No tengo ahorros aún"].map((o) => (
          <div key={o} className="rounded-xl border border-neutral-800 px-6 py-4">{o}</div>
        ))}
      </div>
      <p className="text-sm text-neutral-600">v1: levanten la mano. (v2: votación en vivo)</p>
    </Screen>,

    // 3. Slide derrite
    <Screen key="derrite">
      <h1 className="max-w-4xl text-6xl font-bold leading-tight tracking-tight">
        Tu plata quieta se está <span className="text-rose-400">derritiendo</span>.
      </h1>
      <p className="text-2xl text-neutral-400">Guardar ≠ invertir.</p>
    </Screen>,

    // 4. En vivo: colchón en valor real
    <Screen key="colchon">
      <Kicker>En vivo</Kicker>
      <h2 className="text-3xl font-semibold">$20.000.000 en el colchón, 20 años</h2>
      <div className="w-full max-w-3xl">
        <SimChart
          height={360}
          model={{
            labels: colchon.nominal.points.map((p) => p.year),
            series: [
              { key: "nominal", label: "En el papel (nominal)", color: CHART.contributed, data: colchon.nominal.points.map((p) => p.total) },
              ...(colchonReal ? [{ key: "real", label: "Lo que de verdad compra (real)", color: CHART.contra, data: colchon.real.points.map((p) => p.total) }] : []),
            ],
          }}
        />
      </div>
      <button onClick={() => setColchonReal((v) => !v)} className="rounded-lg border border-neutral-700 px-5 py-2 text-lg">
        {colchonReal ? "Ver solo nominal" : "Descontar la inflación"}
      </button>
      <p className="text-xl text-neutral-400">
        Siguen siendo $20M… pero compran {formatCOP(colchon.real.final)}.
      </p>
    </Screen>,

    // 5. Slide: abre el simulador (QR)
    <Screen key="qr">
      <Kicker>Ahora tú</Kicker>
      <h1 className="text-5xl font-bold tracking-tight">Abre el simulador</h1>
      <QRCode value={appUrl || "/"} size={260} />
      <p className="text-2xl text-neutral-300">{appUrl}</p>
    </Screen>,

    // 6. En vivo: tu propia curva
    <Screen key="curva">
      <Kicker>En vivo · tu curva</Kicker>
      <div className="text-2xl text-neutral-400">A tus {sim.state.targetAge} años tendrías</div>
      <div className="text-7xl font-bold tracking-tight text-emerald-400 tabular-nums">{formatCOP(sim.result.final)}</div>
      <div className="w-full max-w-3xl"><GrayVsGreen result={sim.result} height={340} /></div>
    </Screen>,

    // 7. En vivo: 25 vs 40
    <Screen key="arquetipos">
      <Kicker>En vivo · el poder del tiempo</Kicker>
      <h2 className="text-4xl font-semibold">Empezar a los 25 vs a los 40</h2>
      <div className="flex w-full max-w-2xl flex-col gap-5">
        {arch.map((a) => {
          const max = Math.max(...arch.map((x) => x.final), 1);
          return (
            <div key={a.startAge}>
              <div className="mb-1 flex justify-between text-2xl">
                <span>A los {a.startAge}</span>
                <span className="font-bold tabular-nums">{formatCOP(a.final)}</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(a.final / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xl text-neutral-400">Mismo aporte. Gana el tiempo, no la plata.</p>
    </Screen>,

    // 8. Slide: costo de esperar (cifra grande)
    <Screen key="costo">
      <Kicker>El costo de esperar</Kicker>
      <div className="text-8xl font-bold tracking-tight text-rose-400 tabular-nums">−{formatCOP(wait.difference)}</div>
      <p className="max-w-2xl text-2xl text-neutral-400">Es lo que dejas sobre la mesa por empezar 5 años tarde.</p>
    </Screen>,

    // 9. En vivo: ¿dónde la pones?
    <Screen key="comparador">
      <Kicker>En vivo · ¿dónde la pones?</Kicker>
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {compare.map((r) => {
          const max = Math.max(...compare.map((x) => x.final), 1);
          return (
            <div key={r.product.key} className={`rounded-xl border p-3 ${r.best ? "border-emerald-500/60 bg-emerald-500/5" : "border-neutral-800"}`}>
              <div className="mb-2 flex items-center justify-between text-xl">
                <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ background: r.product.color }} />{r.product.label}</span>
                <span className="font-semibold tabular-nums">{formatCOP(r.final)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full" style={{ width: `${(r.final / max) * 100}%`, background: r.product.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </Screen>,

    // 10. Slide: la escalera + DIAN
    <Screen key="escalera">
      <Kicker>La escalera</Kicker>
      <h1 className="text-4xl font-bold tracking-tight">Sube de nivel cuando entiendas el riesgo del anterior</h1>
      <div className="flex w-full max-w-3xl flex-col gap-3 text-left text-xl">
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4"><b>Nivel 1 · Local regulado</b> — Trii, tyba (vigilados por la SFC)</div>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"><b>Nivel 2 · Cripto cercana</b> — Wenia (mayor riesgo, sin seguro de depósito)</div>
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4"><b>Nivel 3 · Afuera en USD</b> — eToro, IBKR (reguladores extranjeros)</div>
      </div>
      <p className="text-2xl text-neutral-300">Afuera sí, pero le cuentas a la <b>DIAN</b>.</p>
    </Screen>,

    // 11. En vivo: fija tu meta
    <Screen key="meta">
      <Kicker>En vivo · tu compromiso</Kicker>
      <h2 className="text-4xl font-semibold">Fija tu meta</h2>
      <div className="rounded-2xl border border-neutral-800 p-8">
        <div className="text-xl text-neutral-400">A mis {sim.state.targetAge} años tendría</div>
        <div className="text-7xl font-bold tracking-tight text-emerald-400 tabular-nums">{formatCOP(sim.result.final)}</div>
      </div>
      <p className="text-xl text-neutral-400">Descarga tu plan en el celular y compártelo con alguien.</p>
    </Screen>,

    // 12. Slide: cierre
    <Screen key="cierre">
      <h1 className="max-w-4xl text-6xl font-bold leading-tight tracking-tight">
        Esto no es sobre plata. Es sobre <span className="text-emerald-400">opciones</span>.
      </h1>
      <p className="text-sm text-neutral-600">{DISCLAIMER}</p>
    </Screen>,
  ];

  const total = screens.length;
  const go = useCallback((d: number) => setIdx((i) => Math.max(0, Math.min(total - 1, i + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      else if (e.key === "Home") setIdx(0);
      else if (e.key === "End") setIdx(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  // print-to-PDF de respaldo (§10)
  useEffect(() => {
    if (!printing) return;
    const after = () => setPrinting(false);
    window.addEventListener("afterprint", after);
    const t = setTimeout(() => window.print(), 300);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after); };
  }, [printing]);

  if (printing) {
    return <div className="print-deck">{screens}</div>;
  }

  return (
    <div className="relative">
      {screens[idx]}

      {/* Controles del presentador (ocultos al imprimir) */}
      <div className="fixed inset-x-0 bottom-0 flex items-center justify-between px-6 py-4 text-neutral-500 print:hidden">
        <button onClick={() => setPrinting(true)} className="text-sm hover:text-neutral-300">🖨 Respaldo PDF</button>
        <div className="flex items-center gap-2">
          {screens.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Ir a la pantalla ${i + 1}`} className={`h-2 w-2 rounded-full ${i === idx ? "bg-emerald-400" : "bg-neutral-700"}`} />
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="tabular-nums">{idx + 1} / {total}</span>
          <button onClick={() => go(-1)} className="rounded-md border border-neutral-800 px-3 py-1 hover:text-neutral-200">←</button>
          <button onClick={() => go(1)} className="rounded-md border border-neutral-800 px-3 py-1 hover:text-neutral-200">→</button>
        </div>
      </div>
    </div>
  );
}
