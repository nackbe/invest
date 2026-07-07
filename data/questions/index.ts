import type { Question } from "@/lib/quiz/types";
import { INVERSIONES } from "./inversiones";
import { MUNDIAL } from "./mundial";
import { CURIOSOS } from "./curiosos";
import { GEOGRAFIA } from "./geografia";

export const QUESTION_BANK: Question[] = [...INVERSIONES, ...MUNDIAL, ...CURIOSOS, ...GEOGRAFIA];
