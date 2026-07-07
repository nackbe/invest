// Quiz — 20 preguntas (§11). Opción múltiple (4). v1: autoevaluada.
// correctIndex es 0-based (a=0, b=1, c=2, d=3).
// ⚠️ La pregunta 4 (recompensa de Wenia) tiene dato que CADUCA — verificar antes
//    de cada sesión (§11). Valor actual: hasta 6% E.A.

export type Difficulty = "fácil" | "media" | "difícil";

export type QuizQuestion = {
  id: number;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: Difficulty;
  expires?: boolean; // dato que caduca, verificar antes de la sesión
};

export const QUIZ: QuizQuestion[] = [
  {
    id: 1,
    prompt: "Regla del 72: un CDT al 9% E.A. se duplica en aproximadamente…",
    options: ["3 años", "8 años", "15 años", "20 años"],
    correctIndex: 1,
    explanation: "72 ÷ 9 ≈ 8 años. La regla del 72 estima cuánto tarda tu plata en duplicarse.",
    difficulty: "media",
  },
  {
    id: 2,
    prompt: "¿Qué hace crecer más tu inversión a largo plazo?",
    options: ["Más plata", "Más tiempo", "Mirarla a diario", "Cambiar de app"],
    correctIndex: 1,
    explanation: "El tiempo es el mayor aliado del interés compuesto: empezar antes pesa más que poner más.",
    difficulty: "fácil",
  },
  {
    id: 3,
    prompt: "¿Qué es el staking?",
    options: [
      "Vender cripto rápido",
      "Bloquear cripto para validar la red y recibir recompensas",
      "Prestarle al banco",
      "Un CDT",
    ],
    correctIndex: 1,
    explanation: "Bloqueas cripto para ayudar a validar la red y a cambio recibes recompensas.",
    difficulty: "media",
  },
  {
    id: 4,
    prompt: "¿Cuál es la recompensa de Wenia por ahorrar en USDW?",
    options: ["1%", "Hasta 6% E.A.", "20%", "Nada"],
    correctIndex: 1,
    explanation: "Hasta 6% E.A. (variable). Dato que cambia: verifícalo antes de cada sesión.",
    difficulty: "media",
    expires: true,
  },
  {
    id: 5,
    prompt: "Un CDT es un producto de…",
    options: ["Renta fija", "Renta variable", "Cripto", "Acciones"],
    correctIndex: 0,
    explanation: "Es renta fija: conoces la tasa desde el principio.",
    difficulty: "fácil",
  },
  {
    id: 6,
    prompt: "Si algo rinde 8% y la inflación es 6%, tu rendimiento real es ≈…",
    options: ["14%", "8%", "2%", "−6%"],
    correctIndex: 2,
    explanation: "El rendimiento real descuenta la inflación: 8% − 6% ≈ 2%.",
    difficulty: "difícil",
  },
  {
    id: 7,
    prompt: "¿Qué es un FIC (Fondo de Inversión Colectiva)?",
    options: [
      "Una cuenta de ahorros",
      "Un vehículo que junta plata de muchos, diversificado y gestionado",
      "Un préstamo",
      "Una acción",
    ],
    correctIndex: 1,
    explanation: "Reúne el dinero de muchos inversionistas en un portafolio diversificado y gestionado.",
    difficulty: "media",
  },
  {
    id: 8,
    prompt: "Diversificar es…",
    options: [
      "Poner todo en la mejor acción",
      "Repartir en varios activos para reducir riesgo",
      "No invertir",
      "Guardar efectivo",
    ],
    correctIndex: 1,
    explanation: "Repartir reduce el riesgo: si a uno le va mal, no arrastra todo tu dinero.",
    difficulty: "fácil",
  },
  {
    id: 9,
    prompt: "¿Quién vigila a Trii y tyba?",
    options: ["El BanRep", "La SFC", "Nadie", "La DIAN"],
    correctIndex: 1,
    explanation: "La Superintendencia Financiera de Colombia (SFC) vigila a las plataformas locales reguladas.",
    difficulty: "media",
  },
  {
    id: 10,
    prompt: "¿eToro e IBKR están regulados por la SFC?",
    options: ["Sí", "No, por reguladores extranjeros", "No existen", "Solo eToro"],
    correctIndex: 1,
    explanation: "Son brokers del exterior: los regulan entes extranjeros, no la SFC. Mayor riesgo, sin cobertura local.",
    difficulty: "media",
  },
  {
    id: 11,
    prompt: "Una stablecoin es…",
    options: [
      "Una acción volátil",
      "Cripto referenciada 1:1 a una moneda (USDW→dólar, COPW→peso)",
      "Un CDT en USD",
      "Un fondo",
    ],
    correctIndex: 1,
    explanation: "Está anclada 1:1 a una moneda para mantener su valor estable.",
    difficulty: "media",
  },
  {
    id: 12,
    prompt: "Si inviertes afuera por encima del límite, ¿a quién le reportas?",
    options: ["A nadie", "A la DIAN", "Al broker", "A la SFC"],
    correctIndex: 1,
    explanation: "Afuera sí, pero le cuentas a la DIAN. Invertir en el exterior se declara.",
    difficulty: "media",
  },
  {
    id: 13,
    prompt: "Aportar cada mes en vez de todo de una…",
    options: [
      "Es ilegal",
      "Promedia el precio y reduce el riesgo de mal timing",
      "Paga menos impuestos",
      "No tiene ninguna ventaja",
    ],
    correctIndex: 1,
    explanation: "Al aportar periódicamente promedias el precio de entrada y bajas el riesgo de entrar en mal momento.",
    difficulty: "difícil",
  },
  {
    id: 14,
    prompt: "¿Quién termina con más plata?",
    options: [
      "El que empieza a los 25 con poco",
      "El que empieza a los 40 con el doble",
      "El que no empieza",
      "Da igual",
    ],
    correctIndex: 0,
    explanation: "El que empieza antes gana por tiempo: el compuesto trabaja más años.",
    difficulty: "media",
  },
  {
    id: 15,
    prompt: "Un ETF es…",
    options: [
      "Una acción",
      "Una canasta de activos que se transa como acción; diversificación barata",
      "Un CDT",
      "Cripto",
    ],
    correctIndex: 1,
    explanation: "Agrupa muchos activos y se compra/vende como una acción: diversificación de bajo costo.",
    difficulty: "media",
  },
  {
    id: 16,
    prompt: "¿Hay retención en la fuente sobre los rendimientos de un CDT?",
    options: ["Sí", "No", "Solo en cripto", "Solo en el exterior"],
    correctIndex: 0,
    explanation: "Sí: a los rendimientos del CDT se les aplica retención en la fuente.",
    difficulty: "difícil",
  },
  {
    id: 17,
    prompt: "¿Qué es más volátil?",
    options: ["Un CDT", "Bitcoin", "Son iguales", "Ninguno"],
    correctIndex: 1,
    explanation: "Bitcoin sube y baja mucho más que un CDT, que tiene tasa conocida.",
    difficulty: "fácil",
  },
  {
    id: 18,
    prompt: "¿Qué es el Copy Trading (eToro)?",
    options: [
      "Copiar precios",
      "Copiar automáticamente las operaciones de otro inversionista",
      "Un impuesto",
      "Un fondo",
    ],
    correctIndex: 1,
    explanation: "Replicas automáticamente las operaciones de otro inversionista.",
    difficulty: "media",
  },
  {
    id: 19,
    prompt: "Con inflación del 6%, la plata en el colchón…",
    options: [
      "Crece",
      "Pierde poder adquisitivo (se derrite)",
      "Queda igual",
      "Paga intereses",
    ],
    correctIndex: 1,
    explanation: "Quieta pierde poder adquisitivo: la inflación la derrite año a año.",
    difficulty: "fácil",
  },
  {
    id: 20,
    prompt: "Al vencer un CDT, tu plata crece más si…",
    options: [
      "Retiras y gastas los intereses",
      "Renuevas reinvirtiendo capital + intereses",
      "Sacas todo",
      "Da igual",
    ],
    correctIndex: 1,
    explanation: "Renovar reinvirtiendo capital e intereses activa el interés compuesto.",
    difficulty: "media",
  },
];
