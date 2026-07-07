import type { Question } from "@/lib/quiz/types";
import { INVERSIONES } from "./inversiones";
import { MUNDIAL } from "./mundial";
import { CURIOSOS } from "./curiosos";
import { GEOGRAFIA } from "./geografia";
import { ARTE } from "./arte";
import { SALUD } from "./salud";
import { GASTRONOMIA } from "./gastronomia";

export const QUESTION_BANK: Question[] = [...INVERSIONES, ...MUNDIAL, ...CURIOSOS, ...GEOGRAFIA, ...ARTE, ...SALUD, ...GASTRONOMIA];
