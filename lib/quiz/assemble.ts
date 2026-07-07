import type { Category, Difficulty, Question } from "./types";

export const DEFAULT_DIST: Record<Difficulty, number> = { facil: 30, media: 30, dificil: 40 };

export type ContestConfig = {
  numQuestions: number;
  categories: Category[];
  difficultyDist: Record<Difficulty, number>;
};

const DIFS: Difficulty[] = ["facil", "media", "dificil"];
const RANK: Record<Difficulty, number> = { facil: 0, media: 1, dificil: 2 };

/** Reparte numQuestions por porcentaje; el sobrante de redondeo va al de mayor resto (largest remainder). */
export function difficultyQuotas(
  numQuestions: number,
  dist: Record<Difficulty, number>
): Record<Difficulty, number> {
  const totalPct = DIFS.reduce((s, d) => s + dist[d], 0) || 1;
  const raw = DIFS.map((d) => (numQuestions * dist[d]) / totalPct);
  const floor = raw.map((n) => Math.floor(n));
  let used = floor.reduce((s, n) => s + n, 0);
  const quotas: Record<Difficulty, number> = { facil: floor[0], media: floor[1], dificil: floor[2] };
  const remainders = DIFS.map((d, i) => ({ d, frac: raw[i] - floor[i] })).sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (used < numQuestions) {
    quotas[remainders[i % 3].d]++;
    used++;
    i++;
  }
  return quotas;
}

/** Muestrea del banco según cupos de dificultad y ordena agrupado por categoría. */
export function assembleSet(bank: Question[], config: ContestConfig, rng: () => number = Math.random): Question[] {
  if (config.categories.length === 0) return [];

  const pool = bank.filter((q) => config.categories.includes(q.category));
  const quotas = difficultyQuotas(config.numQuestions, config.difficultyDist);

  const picked: Question[] = [];
  let catIdx = 0;

  for (const d of DIFS) {
    const need = quotas[d];
    for (let n = 0; n < need; n++) {
      // Cycle through categories to ensure distribution
      const cat = config.categories[catIdx % config.categories.length];
      let candidates = pool.filter((q) => q.difficulty === d && q.category === cat && !picked.includes(q));

      // If no candidates for current category, try others
      if (candidates.length === 0) {
        for (let attempt = 1; attempt < config.categories.length; attempt++) {
          const altCat = config.categories[(catIdx + attempt) % config.categories.length];
          candidates = pool.filter((q) => q.difficulty === d && q.category === altCat && !picked.includes(q));
          if (candidates.length > 0) break;
        }
      }

      if (candidates.length > 0) {
        const idx = Math.floor(rng() * candidates.length);
        picked.push(candidates[idx]);
        catIdx++;
      }
    }
  }

  if (picked.length < config.numQuestions) {
    let remaining = pool.filter((q) => !picked.includes(q));
    while (picked.length < config.numQuestions && remaining.length > 0) {
      const idx = Math.floor(rng() * remaining.length);
      picked.push(remaining[idx]);
      remaining = remaining.filter((_, i) => i !== idx);
    }
  }

  const catOrder = new Map(config.categories.map((c, i) => [c, i]));
  return picked.sort((a, b) => {
    const ca = catOrder.get(a.category) ?? 99;
    const cb = catOrder.get(b.category) ?? 99;
    return ca !== cb ? ca - cb : RANK[a.difficulty] - RANK[b.difficulty];
  });
}
