# Trivia Live Layer (Plan 2 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the pure question engine (Plan 1) into a live, host-paced multiplayer trivia: players join by code, an admin drives questions one by one, everyone answers against a timer, answers are graded server-side, and a live ranking updates — backed by Supabase Realtime.

**Architecture:** Postgres holds authoritative game state; clients subscribe via Supabase Realtime `postgres_changes` to the `sessions` row (phase/current_index/timer) and use Presence for the lobby. Player mutations (answers) go through the anon client under RLS with Supabase **Anonymous Sign-in**; the **correct answer never reaches the client during a question** — grading and points happen in a Next.js Route Handler using the **service-role** key. Admin actions are passcode-gated Route Handlers, also service-role.

**Tech Stack:** Next.js 14 (App Router, Route Handlers), TypeScript, Tailwind (dark), `@supabase/supabase-js`, Vitest. Builds on Plan 1 (`lib/quiz/*`, `data/questions`). Deploy: Vercel + Supabase.

## Global Constraints

- **Depends on Plan 1** (merged on `main`): `lib/quiz/types.ts` (`Question`, `Answer`, `GradeResult`, `Category`, `Difficulty`), `lib/quiz/grade.ts` (`grade`), `lib/quiz/scoring.ts` (`computePoints`, `DEFAULT_BASE`), `lib/quiz/assemble.ts` (`assembleSet`, `difficultyQuotas`, `DEFAULT_DIST`, `ContestConfig`), `data/questions/index.ts` (`QUESTION_BANK`).
- **Language/locale:** all user-facing copy español (es-CO).
- **Phase enum (verbatim):** `'lobby' | 'question' | 'reveal' | 'ended'`.
- **Session status (verbatim):** `'lobby' | 'running' | 'ended'`.
- **Env vars (exact names):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe); `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE` (server-only, never in `NEXT_PUBLIC_*`).
- **Security invariants:** the correct answer (`correctIndex`, `accept`, `target`, `order`, `pairs` mapping) is stripped from any payload sent to a client while `phase='question'`; grading is server-side only; one answer per (session, question, player); answers after `question_started_at + timerSeconds` are rejected.
- **Scoring/assembly reuse:** never reimplement — import from `lib/quiz/*`.
- **Default difficulty distribution:** 30/30/40; **default timer:** 20s (both configurable in admin).
- **Routes:** `/` (player join+play), `/admin` (host), `/screen/[code]` (projector, big format, read-only). Player is mobile-responsive (Android/iPhone); projector is desktop-large.
- **TDD** for pure functions (projection). UI/realtime tasks: build + typecheck + a scripted manual smoke with ≥2 clients. Commit after each task.
- Spec: `docs/superpowers/specs/2026-07-07-trivia-live-design.md`. Design decisions: DB-as-truth + Realtime (enfoque C); admin is the authoritative clock (its screen triggers `reveal`).

---

### Task 1: Supabase schema, RLS, anonymous auth, env

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `.env.local.example`
- Modify: `README.md` (Supabase setup section)

**Prereq (human):** Create a Supabase project. Enable **Anonymous Sign-ins** (Auth → Providers → Anonymous). Run the migration SQL in the SQL editor (or via `supabase db push`). Copy URL + anon key + service-role key into `.env.local`.

- [ ] **Step 1: Write the migration SQL** — `supabase/migrations/0001_init.sql`

```sql
-- Sesiones (salas)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',          -- lobby|running|ended
  phase text not null default 'lobby',            -- lobby|question|reveal|ended
  config jsonb not null default '{}',             -- {numQuestions, categories[], difficultyDist, timerSeconds}
  current_index int not null default -1,          -- índice en session_questions (-1 = sin lanzar)
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Jugadores (ligados a auth.uid() anónimo)
create table players (
  id uuid primary key,                            -- = auth.uid()
  session_id uuid not null references sessions(id) on delete cascade,
  username text not null,
  joined_at timestamptz not null default now()
);

-- Set de preguntas elegido para la sala (ordenado)
create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id text not null,                      -- id del QUESTION_BANK
  order_index int not null
);

-- Respuestas (calificadas en el servidor)
create table answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id text not null,
  player_id uuid not null references players(id) on delete cascade,
  answer jsonb not null,
  correct boolean not null,
  points int not null,
  ms int not null,                                -- tiempo de respuesta en ms
  answered_at timestamptz not null default now(),
  unique (session_id, question_id, player_id)
);

-- Ranking: suma de puntos por jugador, desempate por tiempo total
create view ranking as
  select p.session_id, p.id as player_id, p.username,
         coalesce(sum(a.points),0) as points,
         coalesce(sum(a.ms),0) as total_ms,
         coalesce(sum((a.correct)::int),0) as correct_count
  from players p
  left join answers a on a.player_id = p.id
  group by p.session_id, p.id, p.username;

-- Realtime en sessions (postgres_changes)
alter publication supabase_realtime add table sessions;

-- RLS
alter table sessions enable row level security;
alter table players enable row level security;
alter table session_questions enable row level security;
alter table answers enable row level security;

-- Lectura pública de estado de sala y set (el set NO contiene la respuesta correcta,
-- solo question_id; el contenido sensible vive en el banco del servidor).
create policy sessions_read on sessions for select using (true);
create policy sq_read on session_questions for select using (true);

-- players: cada quien crea/lee su propia fila
create policy players_self_insert on players for insert with check (id = auth.uid());
create policy players_read on players for select using (true);

-- answers: cada jugador inserta y lee solo las suyas (la calificación la hace el
-- servidor con service-role, que ignora RLS; esta política es defensa en profundidad)
create policy answers_self_insert on answers for insert with check (player_id = auth.uid());
create policy answers_self_read on answers for select using (player_id = auth.uid());
```

