# Trivia en vivo (host-paced) — Diseño

> Documento de diseño para el pivote de **Invierte** a una **trivia multijugador en
> vivo** tipo Kahoot. Fuente de verdad para la fase de planeación. Reusa el scaffold
> Next.js del proyecto actual; la app de inversión se preserva en un branch.
> Fecha: 2026-07-07.

---

## 1. Objetivo

Concurso de trivia **en vivo, sincronizado y controlado por un host (admin)**. Muchas
personas se conectan desde su celular con un **código o link**, escriben un usuario, y
responden preguntas que el admin va lanzando una por una. Tras cada pregunta aparece la
respuesta correcta y una **explicación concisa** (para aprender). Puntos por acierto
(dificultad + velocidad), **ranking en vivo** y detalle de aciertos/fallos por persona.

Temas iniciales: **Inversiones · Cultura general de países del Mundial 2026 · Datos
curiosos · Geografía.** Preguntas muy curiosas, mezcla de tipos tradicionales y
disruptivos, **todas auto-calificables al instante**.

Principio: las preguntas se juegan **agrupadas por categoría** para que la tanda de
respuestas y explicaciones vaya "en la misma línea" y la gente aprenda por tema.

## 2. Roles y pantallas (rutas)

| Ruta | Rol | Descripción |
|------|-----|-------------|
| `/admin` | Host | Protegida por **clave de admin**. Crea la sala, configura el concurso, arma el set, **lanza pregunta por pregunta** (siguiente → siguiente), ve respuestas y ranking en vivo. |
| `/` | Jugador | Entra con **código o link** + escribe **usuario**. Ve la pregunta actual, responde, ve su resultado + explicación + su posición. **Responsive (Android/iPhone).** |
| `/screen/[code]` | Proyector | Vista para proyectar desde el PC: pregunta **en formato grande** (no celular) + ranking en vivo. Solo lectura. |

**Mobile-first para jugador; desktop/grande para proyector.** Ambos tema oscuro.

## 3. Motor de preguntas (pieza central)

Como el motor financiero fue el corazón de v1, aquí el corazón es el **motor de
preguntas**: una **unión discriminada** de tipos donde cada tipo implementa una función
**pura** `grade(question, answer) → { correct: boolean; ratio: number }` (ratio 0..1
para crédito parcial futuro; v1 usa all-or-nothing salvo donde se indique).

`media` (imagen/frase) es **ortogonal**: cualquier tipo puede llevar `mediaUrl` en el
enunciado o en las opciones. "Pregunta con imagen" no es un tipo aparte.

Tipos (todos auto-calificables, rápido):

| Tipo | Interacción | Payload | Respuesta | Correcto si |
|------|-------------|---------|-----------|-------------|
| `single` | Selección 1 de 4 | `{ prompt, options[4], correctIndex }` | `{ index }` | `index === correctIndex` |
| `boolean` | Verdadero/Falso | `{ prompt, correct }` | `{ value }` | `value === correct` |
| `text` | Texto corto escrito | `{ prompt, accept: string[] }` | `{ text }` | `normalize(text) ∈ normalize(accept)` |
| `order` | Arrastrar a secuencia | `{ prompt, items[] (orden correcto) }` | `{ order: id[] }` | secuencia exacta (v1) |
| `match` | Emparejar pares | `{ prompt, pairs:[{left,right}] }` | `{ map }` | todos los pares correctos |
| `hotspot` | Tap sobre zona de imagen | `{ prompt, imageUrl, target:{x,y,r} norm 0..1 }` | `{ x, y }` | distancia(≤ r) al target |

`normalize(s)` = minúsculas · sin tildes · trim · espacios colapsados. `accept` incluye
sinónimos/variantes válidas.

**Cada tipo = 1 módulo** con: `grade` (puro, testeado), `Renderer` (React, responsive),
y opcionalmente `AdminEditor`. Agregar un tipo nuevo no toca los demás. El `grade` es
**código compartido que se ejecuta en el servidor** (Route Handler) para calificar con
autoridad (§8.2); el `Renderer` corre en el cliente. Se testea como función pura.

Corte v1: se implementan y siembran los 6 tipos (mezcla tradicional + disruptiva). Si
en construcción alguno se complica, se difiere sin romper el motor.

