# Trivia Engine (Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, fully-tested question engine (types, graders, scoring, set-assembly), a seed question bank, and prune the repo from the Invierte app — producing working, testable software with no backend yet.

**Architecture:** A discriminated-union `Question` type with one pure `grade(question, answer)` function per type (server-authoritative, unit-tested). Scoring and set-assembly are pure functions. The seed bank is typed data validated by invariant tests. The live multiplayer layer (Supabase, admin, realtime, player/projector UI) is **Plan 2**, written after this plan executes.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind (dark theme), Vitest. Reuses the existing scaffold. No new dependencies in this plan.

## Global Constraints

- **Language/locale:** all user-facing copy in español (es-CO).
- **Difficulty values (verbatim):** `'facil' | 'media' | 'dificil'`.
- **Categories (verbatim):** `'inversiones' | 'mundial' | 'curiosos' | 'geografia'`.
- **Question types (verbatim):** `'single' | 'boolean' | 'text' | 'order' | 'match' | 'hotspot'`.
- **Default difficulty distribution:** 30% facil / 30% media / 40% dificil (configurable).
- **Default score base:** facil 100 · media 200 · dificil 300 (configurable).
- **Speed bonus:** `0.5 + 0.5 × (tiempoRestante / timer)`.
- **`grade` is pure** and shared code executed server-side in Plan 2; here it is unit-tested as a pure function.
- **`order`/`match`:** v1 grading is all-or-nothing for `correct`; `ratio` may be fractional.
- **Media is orthogonal:** any type may carry `mediaUrl`; there is no separate image type.
- **Preserved:** the Invierte app is saved on branch/tag `invest-v1` before pruning.
- **TDD:** pure functions get a failing test first. Commit after each task.
- Spec: `docs/superpowers/specs/2026-07-07-trivia-live-design.md`.

---

### Task 1: Preserve Invierte and prune `main` to a clean scaffold

**Files:**
- Delete: `app/present/`, `app/quiz/`, `components/charts/`, `components/simulator/`, `components/participant/`, `components/present/Presenter.tsx`, `components/ui/controls.tsx`, `lib/finance.ts`, `lib/finance.test.ts`, `lib/finance.engine.test.ts`, `lib/finance.volatility.test.ts`, `lib/chartData.ts`, `lib/chartData.test.ts`, `lib/participant.ts`, `lib/participant.test.ts`, `lib/insights.ts`, `lib/insights.test.ts`, `lib/goals.ts`, `config/assumptions.ts`, `config/assumptions.test.ts`, `data/quiz.ts`, `data/quiz.test.ts`
- Keep: `lib/format.ts`, `lib/format.test.ts`, `components/present/QRCode.tsx` (reused for join QR in Plan 2), scaffold (`app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`)
- Modify: `app/page.tsx` (replace with placeholder), `package.json` (remove invest-only deps)

- [ ] **Step 1: Save the Invierte app on a branch and tag**

```bash
cd /Users/nr/projects/invest
git checkout -b invest-v1
git checkout main
git tag invest-v1
```

Expected: `invest-v1` branch and tag both point at the current tip; `main` checked out.

- [ ] **Step 2: Delete Invierte-specific code**

```bash
cd /Users/nr/projects/invest
rm -rf app/present app/quiz components/charts components/simulator components/participant
rm -f components/present/Presenter.tsx components/ui/controls.tsx
rm -f lib/finance.ts lib/finance.test.ts lib/finance.engine.test.ts lib/finance.volatility.test.ts
rm -f lib/chartData.ts lib/chartData.test.ts lib/participant.ts lib/participant.test.ts
rm -f lib/insights.ts lib/insights.test.ts lib/goals.ts
rm -f config/assumptions.ts config/assumptions.test.ts
rm -f data/quiz.ts data/quiz.test.ts
rmdir config 2>/dev/null || true
```

- [ ] **Step 3: Remove invest-only dependencies**

