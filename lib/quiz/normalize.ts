/**
 * Normaliza texto para comparar respuestas de forma tolerante (tipo `text`):
 * minúsculas · sin tildes · sin puntuación/símbolos · espacios colapsados.
 * Así "E.E.U.U." → "eeuu", "D.C.A." → "dca", "  ¡Bogotá! " → "bogota".
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // puntuación/símbolos ($ . , - ¿ ? …) → fuera
    .replace(/\s+/g, " ")
    .trim();
}