## 4. Contenido (banco de preguntas)

- **Seed ~20 por tema (≈80)** redactadas por Claude; el usuario **cura y verifica**
  (especialmente Mundial 2026 — el corte de conocimiento del modelo es enero 2026).
- Se crece a 50/tema después.
- Cada pregunta: categoría, dificultad (`facil|media|dificil`), tipo, payload,
  **explicación concisa** (texto; `mediaUrl` opcional), `mediaUrl` opcional del enunciado.

## 5. Configuración del concurso (admin)

El admin arma la sala eligiendo:
- **Número total de preguntas.**
- **Categorías** incluidas.
- **Distribución de dificultad** — default **30% fácil / 30% media / 40% difícil**
  (editable).
- **Timer por pregunta** (segundos) — configurable.
- (Opcional) parámetros de puntaje (base por dificultad, bono de velocidad).

**Armado del set:** se muestrea del banco respetando categorías + cupos de dificultad,
y se **ordena agrupado por categoría** (bloques por tema; dentro del bloque, dificultad
ascendente). El resultado se materializa en `session_questions` con `order_index`.

## 6. Loop del juego (host-paced)

Estados de la sala (`sessions.phase`): `lobby → question → reveal → … → ended`.

1. **lobby** — jugadores entran con código + usuario; se ven en vivo (presence).
2. Admin **lanza** la pregunta actual → `phase=question`, `question_started_at=now`.
   La misma pregunta aparece en todas las pantallas y en el proyector.
3. **Timer** (configurado) corre desde `question_started_at`. Los jugadores responden
   una vez; el `answer` se inserta y se **califica al instante**.
4. Al agotarse el timer (o si el admin cierra antes) → `phase=reveal`: se muestra la
   **correcta + explicación concisa** y el **ranking actualizado**.
5. Admin **lanza la siguiente** → vuelve a paso 2. Así hasta terminar.
6. **ended** — podio final + **detalle por jugador** (qué acertó/falló, puntos).

El **admin es el reloj autoritativo**: su pantalla dispara la transición a `reveal` al
llegar a 0 (o manualmente). Respuestas después del `deadline` se rechazan.

## 7. Puntaje

`base(dificultad)` (default fácil 100 · media 200 · difícil 300, editable).

`bono_velocidad = 0.5 + 0.5 × (tiempo_restante / timer)` → responder al instante ≈ 1.0×,
justo en la bocina ≈ 0.5×.

`puntos = correcto ? round(base × bono_velocidad) : 0`.

**Ranking** = suma de `points` por jugador; desempate por **tiempo total de respuesta**
ascendente. Se actualiza tras cada `reveal`. **El ranking mide conocimiento/velocidad,
nunca datos personales.**

## 8. Arquitectura técnica

**Frontend:** Next.js 14 (App Router) + TS + Tailwind + tema oscuro (reusa scaffold).
**Backend:** **Supabase** (Postgres + Realtime + Auth).
**Sincronización (enfoque C — híbrido):** el estado del juego vive en Postgres; los
clientes se suscriben con **Realtime `postgres_changes`** a la sala (transiciones de
fase / pregunta actual) y usan **Presence** para el lobby. Reconexión = releer estado.

### 8.1 Modelo de datos (Postgres)

```sql
question_bank (
  id, category, difficulty,        -- facil|media|dificil
  type,                            -- single|boolean|text|order|match|hotspot
  payload jsonb,                   -- específico del tipo (§3)
  explanation text, explanation_media_url text,
  media_url text,
  created_at
)

sessions (
  id, code,                        -- código corto para unirse
  status,                          -- lobby|running|ended
  phase,                           -- lobby|question|reveal|ended
  config jsonb,                    -- {numQuestions, categories[], difficultyDist, timerSeconds, scoring}
  current_index int,               -- puntero en session_questions
  question_started_at timestamptz,
  created_at
)

players (
  id,                              -- ligado a auth.uid() (anónimo)
  session_id, username, joined_at
)

session_questions (
  id, session_id, question_id, order_index
)

answers (
  id, session_id, question_id, player_id,
  answer jsonb, correct bool, points int, answered_at
  -- UNIQUE(session_id, question_id, player_id)
)

-- vista ranking: SUM(points) por player, desempate por SUM(tiempo respuesta)
ranking (view)
```

