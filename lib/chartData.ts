// Constructores de datos de gráfico (§7). Puros y agnósticos de chart.js:
// mapean SimResult(s) → un modelo normalizado que los componentes renderizan.

import type { Product, SimResult } from "./finance";
import { CHART } from "@/config/assumptions";

export type Series = {
  key: string;
  label: string;
  color: string;
  data: number[];
  fill?: boolean;
  dashed?: boolean;
};

export type ChartModel = {
  labels: number[]; // años (0..horizonte)
  series: Series[];
  stacked?: boolean;
};

const years = (r: SimResult) => r.points.map((p) => p.year);

/** §7.1 Composición por producto — área apilada, un color por producto. */
export function buildStackedComposition(r: SimResult, products: Product[]): ChartModel {
  return {
    labels: years(r),
    stacked: true,
    series: products.map((p) => ({
      key: p.key,
      label: p.label,
      color: p.color,
      fill: true,
      data: r.points.map((pt) => pt.perProduct[p.key] ?? 0),
    })),
  };
}

/** §7.2 Gris vs verde — "lo que pusiste" (recto) vs "lo que ganó solo" (exponencial). */
export function buildGrayVsGreen(r: SimResult): ChartModel {
  return {
    labels: years(r),
    stacked: true,
    series: [
      {
        key: "contributed",
        label: "Lo que pusiste",
        color: CHART.contributed,
        fill: true,
        data: r.points.map((p) => p.contributed),
      },
      {
        key: "gained",
        label: "Lo que ganó solo",
        color: CHART.gained,
        fill: true,
        data: r.points.map((p) => p.total - p.contributed),
      },
    ],
  };
}

/** §7.3 Abanico del dólar — 3 escenarios (a favor / estable / en contra) + aportado. */
export function buildDollarFan(runs: { favor: SimResult; estable: SimResult; contra: SimResult }): ChartModel {
  const { favor, estable, contra } = runs;
  return {
    labels: years(estable),
    series: [
      { key: "favor", label: "Dólar a favor", color: CHART.favor, data: favor.points.map((p) => p.total) },
      { key: "estable", label: "Dólar estable", color: CHART.estable, data: estable.points.map((p) => p.total) },
      { key: "contra", label: "Dólar en contra", color: CHART.contra, data: contra.points.map((p) => p.total) },
      { key: "contributed", label: "Lo que pusiste", color: CHART.contributed, dashed: true, data: estable.points.map((p) => p.contributed) },
    ],
  };
}

/** §7.4 Camino real / volatilidad — línea esperada (media) + un camino real. */
export function buildVolatilityPath(expected: SimResult, real: SimResult): ChartModel {
  return {
    labels: years(expected),
    series: [
      { key: "expected", label: "Esperado (media)", color: CHART.expected, dashed: true, data: expected.points.map((p) => p.total) },
      { key: "real", label: "Un camino real", color: CHART.real, data: real.points.map((p) => p.total) },
    ],
  };
}

/** §7.5 Reinvierte vs cosecha — compuesto (despega) vs simple (recta). */
export function buildReinvestVsHarvest(compound: SimResult, simple: SimResult): ChartModel {
  return {
    labels: years(compound),
    series: [
      { key: "compuesto", label: "Reinvierte (compuesto)", color: CHART.gained, data: compound.points.map((p) => p.total) },
      // cosecha: el saldo invertido queda fijo; la riqueza total (saldo + cosechado) sube recta
      { key: "cosecha", label: "Cosecha (simple)", color: CHART.contributed, data: simple.points.map((p) => p.total + p.harvested) },
    ],
  };
}
