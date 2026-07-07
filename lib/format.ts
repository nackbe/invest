// Formato de moneda (§2): es-CO, COP, sin decimales, TODO redondeado (§13).

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Pesos colombianos completos, redondeado y sin decimales. Ej: $1.234.567 */
export function formatCOP(value: number): string {
  return COP.format(Math.round(value));
}

const NUM1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** Número corto para titulares gigantes (§5). Ej: $1,5 M · $250 K · $2,3 MM */
export function formatCOPShort(value: number): string {
  const sign = value < 0 ? "-" : "";
  const n = Math.abs(value);
  if (n >= 1_000_000_000) return `${sign}$${NUM1.format(n / 1_000_000_000)} MM`;
  if (n >= 1_000_000) return `${sign}$${NUM1.format(n / 1_000_000)} M`;
  if (n >= 1_000) return `${sign}$${NUM1.format(n / 1_000)} K`;
  return `${sign}$${NUM1.format(Math.round(n))}`;
}
