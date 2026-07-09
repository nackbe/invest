import type { Category, Difficulty } from "@/lib/quiz/types";

export type Phase = "lobby" | "question" | "reveal" | "standings" | "ended";
export type SessionStatus = "lobby" | "running" | "ended";

export type SessionConfig = {
  numQuestions: number;
  categories: Category[];
  difficultyDist: Record<Difficulty, number>;
  timerSeconds: number;
};

export type SessionRow = {
  id: string;
  code: string;
  status: SessionStatus;
  phase: Phase;
  config: SessionConfig;
  current_index: number;
  question_started_at: string | null;
  created_at: string;
};

export type PlayerRow = {
  id: string;
  session_id: string;
  username: string;
  joined_at: string;
};

export type SessionQuestionRow = {
  id: string;
  session_id: string;
  question_id: string;
  order_index: number;
};

export type AnswerRow = {
  id: string;
  session_id: string;
  question_id: string;
  player_id: string;
  answer: unknown;
  correct: boolean;
  points: number;
  ms: number;
  answered_at: string;
};

export type RankingRow = {
  session_id: string;
  player_id: string;
  username: string;
  points: number;
  total_ms: number;
  correct_count: number;
};