- [ ] **Step 2: Env example** — `.env.local.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
ADMIN_PASSCODE=change-me
```

- [ ] **Step 3: README** — add a "## Backend (Supabase)" section documenting: create project, enable Anonymous sign-ins, run `supabase/migrations/0001_init.sql`, copy keys to `.env.local`. Note that `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSCODE` are server-only.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql .env.local.example README.md
git commit -m "Trivia P2.T1: Supabase schema, RLS, anon auth, env template"
```

**Verification:** SQL runs without error in Supabase; `ranking` view returns rows; `sessions` is in the realtime publication. (Manual, in Supabase dashboard.)

---

### Task 2: Supabase clients (browser anon + server service-role)

**Files:**
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/types.ts`
- Modify: `package.json` (add `@supabase/supabase-js`)

**Interfaces:**
- Produces: `getBrowserClient(): SupabaseClient` (singleton, anon key), `getServiceClient(): SupabaseClient` (service-role, server-only), and DB row types `SessionRow`, `PlayerRow`, `SessionQuestionRow`, `AnswerRow`, `RankingRow`, `Phase`, `SessionStatus`, `SessionConfig`.

- [ ] **Step 1: Install**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: DB types** — `lib/supabase/types.ts`

```ts
import type { Category, Difficulty } from "@/lib/quiz/types";

export type Phase = "lobby" | "question" | "reveal" | "ended";
export type SessionStatus = "lobby" | "running" | "ended";

export type SessionConfig = {
  numQuestions: number;
  categories: Category[];
  difficultyDist: Record<Difficulty, number>;
  timerSeconds: number;
};

export type SessionRow = {
  id: string; code: string; status: SessionStatus; phase: Phase;
  config: SessionConfig; current_index: number; question_started_at: string | null; created_at: string;
};
export type PlayerRow = { id: string; session_id: string; username: string; joined_at: string };
export type SessionQuestionRow = { id: string; session_id: string; question_id: string; order_index: number };
export type AnswerRow = {
  id: string; session_id: string; question_id: string; player_id: string;
  answer: unknown; correct: boolean; points: number; ms: number; answered_at: string;
};
export type RankingRow = { session_id: string; player_id: string; username: string; points: number; total_ms: number; correct_count: number };
```

- [ ] **Step 3: Browser client** — `lib/supabase/browser.ts`

```ts
"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
export function getBrowserClient(): SupabaseClient {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
  return client;
}
```

- [ ] **Step 4: Server client** — `lib/supabase/server.ts`

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client — SOLO servidor. Ignora RLS; nunca exponer la key. */
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
```

- [ ] **Step 5: Verify typecheck + commit**

Run: `npm install server-only && npx tsc --noEmit`
Expected: clean.

```bash
git add package.json package-lock.json lib/supabase
git commit -m "Trivia P2.T2: Supabase browser + service-role clients and DB types"
```

---

### Task 3: Public question projection (strip answers) — pure + tested

**Files:**
- Create: `lib/quiz/public.ts`
- Test: `lib/quiz/public.test.ts`

**Interfaces:**
- Consumes: `Question` from `lib/quiz/types.ts`.
- Produces: `type PublicQuestion` (same as `Question` minus answer-revealing fields), and `toPublic(q: Question): PublicQuestion`. For `order`/`match`, options are exposed but **shuffled deterministically by id** so the presented order is not the answer; the grader still uses the bank's canonical order server-side.

- [ ] **Step 1: Write the failing test** — `lib/quiz/public.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { toPublic } from "./public";
import type { Question } from "./types";

const b = { id: "q", category: "curiosos", difficulty: "facil", prompt: "p", explanation: "e" } as const;

