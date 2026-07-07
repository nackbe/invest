# Especificaciones definitivas — "Invierte" (capacitación de inversión práctica)

> Documento único de arranque para **Claude Code**. Nombre de trabajo: **Invierte** (placeholder).
> Contiene v1 (MVP desplegable sin backend) y v2 (capa social con Supabase). Construir **v1 completa y desplegarla antes** de tocar v2.
> El corazón del proyecto es el **motor de simulación** (sección 6). Empezar por ahí.

---

## 1. Objetivo y filosofía

App web para dar una **capacitación de inversión en vivo** a un equipo (~25 personas), **práctica, motivacional y memorable**. No es un curso: el éxito es que la gente **decida empezar a invertir**, no que aprenda definiciones.

Principio rector: **cada pantalla siembra una decisión, no explica un concepto.** El presentador habla; la app demuestra. Números grandes y personalizados como protagonistas.

Idea central: **la plata quieta se derrite con la inflación. Guardar ≠ invertir. El enemigo es el tiempo que dejas pasar.**

---

## 2. Público y contexto

- Equipo corporativo en **Medellín, Colombia**. Todo en **español (es-CO)** y **pesos colombianos (COP)**.
- Sesión presencial: **pantalla proyectada** (modo presentador) + **cada persona con su celular** (modo participante). **Mobile-first obligatorio.**
- Formato de moneda: `Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 })`. **Redondear todo número en pantalla.**

---

## 3. Stack técnico

**v1:** Next.js 14 (App Router) + TypeScript + Tailwind. Sin backend, sin BD, sin auth. Estado en React + parámetros de URL. Librerías: `chart.js` (gráficos), `html-to-image` (exportar plan a PNG), `qrcode` (QR presentador). Deploy: **Vercel**.

**v2 (agrega):** Supabase (Postgres + Realtime + Auth) para la capa social. Todo lo de v1 se mantiene.

---

## 4. Rutas

| Ruta | Modo | Descripción |
|------|------|-------------|
| `/` | Participante | App en el celular: simular, comparar, comprometerse |
| `/present` | Presentador | Pantalla grande, tema oscuro, navegación con flechas, slides + módulos en vivo |
| `/quiz` | Participante | Trivia (v1: autoevaluada; v2: leaderboard en vivo) |

Los componentes del simulador deben ser **reutilizables** entre `/` y `/present`.

---

## 5. Principios de diseño

- **Tema oscuro** por defecto (crítico en presentador). **Mobile-first** (~380px).
- **Un número gigante por pantalla.** Texto mínimo (una idea por slide).
- Superficies planas, sin gradientes ni sombras pesadas. Tokens centralizados en Tailwind config.
- Una acción por pantalla en el flujo participante.

---

## 6. MOTOR DE SIMULACIÓN (núcleo — construir primero)

### 6.1 Regla de oro de las tasas

Toda tasa se guarda como **Efectiva Anual (E.A.)**. El factor mensual equivalente es:

```
i_mes = (1 + EA)^(1/12) − 1          // NUNCA usar EA/12
```

Para capitalización a plazo (CDT): `i_periodo = (1 + EA)^(plazo/12) − 1`.

### 6.2 El motor es un flujo de caja mes a mes

**No usar fórmulas cerradas de anualidad.** Se itera mes a mes sobre "baldes" (bloques de capital). Esto permite aportes irregulares, cadencias distintas, entrada por fases y comportamientos por producto.

```
para m = 1..N (N = años × 12):
  1. crecer cada balde según su producto:
       - compounding 'monthly': balde *= (1 + i_mes)
       - compounding 'maturity': balde *= (1 + i_periodo) SOLO si (m − inicioBloque) % plazo === 0
  2. aplicar aportes de cada stream activa este mes (ver 6.4)
  3. si reinvest=false: apartar el interés del periodo a "cosechado" y dejar el capital fijo (interés simple)
  4. valorar en COP: baldes USD → saldoUSD × tipoCambio(m)   (ver 6.5)
  5. registrar por año: saldo por producto, total, aportado acumulado, cosechado
si realValue: dividir las series por (1 + inflación)^años
```

