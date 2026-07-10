import type { Question } from "./types";
import { BANK_LAYOUT } from "./optionLayout";

/** Baraja determinista por id (para no revelar el orden correcto de order/match). */
function shuffleById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Hash estable de un string (FNV-1a). */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Permutación ESTABLE de las posiciones de las opciones de un `single`, derivada
 * del id de la pregunta. Reparte la respuesta correcta de forma pareja entre a/b/c/d
 * (los autores tienden a poner la correcta de primera). `order[posMostrada] = indiceOriginal`.
 * Debe usarse igual al mostrar (toPublic) y al calificar (/api/answer).
 */
/** Todas las permutaciones de [0..n). */
function permutations(n: number): number[][] {
  if (n <= 1) return [Array.from({ length: n }, (_, i) => i)];
  const out: number[][] = [];
  for (const rest of permutations(n - 1)) {
    for (let i = 0; i < n; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  }
  return out;
}

export function optionOrder(id: string, n: number): number[] {
  // Preferir el layout round-robin exacto del banco (reparte la correcta 25% c/u);
  // para ids fuera del banco (tests), caer a una permutación estable por hash.
  const pre = BANK_LAYOUT.get(id);
  if (pre && pre.length === n) return pre;
  const perms = permutations(n);
  return perms[hashId(id) % perms.length];
}

/** Proyección pública: el enunciado y las opciones SIN la respuesta correcta. */
export function toPublic(q: Question) {
  const common = {
    id: q.id, type: q.type, category: q.category, difficulty: q.difficulty,
    prompt: q.prompt, mediaUrl: q.mediaUrl,
  };
  switch (q.type) {
    case "single": {
      const order = optionOrder(q.id, q.options.length);
      return { ...common, options: order.map((o) => q.options[o]) };
    }
    case "boolean": return { ...common };
    case "text": return { ...common };
    case "order": return { ...common, items: shuffleById(q.items) };
    case "match": return { ...common, lefts: q.pairs.map((p) => ({ id: p.id, label: p.left })), rights: shuffleById(q.pairs.map((p) => ({ id: p.id, label: p.right }))) };
    case "hotspot": return { ...common, imageUrl: q.imageUrl };
  }
}

export type PublicQuestion = ReturnType<typeof toPublic>;