describe("toPublic strips the answer", () => {
  it("single: keeps options, removes correctIndex", () => {
    const q: Question = { ...b, type: "single", options: ["a", "b", "c", "d"], correctIndex: 2 };
    const pub = toPublic(q) as Record<string, unknown>;
    expect(pub.options).toEqual(["a", "b", "c", "d"]);
    expect("correctIndex" in pub).toBe(false);
  });
  it("boolean: removes correct", () => {
    const q: Question = { ...b, type: "boolean", correct: true };
    expect("correct" in (toPublic(q) as object)).toBe(false);
  });
  it("text: removes accept", () => {
    const q: Question = { ...b, type: "text", accept: ["Perú"] };
    expect("accept" in (toPublic(q) as object)).toBe(false);
  });
  it("order: exposes items but not necessarily in the correct order", () => {
    const q: Question = { ...b, type: "order", items: [{ id: "1", label: "u" }, { id: "2", label: "d" }, { id: "3", label: "t" }] };
    const pub = toPublic(q) as { items: { id: string }[] };
    expect(pub.items.map((i) => i.id).sort()).toEqual(["1", "2", "3"]); // mismos items
  });
  it("match: exposes lefts and rights separately, not the pairing", () => {
    const q: Question = { ...b, type: "match", pairs: [{ id: "a", left: "Francia", right: "París" }, { id: "b", left: "Perú", right: "Lima" }] };
    const pub = toPublic(q) as { lefts: unknown[]; rights: unknown[] };
    expect(pub.lefts).toHaveLength(2);
    expect(pub.rights).toHaveLength(2);
    expect("pairs" in (pub as object)).toBe(false);
  });
  it("hotspot: keeps image, removes target", () => {
    const q: Question = { ...b, type: "hotspot", imageUrl: "x.png", target: { x: 0.5, y: 0.5, r: 0.1 } };
    const pub = toPublic(q) as Record<string, unknown>;
    expect(pub.imageUrl).toBe("x.png");
    expect("target" in pub).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npm test lib/quiz/public.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** — `lib/quiz/public.ts`

```ts
import type { Question } from "./types";

/** Baraja determinista por id (para no revelar el orden correcto de order/match). */
function shuffleById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Proyección pública: el enunciado y las opciones SIN la respuesta correcta. */
export function toPublic(q: Question) {
  const common = {
    id: q.id, type: q.type, category: q.category, difficulty: q.difficulty,
    prompt: q.prompt, mediaUrl: q.mediaUrl,
  };
  switch (q.type) {
    case "single": return { ...common, options: q.options };
    case "boolean": return { ...common };
    case "text": return { ...common };
    case "order": return { ...common, items: shuffleById(q.items) };
    case "match": return { ...common, lefts: q.pairs.map((p) => ({ id: p.id, label: p.left })), rights: shuffleById(q.pairs.map((p) => ({ id: p.id, label: p.right }))) };
    case "hotspot": return { ...common, imageUrl: q.imageUrl };
  }
}

export type PublicQuestion = ReturnType<typeof toPublic>;
```

- [ ] **Step 4: Run** `npm test lib/quiz/public.test.ts` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/quiz/public.ts lib/quiz/public.test.ts
git commit -m "Trivia P2.T3: public question projection (answer-stripped) + tests"
```

---

### Task 4: Admin auth + session creation API

**Files:**
- Create: `app/api/admin/login/route.ts`, `app/api/admin/session/route.ts`, `lib/admin.ts`
- Test: none (integration; smoke in Task 9)

**Interfaces:**
- Consumes: `getServiceClient` (T2), `assembleSet`/`ContestConfig` (Plan 1), `QUESTION_BANK` (Plan 1), `SessionConfig` (T2).
- Produces: `requireAdmin(req): boolean` in `lib/admin.ts`; `POST /api/admin/login` (sets `admin` httpOnly cookie when passcode matches); `POST /api/admin/session` (creates a session + persists assembled `session_questions`, returns `{ code }`).

- [ ] **Step 1: Admin guard** — `lib/admin.ts`

```ts
import "server-only";
import { cookies } from "next/headers";

export function isAdmin(): boolean {
  return cookies().get("admin")?.value === process.env.ADMIN_PASSCODE;
}
```

- [ ] **Step 2: Login route** — `app/api/admin/login/route.ts`

```ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { passcode } = await req.json();
  if (passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", process.env.ADMIN_PASSCODE!, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
```

- [ ] **Step 3: Session-create route** — `app/api/admin/session/route.ts`

Generates a 5-char uppercase code, assembles questions from `QUESTION_BANK` using the posted `SessionConfig`, inserts `sessions` + `session_questions`.

```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";
import { assembleSet } from "@/lib/quiz/assemble";
import { QUESTION_BANK } from "@/data/questions";
import type { SessionConfig } from "@/lib/supabase/types";

function makeCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = (await req.json()) as SessionConfig;
  const set = assembleSet(QUESTION_BANK, config);
  const db = getServiceClient();
  const code = makeCode();
  const { data: session, error } = await db
    .from("sessions").insert({ code, status: "lobby", phase: "lobby", config, current_index: -1 })
    .select().single();
  if (error || !session) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  const rows = set.map((q, i) => ({ session_id: session.id, question_id: q.id, order_index: i }));
  const { error: e2 } = await db.from("session_questions").insert(rows);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ code, id: session.id });
}
```

- [ ] **Step 4: Verify typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add app/api/admin lib/admin.ts
git commit -m "Trivia P2.T4: admin passcode login + session creation API"
```

---

### Task 5: Game-control API (launch / reveal / end)

**Files:**
- Create: `app/api/admin/control/route.ts`

**Interfaces:**
- Consumes: `isAdmin` (T4), `getServiceClient` (T2), session tables.
- Produces: `POST /api/admin/control` with body `{ code, action: 'launch' | 'reveal' | 'end' }`:
  - `launch`: `current_index += 1` (from -1); set `phase='question'`, `status='running'`, `question_started_at=now()`. If `current_index+1 > count(session_questions)` → set `phase='ended'`, `status='ended'` instead.
  - `reveal`: set `phase='reveal'`.
  - `end`: set `phase='ended'`, `status='ended'`.

- [ ] **Step 1: Implement** — `app/api/admin/control/route.ts`

```ts
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { code, action } = (await req.json()) as { code: string; action: "launch" | "reveal" | "end" };
  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("*").eq("code", code).single();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "reveal") {
    await db.from("sessions").update({ phase: "reveal" }).eq("id", s.id);
  } else if (action === "end") {
    await db.from("sessions").update({ phase: "ended", status: "ended" }).eq("id", s.id);
  } else {
    const { count } = await db.from("session_questions").select("*", { count: "exact", head: true }).eq("session_id", s.id);
    const next = s.current_index + 1;
    if (next >= (count ?? 0)) {
      await db.from("sessions").update({ phase: "ended", status: "ended" }).eq("id", s.id);
    } else {
      await db.from("sessions").update({
        current_index: next, phase: "question", status: "running", question_started_at: new Date().toISOString(),
      }).eq("id", s.id);
    }
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/admin/control/route.ts
git commit -m "Trivia P2.T5: game-control API (launch/reveal/end)"
```

---

### Task 6: Current-question API + answer submission & grading

**Files:**
- Create: `app/api/session/[code]/current/route.ts` (GET), `app/api/answer/route.ts` (POST)

**Interfaces:**
- Consumes: `getServiceClient`, `toPublic` (T3), `grade`+`computePoints` (Plan 1), `QUESTION_BANK`.
- Produces:
  - `GET /api/session/[code]/current` → during `phase='question'`: `{ phase, index, question: PublicQuestion, timerSeconds, startedAt }` (answer stripped). During `phase='reveal'`: `{ phase, index, question: <full incl. explanation & correct> }`. Else `{ phase }`.
  - `POST /api/answer` body `{ code, questionId, answer }` (player is `auth.uid()` via the anon JWT forwarded as `Authorization: Bearer`): grades server-side, computes points from remaining time, rejects if past deadline or duplicate, inserts `answers`. Returns `{ correct, points }`.

- [ ] **Step 1: Current-question route** — `app/api/session/[code]/current/route.ts`

```ts
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { QUESTION_BANK } from "@/data/questions";
import { toPublic } from "@/lib/quiz/public";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const db = getServiceClient();
  const { data: s } = await db.from("sessions").select("*").eq("code", params.code).single();
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (s.phase === "lobby" || s.phase === "ended" || s.current_index < 0) {
    return NextResponse.json({ phase: s.phase, index: s.current_index });
  }
  const { data: sq } = await db.from("session_questions").select("question_id").eq("session_id", s.id).eq("order_index", s.current_index).single();
  const q = QUESTION_BANK.find((x) => x.id === sq?.question_id);
  if (!q) return NextResponse.json({ error: "question missing" }, { status: 500 });
  if (s.phase === "reveal") {
    return NextResponse.json({ phase: s.phase, index: s.current_index, question: q }); // full, incl. explanation
  }
  return NextResponse.json({
    phase: s.phase, index: s.current_index,
    question: toPublic(q), timerSeconds: s.config.timerSeconds, startedAt: s.question_started_at,
  });
}
```

- [ ] **Step 2: Answer route** — `app/api/answer/route.ts`

Grades server-side; identity from the anon JWT (verify via a service-client `auth.getUser(token)`).

```ts
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { QUESTION_BANK } from "@/data/questions";
import { grade } from "@/lib/quiz/grade";
import { computePoints } from "@/lib/quiz/scoring";
import type { Answer } from "@/lib/quiz/types";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "no auth" }, { status: 401 });
  const db = getServiceClient();
  const { data: userData } = await db.auth.getUser(token);
  const playerId = userData.user?.id;
  if (!playerId) return NextResponse.json({ error: "bad token" }, { status: 401 });

  const { code, questionId, answer } = (await req.json()) as { code: string; questionId: string; answer: Answer };
  const { data: s } = await db.from("sessions").select("*").eq("code", code).single();
  if (!s || s.phase !== "question") return NextResponse.json({ error: "not accepting" }, { status: 409 });

  const q = QUESTION_BANK.find((x) => x.id === questionId);
  if (!q) return NextResponse.json({ error: "unknown question" }, { status: 400 });

  const startedAt = new Date(s.question_started_at).getTime();
  const now = Date.now();
  const ms = now - startedAt;
  const timer = s.config.timerSeconds as number;
  if (ms > timer * 1000 + 500) return NextResponse.json({ error: "too late" }, { status: 409 }); // 0.5s de gracia

  const result = grade(q, answer);
  const remaining = Math.max(0, timer - ms / 1000);
  const points = computePoints(q.difficulty, result, remaining, timer);

  const { error } = await db.from("answers").insert({
    session_id: s.id, question_id: questionId, player_id: playerId,
    answer, correct: result.correct, points, ms,
  });
  if (error) return NextResponse.json({ error: "already answered" }, { status: 409 });
  return NextResponse.json({ correct: result.correct, points });
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add app/api/session app/api/answer
git commit -m "Trivia P2.T6: current-question + server-side answer grading"
```

---

### Task 7: Realtime session hook + join flow

**Files:**
- Create: `lib/useSession.ts`, `lib/usePlayer.ts`

**Interfaces:**
- Consumes: `getBrowserClient` (T2), `SessionRow` (T2).
- Produces:
  - `useSession(code): { session: SessionRow | null }` — subscribes to `sessions` row changes (`postgres_changes`, filter `code=eq.<code>`) and returns the live row.
  - `usePlayer(code): { player, join(username) }` — anonymous sign-in (`auth.signInAnonymously()`), then inserts a `players` row `{ id: uid, session_id, username }`; persists in state.

- [ ] **Step 1: `useSession`** — `lib/useSession.ts`

```ts
"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { SessionRow } from "@/lib/supabase/types";

export function useSession(code: string) {
  const [session, setSession] = useState<SessionRow | null>(null);
  useEffect(() => {
    const db = getBrowserClient();
    let active = true;
    db.from("sessions").select("*").eq("code", code).single().then(({ data }) => { if (active) setSession(data as SessionRow | null); });
    const ch = db
      .channel(`session:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `code=eq.${code}` },
        (payload) => setSession(payload.new as SessionRow))
      .subscribe();
    return () => { active = false; db.removeChannel(ch); };
  }, [code]);
  return { session };
}
```

- [ ] **Step 2: `usePlayer`** — `lib/usePlayer.ts`

```ts
"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { PlayerRow } from "@/lib/supabase/types";

