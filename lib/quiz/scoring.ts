import type { Difficulty, GradeResult } from "./types";

export const DEFAULT_BASE: Record<Difficulty, number> = { facil: 100, media: 200, dificil: 300 };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 0.5 + 0.5·(restante/timer); responder al instante ≈ 1.0×, en la bocina ≈ 0.5×. */
export function speedBonus(remaining: number, timer: number): number {
  if (timer <= 0) return 1;
  return 0.5 + 0.5 * clamp(remaining / timer, 0, 1);
}

export function computePoints(
  difficulty: Difficulty,
  result: GradeResult,
  remaining: number,
  timer: number,
  base: Record<Difficulty, number> = DEFAULT_BASE
): number {
  if (!result.correct) return 0;
  return Math.round(base[difficulty] * speedBonus(remaining, timer));
}
