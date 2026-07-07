// Estado del participante y su mapeo al motor (§8, §9).
// Los tres modos comparten el mismo motor; solo cambia cuánta complejidad se expone.

import type { ContribStream, SimInput } from "./finance";
import { PRODUCT_BY_KEY, DEFAULTS } from "@/config/assumptions";

export type Mode = "simple" | "intermedio" | "experto";

export type ParticipantState = {
  mode: Mode;
  startAge: number;
  targetAge: number;
  initial: number; // valor inicial (mes 0)
  monthly: number; // aporte mensual (simple / intermedio)
  productKey: string; // producto único (modo simple)
  allocations: Record<string, number>; // % por producto que suma 100 (modo intermedio)
  streams: ContribStream[]; // streams crudos (modo experto)
  reinvest: boolean;
  realValue: boolean;
  usdDevaluation: number;
};

export function defaultState(): ParticipantState {
  return {
    mode: "simple",
    startAge: 25,
    targetAge: 60,
    initial: 0,
    monthly: 200_000,
    productKey: "fondo",
    allocations: { fondo: 50, cdt: 30, acciones: 20 },
    streams: [
      { id: "cdt", label: "CDT inicial", productKey: "cdt", initial: 3_000_000, startYear: 0 },
      { id: "fondo", label: "Fondo mensual", productKey: "fondo", monthly: 200_000, startYear: 0 },
    ],
    reinvest: DEFAULTS.reinvest,
    realValue: DEFAULTS.realValue,
    usdDevaluation: DEFAULTS.usdDevaluation,
  };
}

// --- Sincronización con parámetros de URL (§3: estado en React + URL) --------

/** Serializa el estado a query params compactos y compartibles. */
export function encodeState(s: ParticipantState): string {
  const p = new URLSearchParams();
  p.set("m", s.mode);
  p.set("a", `${s.startAge}-${s.targetAge}`);
  p.set("ap", String(s.monthly));
  p.set("i", String(s.initial));
  p.set("p", s.productKey);
  p.set("al", Object.entries(s.allocations).map(([k, v]) => `${k}:${v}`).join(","));
  p.set("r", s.reinvest ? "1" : "0");
  p.set("rv", s.realValue ? "1" : "0");
  p.set("d", String(s.usdDevaluation));
  if (s.mode === "experto") p.set("st", encodeURIComponent(JSON.stringify(s.streams)));
  return p.toString();
}

/** Reconstruye el estado desde query params, cayendo a defaults ante lo inválido. */
export function decodeState(query: string): ParticipantState {
  const d = defaultState();
  const p = new URLSearchParams(query);
  const mode = p.get("m");
  if (mode === "simple" || mode === "intermedio" || mode === "experto") d.mode = mode;
  const ages = p.get("a")?.split("-").map(Number);
  if (ages && ages.length === 2 && ages.every(Number.isFinite)) {
    d.startAge = ages[0];
    d.targetAge = ages[1];
  }
  const num = (key: string, cur: number) => {
    const v = Number(p.get(key));
    return p.get(key) !== null && Number.isFinite(v) ? v : cur;
  };
  d.monthly = num("ap", d.monthly);
  d.initial = num("i", d.initial);
  d.usdDevaluation = num("d", d.usdDevaluation);
  if (p.get("p")) d.productKey = p.get("p")!;
  const al = p.get("al");
  if (al) {
    const alloc: Record<string, number> = {};
    for (const pair of al.split(",")) {
      const [k, v] = pair.split(":");
      if (k && Number.isFinite(Number(v))) alloc[k] = Number(v);
    }
    if (Object.keys(alloc).length) d.allocations = alloc;
  }
  if (p.get("r") !== null) d.reinvest = p.get("r") === "1";
  if (p.get("rv") !== null) d.realValue = p.get("rv") === "1";
  const st = p.get("st");
  if (st) {
    try {
      const parsed = JSON.parse(decodeURIComponent(st));
      if (Array.isArray(parsed)) d.streams = parsed;
    } catch {
      /* ignora streams corruptos */
    }
  }
  return d;
}

/** Convierte el estado del participante en un SimInput para el motor. */
export function buildSimInput(state: ParticipantState): SimInput {
  const years = Math.max(1, Math.round(state.targetAge - state.startAge));

  const macro = {
    years,
    startMonth: DEFAULTS.startMonth,
    inflation: DEFAULTS.inflation,
    usdDevaluation: state.usdDevaluation,
    reinvest: state.reinvest,
    realValue: state.realValue,
  };

  if (state.mode === "simple") {
    const product = PRODUCT_BY_KEY[state.productKey];
    return {
      ...macro,
      products: [product],
      streams: [
        { id: "main", label: product.label, productKey: product.key, initial: state.initial, monthly: state.monthly },
      ],
    };
  }

  if (state.mode === "intermedio") {
    const keys = Object.keys(state.allocations).filter((k) => (state.allocations[k] ?? 0) > 0);
    return {
      ...macro,
      products: keys.map((k) => PRODUCT_BY_KEY[k]),
      streams: keys.map((k): ContribStream => {
        const frac = (state.allocations[k] ?? 0) / 100;
        return {
          id: k,
          label: PRODUCT_BY_KEY[k].label,
          productKey: k,
          initial: state.initial * frac,
          monthly: state.monthly * frac,
        };
      }),
    };
  }

  // experto: streams crudos; productos derivados de sus keys
  const keys = Array.from(new Set(state.streams.map((s) => s.productKey)));
  return {
    ...macro,
    products: keys.map((k) => PRODUCT_BY_KEY[k]),
    streams: state.streams,
  };
}
