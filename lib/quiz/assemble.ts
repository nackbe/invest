import type { Category, Difficulty, Question } from "./types";

export const DEFAULT_DIST: Record<Difficulty, number> = { facil: 30, media: 30, dificil: 40 };

export type ContestConfig = {
  numQuestions: number;
  categories: Category[];
  difficultyDist: Record<Difficulty, number>;
};

const DIFS: Difficulty[] = ["facil", "media", "dificil"];

/** Baraja (Fisher-Yates) una copia del array. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Reparte `total` en `n` cubos lo más parejo posible; el sobrante (+1) va a cubos al azar. */
function evenSplit(total: number, n: number, rng: () => number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const counts = new Array(n).fill(base) as number[];
  const rem = total - base * n;
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  for (let k = 0; k < rem; k++) counts[order[k]]++;
  return counts;
}

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

/**
 * Arma el set del concurso:
 * - respeta EXACTO los cupos de dificultad (difficultyDist) sobre numQuestions,
 * - reparte cada cupo de dificultad LO MÁS PAREJO POSIBLE entre las categorías elegidas,
 * - baraja el bucket completo de cada (categoría, dificultad) para máxima variedad entre partidas,
 * - rellena faltantes si algún bucket se queda corto, y baraja el orden final.
 */
export function assembleSet(bank: Question[], config: ContestConfig, rng: () => number = Math.random): Question[] {
  const cats = config.categories.filter((c) => bank.some((q) => q.category === c));
  if (cats.length === 0) return [];

  const quotas = difficultyQuotas(config.numQuestions, config.difficultyDist);
  const used = new Set<string>();
  const picked: Question[] = [];

  for (const d of DIFS) {
    const perCat = evenSplit(quotas[d], cats.length, rng); // reparto parejo del cupo de esta dificultad
    cats.forEach((c, i) => {
      const bucket = shuffle(
        bank.filter((q) => q.category === c && q.difficulty === d && !used.has(q.id)),
        rng
      );
      for (let k = 0; k < perCat[i] && k < bucket.length; k++) {
        picked.push(bucket[k]);
        used.add(bucket[k].id);
      }
    });
  }

  // Relleno: si algún bucket no tenía suficientes, completar desde el resto (categorías elegidas), barajado.
  if (picked.length < config.numQuestions) {
    const rest = shuffle(bank.filter((q) => cats.includes(q.category) && !used.has(q.id)), rng);
    for (const q of rest) {
      if (picked.length >= config.numQuestions) break;
      picked.push(q);
      used.add(q.id);
    }
  }

  // Orden final aleatorio (mezcla temas, no agrupa por categoría).
  return shuffle(picked, rng);
}