Complejidad O(meses × bloques) ≈ <600 × pocos = trivial. **Recalcula en vivo en cada cambio de control.**

### 6.3 Modelo de datos

```ts
type Currency = 'COP' | 'USD';
type RateModel = 'fixed' | 'reward' | 'volatile';
// fixed = CDT/fondo (tasa conocida) · reward = staking stablecoin (variable ~6%) · volatile = acciones/índice

type Product = {
  key: string;
  label: string;
  currency: Currency;
  rateModel: RateModel;
  annualRate: number;            // E.A. (para volatile = media esperada). ILUSTRATIVO y editable.
  volatility?: number;           // solo volatile (desv. anual, ej. 0.15)
  compounding: 'monthly' | 'maturity';
  maturityMonths?: number;       // 3/6/12 (solo CDT / maturity)
  color: string;
};

type ContribStream = {
  id: string;
  label: string;                 // "Fondos mensual", "CDT semestral", "Prima jun+dic"
  productKey: string;            // a qué producto entra
  initial?: number;              // valor inicial (mes 0)
  monthly?: number;              // aporte mensual (OPCIONAL, default 0)
  periodicAmount?: number;       // aporte periódico (OPCIONAL, default 0)
  periodicEveryMonths?: number;  // 3/6/12
  months?: number[];             // meses calendario puntuales: [6,12] primas, [3] bono
  annualGrowth?: number;         // opcional (aumentos de salario/prima)
  startYear?: number;            // "desde" (default 0)
  endYear?: number;              // "hasta" (default horizonte)
};

type SimInput = {
  years: number;                 // horizonte (o derivado de edadInicial→edadMeta)
  startMonth: number;            // mes calendario de inicio (default mes actual) — para que junio/diciembre caigan bien
  products: Product[];
  streams: ContribStream[];
  inflation: number;             // E.A. (~0.06 ilustrativo)
  usdDevaluation: number;        // E.A. del peso vs USD (escenario del dólar; puede ser negativa)
  reinvest: boolean;             // true = compuesto · false = cosecha intereses (simple)
  realValue: boolean;            // descontar inflación
};
```

### 6.4 Aportes: valor inicial + mensual (opcional) + periódico (opcional)

Modelo de aportes **común a todos los productos**: `initial` en el mes 0; `monthly` cada mes; `periodicAmount` cada `periodicEveryMonths`; `months[]` en meses calendario puntuales. **`monthly` y `periodicAmount` arrancan en 0 (opcionales).** Cada aporte entra a su `productKey` (crea un bloque nuevo si el producto es `maturity`). Cada stream respeta su ventana `startYear`/`endYear`.

### 6.5 Productos en USD y el dólar

Los productos con `currency:'USD'` (stablecoin, S&P) crecen **en dólares** y se valoran en pesos con un tipo de cambio que evoluciona:

```
tipoCambio(t) = TC_0 × (1 + usdDevaluation)^(t años)     // TC_0 es normalización (el nivel no afecta el resultado)
valorCOP = saldoUSD × tipoCambio(t)
```

Regla clave (decirla en la capacitación): **(1 + r_pesos) = (1 + r_dólar) × (1 + devaluación_peso)**. Un 6% en USD con el peso devaluándose 4% ≈ 10% en pesos; con el peso fortaleciéndose 4% ≈ 2%.

Escenarios del dólar (abanico): **a favor** (+d), **estable** (0), **en contra** (−d). El slider de `usdDevaluation` debe poder ir a negativo.

### 6.6 Comportamiento por producto

