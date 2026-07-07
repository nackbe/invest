"use client";

// Renderizador genérico de líneas/áreas para las vistas del simulador (§7).
// Consume el modelo normalizado de lib/chartData. Reutilizable en / y /present (§4).

import "./chartSetup";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import type { ChartModel } from "@/lib/chartData";
import { CHART } from "@/config/assumptions";
import { formatCOP, formatCOPShort } from "@/lib/format";

/** Convierte un color hex (#rrggbb) a rgba con alfa para relleno de área. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SimChart({
  model,
  height = 260,
  showLegend,
}: {
  model: ChartModel;
  height?: number;
  showLegend?: boolean;
}) {
  const stacked = !!model.stacked;
  const legend = showLegend ?? model.series.length >= 2;

  const data: ChartData<"line"> = {
    labels: model.labels.map((y) => `Año ${y}`),
    datasets: model.series.map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: s.fill ? withAlpha(s.color, 0.28) : s.color,
      borderWidth: 2,
      borderDash: s.dashed ? [6, 5] : undefined,
      // apilado: la banda inferior rellena hasta la base, las demás hasta la anterior
      fill: s.fill ? (stacked ? (i === 0 ? "origin" : "-1") : "origin") : false,
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHitRadius: 16,
      stack: stacked ? "s" : undefined,
    })),
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: legend,
        labels: { color: CHART.tick, boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCOP(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        stacked,
        grid: { color: CHART.grid, drawTicks: false },
        border: { display: false },
        ticks: { color: CHART.tick, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
      },
      y: {
        stacked,
        beginAtZero: true,
        grid: { color: CHART.grid, drawTicks: false },
        border: { display: false },
        ticks: { color: CHART.tick, font: { size: 11 }, callback: (v) => formatCOPShort(Number(v)) },
      },
    },
  };

  return (
    <div style={{ height }} className="w-full">
      <Line data={data} options={options} />
    </div>
  );
}
