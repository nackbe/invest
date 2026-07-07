// Invierte — motor de simulación (sección 6).
// Regla de oro (6.1): toda tasa se guarda como Efectiva Anual (E.A.).

// ---------------------------------------------------------------------------
// Modelo de datos (6.3)
// ---------------------------------------------------------------------------

export type Currency = "COP" | "USD";
export type RateModel = "fixed" | "reward" | "volatile";
// fixed = CDT/fondo (tasa conocida) · reward = staking stablecoin · volatile = acciones/índice

export type Product = {
  key: string;
  label: string;
  currency: Currency;
  rateModel: RateModel;
  annualRate: number; // E.A. (para volatile = media esperada). ILUSTRATIVO y editable.
  volatility?: number; // solo volatile (desv. anual, ej. 0.15)
  compounding: "monthly" | "maturity";
  maturityMonths?: number; // 3/6/12 (solo CDT / maturity)
  color: string;
};

export type ContribStream = {
  id: string;
  label: string;
  productKey: string;
  initial?: number; // valor inicial (mes de inicio de la ventana)
  monthly?: number; // aporte mensual (default 0)
  periodicAmount?: number; // aporte periódico (default 0)
  periodicEveryMonths?: number; // 3/6/12
  months?: number[]; // meses calendario puntuales: [6,12] primas
  annualGrowth?: number; // aumentos de salario/prima
  startYear?: number; // "desde" (default 0)
  endYear?: number; // "hasta" (default horizonte)
};

export type SimInput = {
  years: number;
  startMonth: number; // mes calendario de inicio (1-12)
  products: Product[];
  streams: ContribStream[];
  inflation: number; // E.A.
  usdDevaluation: number; // E.A. del peso vs USD (puede ser negativa)
  reinvest: boolean; // true = compuesto · false = cosecha (simple)
  realValue: boolean; // descontar inflación
  volatilitySeed?: number; // si se define, los productos 'volatile' siguen un camino aleatorio (6.6 / vista 7.4)
};

export type YearPoint = {
  year: number;
  perProduct: Record<string, number>; // saldo COP por producto
  total: number; // COP
  contributed: number; // aportado acumulado COP
  harvested: number; // cosechado acumulado COP (0 si reinvest)
};

export type SimResult = {
  points: YearPoint[]; // length years+1 (año 0..horizonte)
  final: number; // total COP en el horizonte
  finalContributed: number;
  finalHarvested: number;
};

/**
 * Tasa efectiva mensual equivalente a una E.A.
 * i_mes = (1 + EA)^(1/12) − 1   — NUNCA EA/12.
 */
export function monthlyRate(ea: number): number {
  return Math.pow(1 + ea, 1 / 12) - 1;
}

/**
 * Tasa efectiva del periodo de capitalización a plazo (CDT).
 * i_periodo = (1 + EA)^(plazo/12) − 1
 */
export function maturityRate(ea: number, months: number): number {
  return Math.pow(1 + ea, months / 12) - 1;
}

/**
 * Factor de tipo de cambio COP/USD relativo al mes 0 (6.5).
 * tipoCambio(t) = TC_0 × (1 + usdDevaluation)^(t años); TC_0 = 1 (normalización).
 * valorCOP = saldoUSD × fxFactor(t). usdDevaluation puede ser negativa.
 */
export function fxFactor(years: number, usdDevaluation: number): number {
  return Math.pow(1 + usdDevaluation, years);
}

// ---------------------------------------------------------------------------
// Motor de flujos de caja mes a mes (6.2)
// ---------------------------------------------------------------------------

// Un "balde": bloque de capital. Los productos monthly usan un solo balde
// agregado; los maturity (CDT) crean un balde nuevo por cada aporte.
type Bucket = { principal: number; value: number; startMonth: number };

/** Mes calendario (1-12) del mes de simulación m, alineado a startMonth. */
function calendarMonth(startMonth: number, m: number): number {
  return ((startMonth - 1 + m) % 12) + 1;
}