| Producto | currency | rateModel | compounding | Modo de aporte natural | Nota |
|---|---|---|---|---|---|
| **CDT** | COP | fixed | maturity (3/6/12) | **valor inicial + escalera opcional** | Capitaliza al vencer; renovar = reinvertir. Retención en la fuente sobre rendimientos. |
| **Fondo (FIC)** | COP | fixed | monthly | aporte mensual | Compone continuo; fondo de acumulación reinvierte por dentro. |
| **Acciones** | COP/USD | volatile | monthly | aporte flexible (mensual/periódico/primas) | Ganancia por apreciación + dividendos reinvertidos. Volátil. |
| **Stablecoin USD** | USD | reward | monthly | valor inicial + aportes | Recompensa ~6% E.A. (variable, "hasta 6%"), compone sola. Valor en COP depende del dólar. Riesgo cripto, sin seguro de depósito. |
| **S&P 500** | USD | volatile | monthly | aporte mensual + opcionales | Media largo plazo ~10% USD (12% es optimista). Volátil: NO es una recta. + efecto dólar. |

**CDT — importante (no sobrecargar):** se queda con **valor inicial + plazo de renovación (3/6/12) + escalera opcional (aporte por bloque cada N meses)**. Su vista estrella es el comparativo **reinvierte vs cosecha** (ver 6.7). No forzar "aporte mensual" en el CDT.

### 6.7 Interés compuesto vs simple (toggle transversal)

Disponible en **todos** los productos:
- **Reinvierte (compuesto):** las ganancias se quedan y capitalizan → curva que despega.
- **Cosecha (simple):** el interés se retira cada periodo, el capital queda fijo → línea recta.

La brecha entre las dos curvas ES el interés compuesto. Mensaje: "los dos ganaron lo mismo cada año; uno se comió los intereses y el otro los dejó trabajar."

### 6.8 Nominal vs real y costo de esperar

- **Toggle nominal/real:** descuenta inflación (~6% E.A. ilustrativo). En real, "sin invertir" debe **bajar**.
- **Costo de esperar:** comparar el resultado empezando hoy vs empezando +5 años (misma meta) y mostrar la diferencia.

---

## 7. Vistas del simulador

1. **Composición por producto** — área apilada, un color por producto. Muestra diversificación y cómo cada balde compone a su ritmo.
2. **Gris vs verde (vista hero del compuesto)** — dos capas: "lo que pusiste" (gris, recto) vs "lo que ganó solo" (verde, exponencial). El despegue del verde es la lección.
3. **Escenarios del dólar (abanico)** — para productos USD: 3 líneas (dólar sube/estable/baja) + "lo que pusiste".
4. **Camino real / volatilidad** — para el S&P: línea "esperado" (media) + un "camino real" volátil con botón **"otro futuro posible ↻"** (re-tira retornos aleatorios ~ media + volatilidad·N(0,1)) + slider de volatilidad (a 0 = recta como un CDT).
5. **Reinvierte vs cosecha** — el comparativo compuesto vs simple.
6. **Nominal vs real** — toggle de inflación.

---

## 8. Tres modos (revelación progresiva)

- **Simple:** un solo stream, un producto, un número gigante. Con esto arranca la capacitación.
- **Intermedio:** varios productos con **asignación (%)** que suma 100%; área apilada.
- **Experto:** streams con cadencia propia, meses puntuales (primas), **ventana de tiempo** (startYear/endYear) y reinversión por producto. Permite escenarios tipo "CDT desde el año 0, acciones desde el 1, S&P mensual desde el 2".

El motor es el mismo en los tres; solo cambia cuánta complejidad se muestra.

---

## 9. Módulos del participante (`/`)

Flujo de 3–4 pantallas, una acción cada una:
1. **Simulador ("Tu curva")** — modo simple por defecto. Sliders (edad inicial, aporte, edad meta) + gráfico + número grande. Toggle real y toggle reinvierte/cosecha disponibles.
2. **Comparador ("¿Dónde la pones?")** — vehículos lado a lado; resalta el mejor.
3. **Selector de metas** — presets: cuota inicial, estudio de los hijos, libertad a los 55, jubilación. (Edad inicial baja hasta ~15–18 y meta desde ~25 para metas cortas o largas, no solo retiro.)
4. **Plan / compromiso** — resumen + botón **"Descargar mi plan"** (PNG con `html-to-image`, todo en cliente). Leave-behind.

---

## 10. Modo presentador (`/present`) — 12 pantallas

