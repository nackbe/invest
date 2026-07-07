import type { Question } from "./types";

/** Baraja determinista por id (para no revelar el orden correcto de order/match). */
function shuffleById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Proyección pública: el enunciado y las opciones SIN la respuesta correcta. */
export function toPublic(q: Question) {
  const common = {
    id: q.id, type: q.type, category: q.category, difficulty: q.difficulty,
    prompt: q.prompt, mediaUrl: q.mediaUrl,
  };
  switch (q.type) {
    case "single": return { ...common, options: q.options };
    case "boolean": return { ...common };
    case "text": return { ...common };
    case "order": return { ...common, items: shuffleById(q.items) };
    case "match": return { ...common, lefts: q.pairs.map((p) => ({ id: p.id, label: p.left })), rights: shuffleById(q.pairs.map((p) => ({ id: p.id, label: p.right }))) };
    case "hotspot": return { ...common, imageUrl: q.imageUrl };
  }
}

export type PublicQuestion = ReturnType<typeof toPublic>;
