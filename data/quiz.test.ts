import { describe, it, expect } from "vitest";
import { QUIZ } from "./quiz";

describe("quiz data (§11)", () => {
  it("has exactly 20 questions with unique ids 1..20", () => {
    expect(QUIZ).toHaveLength(20);
    expect(QUIZ.map((q) => q.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("every question has 4 options and a valid correctIndex", () => {
    for (const q of QUIZ) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.options[q.correctIndex]).toBeTruthy();
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(["fácil", "media", "difícil"]).toContain(q.difficulty);
    }
  });

  it("flags the expiring Wenia question (Q4) and nothing else", () => {
    expect(QUIZ.find((q) => q.id === 4)!.expires).toBe(true);
    expect(QUIZ.filter((q) => q.expires).map((q) => q.id)).toEqual([4]);
  });

  it("matches spec correct answers on spot-checked questions", () => {
    const byId = Object.fromEntries(QUIZ.map((q) => [q.id, q]));
    expect(byId[1].correctIndex).toBe(1); // ~8 años
    expect(byId[5].correctIndex).toBe(0); // renta fija
    expect(byId[6].correctIndex).toBe(2); // ≈2%
    expect(byId[14].correctIndex).toBe(0); // empieza a los 25
    expect(byId[16].correctIndex).toBe(0); // sí, retención
    expect(byId[4].correctIndex).toBe(1); // hasta 6% E.A.
  });
});