Pantalla completa, tema oscuro, navegación con flechas. 6 slides estáticas + 6 módulos en vivo embebidos. Exportar respaldo en PDF (print-to-PDF) por si falla la conexión.

1. **[Slide]** Portada + promesa
2. **[Encuesta]** "¿Dónde tienes tu plata hoy?" (v1 externo / v2 nativo)
3. **[Slide]** "Tu plata quieta se está derritiendo"
4. **[En vivo]** El colchón en valor real (toggle inflación)
5. **[Slide]** Abre el simulador (QR + URL)
6. **[En vivo]** Tu propia curva
7. **[En vivo]** 25 vs 40 (arquetipos, costo de esperar)
8. **[Slide]** El costo de esperar (una cifra grande)
9. **[En vivo]** ¿Dónde la pones? (comparador / productos)
10. **[Slide]** La escalera + DIAN: Nivel 1 local regulado (Trii, tyba) → Nivel 2 cripto cercana (Wenia) → Nivel 3 afuera en USD (eToro, IBKR). "Afuera sí, pero le cuentas a la DIAN."
11. **[En vivo]** Fija tu meta (compromiso, descargar plan)
12. **[Slide]** "Esto no es sobre plata, es sobre opciones"

---

## 11. Quiz — 20 preguntas (`/quiz`)

Opción múltiple (4 opciones). Estructura por pregunta: enunciado, opciones, respuesta correcta, explicación breve, dificultad. v1: autoevaluada. v2: leaderboard en vivo. Guardar en `data/quiz.ts`.

> ⚠️ La pregunta 4 (recompensa de Wenia) tiene dato que caduca — **verificar antes de cada sesión**. Valor actual: hasta **6% E.A.**

1. Regla del 72: CDT al 9% E.A. se duplica en ~ a)3 **b)8** c)15 d)20 → 72÷9≈8. *(media)*
2. ¿Qué hace crecer más a largo plazo? a)más plata **b)más tiempo** c)mirar a diario d)cambiar de app *(fácil)*
3. Staking es a)vender rápido **b)bloquear cripto para validar la red y recibir recompensas** c)prestarle al banco d)un CDT *(media)*
4. Recompensa de Wenia por ahorrar en USDW: a)1% **b)hasta 6% E.A.** c)20% d)nada *(media)*
5. Un CDT es **a)renta fija** b)renta variable c)cripto d)acciones *(fácil)*
6. Rinde 8%, inflación 6%, real ≈ a)14% b)8% **c)2%** d)−6% *(difícil)*
7. FIC es a)cuenta de ahorros **b)vehículo que junta plata de muchos, diversificado y gestionado** c)préstamo d)acción *(media)*
8. Diversificar es a)todo en la mejor acción **b)repartir en varios activos para reducir riesgo** c)no invertir d)efectivo *(fácil)*
9. Trii y tyba están vigiladas por a)BanRep **b)la SFC** c)nadie d)la DIAN *(media)*
10. ¿eToro/IBKR regulados por la SFC? a)sí **b)no, por reguladores extranjeros** c)no existen d)solo eToro *(media)*
11. Stablecoin es a)acción volátil **b)cripto referenciada 1:1 a una moneda (USDW→dólar, COPW→peso)** c)CDT en USD d)fondo *(media)*
12. Invertir afuera sobre el límite: reportas a a)nadie **b)la DIAN** c)el broker d)la SFC *(media)*
13. Aportar cada mes vs todo de una: a)es ilegal **b)promedia el precio y reduce el riesgo de mal timing** c)menos impuestos d)sin ventaja *(difícil)*
14. ¿Quién termina con más? **a)empieza a los 25 con poco** b)a los 40 con el doble c)el que no empieza d)da igual *(media)*
15. ETF es a)una acción **b)canasta de activos que se transa como acción; diversificación barata** c)un CDT d)cripto *(media)*
16. ¿Retención en la fuente sobre rendimientos de un CDT? **a)sí** b)no c)solo cripto d)solo en el exterior *(difícil)*
17. Más volátil: a)un CDT **b)Bitcoin** c)igual d)ninguno *(fácil)*
18. Copy Trading (eToro) es a)copiar precios **b)copiar automáticamente las operaciones de otro inversionista** c)un impuesto d)un fondo *(media)*
19. Colchón con inflación 6%: a)crece **b)pierde poder adquisitivo (se derrite)** c)igual d)paga intereses *(fácil)*
20. Al vencer un CDT, crece más si a)retiras y gastas los intereses **b)renuevas reinvirtiendo capital + intereses** c)sacas todo d)da igual *(media)*

