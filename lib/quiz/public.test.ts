import { describe, it, expect } from "vitest";
import { toPublic } from "./public";
import type { Question } from "./types";

const b = { id: "q", category: "curiosos", difficulty: "facil", prompt: "p", explanation: "e" } as const;

describe("toPublic strips the answer", () => {
  it("single: keeps options, removes correctIndex", () => {
    const q: Question = { ...b, type: "single", options: ["a", "b", "c", "d"], correctIndex: 2 };
    const pub = toPublic(q) as Record<string, unknown>;
    expect(pub.options).toEqual(["a", "b", "c", "d"]);
    expect("correctIndex" in pub).toBe(false);
  });
  it("boolean: removes correct", () => {
    const q: Question = { ...b, type: "boolean", correct: true };
    expect("correct" in (toPublic(q) as object)).toBe(false);
  });
  it("text: removes accept", () => {
    const q: Question = { ...b, type: "text", accept: ["Perú"] };
    expect("accept" in (toPublic(q) as object)).toBe(false);
  });
  it("order: exposes items but same set of ids", () => {
    const q: Question = { ...b, type: "order", items: [{ id: "1", label: "u" }, { id: "2", label: "d" }, { id: "3", label: "t" }] };
    const pub = toPublic(q) as { items: { id: string }[] };
    expect(pub.items.map((i) => i.id).sort()).toEqual(["1", "2", "3"]);
  });
  it("match: exposes lefts and rights separately, not the pairing", () => {
    const q: Question = { ...b, type: "match", pairs: [{ id: "a", left: "Francia", right: "París" }, { id: "b", left: "Perú", right: "Lima" }] };
    const pub = toPublic(q) as { lefts: unknown[]; rights: unknown[] };
    expect(pub.lefts).toHaveLength(2);
    expect(pub.rights).toHaveLength(2);
    expect("pairs" in (pub as object)).toBe(false);
  });
  it("hotspot: keeps image, removes target", () => {
    const q: Question = { ...b, type: "hotspot", imageUrl: "x.png", target: { x: 0.5, y: 0.5, r: 0.1 } };
    const pub = toPublic(q) as Record<string, unknown>;
    expect(pub.imageUrl).toBe("x.png");
    expect("target" in pub).toBe(false);
  });
});
