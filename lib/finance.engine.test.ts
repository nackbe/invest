import { describe, it, expect } from "vitest";
import { simulate, monthlyRate, maturityRate, type Product, type SimInput } from "./finance";

// ---- builders --------------------------------------------------------------

const fondo = (rate: number): Product => ({
  key: "fondo",
  label: "Fondo",
  currency: "COP",
  rateModel: "fixed",
  annualRate: rate,
  compounding: "monthly",
  color: "#0f0",
});

const cdt = (rate: number, maturityMonths: number): Product => ({
  key: "cdt",
  label: "CDT",
  currency: "COP",
  rateModel: "fixed",
  annualRate: rate,
  compounding: "maturity",
  maturityMonths,
  color: "#00f",
});

const stableUSD = (rate: number): Product => ({
  key: "usdw",
  label: "Stablecoin",
  currency: "USD",
  rateModel: "reward",
  annualRate: rate,
  compounding: "monthly",
  color: "#ff0",
});

const base = (over: Partial<SimInput>): SimInput => ({
  years: 1,
  startMonth: 1,
  products: [],
  streams: [],
  inflation: 0.06,
  usdDevaluation: 0,
  reinvest: true,
  realValue: false,
  ...over,
});

// ---------------------------------------------------------------------------

describe("simulate — estructura de salida", () => {
  it("returns years+1 yearly points, from year 0 to horizon", () => {
    const r = simulate(
      base({
        years: 3,
        products: [fondo(0.1)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    expect(r.points).toHaveLength(4);
    expect(r.points.map((p) => p.year)).toEqual([0, 1, 2, 3]);
  });
});

describe("simulate — producto mensual compuesto (Fondo/FIC)", () => {
  it("compounds an initial deposit by i_mes, reaching the EA after 12 months", () => {
    const r = simulate(
      base({
        years: 1,
        products: [fondo(0.12)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    expect(r.points[0].total).toBeCloseTo(1_000_000, 6);
    expect(r.points[1].total).toBeCloseTo(1_120_000, 3); // 1M × 1.12
    expect(r.finalContributed).toBeCloseTo(1_000_000, 6);
  });

  it("uses i_mes month-by-month, not EA/12", () => {
    const r = simulate(
      base({
        years: 1,
        products: [fondo(0.12)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    const naive = 1_000_000 * Math.pow(1 + 0.12 / 12, 12); // wrong model
    expect(r.points[1].total).not.toBeCloseTo(naive, 0);
    expect(r.points[1].total).toBeCloseTo(1_000_000 * Math.pow(1 + monthlyRate(0.12), 12), 4);
  });

  it("accumulates 12 monthly contributions (timing) at 0% rate", () => {
    const r = simulate(
      base({
        years: 1,
        products: [fondo(0)],
        streams: [{ id: "s", label: "x", productKey: "fondo", monthly: 100_000 }],
      })
    );
    expect(r.points[1].total).toBeCloseTo(1_200_000, 6);
    expect(r.points[1].contributed).toBeCloseTo(1_200_000, 6);
  });
});

describe("simulate — CDT (maturity) capitaliza al vencer", () => {
  it("compounds only at maturity boundaries", () => {
    const r = simulate(
      base({
        years: 2,
        products: [cdt(0.09, 12)],
        streams: [{ id: "s", label: "x", productKey: "cdt", initial: 1_000_000 }],
      })
    );
    // stays flat within the year, jumps at month 12 and 24
    expect(r.points[1].total).toBeCloseTo(1_090_000, 3);
    expect(r.points[2].total).toBeCloseTo(1_000_000 * 1.09 * 1.09, 2);
  });

  it("a 6-month CDT capitalizes twice per year", () => {
    const r = simulate(
      base({
        years: 1,
        products: [cdt(0.09, 6)],
        streams: [{ id: "s", label: "x", productKey: "cdt", initial: 1_000_000 }],
      })
    );
    const f = 1 + maturityRate(0.09, 6);
    expect(r.points[1].total).toBeCloseTo(1_000_000 * f * f, 3); // ≈ 1.09
    expect(r.points[1].total).toBeCloseTo(1_090_000, 2);
  });
});

describe("simulate — reinvierte vs cosecha (6.7)", () => {
  it("cosecha (reinvest=false) keeps invested capital flat and sets interest aside", () => {
    const r = simulate(
      base({
        years: 1,
        reinvest: false,
        products: [fondo(0.12)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    expect(r.points[1].total).toBeCloseTo(1_000_000, 4); // línea recta
    expect(r.points[1].harvested).toBeCloseTo(1_000_000 * monthlyRate(0.12) * 12, 3);
    expect(r.points[1].harvested).toBeGreaterThan(0);
  });

  it("compuesto ends above simple (the gap IS compound interest)", () => {
    const comp = simulate(
      base({
        years: 10,
        products: [fondo(0.12)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    const simple = simulate(
      base({
        years: 10,
        reinvest: false,
        products: [fondo(0.12)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    const compWealth = comp.points[10].total;
    const simpleWealth = simple.points[10].total + simple.points[10].harvested;
    expect(compWealth).toBeGreaterThan(simpleWealth);
  });

  it("cosecha on a CDT pays fixed interest each maturity, principal renews", () => {
    const r = simulate(
      base({
        years: 2,
        reinvest: false,
        products: [cdt(0.09, 12)],
        streams: [{ id: "s", label: "x", productKey: "cdt", initial: 1_000_000 }],
      })
    );
    expect(r.points[1].harvested).toBeCloseTo(90_000, 4);
    expect(r.points[2].harvested).toBeCloseTo(180_000, 4);
    expect(r.points[2].total).toBeCloseTo(1_000_000, 4);
  });
});

describe("simulate — productos USD y el dólar (6.5)", () => {
  it("(1+r_pesos) = (1+r_usd)(1+devaluación): 6% USD + 4% deval ≈ 10.24% COP", () => {
    const r = simulate(
      base({
        years: 1,
        usdDevaluation: 0.04,
        products: [stableUSD(0.06)],
        streams: [{ id: "s", label: "x", productKey: "usdw", initial: 1000 }],
      })
    );
    expect(r.points[0].total).toBeCloseTo(1000, 6); // COP at t0, fx=1
    expect(r.points[1].total).toBeCloseTo(1000 * 1.06 * 1.04, 4); // 1102.4
    expect(r.points[1].contributed).toBeCloseTo(1000, 6);
  });

  it("a strengthening peso (−deval) eats USD returns", () => {
    const up = simulate(
      base({ years: 1, usdDevaluation: 0.04, products: [stableUSD(0.06)], streams: [{ id: "s", label: "x", productKey: "usdw", initial: 1000 }] })
    );
    const down = simulate(
      base({ years: 1, usdDevaluation: -0.04, products: [stableUSD(0.06)], streams: [{ id: "s", label: "x", productKey: "usdw", initial: 1000 }] })
    );
    expect(down.points[1].total).toBeLessThan(up.points[1].total);
    expect(down.points[1].total).toBeCloseTo(1000 * 1.06 * 0.96, 4);
  });
});

describe("simulate — nominal vs real (6.8)", () => {
  it("real value of an un-invested cushion (0%) goes DOWN", () => {
    const r = simulate(
      base({
        years: 1,
        realValue: true,
        inflation: 0.06,
        products: [{ ...fondo(0), key: "colchon", label: "Colchón" }],
        streams: [{ id: "s", label: "x", productKey: "colchon", initial: 1_000_000 }],
      })
    );
    expect(r.points[1].total).toBeCloseTo(1_000_000 / 1.06, 3);
    expect(r.points[1].total).toBeLessThan(1_000_000);
  });

  it("real ≈ 2% when nominal 8% and inflation 6% (quiz Q6)", () => {
    const r = simulate(
      base({
        years: 1,
        realValue: true,
        inflation: 0.06,
        products: [fondo(0.08)],
        streams: [{ id: "s", label: "x", productKey: "fondo", initial: 1_000_000 }],
      })
    );
    // nominal 1.08 / 1.06 = 1.0189 ≈ +1.9% real
    expect(r.points[1].total / 1_000_000 - 1).toBeCloseTo(1.08 / 1.06 - 1, 6);
    expect(r.points[1].total / 1_000_000 - 1).toBeGreaterThan(0.018);
    expect(r.points[1].total / 1_000_000 - 1).toBeLessThan(0.021);
  });
});

describe("simulate — primas por mes calendario (6.4)", () => {
  it("deposits on calendar months [6,12] aligned to startMonth", () => {
    const r = simulate(
      base({
        years: 1,
        startMonth: 1, // enero
        products: [fondo(0)],
        streams: [
          { id: "p", label: "Prima", productKey: "fondo", periodicAmount: 500_000, months: [6, 12] },
        ],
      })
    );
    expect(r.points[1].contributed).toBeCloseTo(1_000_000, 6); // jun + dic
    expect(r.points[1].total).toBeCloseTo(1_000_000, 6);
  });
});

describe("simulate — ventana temporal startYear/endYear (modo experto)", () => {
  it("a stream only contributes inside its [startYear,endYear] window", () => {
    const r = simulate(
      base({
        years: 3,
        products: [fondo(0)],
        streams: [
          { id: "s", label: "x", productKey: "fondo", monthly: 100_000, startYear: 1, endYear: 2 },
        ],
      })
    );
    expect(r.points[1].contributed).toBeCloseTo(0, 6); // nothing in year 0
    // 12 deposits across year 1..2 window
    expect(r.points[3].contributed).toBeGreaterThan(0);
    expect(r.points[3].contributed).toBeLessThanOrEqual(1_300_000);
  });
});

describe("simulate — composición por producto (7.1)", () => {
  it("reports per-product balances that sum to the total", () => {
    const r = simulate(
      base({
        years: 1,
        products: [fondo(0.1), cdt(0.09, 12)],
        streams: [
          { id: "a", label: "f", productKey: "fondo", initial: 1_000_000 },
          { id: "b", label: "c", productKey: "cdt", initial: 2_000_000 },
        ],
      })
    );
    const p = r.points[1];
    expect(p.perProduct.fondo + p.perProduct.cdt).toBeCloseTo(p.total, 4);
    expect(p.perProduct.cdt).toBeCloseTo(2_180_000, 2); // 2M × 1.09
  });
});
