"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultState,
  buildSimInput,
  encodeState,
  decodeState,
  type ParticipantState,
} from "@/lib/participant";
import { simulate } from "@/lib/finance";

/**
 * Estado del simulador con sincronización a la URL (§3). Recalcula el motor en
 * vivo en cada cambio de control (§6.2). El seed de volatilidad se re-tira
 * manualmente ("otro futuro posible ↻", §7.4).
 */
export function useSimulator() {
  // SSR y primer render usan defaults para evitar hydration mismatch; la URL
  // se lee tras montar.
  const [state, setState] = useState<ParticipantState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [volSeed, setVolSeed] = useState(1);

  useEffect(() => {
    if (window.location.search) setState(decodeState(window.location.search));
    setHydrated(true);
  }, []);

  // refleja el estado en la URL sin recargar (compartible / leave-behind)
  useEffect(() => {
    if (!hydrated) return;
    const qs = encodeState(state);
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [state, hydrated]);

  const patch = useCallback(
    (p: Partial<ParticipantState>) => setState((s) => ({ ...s, ...p })),
    []
  );

  const input = useMemo(() => buildSimInput(state), [state]);
  const result = useMemo(() => simulate(input), [input]);
  // camino real volátil para la vista 7.4
  const realResult = useMemo(() => simulate({ ...input, volatilitySeed: volSeed }), [input, volSeed]);

  const reroll = useCallback(() => setVolSeed((s) => s + 1), []);

  return { state, patch, setState, input, result, realResult, reroll };
}