Run:
```bash
cd /Users/nr/projects/invest
npm uninstall chart.js react-chartjs-2 html-to-image
```
Expected: `package.json` keeps `next`, `react`, `react-dom`, `qrcode`; dev deps keep `vitest`, `@types/qrcode`, tailwind/eslint/ts.

- [ ] **Step 4: Replace the home page with a placeholder**

Replace `app/page.tsx` with:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Trivia</h1>
      <p className="text-neutral-500">En construcción.</p>
    </main>
  );
}
```

- [ ] **Step 5: Verify the pruned repo builds and kept tests pass**

Run:
```bash
cd /Users/nr/projects/invest
npm run build && npm test
```
Expected: build succeeds; `lib/format.test.ts` passes (7 tests); no references to deleted modules.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Trivia P1.T1: preserve Invierte on invest-v1, prune main to scaffold"
```

---

### Task 2: Question types and text normalization

**Files:**
- Create: `lib/quiz/types.ts`
- Create: `lib/quiz/normalize.ts`
- Test: `lib/quiz/normalize.test.ts`

**Interfaces:**
- Produces (`lib/quiz/types.ts`): `Difficulty`, `Category`, `QuestionType`, `Question` (union of `SingleQ|BooleanQ|TextQ|OrderQ|MatchQ|HotspotQ`), `Answer` (union), `GradeResult = { correct: boolean; ratio: number }`, and helper subtypes `OrderItem`, `MatchPair`.
- Produces (`lib/quiz/normalize.ts`): `normalize(s: string): string`.

- [ ] **Step 1: Write the failing test for `normalize`**

Create `lib/quiz/normalize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases, strips accents, trims and collapses spaces", () => {
    expect(normalize("  Bogotá ")).toBe("bogota");
    expect(normalize("El   Ñandú")).toBe("el nandu");
    expect(normalize("CAFÉ")).toBe("cafe");
  });
  it("is idempotent", () => {
    expect(normalize(normalize("Perú "))).toBe("peru");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test lib/quiz/normalize.test.ts`
Expected: FAIL — cannot resolve `./normalize`.

- [ ] **Step 3: Implement types and `normalize`**

Create `lib/quiz/types.ts`:

```ts
export type Difficulty = "facil" | "media" | "dificil";
export type Category = "inversiones" | "mundial" | "curiosos" | "geografia";
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
export type OrderQ = Base & { type: "order"; items: OrderItem[] }; // items en el orden correcto

export type MatchPair = { id: string; left: string; right: string };
export type MatchQ = Base & { type: "match"; pairs: MatchPair[] };

export type HotspotQ = Base & {
  type: "hotspot";
  imageUrl: string;
  target: { x: number; y: number; r: number }; // coords normalizadas 0..1
};

export type Question = SingleQ | BooleanQ | TextQ | OrderQ | MatchQ | HotspotQ;

export type Answer =
  | { type: "single"; index: number }
  | { type: "boolean"; value: boolean }
  | { type: "text"; text: string }
  | { type: "order"; order: string[] } // ids en el orden elegido
  | { type: "match"; map: Record<string, string> } // leftPairId -> rightPairId
  | { type: "hotspot"; x: number; y: number };

export type GradeResult = { correct: boolean; ratio: number };
```

Create `lib/quiz/normalize.ts`:

```ts
/** minúsculas · sin tildes · trim · espacios colapsados. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test lib/quiz/normalize.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/quiz/types.ts lib/quiz/normalize.ts lib/quiz/normalize.test.ts
git commit -m "Trivia P1.T2: question types + text normalization"
```

---

### Task 3: Graders (one per type)

**Files:**
- Create: `lib/quiz/grade.ts`
- Test: `lib/quiz/grade.test.ts`

**Interfaces:**
- Consumes: `Question`, `Answer`, `GradeResult` from `lib/quiz/types.ts`; `normalize` from `lib/quiz/normalize.ts`.
- Produces: `grade(question: Question, answer: Answer): GradeResult`.