---

## 12. Copy — mensajes clave

- Idea central: "tu plata quieta se derrite."
- Compuesto: "no cosechar la fruta: dejar que cada fruta siembre otro árbol."
- Acciones: "no ganas cuando vendes; ganas mientras aguantas."
- Dólar: "en dólares haces dos apuestas: a la recompensa y a la moneda."
- Plataformas: "empieza donde haya más respaldo y menos fricción; sube de nivel solo cuando entiendas el riesgo del anterior."
- Cierre: "esto no es sobre plata, es sobre opciones."

---

## 13. Guardrails (obligatorios)

- **No es asesoría financiera.** Disclaimer discreto: información educativa, rendimientos ilustrativos, no promesas, no recomendación de compra.
- **No recomendar acciones ni criptos específicas.** Enseñar categorías y marco.
- **Tasas ilustrativas y editables**, nunca garantía. Centralizarlas en `config/assumptions.ts`.
- **El dólar y la volatilidad cortan para los dos lados** — mostrar siempre el escenario adverso.
- **Cripto y brokers del exterior = mayor riesgo, sin cobertura de la SFC, sin seguro de depósito** — decirlo cuando se mencionan.
- **Leaderboard rankea conocimiento, jamás la situación financiera** de la persona.
- **Redondear todo número en pantalla** (`Math.round`/`toFixed`/`toLocaleString`).

---

## 14. Orden de construcción (una sesión de Claude Code, commit por hito)

1. Scaffold Next.js 14 + TS + Tailwind + tema oscuro. Commit.
2. **`lib/finance.ts`: el motor de flujos de caja** (6.2), tasa efectiva mensual (6.1), modelo de datos (6.3), productos (6.6), FX (6.5), volatilidad, reinvierte/cosecha. **Con tests.** Commit.
3. `config/assumptions.ts` (productos y tasas ilustrativas). Commit.
4. Componentes de gráfico: composición apilada, gris-vs-verde, abanico del dólar, camino real/volatilidad, reinvierte-vs-gasta. Commit.
5. Simulador participante (`/`) modo simple → intermedio → experto. Commit.
6. Comparador, arquetipos/costo de esperar, selector de metas, plan con descarga PNG. Commit.
7. Quiz autoevaluado (`/quiz`) con las 20 preguntas. Commit.
8. Modo presentador (`/present`): 6 slides + módulos en vivo + QR + print-to-PDF. Commit.
9. Pulir estilo, responsive, disclaimers. Commit.
10. **Deploy a Vercel.** Commit.

---

## 15. V2 — Capa social (Supabase, sesión aparte)

Construir solo tras desplegar v1. Añade el estado compartido celular↔pantalla.

**Features:** encuestas en vivo agregadas · leaderboard del quiz (por conocimiento) · auth con allowlist (magic links) · guardar escenarios / tracking de finalización.

**Esquema:**
```sql
sessions        (id, code, title, status, created_at)
participants    (id, session_id, display_name, email, joined_at)
poll_questions  (id, session_id, prompt, options jsonb, active)
poll_responses  (id, poll_question_id, participant_id, choice)
quiz_answers    (id, session_id, participant_id, question_id, choice, correct, answered_at)
leaderboard     (view: correctas, desempate por tiempo)
saved_scenarios (id, participant_id, input jsonb, valor_final, created_at)
```
Supabase Realtime (canales por `session_id`), RLS activado (cada participante escribe solo sus filas). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Redeploy en Vercel.
