import type { Question } from "./types";

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
export function optionOrder(id: string, n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  let seed = hashId(id) || 1;
  const rnd = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
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
