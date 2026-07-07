import type { Question } from "./types";

/**
 * Texto legible de la respuesta correcta (para el reveal en admin/proyector/jugador).
 * Defensivo: si llega una proyección pública (sin los campos de respuesta), devuelve "".
 */
export function answerText(q: Question): string {
  switch (q.type) {
    case "single":
      return q.options?.[q.correctIndex] ?? "";
    case "boolean":
      return typeof q.correct === "boolean" ? (q.correct ? "Verdadero" : "Falso") : "";
    case "text":
      return q.accept?.[0] ?? "";
    case "order":
      return q.items?.map((i) => i.label).join(" → ") ?? "";
    case "match":
      return q.pairs?.map((p) => `${p.left} ↔ ${p.right}`).join(" · ") ?? "";
    case "hotspot":
      return "Zona correcta en la imagen";
    default:
      return "";
  }
}
