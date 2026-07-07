// Las cinco vistas del simulador (§7), envolviendo el renderizador SimChart.
// Reciben SimResult(s) ya calculados por el motor; reutilizables en / y /present (§4).

import type { Product, SimResult } from "@/lib/finance";
import {
  buildStackedComposition,
  buildGrayVsGreen,
  buildDollarFan,
  buildVolatilityPath,
  buildReinvestVsHarvest,
} from "@/lib/chartData";
import { SimChart } from "./SimChart";

type ChartProps = { height?: number };

/** §7.1 Composición por producto — área apilada. */
export function StackedComposition({ result, products, height }: { result: SimResult; products: Product[] } & ChartProps) {
  return <SimChart model={buildStackedComposition(result, products)} height={height} />;
}

/** §7.2 Gris vs verde — lo que pusiste vs lo que ganó solo (vista hero del compuesto). */
export function GrayVsGreen({ result, height }: { result: SimResult } & ChartProps) {
  return <SimChart model={buildGrayVsGreen(result)} height={height} />;
}

/** §7.3 Abanico del dólar — 3 escenarios + aportado. */
export function DollarFan({ favor, estable, contra, height }: { favor: SimResult; estable: SimResult; contra: SimResult } & ChartProps) {
  return <SimChart model={buildDollarFan({ favor, estable, contra })} height={height} />;
}

/** §7.4 Camino real / volatilidad — esperado + un camino real. */
export function VolatilityPath({ expected, real, height }: { expected: SimResult; real: SimResult } & ChartProps) {
  return <SimChart model={buildVolatilityPath(expected, real)} height={height} />;
}

/** §7.5 Reinvierte vs cosecha — compuesto vs simple. */
export function ReinvestVsHarvest({ compound, simple, height }: { compound: SimResult; simple: SimResult } & ChartProps) {
  return <SimChart model={buildReinvestVsHarvest(compound, simple)} height={height} />;
}
