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

  it("respects the difficulty quotas exactly", () => {
    const set = assembleSet(bank(), cfg, zero);
    const count = (d: Difficulty) => set.filter((q) => q.difficulty === d).length;
    // difficultyQuotas(12, 30/30/40) = { facil:4, media:3, dificil:5 }
    expect(count("facil")).toBe(4);
    expect(count("media")).toBe(3);
    expect(count("dificil")).toBe(5);
  });

  it("distributes evenly across the selected categories", () => {
    let seed = 3;
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    // 4 categorías, 12 preguntas → ~3 por categoría
    const four = ["inversiones", "geografia", "curiosos", "mundial"] as const;
    const set = assembleSet(bank(), { numQuestions: 12, categories: [...four], difficultyDist: DEFAULT_DIST }, rng);
    const per = (c: string) => set.filter((q) => q.category === c).length;
    for (const c of four) {
      expect(per(c)).toBeGreaterThanOrEqual(2); // parejo: entre 2 y 4
      expect(per(c)).toBeLessThanOrEqual(4);
    }
    expect(set).toHaveLength(12);
  });

  it("varies the questions between runs (different rng → different set)", () => {
    const mk = (s0: number) => {
      let s = s0;
      const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      return assembleSet(bank(), { ...cfg, categories: ["inversiones"], numQuestions: 5 }, rng).map((q) => q.id).sort().join(",");
    };
    expect(mk(1)).not.toBe(mk(999)); // dos "partidas" distintas no traen exactamente las mismas
  });

  it("mixes categories (does NOT group all of one category together)", () => {
    // con un rng pseudo-aleatorio, las categorías deben quedar intercaladas,
    // no todos los 'inversiones' antes de todos los 'geografia'.
    let seed = 7;
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const set = assembleSet(bank(), { ...cfg, numQuestions: 12 }, rng);
    const cats = set.map((q) => q.category);
    const lastInv = cats.lastIndexOf("inversiones");
    const firstGeo = cats.indexOf("geografia");
    // si estuviera agrupado por categoría, lastInv < firstGeo siempre; aquí NO debe cumplirse
    expect(lastInv < firstGeo).toBe(false);
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
