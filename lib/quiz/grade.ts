import type { Answer, GradeResult, Question } from "./types";
import { normalize } from "./normalize";

const R = (correct: boolean, ratio = correct ? 1 : 0): GradeResult => ({ correct, ratio });

export function grade(question: Question, answer: Answer): GradeResult {
  switch (question.type) {
    case "single":
      return answer.type === "single" ? R(answer.index === question.correctIndex) : R(false);
    case "boolean":
      return answer.type === "boolean" ? R(answer.value === question.correct) : R(false);
    case "text": {
      if (answer.type !== "text") return R(false);
      const got = normalize(answer.text);
      return R(question.accept.some((a) => normalize(a) === got));
    }
    case "order": {
      if (answer.type !== "order") return R(false);
      const correctOrder = question.items.map((i) => i.id);
      const ok =
        answer.order.length === correctOrder.length &&
        answer.order.every((id, i) => id === correctOrder[i]);
      return R(ok);
    }
    case "match": {
      if (answer.type !== "match") return R(false);
      const total = question.pairs.length;
      const hits = question.pairs.filter((p) => answer.map[p.id] === p.id).length;
      return { correct: hits === total, ratio: total ? hits / total : 0 };
    }
    case "hotspot": {
      if (answer.type !== "hotspot") return R(false);
      const { x, y, r } = question.target;
      const d = Math.hypot(answer.x - x, answer.y - y);
      return R(d <= r);
    }
  }
}