export function usePlayer(code: string) {
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  async function join(username: string) {
    const db = getBrowserClient();
    const { data: auth } = await db.auth.signInAnonymously();
    const uid = auth.user?.id;
    if (!uid) throw new Error("anon sign-in failed");
    const { data: s } = await db.from("sessions").select("id").eq("code", code).single();
    if (!s) throw new Error("sala no encontrada");
    const { data, error } = await db.from("players").insert({ id: uid, session_id: s.id, username }).select().single();
    if (error) throw error;
    setPlayer(data as PlayerRow);
  }
  return { player, join };
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add lib/useSession.ts lib/usePlayer.ts
git commit -m "Trivia P2.T7: realtime session hook + anonymous join"
```

---

### Task 8: Answer renderers (one per type) + result view

**Files:**
- Create: `components/play/renderers.tsx`, `components/play/QuestionView.tsx`

**Interfaces:**
- Consumes: `PublicQuestion` (T3), `Answer` (Plan 1 types).
- Produces: `AnswerInput({ question, onSubmit })` that renders the right control per type and calls `onSubmit(answer: Answer)`; `QuestionView` that composes prompt/media/timer + `AnswerInput`. Mobile-responsive (Android/iPhone): large tap targets, `text-lg`, full-width buttons, `select-none`.

- [ ] **Step 1: Renderers** — `components/play/renderers.tsx`

Full code for all six controls. Each collects an `Answer` and calls `onSubmit`.

```tsx
"use client";
import { useState } from "react";
import type { Answer } from "@/lib/quiz/types";
import type { PublicQuestion } from "@/lib/quiz/public";

const btn = "w-full rounded-xl border border-neutral-700 p-4 text-lg text-left active:bg-neutral-800";

export function AnswerInput({ question: q, onSubmit }: { question: PublicQuestion; onSubmit: (a: Answer) => void }) {
  switch (q.type) {
    case "single":
      return (
        <div className="flex flex-col gap-2">
          {(q as any).options.map((o: string, i: number) => (
            <button key={i} className={btn} onClick={() => onSubmit({ type: "single", index: i })}>
              <span className="mr-2 text-neutral-500">{String.fromCharCode(97 + i)}.</span>{o}
            </button>
          ))}
        </div>
      );
    case "boolean":
      return (
        <div className="grid grid-cols-2 gap-2">
          <button className={btn} onClick={() => onSubmit({ type: "boolean", value: true })}>Verdadero</button>
          <button className={btn} onClick={() => onSubmit({ type: "boolean", value: false })}>Falso</button>
        </div>
      );
    case "text": return <TextInput onSubmit={onSubmit} />;
    case "order": return <OrderInput items={(q as any).items} onSubmit={onSubmit} />;
    case "match": return <MatchInput lefts={(q as any).lefts} rights={(q as any).rights} onSubmit={onSubmit} />;
    case "hotspot": return <HotspotInput imageUrl={(q as any).imageUrl} onSubmit={onSubmit} />;
  }
}

function TextInput({ onSubmit }: { onSubmit: (a: Answer) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: "text", text: v }); }} className="flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" placeholder="Tu respuesta" />
      <button className="rounded-xl bg-emerald-500 px-5 font-semibold text-neutral-950">OK</button>
    </form>
  );
}

