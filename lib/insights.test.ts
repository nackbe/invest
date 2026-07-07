import { describe, it, expect } from "vitest";
import { simulate, type SimInput } from "./finance";
import { compareProducts, costOfWaiting, archetypes } from "./insights";
import { GOALS, applyGoal } from "./goals";
import { defaultState } from "./participant";
import { PRODUCTS, PRODUCT_BY_KEY } from "@/config/assumptions";

const base: SimInput = {
  years: 30,
  startMonth: 1,
  products: [],
  streams: [],
  inflation: 0.06,
  usdDevaluation: 0,
  reinvest: true,
  realValue: false,
};

describe("compareProducts (§9.2)", () => {
  it("returns one final per product, sorted best-first", () => {
    const rows = compareProducts(PRODUCTS.filter((p) => p.key !== "colchon"), {
      ...base,
      streams: [{ id: "s", label: "x", productKey: "_", monthly: 200_000 }],
    });
    expect(rows.length).toBe(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].final).toBeGreaterThanOrEqual(rows[i].final);
    }
    expect(rows[0].best).toBe(true);
  });

  it("puts the highest-rate fixed product above the colchón (0%)", () => {
    const rows = compareProducts([PRODUCT_BY_KEY.colchon, PRODUCT_BY_KEY.fondo], {
      ...base,
      streams: [{ id: "s", label: "x", productKey: "_", monthly: 100_000 }],
    });
    expect(rows[0].product.key).toBe("fondo");
    expect(rows.find((r) => r.product.key === "colchon")!.best).toBe(false);
  });
});

describe("costOfWaiting (§6.8)", () => {
  it("starting 5 years later (same target) ends with less", () => {
    const input: SimInput = { ...base, years: 30, products: [PRODUCT_BY_KEY.fondo], streams: [{ id: "s", label: "x", productKey: "fondo", monthly: 200_000 }] };
    const r = costOfWaiting(input, 5);
    expect(r.now).toBeCloseTo(simulate(input).final, 3);
    expect(r.delayed).toBeLessThan(r.now);
    expect(r.difference).toBeCloseTo(r.now - r.delayed, 3);
    expect(r.difference).toBeGreaterThan(0);
  });
});

describe("archetypes 25 vs 40 (§10.7)", () => {
  it("the earlier starter ends ahead with the same monthly", () => {
    const input: SimInput = { ...base, products: [PRODUCT_BY_KEY.fondo], streams: [{ id: "s", label: "x", productKey: "fondo", monthly: 200_000 }] };
    const rows = archetypes(input, 60, [25, 40]);
    expect(rows.map((r) => r.startAge)).toEqual([25, 40]);
    expect(rows[0].years).toBe(35);
    expect(rows[1].years).toBe(20);
    expect(rows[0].final).toBeGreaterThan(rows[1].final);
  });
});

describe("goal presets (§9.3)", () => {
  it("every goal produces a valid horizon", () => {
    for (const g of GOALS) {
      const s = applyGoal(defaultState(), g.key);
      expect(g.targetAge).toBeGreaterThan(g.startAge);
      expect(s.startAge).toBe(g.startAge);
      expect(s.targetAge).toBe(g.targetAge);
    }
  });

  it("covers short and long goals (cuota inicial short, jubilación long)", () => {
    const keys = GOALS.map((g) => g.key);
    expect(keys).toContain("cuota-inicial");
    expect(keys).toContain("jubilacion");
    const cuota = GOALS.find((g) => g.key === "cuota-inicial")!;
    const jub = GOALS.find((g) => g.key === "jubilacion")!;
    expect(jub.targetAge - jub.startAge).toBeGreaterThan(cuota.targetAge - cuota.startAge);
  });
});