- [ ] **Step 1: Write the failing tests**

Create `lib/quiz/grade.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { grade } from "./grade";
import type { Question } from "./types";

const b = { id: "q", category: "curiosos", difficulty: "facil", prompt: "p", explanation: "e" } as const;

describe("grade — single", () => {
  const q: Question = { ...b, type: "single", options: ["a", "b", "c", "d"], correctIndex: 2 };
  it("correct when index matches", () => {
    expect(grade(q, { type: "single", index: 2 })).toEqual({ correct: true, ratio: 1 });
  });
  it("wrong otherwise", () => {
    expect(grade(q, { type: "single", index: 0 })).toEqual({ correct: false, ratio: 0 });
  });
});

describe("grade — boolean", () => {
  const q: Question = { ...b, type: "boolean", correct: true };
  it("matches the boolean", () => {
    expect(grade(q, { type: "boolean", value: true }).correct).toBe(true);
    expect(grade(q, { type: "boolean", value: false }).correct).toBe(false);
  });
});

describe("grade — text", () => {
  const q: Question = { ...b, type: "text", accept: ["Perú", "Peru"] };
  it("accepts normalized matches (accents/case)", () => {
    expect(grade(q, { type: "text", text: "  perú " }).correct).toBe(true);
    expect(grade(q, { type: "text", text: "PERU" }).correct).toBe(true);
  });
  it("rejects non-matches", () => {
    expect(grade(q, { type: "text", text: "chile" }).correct).toBe(false);
  });
});

describe("grade — order", () => {
  const q: Question = {
    ...b, type: "order",
    items: [{ id: "1", label: "uno" }, { id: "2", label: "dos" }, { id: "3", label: "tres" }],
  };
  it("correct only on exact sequence", () => {
    expect(grade(q, { type: "order", order: ["1", "2", "3"] })).toEqual({ correct: true, ratio: 1 });
    expect(grade(q, { type: "order", order: ["1", "3", "2"] }).correct).toBe(false);
  });
});

describe("grade — match", () => {
  const q: Question = {
    ...b, type: "match",
    pairs: [{ id: "a", left: "Francia", right: "París" }, { id: "b", left: "Perú", right: "Lima" }],
  };
  it("correct when every left maps to its own right", () => {
    expect(grade(q, { type: "match", map: { a: "a", b: "b" } })).toEqual({ correct: true, ratio: 1 });
  });
  it("partial ratio, not correct, when some wrong", () => {
    const r = grade(q, { type: "match", map: { a: "a", b: "a" } });
    expect(r.correct).toBe(false);
    expect(r.ratio).toBeCloseTo(0.5, 5);
  });
});

describe("grade — hotspot", () => {
  const q: Question = {
    ...b, type: "hotspot", imageUrl: "x.png", target: { x: 0.5, y: 0.5, r: 0.1 },
  };
  it("correct inside the radius", () => {
    expect(grade(q, { type: "hotspot", x: 0.52, y: 0.48 }).correct).toBe(true);
  });
  it("wrong outside the radius", () => {
    expect(grade(q, { type: "hotspot", x: 0.9, y: 0.9 }).correct).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test lib/quiz/grade.test.ts`
Expected: FAIL — cannot resolve `./grade`.

- [ ] **Step 3: Implement `grade`**

Create `lib/quiz/grade.ts`:

