import { QUESTION_BANK } from "@/data/questions";

/**
 * Layout precomputado de opciones para las preguntas `single` del banco.
 * Reparte la respuesta correcta EXACTAMENTE parejo entre a/b/c/d con un
 * round-robin sobre los singles ordenados por id. `order[posMostrada] = indiceOriginal`.
 */
export const BANK_LAYOUT: Map<string, number[]> = (() => {
  const map = new Map<string, number[]>();
  const singles = QUESTION_BANK.filter((q) => q.type === "single").sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  singles.forEach((q, i) => {
    if (q.type !== "single") return;
    const n = q.options.length;
    const target = i % n; // posición donde va la correcta (cicla 0,1,2,3,…)
    const order = new Array<number>(n);
    order[target] = q.correctIndex;
    let k = 0;
    for (let orig = 0; orig < n; orig++) {
      if (orig === q.correctIndex) continue;
      if (k === target) k++;
      order[k++] = orig;
    }
    map.set(q.id, order);
  });
  return map;
})();
