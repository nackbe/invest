import { describe, it, expect } from "vitest";
import { grade } from "./grade";
import type { Question } from "./types";

const b = { id: "q", category: "curiosos", difficulty: "facil", prompt: "p", explanation: "e" } as const;

describe("grade — single", () => {
  const q: Question = { ...b, type: "single", options: ["a", "b", "c", "d"], correctIndex: 2 };
  it("correct when index matches", () => {
    expect(grade(q, { type: "single", index: 2 })).toEqual({ correct: true, ratio: 1 });
  });
  it("wrong otherwise", () => {
    expect(grade(q, { type: "single", index: 0 })).toEqual({ correct: false, ratio: 0 });
  });
});

describe("grade — boolean", () => {
  const q: Question = { ...b, type: "boolean", correct: true };
  it("matches the boolean", () => {
    expect(grade(q, { type: "boolean", value: true }).correct).toBe(true);
    expect(grade(q, { type: "boolean", value: false }).correct).toBe(false);
  });
});

describe("grade — text", () => {
  const q: Question = { ...b, type: "text", accept: ["Perú", "Peru"] };
  it("accepts normalized matches (accents/case)", () => {
    expect(grade(q, { type: "text", text: "  perú " }).correct).toBe(true);
    expect(grade(q, { type: "text", text: "PERU" }).correct).toBe(true);
  });
  it("rejects non-matches", () => {
    expect(grade(q, { type: "text", text: "chile" }).correct).toBe(false);
  });
});

describe("grade — order", () => {
  const q: Question = {
    ...b, type: "order",
    items: [{ id: "1", label: "uno" }, { id: "2", label: "dos" }, { id: "3", label: "tres" }],
  };
  it("correct only on exact sequence", () => {
    expect(grade(q, { type: "order", order: ["1", "2", "3"] })).toEqual({ correct: true, ratio: 1 });
    expect(grade(q, { type: "order", order: ["1", "3", "2"] }).correct).toBe(false);
  });
});

describe("grade — match", () => {
  const q: Question = {
    ...b, type: "match",
    pairs: [{ id: "a", left: "Francia", right: "París" }, { id: "b", left: "Perú", right: "Lima" }],
  };
  it("correct when every left maps to its own right", () => {
    expect(grade(q, { type: "match", map: { a: "a", b: "b" } })).toEqual({ correct: true, ratio: 1 });
  });
  it("partial ratio, not correct, when some wrong", () => {
    const r = grade(q, { type: "match", map: { a: "a", b: "a" } });
    expect(r.correct).toBe(false);
    expect(r.ratio).toBeCloseTo(0.5, 5);
  });
});

describe("grade — hotspot", () => {
  const q: Question = {
    ...b, type: "hotspot", imageUrl: "x.png", target: { x: 0.5, y: 0.5, r: 0.1 },
  };
  it("correct inside the radius", () => {
    expect(grade(q, { type: "hotspot", x: 0.52, y: 0.48 }).correct).toBe(true);
  });
  it("wrong outside the radius", () => {
    expect(grade(q, { type: "hotspot", x: 0.9, y: 0.9 }).correct).toBe(false);
  });
});