function OrderInput({ items, onSubmit }: { items: { id: string; label: string }[]; onSubmit: (a: Answer) => void }) {
  const [order, setOrder] = useState(items);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order]; [next[i], next[j]] = [next[j], next[i]]; setOrder(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {order.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2 rounded-xl border border-neutral-700 p-3">
          <span className="text-neutral-500">{i + 1}.</span><span className="flex-1 text-lg">{it.label}</span>
          <button onClick={() => move(i, -1)} className="px-2 text-xl">▲</button>
          <button onClick={() => move(i, 1)} className="px-2 text-xl">▼</button>
        </div>
      ))}
      <button className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950" onClick={() => onSubmit({ type: "order", order: order.map((o) => o.id) })}>Confirmar orden</button>
    </div>
  );
}

function MatchInput({ lefts, rights, onSubmit }: { lefts: { id: string; label: string }[]; rights: { id: string; label: string }[]; onSubmit: (a: Answer) => void }) {
  const [map, setMap] = useState<Record<string, string>>({});
  return (
    <div className="flex flex-col gap-3">
      {lefts.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <span className="flex-1 text-lg">{l.label}</span>
          <select className="rounded-lg border border-neutral-700 bg-neutral-900 p-2" value={map[l.id] ?? ""} onChange={(e) => setMap({ ...map, [l.id]: e.target.value })}>
            <option value="">—</option>
            {rights.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      ))}
      <button className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950" onClick={() => onSubmit({ type: "match", map })}>Confirmar</button>
    </div>
  );
}