```ts
import type { Answer, GradeResult, Question } from "./types";
import { normalize } from "./normalize";

const R = (correct: boolean, ratio = correct ? 1 : 0): GradeResult => ({ correct, ratio });

export function grade(question: Question, answer: Answer): GradeResult {
  switch (question.type) {
    case "single":
      return answer.type === "single" ? R(answer.index === question.correctIndex) : R(false);
    case "boolean":
      return answer.type === "boolean" ? R(answer.value === question.correct) : R(false);
    case "text": {
      if (answer.type !== "text") return R(false);
      const got = normalize(answer.text);
      return R(question.accept.some((a) => normalize(a) === got));
    }
    case "order": {
      if (answer.type !== "order") return R(false);
      const correctOrder = question.items.map((i) => i.id);
      const ok =
        answer.order.length === correctOrder.length &&
        answer.order.every((id, i) => id === correctOrder[i]);
      return R(ok);
    }
    case "match": {
      if (answer.type !== "match") return R(false);
      const total = question.pairs.length;
      const hits = question.pairs.filter((p) => answer.map[p.id] === p.id).length;
      return { correct: hits === total, ratio: total ? hits / total : 0 };
    }
    case "hotspot": {
      if (answer.type !== "hotspot") return R(false);
      const { x, y, r } = question.target;
      const d = Math.hypot(answer.x - x, answer.y - y);
      return R(d <= r);
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test lib/quiz/grade.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/quiz/grade.ts lib/quiz/grade.test.ts
git commit -m "Trivia P1.T3: pure graders for all six question types"
```

---

### Task 4: Scoring (difficulty base + speed bonus)

**Files:**
- Create: `lib/quiz/scoring.ts`
- Test: `lib/quiz/scoring.test.ts`

**Interfaces:**
- Consumes: `Difficulty`, `GradeResult` from `lib/quiz/types.ts`.
- Produces:
  - `DEFAULT_BASE: Record<Difficulty, number>` = `{ facil:100, media:200, dificil:300 }`
  - `speedBonus(remaining: number, timer: number): number`
  - `computePoints(difficulty: Difficulty, result: GradeResult, remaining: number, timer: number, base?: Record<Difficulty, number>): number`

- [ ] **Step 1: Write the failing tests**

Create `lib/quiz/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_BASE, speedBonus, computePoints } from "./scoring";

describe("speedBonus", () => {
  it("is 1.0 with full time remaining and 0.5 at the buzzer", () => {
    expect(speedBonus(20, 20)).toBeCloseTo(1, 6);
    expect(speedBonus(0, 20)).toBeCloseTo(0.5, 6);
    expect(speedBonus(10, 20)).toBeCloseTo(0.75, 6);
  });
  it("clamps out-of-range remaining and handles zero timer", () => {
    expect(speedBonus(-5, 20)).toBeCloseTo(0.5, 6);
    expect(speedBonus(50, 20)).toBeCloseTo(1, 6);
    expect(speedBonus(5, 0)).toBe(1);
  });
});

describe("computePoints", () => {
  it("scores base × bonus when correct, 0 when wrong", () => {
    expect(computePoints("dificil", { correct: true, ratio: 1 }, 20, 20)).toBe(300);
    expect(computePoints("dificil", { correct: true, ratio: 1 }, 0, 20)).toBe(150);
    expect(computePoints("facil", { correct: false, ratio: 0 }, 20, 20)).toBe(0);
  });
  it("uses default base per difficulty", () => {
    expect(DEFAULT_BASE).toEqual({ facil: 100, media: 200, dificil: 300 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test lib/quiz/scoring.test.ts`
Expected: FAIL — cannot resolve `./scoring`.

- [ ] **Step 3: Implement scoring**

Create `lib/quiz/scoring.ts`:

```ts
import type { Difficulty, GradeResult } from "./types";

export const DEFAULT_BASE: Record<Difficulty, number> = { facil: 100, media: 200, dificil: 300 };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 0.5 + 0.5·(restante/timer); responder al instante ≈ 1.0×, en la bocina ≈ 0.5×. */
export function speedBonus(remaining: number, timer: number): number {
  if (timer <= 0) return 1;
  return 0.5 + 0.5 * clamp(remaining / timer, 0, 1);
}

export function computePoints(
  difficulty: Difficulty,
  result: GradeResult,
  remaining: number,
  timer: number,
  base: Record<Difficulty, number> = DEFAULT_BASE
): number {
  if (!result.correct) return 0;
  return Math.round(base[difficulty] * speedBonus(remaining, timer));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test lib/quiz/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/quiz/scoring.ts lib/quiz/scoring.test.ts
git commit -m "Trivia P1.T4: scoring — difficulty base + speed bonus"
```

