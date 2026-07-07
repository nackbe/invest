import { describe, it, expect } from "vitest";
import { difficultyQuotas, assembleSet, DEFAULT_DIST, type ContestConfig } from "./assemble";
import type { Question, Category, Difficulty } from "./types";

function bank(): Question[] {
  const cats: Category[] = ["inversiones", "mundial", "curiosos", "geografia"];
  const difs: Difficulty[] = ["facil", "media", "dificil"];
  const out: Question[] = [];
  for (const c of cats)
    for (const d of difs)
      for (let i = 0; i < 10; i++)
        out.push({ id: `${c}-${d}-${i}`, category: c, difficulty: d, type: "boolean", correct: true, prompt: "p", explanation: "e" });
  return out;
}

const zero = () => 0;

describe("difficultyQuotas", () => {
  it("splits by percentage and sums exactly to the total", () => {
    const q = difficultyQuotas(10, DEFAULT_DIST);
    expect(q.facil + q.media + q.dificil).toBe(10);
    expect(q).toEqual({ facil: 3, media: 3, dificil: 4 });
  });
  it("absorbs rounding by largest remainder to hit the total", () => {
    const q = difficultyQuotas(7, DEFAULT_DIST);
    expect(q.facil + q.media + q.dificil).toBe(7);
  });
});

describe("assembleSet", () => {
  const cfg: ContestConfig = {
    numQuestions: 12,
    categories: ["inversiones", "geografia"],
    difficultyDist: DEFAULT_DIST,
  };

  it("returns numQuestions items only from the chosen categories", () => {
    const set = assembleSet(bank(), cfg, zero);
    expect(set).toHaveLength(12);
    expect(new Set(set.map((q) => q.category))).toEqual(new Set(["inversiones", "geografia"]));
  });

  it("respects the difficulty quotas", () => {
    const set = assembleSet(bank(), cfg, zero);
    const count = (d: Difficulty) => set.filter((q) => q.difficulty === d).length;
    expect(count("facil") + count("media") + count("dificil")).toBe(12);
    expect(count("dificil")).toBeGreaterThanOrEqual(count("facil"));
  });

  it("orders grouped by category (in config order), difficulty ascending within", () => {
    const set = assembleSet(bank(), cfg, zero);
    const firstGeo = set.findIndex((q) => q.category === "geografia");
    const lastInv = set.map((q) => q.category).lastIndexOf("inversiones");
    expect(lastInv).toBeLessThan(firstGeo);
    const invDifs = set.filter((q) => q.category === "inversiones").map((q) => q.difficulty);
    const rank = { facil: 0, media: 1, dificil: 2 } as const;
    for (let i = 1; i < invDifs.length; i++) expect(rank[invDifs[i]]).toBeGreaterThanOrEqual(rank[invDifs[i - 1]]);
  });

  it("does not repeat questions", () => {
    const set = assembleSet(bank(), cfg, zero);
    expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
  });

  it("backfills to numQuestions when a difficulty is under-stocked", () => {
    // banco con pocas 'dificil' en una sola categoría
    const small: Question[] = [];
    for (let i = 0; i < 8; i++) small.push({ id: `f${i}`, category: "inversiones", difficulty: "facil", type: "boolean", correct: true, prompt: "p", explanation: "e" });
    for (let i = 0; i < 1; i++) small.push({ id: `d${i}`, category: "inversiones", difficulty: "dificil", type: "boolean", correct: true, prompt: "p", explanation: "e" });
    const cfg: ContestConfig = { numQuestions: 6, categories: ["inversiones"], difficultyDist: { facil: 0, media: 0, dificil: 100 } };
    const set = assembleSet(small, cfg, () => 0);
    expect(set).toHaveLength(6); // 1 dificil + 5 backfilled from facil
    expect(new Set(set.map((q) => q.id)).size).toBe(6); // no repeats
  });

  it("returns the whole pool (sorted) when it is smaller than numQuestions", () => {
    const tiny: Question[] = [
      { id: "a", category: "inversiones", difficulty: "facil", type: "boolean", correct: true, prompt: "p", explanation: "e" },
      { id: "b", category: "inversiones", difficulty: "media", type: "boolean", correct: true, prompt: "p", explanation: "e" },
    ];
    const cfg: ContestConfig = { numQuestions: 10, categories: ["inversiones"], difficultyDist: DEFAULT_DIST };
    expect(assembleSet(tiny, cfg, () => 0)).toHaveLength(2);
  });
});