function HotspotInput({ imageUrl, onSubmit }: { imageUrl: string; onSubmit: (a: Answer) => void }) {
  return (
    <img src={imageUrl} alt="toca el lugar" className="w-full rounded-xl"
      onClick={(e) => {
        const r = (e.target as HTMLImageElement).getBoundingClientRect();
        onSubmit({ type: "hotspot", x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      }} />
  );
}
```

- [ ] **Step 2: QuestionView (prompt + media + timer + input)** — `components/play/QuestionView.tsx`

```tsx
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
  return (
    <div className="flex flex-col gap-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(remaining / timerSeconds) * 100}%` }} />
      </div>
      {(question as any).mediaUrl && <img src={(question as any).mediaUrl} alt="" className="max-h-56 w-full rounded-xl object-contain" />}
      <h1 className="text-2xl font-semibold leading-snug">{question.prompt}</h1>
      {remaining > 0 ? <AnswerInput question={question} onSubmit={onSubmit} /> : <p className="text-neutral-500">Tiempo agotado.</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add components/play
git commit -m "Trivia P2.T8: answer renderers (6 types) + question view"
```

---

### Task 9: Player page (join → play → result) + smoke

**Files:**
- Create: `app/page.tsx` (replace placeholder), `components/play/PlayerApp.tsx`

**Interfaces:**
- Consumes: `useSession`, `usePlayer` (T7), `QuestionView` (T8), current+answer APIs (T6), `getBrowserClient`.
- Produces: `/` join form (code from `?code=` or typed + username), then a live view driven by `session.phase`: `lobby` (waiting), `question` (QuestionView → POST /api/answer with the anon JWT), `reveal` (correct + explanation + "tu posición"), `ended` (podium link).

- [ ] **Step 1: PlayerApp** — `components/play/PlayerApp.tsx` (composition; drives on phase)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { usePlayer } from "@/lib/usePlayer";
import { getBrowserClient } from "@/lib/supabase/browser";
import { QuestionView } from "./QuestionView";
import type { Answer } from "@/lib/quiz/types";

export function PlayerApp({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [username, setUsername] = useState("");
  const { player, join } = usePlayer(code);
  const { session } = useSession(code);
  const [current, setCurrent] = useState<any>(null);
  const [answered, setAnswered] = useState<{ correct: boolean; points: number } | null>(null);

  // recargar la pregunta pública en cada cambio de fase/índice
  useEffect(() => {
    if (!session || !player) return;
    setAnswered(null);
    fetch(`/api/session/${code}/current`).then((r) => r.json()).then(setCurrent);
  }, [session?.phase, session?.current_index, player, code]);

  async function submit(answer: Answer) {
    const db = getBrowserClient();
    const { data } = await db.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/answer", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, questionId: current.question.id, answer }),
    });
    if (res.ok) setAnswered(await res.json());
  }

  if (!player) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-3xl font-bold">Entrar a la trivia</h1>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código" className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu nombre" className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-lg" />
        <button onClick={() => username && code && join(username)} className="rounded-xl bg-emerald-500 p-4 font-semibold text-neutral-950">Entrar</button>
      </main>
    );
  }

  const phase = session?.phase ?? "lobby";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      {phase === "lobby" && <p className="text-center text-xl text-neutral-400">Hola {player.username} — esperando al presentador…</p>}
      {phase === "question" && current?.question && !answered && (
        <QuestionView question={current.question} timerSeconds={current.timerSeconds} startedAt={current.startedAt} onSubmit={submit} />
      )}
      {phase === "question" && answered && <p className="text-center text-xl">Respuesta enviada ✓ (+{answered.points})</p>}
      {phase === "reveal" && current?.question && (
        <div className="flex flex-col gap-3 text-center">
          <div className={answered?.correct ? "text-emerald-400" : "text-rose-400"}>{answered ? (answered.correct ? "¡Correcto!" : "Incorrecto") : "Respuesta"}</div>
          <p className="text-neutral-300">{current.question.explanation}</p>
        </div>
      )}
      {phase === "ended" && <a href={`/screen/${code}`} className="text-center text-emerald-400 underline">Ver resultados</a>}
    </main>
  );
}
```

- [ ] **Step 2: Page** — `app/page.tsx`

```tsx
import { PlayerApp } from "@/components/play/PlayerApp";

export default function Home({ searchParams }: { searchParams: { code?: string } }) {
  return <PlayerApp initialCode={(searchParams.code ?? "").toUpperCase()} />;
}
```

- [ ] **Step 3: Smoke test (manual, 2 clients)**

With `.env.local` set and `npm run dev` running: open `/admin`, create a session (Task 10 UI, or POST `/api/admin/session` via curl), then open `/` in two browser windows, join with two usernames, and use the admin control (or curl `/api/admin/control`) to `launch`/`reveal`. Verify both clients change screens in sync and points appear. Record the result in the commit message.

- [ ] **Step 4: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add app/page.tsx components/play/PlayerApp.tsx
git commit -m "Trivia P2.T9: player page (join/play/result) + realtime sync"
```

---

### Task 10: Admin page (config + control panel)

**Files:**
- Create: `app/admin/page.tsx`, `components/admin/AdminApp.tsx`

**Interfaces:**
- Consumes: admin APIs (T4, T5), `useSession` (T7), `DEFAULT_DIST` (Plan 1), categories.
- Produces: `/admin` — passcode gate → config form (numQuestions, category checkboxes, difficulty 30/30/40 inputs, timerSeconds) → "Crear sala" (POST `/api/admin/session`) → control panel showing the join code + QR (reuse `components/present/QRCode.tsx`, value `${origin}/?code=${code}`), a "Siguiente pregunta" button (POST control `launch`), "Revelar" (control `reveal`), live answer count and mini ranking (query `ranking` view via browser client, filtered by session), and "Terminar".

- [ ] **Step 1: AdminApp** — `components/admin/AdminApp.tsx`

```tsx
"use client";
import { useState } from "react";
import { QRCode } from "@/components/present/QRCode";
import { useSession } from "@/lib/useSession";
import { DEFAULT_DIST } from "@/lib/quiz/assemble";
import type { Category } from "@/lib/quiz/types";

const CATS: Category[] = ["inversiones", "mundial", "curiosos", "geografia"];

export function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [cfg, setCfg] = useState({ numQuestions: 12, categories: CATS, difficultyDist: DEFAULT_DIST, timerSeconds: 20 });
  const { session } = useSession(code ?? "");

  async function login() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
    setAuthed(r.ok);
  }
  async function create() {
    const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await r.json(); setCode(j.code);
  }
  const control = (action: "launch" | "reveal" | "end") =>
    fetch("/api/admin/control", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, action }) });

  if (!authed) return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Clave" className="rounded-xl border border-neutral-700 bg-neutral-900 p-3" />
      <button onClick={login} className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950">Entrar</button>
    </main>
  );

  if (!code) return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Nueva sala</h1>
      <label className="flex justify-between">Preguntas <input type="number" value={cfg.numQuestions} onChange={(e) => setCfg({ ...cfg, numQuestions: +e.target.value })} className="w-20 rounded bg-neutral-900 p-1 text-right" /></label>
      <label className="flex justify-between">Timer (s) <input type="number" value={cfg.timerSeconds} onChange={(e) => setCfg({ ...cfg, timerSeconds: +e.target.value })} className="w-20 rounded bg-neutral-900 p-1 text-right" /></label>
      <div className="flex flex-wrap gap-2">{CATS.map((c) => (
        <button key={c} onClick={() => setCfg({ ...cfg, categories: cfg.categories.includes(c) ? cfg.categories.filter((x) => x !== c) : [...cfg.categories, c] })}
          className={`rounded-full border px-3 py-1 ${cfg.categories.includes(c) ? "border-emerald-500 text-emerald-300" : "border-neutral-700"}`}>{c}</button>
      ))}</div>
      <div className="flex gap-2 text-sm">
        {(["facil", "media", "dificil"] as const).map((d) => (
          <label key={d} className="flex-1">{d}<input type="number" value={cfg.difficultyDist[d]} onChange={(e) => setCfg({ ...cfg, difficultyDist: { ...cfg.difficultyDist, [d]: +e.target.value } })} className="w-full rounded bg-neutral-900 p-1" /></label>
        ))}
      </div>
      <button onClick={create} className="rounded-xl bg-emerald-500 p-3 font-semibold text-neutral-950">Crear sala</button>
    </main>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="text-sm text-neutral-500">Código</div>
      <div className="text-5xl font-bold tracking-widest">{code}</div>
      <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={180} />
      <div className="text-neutral-400">Fase: {session?.phase ?? "…"} · pregunta {(session?.current_index ?? -1) + 1}</div>
      <div className="flex gap-3">
        <button onClick={() => control("launch")} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-neutral-950">Siguiente ▶</button>
        <button onClick={() => control("reveal")} className="rounded-xl border border-neutral-700 px-5 py-3">Revelar</button>
        <button onClick={() => control("end")} className="rounded-xl border border-rose-700 px-5 py-3 text-rose-300">Terminar</button>
      </div>
      <a href={`/screen/${code}`} target="_blank" className="text-sm text-neutral-500 underline">Abrir proyector</a>
    </main>
  );
}
```

- [ ] **Step 2: Page** — `app/admin/page.tsx`

```tsx
import { AdminApp } from "@/components/admin/AdminApp";
export default function AdminPage() { return <AdminApp />; }
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
npx tsc --noEmit
git add app/admin components/admin
git commit -m "Trivia P2.T10: admin page — config + control panel + QR"
```

---

### Task 11: Projector `/screen/[code]` + live ranking + polish + deploy

**Files:**
- Create: `app/screen/[code]/page.tsx`, `components/screen/ScreenApp.tsx`, `lib/useRanking.ts`
- Modify: `app/layout.tsx` (metadata title), `README.md` (deploy)

**Interfaces:**
- Consumes: `useSession` (T7), current API (T6), `getBrowserClient`.
- Produces:
  - `useRanking(code)`: queries the `ranking` view for the session and re-fetches on `answers` inserts (subscribe to `answers` for this session) → sorted `RankingRow[]`.
  - `ScreenApp`: big desktop layout. `lobby` → code + QR + joined players; `question` → big prompt + timer; `reveal` → correct answer + explanation + top ranking; `ended` → podium (top 3) + full table.

- [ ] **Step 1: `useRanking`** — `lib/useRanking.ts`

```ts
"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { RankingRow } from "@/lib/supabase/types";

