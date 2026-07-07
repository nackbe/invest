"use client";
import { useEffect, useState } from "react";
import type { Answer } from "@/lib/quiz/types";
import type { PublicQuestion } from "@/lib/quiz/public";
import { AnswerInput } from "./renderers";

export function QuestionView({ question, timerSeconds, startedAt, onSubmit }: {
  question: PublicQuestion; timerSeconds: number; startedAt: string; onSubmit: (a: Answer) => void;
}) {
  const [remaining, setRemaining] = useState(timerSeconds);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const t = setInterval(() => setRemaining(Math.max(0, timerSeconds - (Date.now() - start) / 1000)), 100);
    return () => clearInterval(t);
  }, [startedAt, timerSeconds]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q_: any = question;
  return (
    <div className="flex flex-col gap-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(remaining / timerSeconds) * 100}%` }} />
      </div>
      {q_.mediaUrl && <img src={q_.mediaUrl} alt="" className="max-h-56 w-full rounded-xl object-contain" />}
      <h1 className="text-2xl font-semibold leading-snug">{question.prompt}</h1>
      {remaining > 0 ? <AnswerInput question={question} onSubmit={onSubmit} /> : <p className="text-neutral-500">Tiempo agotado.</p>}
    </div>
  );
}
