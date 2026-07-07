import { describe, it, expect } from "vitest";
import { monthlyRate, maturityRate, fxFactor } from "./finance";

describe("monthlyRate (i_mes) — regla de oro 6.1", () => {
  it("is (1+EA)^(1/12) − 1, NOT EA/12", () => {
    const ea = 0.12;
    const i = monthlyRate(ea);
    expect(i).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 12);
    // must NOT be the naive EA/12
    expect(i).not.toBeCloseTo(ea / 12, 6);
  });

  it("compounds back to the EA over 12 months", () => {
    const ea = 0.09;
    const i = monthlyRate(ea);
    expect(Math.pow(1 + i, 12) - 1).toBeCloseTo(ea, 12);
  });

  it("is 0 when EA is 0", () => {
    expect(monthlyRate(0)).toBe(0);
  });
});

describe("maturityRate (i_periodo) — capitalización a plazo 6.1", () => {
  it("is (1+EA)^(plazo/12) − 1", () => {
    const ea = 0.09;
    expect(maturityRate(ea, 6)).toBeCloseTo(Math.pow(1.09, 6 / 12) - 1, 12);
    expect(maturityRate(ea, 12)).toBeCloseTo(ea, 12);
    expect(maturityRate(ea, 3)).toBeCloseTo(Math.pow(1.09, 3 / 12) - 1, 12);
  });

  it("chaining monthly maturities equals compounding by i_mes", () => {
    // a 3-month maturity factor === (1+i_mes)^3
    const ea = 0.08;
    const perPeriod = 1 + maturityRate(ea, 3);
    const perMonth = Math.pow(1 + monthlyRate(ea), 3);
    expect(perPeriod).toBeCloseTo(perMonth, 12);
  });
});

describe("fxFactor — escenario del dólar 6.5", () => {
  it("is normalized to 1 at t=0", () => {
    expect(fxFactor(0, 0.04)).toBe(1);
  });

  it("grows the COP value of USD when the peso devalues (+d)", () => {
    // devaluación +4% E.A.: en 1 año el dólar vale 4% más pesos
    expect(fxFactor(1, 0.04)).toBeCloseTo(1.04, 12);
    expect(fxFactor(2, 0.04)).toBeCloseTo(1.04 * 1.04, 12);
  });

  it("shrinks the COP value when the peso strengthens (−d)", () => {
    expect(fxFactor(1, -0.04)).toBeCloseTo(0.96, 12);
  });

  it("satisfies (1+r_pesos) = (1+r_usd)(1+devaluación) — regla 6.5", () => {
    // 6% en USD, peso devaluándose 4% ⇒ ~10.24% en pesos
    const rUsd = 0.06;
    const deval = 0.04;
    // valor en COP tras 1 año de un USD que rindió 6%, con dólar +4%
    const valCop = (1 + rUsd) * fxFactor(1, deval);
    expect(valCop - 1).toBeCloseTo((1 + rUsd) * (1 + deval) - 1, 12);
    expect(valCop - 1).toBeCloseTo(0.1024, 12);
  });
});
