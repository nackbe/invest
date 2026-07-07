import { describe, it, expect } from "vitest";
import { simulate, type Product, type SimInput } from "./finance";

const sp500 = (rate: number, vol: number): Product => ({
  key: "sp",
  label: "S&P 500",
  currency: "COP", // sin efecto dólar para aislar la volatilidad
  rateModel: "volatile",
  annualRate: rate,
  volatility: vol,
  compounding: "monthly",
  color: "#e11",
});

const run = (over: Partial<SimInput>): SimInput => ({
  years: 10,
  startMonth: 1,
  products: [],
  streams: [{ id: "s", label: "x", productKey: "sp", initial: 1_000_000 }],
  inflation: 0.06,
  usdDevaluation: 0,
  reinvest: true,
  realValue: false,
  ...over,
});

describe("volatilidad — camino real / vista 7.4 (6.6)", () => {
  it("volatility 0 with a seed equals the deterministic expected line", () => {
    const expected = simulate(run({ products: [sp500(0.1, 0)] })); // sin seed
    const seeded = simulate(run({ products: [sp500(0.1, 0)], volatilitySeed: 42 }));
    for (let i = 0; i < expected.points.length; i++) {
      expect(seeded.points[i].total).toBeCloseTo(expected.points[i].total, 2);
    }
  });

  it("is deterministic: same seed → same path", () => {
    const a = simulate(run({ products: [sp500(0.1, 0.2)], volatilitySeed: 7 }));
    const b = simulate(run({ products: [sp500(0.1, 0.2)], volatilitySeed: 7 }));
    expect(b.final).toBeCloseTo(a.final, 6);
  });

  it("different seeds → different real paths (otro futuro posible ↻)", () => {
    const a = simulate(run({ products: [sp500(0.1, 0.2)], volatilitySeed: 1 }));
    const b = simulate(run({ products: [sp500(0.1, 0.2)], volatilitySeed: 2 }));
    expect(b.final).not.toBeCloseTo(a.final, 0);
  });

  it("a volatile path is NOT the straight expected compound line", () => {
    const expected = simulate(run({ products: [sp500(0.1, 0.2)] }));
    const real = simulate(run({ products: [sp500(0.1, 0.2)], volatilitySeed: 99 }));
    expect(real.final).not.toBeCloseTo(expected.final, 0);
  });

  it("only affects 'volatile' products, not fixed ones", () => {
    const fixed: Product = {
      key: "sp",
      label: "Fondo",
      currency: "COP",
      rateModel: "fixed",
      annualRate: 0.1,
      compounding: "monthly",
      color: "#0f0",
    };
    const noSeed = simulate(run({ products: [fixed] }));
    const withSeed = simulate(run({ products: [fixed], volatilitySeed: 5 }));
    expect(withSeed.final).toBeCloseTo(noSeed.final, 4);
  });
});