---

### Task 5: Set assembly (difficulty quotas + category ordering)

**Files:**
- Create: `lib/quiz/assemble.ts`
- Test: `lib/quiz/assemble.test.ts`

**Interfaces:**
- Consumes: `Question`, `Category`, `Difficulty` from `lib/quiz/types.ts`.
- Produces:
  - `type ContestConfig = { numQuestions: number; categories: Category[]; difficultyDist: Record<Difficulty, number>; }`
  - `DEFAULT_DIST: Record<Difficulty, number>` = `{ facil:30, media:30, dificil:40 }`
  - `difficultyQuotas(numQuestions: number, dist: Record<Difficulty, number>): Record<Difficulty, number>` (sums exactly to numQuestions)
  - `assembleSet(bank: Question[], config: ContestConfig, rng?: () => number): Question[]` — sampled to quotas, then **ordered grouped by category** (config.categories order), and within a category by difficulty facil→media→dificil.

- [ ] **Step 1: Write the failing tests**

Create `lib/quiz/assemble.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { difficultyQuotas, assembleSet, DEFAULT_DIST, type ContestConfig } from "./assemble";
import type { Question, Category, Difficulty } from "./types";

// banco sintético: N por (categoría, dificultad)
function bank(): Question[] {
  const cats: Category[] = ["inversiones", "mundial", "curiosos", "geografia"];
  const difs: Difficulty[] = ["facil", "media", "dificil"];
  const out: Question[] = [];
  for (const c of cats)
    for (const d of difs)
      for (let i = 0; i < 10; i++)
        out.push({ id: `${c}-${d}-${i}`, category: c, difficulty: d, type: "boolean", correct: true, prompt: "p", explanation: "e" });
  return out;
}

// rng determinista (siempre 0 → toma el primero disponible)
const zero = () => 0;

describe("difficultyQuotas", () => {
  it("splits by percentage and sums exactly to the total", () => {
    const q = difficultyQuotas(10, DEFAULT_DIST); // 30/30/40
    expect(q.facil + q.media + q.dificil).toBe(10);
    expect(q).toEqual({ facil: 3, media: 3, dificil: 4 });
  });
  it("absorbs rounding into the largest bucket to hit the total", () => {
    const q = difficultyQuotas(7, DEFAULT_DIST);
    expect(q.facil + q.media + q.dificil).toBe(7);
  });
});

describe("assembleSet", () => {
  const cfg: ContestConfig = {
    numQuestions: 12,
    categories: ["inversiones", "geografia"],
    difficultyDist: DEFAULT_DIST,
  };

  it("returns numQuestions items only from the chosen categories", () => {
    const set = assembleSet(bank(), cfg, zero);
    expect(set).toHaveLength(12);
    expect(new Set(set.map((q) => q.category))).toEqual(new Set(["inversiones", "geografia"]));
  });

  it("respects the difficulty quotas", () => {
    const set = assembleSet(bank(), cfg, zero);
    const count = (d: Difficulty) => set.filter((q) => q.difficulty === d).length;
    // 12 × 30/30/40 = 3/3/6... but distributed across 2 categories → totals hold
    expect(count("facil") + count("media") + count("dificil")).toBe(12);
    expect(count("dificil")).toBeGreaterThanOrEqual(count("facil"));
  });

  it("orders grouped by category (in config order), difficulty ascending within", () => {
    const set = assembleSet(bank(), cfg, zero);
    const firstGeo = set.findIndex((q) => q.category === "geografia");
    const lastInv = set.map((q) => q.category).lastIndexOf("inversiones");
    expect(lastInv).toBeLessThan(firstGeo); // all inversiones before any geografia
    const invDifs = set.filter((q) => q.category === "inversiones").map((q) => q.difficulty);
    const rank = { facil: 0, media: 1, dificil: 2 } as const;
    for (let i = 1; i < invDifs.length; i++) expect(rank[invDifs[i]]).toBeGreaterThanOrEqual(rank[invDifs[i - 1]]);
  });

  it("does not repeat questions", () => {
    const set = assembleSet(bank(), cfg, zero);
    expect(new Set(set.map((q) => q.id)).size).toBe(set.length);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test lib/quiz/assemble.test.ts`
