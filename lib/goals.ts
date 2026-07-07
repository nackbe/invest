// Selector de metas (§9.3). Presets que fijan horizonte y aporte sugerido.
// Edades cubren metas cortas y largas (no solo retiro).

import type { ParticipantState } from "./participant";

export type Goal = {
  key: string;
  label: string;
  emoji: string;
  startAge: number;
  targetAge: number;
  monthly: number;
  productKey: string;
};

export const GOALS: Goal[] = [
  { key: "cuota-inicial", label: "Cuota inicial", emoji: "🏠", startAge: 25, targetAge: 30, monthly: 600_000, productKey: "cdt" },
  { key: "estudio-hijos", label: "Estudio de los hijos", emoji: "🎓", startAge: 30, targetAge: 48, monthly: 300_000, productKey: "fondo" },
  { key: "libertad-55", label: "Libertad a los 55", emoji: "🕊️", startAge: 30, targetAge: 55, monthly: 400_000, productKey: "acciones" },
  { key: "jubilacion", label: "Jubilación", emoji: "🌴", startAge: 25, targetAge: 65, monthly: 200_000, productKey: "sp500" },
];

export const GOAL_BY_KEY: Record<string, Goal> = Object.fromEntries(GOALS.map((g) => [g.key, g]));

/** Aplica un preset de meta al estado del participante (modo simple). */
export function applyGoal(state: ParticipantState, key: string): ParticipantState {
  const g = GOAL_BY_KEY[key];
  if (!g) return state;
  return { ...state, mode: "simple", startAge: g.startAge, targetAge: g.targetAge, monthly: g.monthly, productKey: g.productKey };
}
