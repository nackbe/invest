// Insights derivados del motor (§6.8, §9.2, §10.7). Puros y testeables.

import { simulate, type Product, type SimInput } from "./finance";

/** Reemplaza el productKey de cada stream y simula un solo producto a la vez. */
function simulateWith(product: Product, macro: SimInput): number {
  const streams = macro.streams.map((s) => ({ ...s, productKey: product.key }));
  return simulate({ ...macro, products: [product], streams }).final;
}

export type CompareRow = { product: Product; final: number; best: boolean };

/** §9.2 Comparador — un resultado por vehículo, ordenado, resaltando el mejor. */
export function compareProducts(products: Product[], macro: SimInput): CompareRow[] {
  const rows = products
    .map((product) => ({ product, final: simulateWith(product, macro), best: false }))
    .sort((a, b) => b.final - a.final);
  if (rows.length) rows[0].best = true;
  return rows;
}

/** §6.8 Costo de esperar — empezar hoy vs empezar +delay años (misma meta). */
export function costOfWaiting(input: SimInput, delayYears: number): { now: number; delayed: number; difference: number } {
  const now = simulate(input).final;
  const delayed = simulate({ ...input, years: Math.max(1, input.years - delayYears) }).final;
  return { now, delayed, difference: now - delayed };
}

export type ArchetypeRow = { startAge: number; years: number; final: number };

/** §10.7 Arquetipos — misma meta y aporte, distinta edad de inicio. */
export function archetypes(input: SimInput, targetAge: number, startAges: number[]): ArchetypeRow[] {
  return startAges.map((startAge) => {
    const years = Math.max(1, targetAge - startAge);
    return { startAge, years, final: simulate({ ...input, years }).final };
  });
}
