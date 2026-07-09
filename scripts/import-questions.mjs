#!/usr/bin/env node
// Importa preguntas desde un CSV → genera el TS de una categoría del banco.
//
// Uso:  node scripts/import-questions.mjs <archivo.csv> [categoria]
//   - Si pasas categoría, filtra solo esas filas y escribe data/questions/<categoria>.ts
//   - Sin categoría: agrupa por la columna "categoria" y escribe un archivo por cada una.
//
// Columnas CSV: categoria,dificultad,tipo,pregunta,a,b,c,d,correcta,explicacion,acepta
//   tipo: single | vf | text
//   correcta: single → letra A/B/C/D · vf → verdadero/falso · text → (vacío)
//   acepta: text → respuestas válidas separadas por "|" (la primera es la canónica)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [, , csvPath, onlyCat] = process.argv;
if (!csvPath) {
  console.error("Uso: node scripts/import-questions.mjs <archivo.csv> [categoria]");
  process.exit(1);
}

// --- parser CSV mínimo (soporta comillas y comas dentro de comillas) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(csvPath, "utf8");
const [header, ...lines] = parseCSV(raw);
const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));

const LETTER = { a: 0, b: 1, c: 2, d: 3 };
const byCat = {};
let n = 0;

for (const r of lines) {
  if (!r || r.every((x) => x.trim() === "")) continue;
  const get = (name) => (r[col[name]] ?? "").trim();
  const categoria = get("categoria");
  if (!categoria || (onlyCat && categoria !== onlyCat)) continue;
  const dificultad = get("dificultad") || "media";
  const tipo = (get("tipo") || "single").toLowerCase();
  const prompt = get("pregunta");
  const explanation = get("explicacion");
  n++;
  const id = `${categoria}-imp-${String(n).padStart(3, "0")}`;
  const base = { id, category: categoria, difficulty: dificultad, prompt, explanation };
  let q;
  if (tipo === "vf") {
    q = { ...base, type: "boolean", correct: /^v/i.test(get("correcta")) };
  } else if (tipo === "text") {
    q = { ...base, type: "text", accept: get("acepta").split("|").map((s) => s.trim()).filter(Boolean) };
  } else {
    q = { ...base, type: "single", options: [get("a"), get("b"), get("c"), get("d")], correctIndex: LETTER[get("correcta").toLowerCase()] ?? 0 };
  }
  (byCat[categoria] ??= []).push(q);
}

mkdirSync("data/questions", { recursive: true });
for (const [cat, qs] of Object.entries(byCat)) {
  const CONST = cat.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const body = qs.map((q) => "  " + JSON.stringify(q) + ",").join("\n");
  const out = `import type { Question } from "@/lib/quiz/types";\n\nexport const ${CONST}: Question[] = [\n${body}\n];\n`;
  const path = `data/questions/${cat}.ts`;
  writeFileSync(path, out);
  console.log(`✓ ${path} — ${qs.length} preguntas (const ${CONST})`);
  console.log(`  Recuerda: importarlo en data/questions/index.ts y agregar "${cat}" al tipo Category + admin CATS.`);
}
console.log(`Total: ${n} preguntas importadas.`);
