# Invierte

App web para una **capacitación de inversión práctica** (es-CO, COP). Mobile-first,
tema oscuro. El corazón es el **motor de simulación** (flujo de caja mes a mes con
tasa efectiva mensual `i_mes = (1+EA)^(1/12) − 1`).

## Rutas

| Ruta | Modo |
|------|------|
| `/` | Participante — simulador (simple/intermedio/experto), comparador, metas, plan |
| `/present` | Presentador — 12 pantallas, navegación con flechas, QR, print-to-PDF |
| `/quiz` | Trivia autoevaluada (20 preguntas) |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # motor + helpers (vitest)
npm run build      # build de producción
```

## Stack (v1)

Next.js 14 (App Router) · TypeScript · Tailwind · chart.js · html-to-image · qrcode.
Sin backend, sin BD: el estado vive en React y en los parámetros de URL.

> Las tasas son **ilustrativas y editables** (`config/assumptions.ts`), nunca una
> promesa. No es asesoría financiera. La recompensa de Wenia (quiz Q4) **caduca**:
> verificar antes de cada sesión.

## Deploy (Vercel)

Sin variables de entorno. Detección automática de Next.js.

```bash
# Opción A — CLI
npx vercel login
npx vercel --prod

# Opción B — GitHub
# 1) push del repo a GitHub
# 2) Import en vercel.com → Deploy (sin configuración extra)
```