Expected: FAIL — cannot resolve `./assemble`.

- [ ] **Step 3: Implement set assembly**

Create `lib/quiz/assemble.ts`:

```ts
import type { Category, Difficulty, Question } from "./types";

export const DEFAULT_DIST: Record<Difficulty, number> = { facil: 30, media: 30, dificil: 40 };

export type ContestConfig = {
  numQuestions: number;
  categories: Category[];
  difficultyDist: Record<Difficulty, number>;
};

const DIFS: Difficulty[] = ["facil", "media", "dificil"];
const RANK: Record<Difficulty, number> = { facil: 0, media: 1, dificil: 2 };

/** Reparte numQuestions por porcentaje; el sobrante de redondeo va al bucket mayor. */
export function difficultyQuotas(
  numQuestions: number,
  dist: Record<Difficulty, number>
): Record<Difficulty, number> {
  const totalPct = DIFS.reduce((s, d) => s + dist[d], 0) || 1;
  const raw = DIFS.map((d) => (numQuestions * dist[d]) / totalPct);
  const floor = raw.map((n) => Math.floor(n));
  let used = floor.reduce((s, n) => s + n, 0);
  const quotas: Record<Difficulty, number> = { facil: floor[0], media: floor[1], dificil: floor[2] };
  // reparte el faltante por mayor parte fraccionaria
  const remainders = DIFS.map((d, i) => ({ d, frac: raw[i] - floor[i] })).sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (used < numQuestions) {
    quotas[remainders[i % 3].d]++;
    used++;
    i++;
  }
  return quotas;
}

/** Muestrea del banco según cupos de dificultad y ordena agrupado por categoría. */
export function assembleSet(bank: Question[], config: ContestConfig, rng: () => number = Math.random): Question[] {
  const pool = bank.filter((q) => config.categories.includes(q.category));
  const quotas = difficultyQuotas(config.numQuestions, config.difficultyDist);

  const picked: Question[] = [];
  for (const d of DIFS) {
    const candidates = pool.filter((q) => q.difficulty === d && !picked.includes(q));
    const need = quotas[d];
    for (let n = 0; n < need && candidates.length; n++) {
      const idx = Math.floor(rng() * candidates.length);
      picked.push(candidates.splice(idx, 1)[0]);
    }
  }

  // orden: por categoría (en el orden de config), dificultad ascendente dentro
  const catOrder = new Map(config.categories.map((c, i) => [c, i]));
  return picked.sort((a, b) => {
    const ca = catOrder.get(a.category) ?? 99;
    const cb = catOrder.get(b.category) ?? 99;
    return ca !== cb ? ca - cb : RANK[a.difficulty] - RANK[b.difficulty];
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test lib/quiz/assemble.test.ts`
Expected: PASS.

Note: the `count("dificil") >= count("facil")` assertion holds because the quota for `dificil` (40%) ≥ `facil` (30%) and the synthetic bank has enough of each.

- [ ] **Step 5: Commit**

```bash
git add lib/quiz/assemble.ts lib/quiz/assemble.test.ts
git commit -m "Trivia P1.T5: set assembly — difficulty quotas + category ordering"
```

