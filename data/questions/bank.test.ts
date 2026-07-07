import { describe, it, expect } from "vitest";
import { QUESTION_BANK } from "./index";
import { grade } from "@/lib/quiz/grade";
import type { Answer, Question } from "@/lib/quiz/types";

function correctAnswer(q: Question): Answer {
  switch (q.type) {
    case "single": return { type: "single", index: q.correctIndex };
    case "boolean": return { type: "boolean", value: q.correct };
    case "text": return { type: "text", text: q.accept[0] };
    case "order": return { type: "order", order: q.items.map((i) => i.id) };
    case "match": return { type: "match", map: Object.fromEntries(q.pairs.map((p) => [p.id, p.id])) };
    case "hotspot": return { type: "hotspot", x: q.target.x, y: q.target.y };
  }
}

describe("question bank invariants", () => {
  it("has unique ids", () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every question grades its own canonical answer as correct", () => {
    for (const q of QUESTION_BANK) expect(grade(q, correctAnswer(q)).correct, `q=${q.id}`).toBe(true);
  });
  it("single questions have exactly 4 options and a valid correctIndex", () => {
    for (const q of QUESTION_BANK) if (q.type === "single") {
      expect(q.options.length, `q=${q.id}`).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });
  it("covers all seven categories", () => {
    expect(new Set(QUESTION_BANK.map((q) => q.category))).toEqual(
      new Set(["inversiones", "mundial", "curiosos", "geografia", "arte", "salud", "gastronomia"])
    );
  });
  it("every explanation is non-empty", () => {
    for (const q of QUESTION_BANK) expect(q.explanation.length, `q=${q.id}`).toBeGreaterThan(0);
  });
});
