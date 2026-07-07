import { describe, it, expect } from "vitest";
import { simulate, type Product, type SimInput } from "./finance";
import {
  buildStackedComposition,
  buildGrayVsGreen,
  buildDollarFan,
  buildVolatilityPath,
  buildReinvestVsHarvest,
} from "./chartData";

const fondo: Product = { key: "fondo", label: "Fondo", currency: "COP", rateModel: "fixed", annualRate: 0.1, compounding: "monthly", color: "#0a0" };
const cdt: Product = { key: "cdt", label: "CDT", currency: "COP", rateModel: "fixed", annualRate: 0.09, compounding: "maturity", maturityMonths: 12, color: "#00a" };
const spUSD: Product = { key: "sp", label: "S&P", currency: "USD", rateModel: "volatile", annualRate: 0.1, volatility: 0.15, compounding: "monthly", color: "#a00" };

const base = (over: Partial<SimInput>): SimInput => ({
  years: 3, startMonth: 1, products: [], streams: [], inflation: 0.06, usdDevaluation: 0, reinvest: true, realValue: false, ...over,
});

describe("buildStackedComposition (§7.1)", () => {
  it("emits one stacked series per product, summing to the total", () => {
    const products = [fondo, cdt];
    const r = simulate(base({ products, streams: [
      { id: "a", label: "f", productKey: "fondo", initial: 1_000_000 },
      { id: "b", label: "c", productKey: "cdt", initial: 2_000_000 },
    ] }));
    const m = buildStackedComposition(r, products);
    expect(m.stacked).toBe(true);
    expect(m.labels).toEqual([0, 1, 2, 3]);
    expect(m.series.map((s) => s.key)).toEqual(["fondo", "cdt"]);
    expect(m.series[0].color).toBe(fondo.color);
    const lastYearTotal = m.series.reduce((s, ser) => s + ser.data[3], 0);
    expect(lastYearTotal).toBeCloseTo(r.points[3].total, 3);
  });
});

describe("buildGrayVsGreen (§7.2)", () => {
  it("splits into contributed (gray) + gained (green), stacking to total", () => {
    const r = simulate(base({ years: 10, products: [fondo], streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }] }));
    const m = buildGrayVsGreen(r);
    expect(m.stacked).toBe(true);
    const [contributed, gained] = m.series;
    expect(contributed.key).toBe("contributed");
    expect(gained.key).toBe("gained");
    // year 10: contributed stays 1M, gained = total − contributed
    expect(contributed.data[10]).toBeCloseTo(1_000_000, 3);
    expect(gained.data[10]).toBeCloseTo(r.points[10].total - 1_000_000, 3);
    expect(contributed.data[10] + gained.data[10]).toBeCloseTo(r.points[10].total, 3);
  });
});

describe("buildDollarFan (§7.3)", () => {
  it("emits three total lines (+d / 0 / −d) plus the contributed line", () => {
    const stream = { id: "s", label: "x", productKey: "sp", initial: 1000 };
    const favor = simulate(base({ products: [spUSD], streams: [stream], usdDevaluation: 0.04 }));
    const estable = simulate(base({ products: [spUSD], streams: [stream], usdDevaluation: 0 }));
    const contra = simulate(base({ products: [spUSD], streams: [stream], usdDevaluation: -0.04 }));
    const m = buildDollarFan({ favor, estable, contra });
    expect(m.stacked).toBeFalsy();
    expect(m.series.map((s) => s.key)).toEqual(["favor", "estable", "contra", "contributed"]);
    // el dólar a favor termina por encima del estable, y en contra por debajo
    expect(m.series[0].data[3]).toBeGreaterThan(m.series[1].data[3]);
    expect(m.series[2].data[3]).toBeLessThan(m.series[1].data[3]);
  });
});

describe("buildVolatilityPath (§7.4)", () => {
  it("emits an expected line and a real (volatile) line", () => {
    const stream = { id: "s", label: "x", productKey: "sp", initial: 1_000_000 };
    const expected = simulate(base({ products: [{ ...spUSD, currency: "COP" }], streams: [stream] }));
    const real = simulate(base({ products: [{ ...spUSD, currency: "COP" }], streams: [stream], volatilitySeed: 3 }));
    const m = buildVolatilityPath(expected, real);
    expect(m.series.map((s) => s.key)).toEqual(["expected", "real"]);
    expect(m.series[0].data.length).toBe(4);
  });
});

describe("buildReinvestVsHarvest (§7.5)", () => {
  it("compuesto line takes off above the cosecha line", () => {
    const stream = { id: "s", label: "x", productKey: "fondo", initial: 1_000_000 };
    const compound = simulate(base({ years: 20, products: [fondo], streams: [stream], reinvest: true }));
    const simple = simulate(base({ years: 20, products: [fondo], streams: [stream], reinvest: false }));
    const m = buildReinvestVsHarvest(compound, simple);
    expect(m.series.map((s) => s.key)).toEqual(["compuesto", "cosecha"]);
    expect(m.series[0].data[20]).toBeGreaterThan(m.series[1].data[20]);
  });
});