---

### Task 6: Seed question bank + invariant tests

**Files:**
- Create: `data/questions/inversiones.ts`, `data/questions/mundial.ts`, `data/questions/curiosos.ts`, `data/questions/geografia.ts`
- Create: `data/questions/index.ts`
- Test: `data/questions/bank.test.ts`

**Interfaces:**
- Consumes: `Question` from `lib/quiz/types.ts`; `grade` from `lib/quiz/grade.ts`.
- Produces: `QUESTION_BANK: Question[]` (aggregated), and per-category arrays.

**Content instructions:** Author **~20 questions per category (≈80 total)**, mixing all six
types (each category should include at least one `single`, `boolean`, `text`, `order`,
`match`, and — where an image is available — `hotspot`), with a distribution roughly
30/30/40 facil/media/dificil so the bank can satisfy contest quotas. Each question needs a
concise `explanation`. `mediaUrl`/`imageUrl` may point to local assets under `public/`
(add in Plan 2) or remain text-only for now — for `hotspot`, if no image is ready yet,
prefer a `single`/`order` instead so every seeded question renders without assets.
**Flag Mundial 2026 facts for user verification** (knowledge cutoff Jan 2026). Below are
one concrete example per type to fix the format; replicate the shape for the rest.

- [ ] **Step 1: Write the failing invariant test**

Create `data/questions/bank.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { QUESTION_BANK } from "./index";
import { grade } from "@/lib/quiz/grade";
import type { Answer, Question } from "@/lib/quiz/types";

// respuesta "correcta canónica" para autoverificar cada pregunta del banco
function correctAnswer(q: Question): Answer {
  switch (q.type) {
    case "single": return { type: "single", index: q.correctIndex };
    case "boolean": return { type: "boolean", value: q.correct };
    case "text": return { type: "text", text: q.accept[0] };
    case "order": return { type: "order", order: q.items.map((i) => i.id) };
    case "match": return { type: "match", map: Object.fromEntries(q.pairs.map((p) => [p.id, p.id])) };
    case "hotspot": return { type: "hotspot", x: q.target.x, y: q.target.y };
  }
}

describe("question bank invariants", () => {
  it("has unique ids", () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every question grades its own canonical answer as correct", () => {
    for (const q of QUESTION_BANK) {
      expect(grade(q, correctAnswer(q)).correct, `q=${q.id}`).toBe(true);
    }
  });

  it("single questions have exactly 4 options and a valid correctIndex", () => {
    for (const q of QUESTION_BANK) {
      if (q.type === "single") {
        expect(q.options.length, `q=${q.id}`).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });

  it("covers all four categories", () => {
    expect(new Set(QUESTION_BANK.map((q) => q.category))).toEqual(
      new Set(["inversiones", "mundial", "curiosos", "geografia"])
    );
  });

  it("every explanation is non-empty", () => {
    for (const q of QUESTION_BANK) expect(q.explanation.length, `q=${q.id}`).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test data/questions/bank.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Create the seed files (one concrete example per type shown)**

Create `data/questions/inversiones.ts` (author ~20; example shape):

```ts
import type { Question } from "@/lib/quiz/types";

export const INVERSIONES: Question[] = [
  {
    id: "inv-001", category: "inversiones", difficulty: "facil", type: "single",
    prompt: "¿Qué es un CDT?",
    options: ["Renta variable", "Renta fija", "Una cripto", "Una acción"],
    correctIndex: 1,
    explanation: "Un CDT es renta fija: conoces la tasa desde el principio.",
  },
  {
    id: "inv-002", category: "inversiones", difficulty: "media", type: "boolean",
    prompt: "El interés compuesto reinvierte las ganancias para que generen más ganancias.",
    correct: true,
    explanation: "Sí: por eso la curva 'despega' frente al interés simple.",
  },
  // … hasta ~20, mezclando text/order/match, ~30/30/40 dificultad.
];
```

Create `data/questions/geografia.ts` (author ~20; examples for text/order/match):

```ts
import type { Question } from "@/lib/quiz/types";

