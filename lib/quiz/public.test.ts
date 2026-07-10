import { describe, it, expect } from "vitest";
import { toPublic, optionOrder } from "./public";
import type { Question } from "./types";

const b = { id: "q", category: "curiosos", difficulty: "facil", prompt: "p", explanation: "e" } as const;

describe("toPublic strips the answer", () => {
  it("single: exposes the same options (permuted) and removes correctIndex", () => {
    const q: Question = { ...b, type: "single", options: ["a", "b", "c", "d"], correctIndex: 2 };
    const pub = toPublic(q) as Record<string, unknown>;
    expect(new Set(pub.options as string[])).toEqual(new Set(["a", "b", "c", "d"])); // mismo conjunto
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

describe("optionOrder — permuta estable de opciones", () => {
  it("is a permutation of [0..n) and deterministic per id", () => {
    const a = optionOrder("abc", 4);
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
    expect(optionOrder("abc", 4)).toEqual(a); // determinista
  });

  it("lets the displayed position map back to the original correct index", () => {
    const q: Question = { ...b, id: "q123", type: "single", options: ["W", "X", "Y", "Z"], correctIndex: 0 };
    const order = optionOrder(q.id, 4);
    const pub = toPublic(q) as { options: string[] };
    const displayedPos = order.indexOf(q.correctIndex); // dónde quedó la correcta
    expect(pub.options[displayedPos]).toBe("W"); // esa posición muestra la correcta
    expect(order[displayedPos]).toBe(q.correctIndex); // y remapea al índice original
  });

  it("spreads the correct answer roughly evenly across a/b/c/d over many ids", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      // correcta siempre en índice original 0; medir dónde cae al permutar
      const order = optionOrder("id-" + i, 4);
      counts[order.indexOf(0)]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(4000 * 0.2); // cada posición ~25% (>20%)
      expect(c).toBeLessThan(4000 * 0.3); // (<30%)
    }
  });
});
