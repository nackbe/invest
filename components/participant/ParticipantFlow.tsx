"use client";

// Flujo participante (§9): 4 pantallas, una acción cada una. Estado compartido
// por useSimulator para que la curva sea la misma en todo el recorrido.

import { useEffect, useState } from "react";
import { useSimulator } from "@/components/simulator/useSimulator";
import { Simulator } from "@/components/simulator/Simulator";
import { Comparador } from "./Comparador";
import { Metas } from "./Metas";
import { Plan } from "./Plan";

type Step = "simular" | "comparar" | "metas" | "plan";
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "simular", label: "Tu curva", icon: "📈" },
  { key: "comparar", label: "¿Dónde?", icon: "⚖️" },
  { key: "metas", label: "Metas", icon: "🎯" },
  { key: "plan", label: "Mi plan", icon: "✅" },
];

export function ParticipantFlow() {
  const sim = useSimulator();
  const [step, setStep] = useState<Step>("simular");

  // deep-link opcional a un paso (?step=metas)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("step");
    if (s && STEPS.some((x) => x.key === s)) setStep(s as Step);
  }, []);

  return (
    <div className="min-h-screen">
      <a href="/quiz" className="fixed right-3 top-3 z-10 rounded-full border border-neutral-800 bg-neutral-950/80 px-3 py-1 text-xs text-neutral-400 backdrop-blur">
        Quiz 🧠
      </a>
      {step === "simular" && <Simulator sim={sim} />}
      {step === "comparar" && <Comparador sim={sim} />}
      {step === "metas" && <Metas sim={sim} />}
      {step === "plan" && <Plan sim={sim} />}

      {/* Navegación inferior fija (mobile-first) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {STEPS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                step === s.key ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