export const GEOGRAFIA: Question[] = [
  {
    id: "geo-001", category: "geografia", difficulty: "media", type: "text",
    prompt: "¿Cuál es la capital de Perú?",
    accept: ["Lima"],
    explanation: "Lima, fundada en 1535, es la capital y ciudad más poblada de Perú.",
  },
  {
    id: "geo-002", category: "geografia", difficulty: "dificil", type: "order",
    prompt: "Ordena estos países de MENOR a MAYOR superficie.",
    items: [
      { id: "cr", label: "Costa Rica" },
      { id: "co", label: "Colombia" },
      { id: "ar", label: "Argentina" },
      { id: "br", label: "Brasil" },
    ],
    explanation: "Costa Rica < Colombia < Argentina < Brasil por superficie.",
  },
  {
    id: "geo-003", category: "geografia", difficulty: "media", type: "match",
    prompt: "Empareja cada país con su capital.",
    pairs: [
      { id: "fr", left: "Francia", right: "París" },
      { id: "jp", left: "Japón", right: "Tokio" },
      { id: "eg", left: "Egipto", right: "El Cairo" },
    ],
    explanation: "París, Tokio y El Cairo son las capitales respectivas.",
  },
  // … hasta ~20.
];
```

Create `data/questions/mundial.ts` and `data/questions/curiosos.ts` the same way
(~20 each). **Add a comment at the top of `mundial.ts`:** `// ⚠️ VERIFICAR datos del Mundial 2026 antes de usar (corte de conocimiento ene-2026).`

Create `data/questions/index.ts`:

```ts
import type { Question } from "@/lib/quiz/types";
import { INVERSIONES } from "./inversiones";
import { MUNDIAL } from "./mundial";
import { CURIOSOS } from "./curiosos";
import { GEOGRAFIA } from "./geografia";

export const QUESTION_BANK: Question[] = [...INVERSIONES, ...MUNDIAL, ...CURIOSOS, ...GEOGRAFIA];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test data/questions/bank.test.ts`
Expected: PASS — every seeded question self-grades correct; all four categories present.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all tests green; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add data/questions
git commit -m "Trivia P1.T6: seed question bank (~80) + invariant tests"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):**
- §3 Question engine (types + 6 auto-gradable graders + normalize) → Tasks 2, 3. ✓
- §7 Scoring (difficulty base + speed bonus) → Task 4. ✓
- §5 Set assembly (difficulty quotas 30/30/40 + category ordering) → Task 5. ✓
- §4 Seed bank (~20/theme, explanations, Mundial 2026 flag) → Task 6. ✓
- §10 Preservation (branch/tag invest-v1) + prune → Task 1. ✓
- §11 Testing (pure graders, assembly, scoring, bank invariants) → Tasks 2–6. ✓

**Deferred to Plan 2 (out of scope here):** Supabase schema + RLS + anon auth (§8.1–8.2),
admin config UI + passcode + service-role Route Handlers (§2, §5, §8.2), realtime
host-paced loop (§6), player UI responsive (§2), live ranking + detail + podium (§7),
projector `/screen` (§2), env vars (§8.3), deploy. These are all named for Plan 2.

**Placeholder scan:** No "TODO/handle edge cases" in code steps. Task 6 is a content task
with concrete per-type examples + an invariant test that validates whatever is authored —
the format is fully specified, not a placeholder.

**Type consistency:** `Question`/`Answer`/`GradeResult` defined in Task 2 and used
verbatim in Tasks 3, 5, 6. `grade` signature `(Question, Answer) => GradeResult` consistent
Task 3 ↔ Task 6. `Difficulty` union consistent across Tasks 2, 4, 5. `ContestConfig`
shape defined in Task 5 matches spec §5.
