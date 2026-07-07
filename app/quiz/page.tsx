import type { Metadata } from "next";
import { Quiz } from "@/components/quiz/Quiz";

export const metadata: Metadata = {
  title: "Quiz · Invierte",
  description: "20 preguntas para poner a prueba lo que sabes de inversión.",
};

export default function QuizPage() {
  return <Quiz />;
}
