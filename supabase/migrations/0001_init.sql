-- Trivia en vivo — esquema inicial (Plan 2, Task 1)
-- Correr en Supabase → SQL Editor.

-- Sesiones (salas)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',           -- lobby|running|ended
  phase text not null default 'lobby',             -- lobby|question|reveal|ended
  config jsonb not null default '{}',              -- {numQuestions, categories[], difficultyDist, timerSeconds}
  current_index int not null default -1,           -- índice en session_questions (-1 = sin lanzar)
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Jugadores (ligados a auth.uid() anónimo)
create table players (
  id uuid primary key,                             -- = auth.uid()
  session_id uuid not null references sessions(id) on delete cascade,
  username text not null,
  joined_at timestamptz not null default now()
);

-- Set de preguntas elegido para la sala (ordenado)
create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id text not null,                       -- id del QUESTION_BANK
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
  ms int not null,                                 -- tiempo de respuesta en ms
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

-- Realtime (postgres_changes) en sessions y answers
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table answers;

-- RLS
alter table sessions enable row level security;
alter table players enable row level security;
alter table session_questions enable row level security;
alter table answers enable row level security;

-- Lectura pública de estado de sala y set (el set solo tiene question_id;
-- el contenido sensible/correcto vive en el banco del servidor).
create policy sessions_read on sessions for select using (true);
create policy sq_read on session_questions for select using (true);

-- players: cada quien crea/lee su propia fila
create policy players_self_insert on players for insert with check (id = auth.uid());
create policy players_read on players for select using (true);

-- answers: cada jugador inserta/lee solo las suyas (la calificación la hace el
-- servidor con service-role, que ignora RLS; esta política es defensa en profundidad).
create policy answers_self_insert on answers for insert with check (player_id = auth.uid());
create policy answers_self_read on answers for select using (player_id = auth.uid());
