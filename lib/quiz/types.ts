export type Difficulty = "facil" | "media" | "dificil";
export type Category = "inversiones" | "mundial" | "curiosos" | "geografia" | "arte" | "salud" | "gastronomia";
export type QuestionType = "single" | "boolean" | "text" | "order" | "match" | "hotspot";

type Base = {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  mediaUrl?: string;
  explanation: string;
  explanationMediaUrl?: string;
};

export type SingleQ = Base & { type: "single"; options: string[]; correctIndex: number };
export type BooleanQ = Base & { type: "boolean"; correct: boolean };
export type TextQ = Base & { type: "text"; accept: string[] };

export type OrderItem = { id: string; label: string };
export type OrderQ = Base & { type: "order"; items: OrderItem[] };

export type MatchPair = { id: string; left: string; right: string };
export type MatchQ = Base & { type: "match"; pairs: MatchPair[] };

export type HotspotQ = Base & {
  type: "hotspot";
  imageUrl: string;
  target: { x: number; y: number; r: number };
};

export type Question = SingleQ | BooleanQ | TextQ | OrderQ | MatchQ | HotspotQ;

export type Answer =
  | { type: "single"; index: number }
  | { type: "boolean"; value: boolean }
  | { type: "text"; text: string }
  | { type: "order"; order: string[] }
  | { type: "match"; map: Record<string, string> }
  | { type: "hotspot"; x: number; y: number };

export type GradeResult = { correct: boolean; ratio: number };
