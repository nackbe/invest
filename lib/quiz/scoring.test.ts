import { describe, it, expect } from "vitest";
import { DEFAULT_BASE, speedBonus, computePoints } from "./scoring";

describe("speedBonus", () => {
  it("is 1.0 with full time remaining and 0.5 at the buzzer", () => {
    expect(speedBonus(20, 20)).toBeCloseTo(1, 6);
    expect(speedBonus(0, 20)).toBeCloseTo(0.5, 6);
    expect(speedBonus(10, 20)).toBeCloseTo(0.75, 6);
  });
  it("clamps out-of-range remaining and handles zero timer", () => {
    expect(speedBonus(-5, 20)).toBeCloseTo(0.5, 6);
    expect(speedBonus(50, 20)).toBeCloseTo(1, 6);
    expect(speedBonus(5, 0)).toBe(1);
  });
});

describe("computePoints", () => {
  it("scores base × bonus when correct, 0 when wrong", () => {
    expect(computePoints("dificil", { correct: true, ratio: 1 }, 20, 20)).toBe(300);
    expect(computePoints("dificil", { correct: true, ratio: 1 }, 0, 20)).toBe(150);
    expect(computePoints("facil", { correct: false, ratio: 0 }, 20, 20)).toBe(0);
  });
  it("uses default base per difficulty", () => {
    expect(DEFAULT_BASE).toEqual({ facil: 100, media: 200, dificil: 300 });
  });
});