/** PRNG determinista (mulberry32) — mismo seed ⇒ mismo camino (vista 7.4). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Muestra N(0,1) por Box-Muller usando un uniforme (0,1). */
function gaussian(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Simula el flujo de caja mes a mes sobre baldes (6.2).
 * Recalcula todo en vivo; O(meses × baldes).
 */
export function simulate(input: SimInput): SimResult {
  const { years, startMonth, products, streams, inflation, usdDevaluation, reinvest, realValue } = input;
  const N = years * 12;

  const byKey = new Map<string, Product>(products.map((p) => [p.key, p]));
  const buckets = new Map<string, Bucket[]>(products.map((p) => [p.key, []]));
  const isUSD = (p: Product) => p.currency === "USD";

  let contributedCOP = 0; // aportado acumulado, en COP
  let harvestedCOP = 0; // cosechado acumulado, en COP

  // Camino aleatorio para productos 'volatile' (6.6 / vista 7.4). Sin seed → media esperada.
  const rand = input.volatilitySeed !== undefined ? mulberry32(input.volatilitySeed) : null;

  const points: YearPoint[] = [];

  const record = (m: number) => {
    const year = m / 12;
    const fx = fxFactor(year, usdDevaluation);
    const deflate = realValue ? Math.pow(1 + inflation, year) : 1;
    const perProduct: Record<string, number> = {};
    let total = 0;
    for (const p of products) {
      const native = (buckets.get(p.key) ?? []).reduce((s, b) => s + b.value, 0);
      const cop = (isUSD(p) ? native * fx : native) / deflate;
      perProduct[p.key] = cop;
      total += cop;
    }
    points.push({
      year,
      perProduct,
      total,
      contributed: contributedCOP / deflate,
      harvested: harvestedCOP / deflate,
    });
  };

  const grow = (m: number) => {
    for (const p of products) {
      const bs = buckets.get(p.key)!;
      if (bs.length === 0) continue;
      const fx = fxFactor(m / 12, usdDevaluation);
      const toCOP = (native: number) => (isUSD(p) ? native * fx : native);

      if (p.compounding === "monthly") {
        const mean = monthlyRate(p.annualRate);
        // producto volátil con seed: retorno mensual = media + vol_mensual·N(0,1)
        let im = mean;
        if (rand && p.rateModel === "volatile" && p.volatility) {
          const volMonthly = p.volatility / Math.sqrt(12);
          im = Math.max(mean + volMonthly * gaussian(rand), -0.99);
        }
        for (const b of bs) {
          if (reinvest) {
            b.value += b.value * im;
          } else {
            // cosecha (simple): interés sobre el capital, saldo queda fijo
            harvestedCOP += toCOP(b.principal * im);
          }
        }
      } else {
        // maturity: capitaliza solo al vencer cada balde
        const plazo = p.maturityMonths ?? 12;
        const ip = maturityRate(p.annualRate, plazo);
        for (const b of bs) {
          const age = m - b.startMonth;
          if (age > 0 && age % plazo === 0) {
            if (reinvest) {
              b.value += b.value * ip;
            } else {
              harvestedCOP += toCOP(b.principal * ip);
            }
          }
        }
      }
    }
  };

  const contribute = (m: number) => {
    const fx = fxFactor(m / 12, usdDevaluation);
    for (const s of streams) {
      const p = byKey.get(s.productKey);
      if (!p) continue;
      const startAbs = (s.startYear ?? 0) * 12;
      const endAbs = (s.endYear ?? years) * 12;
      if (m < startAbs || m > endAbs) continue;

      const growth = s.annualGrowth ? Math.pow(1 + s.annualGrowth, Math.floor((m - startAbs) / 12)) : 1;
      let amount = 0;

      if (m === startAbs) amount += s.initial ?? 0;

      const inCadence = startAbs < m && m <= endAbs;
      if (inCadence && s.monthly) amount += s.monthly * growth;

      if (inCadence && s.periodicAmount) {
        const byEvery =
          s.periodicEveryMonths && (m - startAbs) % s.periodicEveryMonths === 0;
        const byCalendar = s.months?.includes(calendarMonth(startMonth, m));
        if (byEvery || byCalendar) amount += s.periodicAmount * growth;
      }

      if (amount === 0) continue;

      const bs = buckets.get(p.key)!;
      if (p.compounding === "maturity") {
        bs.push({ principal: amount, value: amount, startMonth: m });
      } else {
        if (bs.length === 0) bs.push({ principal: 0, value: 0, startMonth: m });
        bs[0].principal += amount;
        bs[0].value += amount;
      }
      contributedCOP += isUSD(p) ? amount * fx : amount;
    }
  };

  // mes 0: solo aportes iniciales, sin crecimiento; registrar año 0
  contribute(0);
  record(0);

  for (let m = 1; m <= N; m++) {
    grow(m);
    contribute(m);
    if (m % 12 === 0) record(m);
  }

  const last = points[points.length - 1];
  return {
    points,
    final: last.total,
    finalContributed: last.contributed,
    finalHarvested: last.harvested,
  };
}