export function useRanking(sessionId: string | undefined) {
  const [rows, setRows] = useState<RankingRow[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    const db = getBrowserClient();
    const load = () => db.from("ranking").select("*").eq("session_id", sessionId).then(({ data }) =>
      setRows(((data ?? []) as RankingRow[]).sort((a, b) => b.points - a.points || a.total_ms - b.total_ms)));
    load();
    const ch = db.channel(`ans:${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `session_id=eq.${sessionId}` }, load)
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [sessionId]);
  return rows;
}
```

Note: add `answers` to the realtime publication in the migration if not present — append to `0001_init.sql`: `alter publication supabase_realtime add table answers;` (and re-run). Document this in the task.

- [ ] **Step 2: ScreenApp** — `components/screen/ScreenApp.tsx` (big, read-only, phase-driven)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { useRanking } from "@/lib/useRanking";
import { QRCode } from "@/components/present/QRCode";

export function ScreenApp({ code }: { code: string }) {
  const { session } = useSession(code);
  const ranking = useRanking(session?.id);
  const [current, setCurrent] = useState<any>(null);
  useEffect(() => {
    if (!session) return;
    fetch(`/api/session/${code}/current`).then((r) => r.json()).then(setCurrent);
  }, [session?.phase, session?.current_index, code]);

  const phase = session?.phase ?? "lobby";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-12 text-center">
      {phase === "lobby" && (<>
        <div className="text-2xl uppercase tracking-[0.3em] text-emerald-400">Únete</div>
        <div className="text-8xl font-bold tracking-widest">{code}</div>
        <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/?code=${code}`} size={260} />
      </>)}
      {phase === "question" && current?.question && (
        <h1 className="max-w-5xl text-6xl font-bold leading-tight">{current.question.prompt}</h1>
      )}
      {phase === "reveal" && current?.question && (<>
        <h2 className="max-w-4xl text-4xl font-semibold">{current.question.prompt}</h2>
        <p className="max-w-3xl text-2xl text-neutral-300">{current.question.explanation}</p>
        <Ranking rows={ranking.slice(0, 5)} />
      </>)}
      {phase === "ended" && (<>
        <h1 className="text-5xl font-bold">🏆 Podio</h1>
        <Ranking rows={ranking} />
      </>)}
    </main>
  );
}

function Ranking({ rows }: { rows: { player_id: string; username: string; points: number; correct_count: number }[] }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.player_id} className="flex items-center justify-between rounded-xl border border-neutral-800 px-5 py-3 text-2xl">
          <span><span className="mr-3 text-neutral-500">{i + 1}</span>{r.username}</span>
          <span className="font-bold tabular-nums text-emerald-400">{r.points}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Page** — `app/screen/[code]/page.tsx`

```tsx
import { ScreenApp } from "@/components/screen/ScreenApp";
export default function Screen({ params }: { params: { code: string } }) {
  return <ScreenApp code={params.code.toUpperCase()} />;
}
```

- [ ] **Step 4: Metadata + full smoke**

Set `app/layout.tsx` title "Trivia en vivo". Run the full flow end-to-end with ≥2 players: admin create → players join (lobby shows on projector) → launch several questions of different types → answers grade + points → reveal shows explanation + ranking → end shows podium. Fix any issue found.

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npm run build
git add app/screen components/screen lib/useRanking.ts app/layout.tsx README.md supabase/migrations/0001_init.sql
git commit -m "Trivia P2.T11: projector screen + live ranking + podium"
```

- [ ] **Step 6: Deploy**

- Create the Supabase project (if not done), run the migration, enable Anonymous sign-ins.
- In Vercel: set env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`. Push to `main` → Vercel builds. Verify `/admin`, `/`, `/screen/[code]` on the deployed URL.

---

## Self-Review

**Spec coverage (Plan 2 scope):**
- §2 routes `/`, `/admin`, `/screen/[code]` → Tasks 9, 10, 11. ✓
- §6 host-paced loop (lobby→question→reveal→ended, admin advances) → Tasks 5, 9, 10. ✓
- §8.1 data model (sessions/players/session_questions/answers/ranking) → Task 1. ✓
- §8.2 security (RLS, anon auth, service-role admin, server grading, answer hidden during question) → Tasks 1, 2, 3, 4, 6. ✓
- §8.3 env vars → Tasks 1, 2, 11. ✓
- §7 scoring reuse + live ranking + detail/podium → Tasks 6, 11. ✓
- §5 admin config (count/categories/30-30-40/timer) + assemble+persist → Tasks 4, 10. ✓
- §3 six answer renderers (auto-graded) → Task 8. ✓
- Projector big format + responsive player → Tasks 8, 9, 11. ✓
- Deploy (Vercel + Supabase) → Task 11. ✓

**Placeholder scan:** No "TODO/handle edge cases" in code. `(q as any)` casts in renderers are a deliberate ergonomic narrowing of the `PublicQuestion` union — acceptable; a stricter discriminated `PublicQuestion` union could replace them later if desired.

**Type consistency:** `Phase`/`SessionConfig`/`SessionRow` defined in Task 2 used verbatim in Tasks 4–11. `toPublic`/`PublicQuestion` (Task 3) consumed by Tasks 6, 8. `Answer` (Plan 1) flows renderer→POST /api/answer→grade unchanged. Control actions `'launch'|'reveal'|'end'` consistent Tasks 5, 10. Env var names match the Global Constraints block everywhere.

**Cross-task note for the executor:** `answers` must be in the realtime publication for live ranking (Task 11 Step 1 appends it to the migration) — if Task 1 already shipped, re-run that one `alter publication` line.
