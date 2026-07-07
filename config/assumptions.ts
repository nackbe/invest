// Invierte — supuestos ILUSTRATIVOS y EDITABLES (guardrail §13).
// Centraliza aquí toda tasa. NUNCA son promesa ni garantía; el presentador
// las ajusta en vivo. Verificar la recompensa de Wenia antes de cada sesión (§11 Q4).

import type { Product } from "@/lib/finance";

// ---------------------------------------------------------------------------
// Productos (§6.6). annualRate = E.A. (para volatile = media esperada).
// ---------------------------------------------------------------------------

/** "Sin invertir": la plata quieta. 0% — en valor real se derrite (§6.8). */
export const COLCHON: Product = {
  key: "colchon",
  label: "Sin invertir",
  currency: "COP",
  rateModel: "fixed",
  annualRate: 0,
  compounding: "monthly",
  color: "#9ca3af", // gris
};

/** CDT — renta fija, capitaliza al vencer; renovar = reinvertir (§6.6). */
export const CDT: Product = {
  key: "cdt",
  label: "CDT",
  currency: "COP",
  rateModel: "fixed",
  annualRate: 0.09, // 9% E.A. (quiz §11 Q1)
  compounding: "maturity",
  maturityMonths: 12, // renovación por defecto (3/6/12)
  color: "#3b82f6", // azul
};

/** Fondo (FIC) — de acumulación, compone continuo (§6.6). */
export const FONDO: Product = {
  key: "fondo",
  label: "Fondo (FIC)",
  currency: "COP",
  rateModel: "fixed",
  annualRate: 0.08, // 8% E.A. ilustrativo
  compounding: "monthly",
  color: "#22c55e", // verde
};

/** Acciones (renta variable local, COP) — volátil (§6.6). */
export const ACCIONES: Product = {
  key: "acciones",
  label: "Acciones",
  currency: "COP",
  rateModel: "volatile",
  annualRate: 0.12, // media esperada 12% E.A.
  volatility: 0.2, // desviación anual
  compounding: "monthly",
  color: "#f59e0b", // ámbar
};

/** Stablecoin USD (staking / reward) — ~6% E.A. variable, valor en COP depende del dólar (§6.6). */
export const STABLECOIN: Product = {
  key: "stablecoin",
  label: "Stablecoin USD",
  currency: "USD",
  rateModel: "reward",
  annualRate: 0.06, // "hasta 6% E.A." — DATO QUE CADUCA, verificar (§11 Q4)
  compounding: "monthly",
  color: "#14b8a6", // teal
};

/** S&P 500 (USD) — media largo plazo ~10% USD, volátil + efecto dólar (§6.6). */
export const SP500: Product = {
  key: "sp500",
  label: "S&P 500",
  currency: "USD",
  rateModel: "volatile",
  annualRate: 0.1, // media ~10% USD (12% es optimista)
  volatility: 0.15, // volatilidad histórica típica
  compounding: "monthly",
  color: "#f43f5e", // rosa
};

/** Todos los productos ilustrativos disponibles. */
export const PRODUCTS: Product[] = [COLCHON, CDT, FONDO, ACCIONES, STABLECOIN, SP500];

/** Índice por key para lookup rápido. */
export const PRODUCT_BY_KEY: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.key, p])
);

// ---------------------------------------------------------------------------
// Supuestos macro por defecto (editables en vivo)
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  inflation: 0.06, // E.A. ilustrativa (§6.8)
  usdDevaluation: 0, // escenario dólar: arranca estable; el slider va a negativo (§6.5)
  reinvest: true, // compuesto por defecto (§6.7)
  realValue: false, // nominal por defecto (§6.8)
  startMonth: 1, // la UI del participante puede fijar el mes calendario actual
} as const;

/** Rangos ilustrativos del escenario del dólar (abanico §6.5). */
export const USD_DEVALUATION_RANGE = { min: -0.06, max: 0.06, favor: 0.04, contra: -0.04 } as const;

// ---------------------------------------------------------------------------
// Copy de guardrails (§13)
// ---------------------------------------------------------------------------

export const DISCLAIMER =
  "Información educativa. Rendimientos ilustrativos, no promesas ni recomendación de compra. No es asesoría financiera.";

/** ⚠️ Dato que caduca — verificar antes de cada sesión (§11 Q4). */
export const WENIA_REWARD_NOTE = "Recompensa Wenia (USDW): hasta 6% E.A. — verificar antes de la sesión.";
