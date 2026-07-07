import { describe, it, expect } from "vitest";
import { PRODUCTS, PRODUCT_BY_KEY, DEFAULTS } from "./assumptions";
import { simulate } from "@/lib/finance";

describe("assumptions — invariantes de configuración", () => {
  it("has unique product keys", () => {
    const keys = PRODUCTS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("volatile products carry a volatility; maturity products carry maturityMonths", () => {
    for (const p of PRODUCTS) {
      if (p.rateModel === "volatile") expect(p.volatility).toBeGreaterThan(0);
      if (p.compounding === "maturity") expect(p.maturityMonths).toBeGreaterThan(0);
    }
  });

  it("colchón is 0% (money quieta) so it melts in real value", () => {
    expect(PRODUCT_BY_KEY.colchon.annualRate).toBe(0);
  });

  it("every product runs through the engine without NaN", () => {
    for (const p of PRODUCTS) {
      const r = simulate({
        years: 5,
        startMonth: DEFAULTS.startMonth,
        products: [p],
        streams: [{ id: "s", label: "x", productKey: p.key, initial: 1_000_000, monthly: 100_000 }],
        inflation: DEFAULTS.inflation,
        usdDevaluation: DEFAULTS.usdDevaluation,
        reinvest: DEFAULTS.reinvest,
        realValue: DEFAULTS.realValue,
      });
      expect(Number.isFinite(r.final)).toBe(true);
      expect(r.final).toBeGreaterThan(0);
    }
  });
});