### 8.2 Seguridad (RLS + roles)

- **Admin:** `/admin` protegida por `ADMIN_PASSCODE`. Las mutaciones del admin (crear
  sala, armar set, cambiar fase, lanzar pregunta) van por **Route Handlers de Next.js**
  usando la **service role key** (solo servidor, nunca expuesta) → control total.
- **Jugadores:** cliente anónimo con **Supabase Anonymous Sign-in** (JWT por jugador).
  **RLS**: un jugador solo inserta/lee sus propias filas (`answers`, su `players`);
  lectura de `sessions`/`session_questions`/`ranking` de su sala. Una respuesta por
  pregunta (unique) y rechazo si `answered_at > question_started_at + timer`.
- La calificación (`correct`, `points`) se calcula en el **servidor** (Route Handler)
  al recibir la respuesta, para que el cliente no pueda inflar puntos ni ver la
  correcta antes del `reveal`. El `payload` con la respuesta correcta **no se envía al
  cliente** durante `question` (se filtra); llega en `reveal`.

### 8.3 Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # solo servidor
ADMIN_PASSCODE                 # solo servidor
```

## 9. Reuso vs nuevo

**Se reusa:** scaffold Next.js/TS/Tailwind, tema oscuro, vitest, `formatCOP`-style utils,
patrón de componentes, la idea de `data/*.ts` como banco.
**Nuevo:** motor de preguntas, integración Supabase, admin, realtime, pantallas de juego.
**No se reusa** directamente: motor financiero, gráficos chart.js, flujo participante de
inversión (quedan en el branch).

## 10. Preservación de la app de inversión

Antes de tocar código: `git branch invest-v1 main` + `git tag invest-v1` (recuperable
siempre). La trivia se construye en **`main`**. La app de inversión desplegada en Vercel
sigue viva desde su branch/deploy si se desea.

## 11. Testing

- **Graders puros** → unit tests por tipo (como el motor financiero). Casos: correcto,
  incorrecto, normalización de texto, tolerancia de hotspot, orden exacto, match parcial.
- **Armado del set** → tests: cupos de dificultad respetados, orden agrupado por
  categoría, muestreo sin repetir.
- **Puntaje** → tests: base por dificultad, bono de velocidad en extremos.
- **Realtime / loop** → prueba de integración manual (2+ clientes) + smoke.

## 12. Orden de construcción (borrador — se detalla en el plan)

1. Preservar invest en branch/tag; limpiar rutas de inversión de `main`.
2. **Motor de preguntas**: tipos + graders puros + tests. (Sin backend aún.)
3. Banco **seed** (~20/tema) en el formato del motor + tests de invariantes.
4. Supabase: esquema + RLS + cliente + Anonymous auth + env.
5. Admin: clave + crear sala + configurar (nº, categorías, 30/30/40, timer) + armar set.
6. Realtime + loop host-paced (lobby → question → reveal → ended) con service-role
   Route Handlers para mutaciones del admin y calificación servidor.
7. Pantalla jugador (responsive Android/iPhone): unirse, responder cada tipo, ver
   resultado + explicación + posición.
8. Ranking en vivo + detalle aciertos/fallos + podio final.
9. Vista proyector `/screen/[code]` (formato grande).
10. Pulir (responsive, animaciones, disclaimers educativos), deploy (Vercel + Supabase).

## 13. Fuera de alcance (v1)

- Crédito parcial en `order`/`match` (v1 all-or-nothing).
- Editor visual completo de preguntas en admin (v1: banco en código/seed + config del set).
- Modo self-paced / 1v1 (este diseño es host-paced).
- Cuentas persistentes de jugador / historial entre sesiones.

## 14. Preguntas abiertas / a verificar

- **Mundial 2026**: verificar participantes/datos (corte de conocimiento ene-2026).
- Fuente de imágenes (banderas, mapas): definir en construcción (assets locales vs URL).
- Escala esperada de jugadores concurrentes (Supabase free soporta el rango de un evento
  ~25–100 sin problema).
