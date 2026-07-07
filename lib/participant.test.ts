import { describe, it, expect } from "vitest";
import { buildSimInput, defaultState, encodeState, decodeState, type ParticipantState } from "./participant";

const st = (over: Partial<ParticipantState>): ParticipantState => ({ ...defaultState(), ...over });

describe("buildSimInput — horizonte desde edades", () => {
  it("years = targetAge − startAge", () => {
    const input = buildSimInput(st({ startAge: 25, targetAge: 60 }));
    expect(input.years).toBe(35);
  });

  it("never produces a non-positive horizon", () => {
    const input = buildSimInput(st({ startAge: 40, targetAge: 40 }));
    expect(input.years).toBeGreaterThanOrEqual(1);
  });
});

describe("buildSimInput — modo simple", () => {
  it("maps to a single product and a single stream", () => {
    const input = buildSimInput(
      st({ mode: "simple", productKey: "fondo", initial: 500_000, monthly: 200_000, startAge: 30, targetAge: 40 })
    );
    expect(input.products.map((p) => p.key)).toEqual(["fondo"]);
    expect(input.streams).toHaveLength(1);
    expect(input.streams[0].productKey).toBe("fondo");
    expect(input.streams[0].initial).toBe(500_000);
    expect(input.streams[0].monthly).toBe(200_000);
  });
});

describe("buildSimInput — modo intermedio (asignación %)", () => {
  it("splits the monthly contribution across products by allocation", () => {
    const input = buildSimInput(
      st({ mode: "intermedio", monthly: 1_000_000, initial: 0, allocations: { fondo: 60, cdt: 40 } })
    );
    const byKey = Object.fromEntries(input.streams.map((s) => [s.productKey, s]));
    expect(input.products.map((p) => p.key).sort()).toEqual(["cdt", "fondo"]);
    expect(byKey.fondo.monthly).toBeCloseTo(600_000, 6);
    expect(byKey.cdt.monthly).toBeCloseTo(400_000, 6);
  });

  it("ignores products with 0% allocation", () => {
    const input = buildSimInput(
      st({ mode: "intermedio", monthly: 1_000_000, allocations: { fondo: 100, cdt: 0, acciones: 0 } })
    );
    expect(input.products.map((p) => p.key)).toEqual(["fondo"]);
  });
});

describe("buildSimInput — modo experto (streams crudos)", () => {
  it("passes streams through and derives products from their keys", () => {
    const input = buildSimInput(
      st({
        mode: "experto",
        streams: [
          { id: "a", label: "CDT", productKey: "cdt", initial: 3_000_000, startYear: 0 },
          { id: "b", label: "S&P", productKey: "sp500", monthly: 200_000, startYear: 2 },
        ],
      })
    );
    expect(input.streams).toHaveLength(2);
    expect(input.products.map((p) => p.key).sort()).toEqual(["cdt", "sp500"]);
  });
});

describe("encode/decode — estado en URL (§3)", () => {
  it("roundtrips a simple-mode state", () => {
    const s = st({ mode: "simple", startAge: 22, targetAge: 55, monthly: 350_000, initial: 1_000_000, productKey: "cdt", reinvest: false, realValue: true, usdDevaluation: -0.02 });
    const back = decodeState(encodeState(s));
    expect(back.mode).toBe("simple");
    expect(back.startAge).toBe(22);
    expect(back.targetAge).toBe(55);
    expect(back.monthly).toBe(350_000);
    expect(back.initial).toBe(1_000_000);
    expect(back.productKey).toBe("cdt");
    expect(back.reinvest).toBe(false);
    expect(back.realValue).toBe(true);
    expect(back.usdDevaluation).toBe(-0.02);
  });

  it("roundtrips intermedio allocations", () => {
    const s = st({ mode: "intermedio", allocations: { fondo: 70, sp500: 30 } });
    const back = decodeState(encodeState(s));
    expect(back.allocations).toEqual({ fondo: 70, sp500: 30 });
  });

  it("roundtrips expert streams", () => {
    const s = st({ mode: "experto", streams: [{ id: "a", label: "CDT", productKey: "cdt", initial: 2_000_000, startYear: 1 }] });
    const back = decodeState(encodeState(s));
    expect(back.streams).toEqual(s.streams);
  });

  it("falls back to defaults on garbage input", () => {
    const back = decodeState("m=nonsense&a=oops");
    expect(back.mode).toBe("simple");
    expect(back.startAge).toBe(defaultState().startAge);
  });
});

describe("buildSimInput — toggles transversales", () => {
  it("carries reinvest, realValue and usdDevaluation", () => {
    const input = buildSimInput(st({ reinvest: false, realValue: true, usdDevaluation: -0.03 }));
    expect(input.reinvest).toBe(false);
    expect(input.realValue).toBe(true);
    expect(input.usdDevaluation).toBe(-0.03);
  });
});
