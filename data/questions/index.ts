import type { Question } from "@/lib/quiz/types";
import { INVERSIONES } from "./inversiones";
import { MUNDIAL } from "./mundial";
import { CURIOSOS } from "./curiosos";
import { GEOGRAFIA } from "./geografia";
import { ARTE } from "./arte";
import { SALUD } from "./salud";
import { GASTRONOMIA } from "./gastronomia";
import { CINE } from "./cine";
import { BELLEZA } from "./belleza";
import { HISTORIA } from "./historia";
import { PERSONAL } from "./personal";
import { BIZARROS } from "./bizarros";

export const QUESTION_BANK: Question[] = [...INVERSIONES, ...MUNDIAL, ...CURIOSOS, ...GEOGRAFIA, ...ARTE, ...SALUD, ...GASTRONOMIA, ...CINE, ...BELLEZA, ...HISTORIA, ...PERSONAL, ...BIZARROS];
