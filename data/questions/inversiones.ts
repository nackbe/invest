import type { Question } from "@/lib/quiz/types";

export const INVERSIONES: Question[] = [
  // ---- FACIL ----
  {
    id: "inv-001",
    category: "inversiones",
    difficulty: "facil",
    type: "single",
    prompt: "¿Qué es un CDT?",
    options: [
      "Un Certificado de Depósito a Término",
      "Un tipo de acción bursátil",
      "Una criptomoneda",
      "Un impuesto de la DIAN",
    ],
    correctIndex: 0,
    explanation:
      "El CDT es un producto de ahorro donde entregas tu dinero al banco por un plazo fijo a cambio de una tasa de interés pactada.",
  },
  {
    id: "inv-002",
    category: "inversiones",
    difficulty: "facil",
    type: "boolean",
    prompt: "¿La DIAN es la entidad que recauda los impuestos en Colombia?",
    correct: true,
    explanation:
      "La DIAN (Dirección de Impuestos y Aduanas Nacionales) es la autoridad tributaria y aduanera de Colombia.",
  },
  {
    id: "inv-003",
    category: "inversiones",
    difficulty: "facil",
    type: "text",
    prompt: "¿Con qué sigla se conoce a un Fondo de Inversión Colectiva en Colombia?",
    accept: ["FIC", "Fondo de Inversion Colectiva", "Fondo de Inversión Colectiva", "un fic", "fondo colectivo"],
    explanation:
      "Un FIC reúne el dinero de muchos inversionistas para invertirlo de forma conjunta, gestionado por una entidad autorizada.",
  },
  {
    id: "inv-004",
    category: "inversiones",
    difficulty: "facil",
    type: "boolean",
    prompt: "¿Diversificar significa poner todo tu dinero en un solo activo?",
    correct: false,
    explanation:
      "Diversificar es justo lo contrario: repartir el dinero entre distintos activos para reducir el riesgo.",
  },
  {
    id: "inv-005",
    category: "inversiones",
    difficulty: "facil",
    type: "single",
    prompt: "¿Qué mide la inflación?",
    options: [
      "El aumento generalizado de los precios en el tiempo",
      "La cantidad de acciones en la bolsa",
      "El número de bancos en un país",
      "La tasa de cambio del dólar únicamente",
    ],
    correctIndex: 0,
    explanation:
      "La inflación mide cuánto suben en promedio los precios de bienes y servicios, reduciendo el poder de compra del dinero.",
  },
  {
    id: "inv-006",
    category: "inversiones",
    difficulty: "facil",
    type: "text",
    prompt: "¿Qué sigla usamos para referirnos a un fondo cotizado en bolsa que replica un índice?",
    accept: ["ETF", "Exchange Traded Fund", "fondo cotizado", "fondo cotizado en bolsa"],
    explanation:
      "Un ETF es un fondo que cotiza en bolsa como una acción y normalmente replica el comportamiento de un índice o canasta de activos.",
  },
  {
    id: "inv-007",
    category: "inversiones",
    difficulty: "facil",
    type: "boolean",
    prompt: "¿El interés compuesto se calcula solo sobre el capital inicial, sin incluir los intereses ya ganados?",
    correct: false,
    explanation:
      "En el interés compuesto, los intereses ganados se suman al capital y también generan nuevos intereses en los periodos siguientes.",
  },
  // ---- MEDIA ----
  {
    id: "inv-008",
    category: "inversiones",
    difficulty: "media",
    type: "single",
    prompt: "Si inviertes $1.000.000 al 10% anual con interés compuesto, ¿cuánto tendrás aproximadamente al cabo de 2 años?",
    options: ["$1.100.000", "$1.200.000", "$1.210.000", "$1.000.000"],
    correctIndex: 2,
    explanation:
      "Año 1: 1.000.000 × 1.10 = 1.100.000. Año 2: 1.100.000 × 1.10 = 1.210.000. Los intereses del primer año también generan interés.",
  },
  {
    id: "inv-009",
    category: "inversiones",
    difficulty: "media",
    type: "single",
    prompt: "¿Qué significa que un activo tenga alta 'volatilidad'?",
    options: [
      "Que su precio cambia poco con el tiempo",
      "Que su precio puede subir o bajar bruscamente en poco tiempo",
      "Que no se puede vender fácilmente",
      "Que está garantizado por el gobierno",
    ],
    correctIndex: 1,
    explanation:
      "La volatilidad mide qué tanto varía el precio de un activo; a mayor volatilidad, mayores y más rápidos son sus movimientos de precio.",
  },
  {
    id: "inv-010",
    category: "inversiones",
    difficulty: "media",
    type: "boolean",
    prompt: "¿El valor real de tu dinero puede disminuir con el tiempo aunque la cantidad de pesos que tienes no cambie?",
    correct: true,
    explanation:
      "Si la inflación es positiva, el mismo monto de dinero compra menos bienes y servicios con el paso del tiempo: pierde valor real.",
  },
  {
    id: "inv-011",
    category: "inversiones",
    difficulty: "media",
    type: "text",
    prompt: "¿Cómo se conoce a las criptomonedas diseñadas para mantener un valor estable, usualmente ligado al dólar?",
    accept: ["stablecoins", "stablecoin", "monedas estables", "moneda estable", "criptomoneda estable"],
    explanation:
      "Las stablecoins buscan mantener una paridad fija (por ejemplo 1 a 1 con el dólar) respaldadas por reservas u otros mecanismos.",
  },
  {
    id: "inv-012",
    category: "inversiones",
    difficulty: "media",
    type: "single",
    prompt: "¿Qué es el 'staking' en el mundo cripto?",
    options: [
      "Vender criptomonedas rápidamente para obtener ganancia inmediata",
      "Bloquear criptomonedas para ayudar a validar una red y recibir recompensas a cambio",
      "Un impuesto que cobra la DIAN sobre criptoactivos",
      "Un tipo de préstamo bancario tradicional",
    ],
    correctIndex: 1,
    explanation:
      "El staking consiste en bloquear tokens en una red blockchain de prueba de participación para ayudar a validarla, recibiendo recompensas.",
  },
  {
    id: "inv-013",
    category: "inversiones",
    difficulty: "media",
    type: "order",
    prompt: "Ordena estos productos de menor a mayor riesgo típico: acciones, CDT, cuenta de ahorros.",
    items: [
      { id: "ahorros", label: "Cuenta de ahorros" },
      { id: "cdt", label: "CDT" },
      { id: "acciones", label: "Acciones" },
    ],
    explanation:
      "En general, la cuenta de ahorros es de bajísimo riesgo, el CDT tiene riesgo bajo con retorno fijo, y las acciones tienen mayor riesgo y potencial de retorno.",
  },
  {
    id: "inv-014",
    category: "inversiones",
    difficulty: "media",
    type: "match",
    prompt: "Relaciona cada concepto con su definición.",
    pairs: [
      { id: "p1", left: "Diversificación", right: "Repartir inversiones entre distintos activos" },
      { id: "p2", left: "Liquidez", right: "Facilidad para convertir un activo en efectivo" },
      { id: "p3", left: "Rentabilidad", right: "Ganancia que produce una inversión" },
    ],
    explanation:
      "Diversificación, liquidez y rentabilidad son tres conceptos clave para evaluar cualquier inversión.",
  },
  // ---- DIFICIL ----
  {
    id: "inv-015",
    category: "inversiones",
    difficulty: "dificil",
    type: "single",
    prompt: "Si la inflación anual es del 8% y tu inversión rentó 5% en el mismo periodo, ¿qué pasó con tu poder adquisitivo?",
    options: [
      "Aumentó, porque tu inversión tuvo rentabilidad positiva",
      "Se mantuvo igual",
      "Disminuyó, porque la rentabilidad real fue negativa",
      "No se puede saber sin conocer el monto invertido",
    ],
    correctIndex: 2,
    explanation:
      "La rentabilidad real aproximada es rentabilidad nominal menos inflación (5% − 8% = −3%): perdiste poder de compra pese a ganar en pesos.",
  },
  {
    id: "inv-016",
    category: "inversiones",
    difficulty: "dificil",
    type: "single",
    prompt: "¿Cuál de estas afirmaciones sobre un ETF es correcta?",
    options: [
      "Solo puede comprarse una vez al año",
      "Se negocia en bolsa durante el día como una acción",
      "Garantiza siempre una rentabilidad fija",
      "Solo puede invertir en un único país",
    ],
    correctIndex: 1,
    explanation:
      "A diferencia de un fondo mutuo tradicional que se valora una vez al día, un ETF cotiza en bolsa en tiempo real como cualquier acción.",
  },
  {
    id: "inv-017",
    category: "inversiones",
    difficulty: "dificil",
    type: "boolean",
    prompt: "¿En Colombia, los rendimientos de algunas inversiones pueden estar sujetos a retención en la fuente por parte de la DIAN?",
    correct: true,
    explanation:
      "Muchos rendimientos financieros (como los de CDT) están sujetos a retención en la fuente que luego se ajusta en la declaración de renta.",
  },
  {
    id: "inv-018",
    category: "inversiones",
    difficulty: "dificil",
    type: "text",
    prompt: "¿Cómo se llama la estrategia de invertir un monto fijo periódicamente sin importar el precio del activo, para promediar el costo de compra?",
    accept: ["costo promedio en dolares", "costo promedio en dólares", "dollar cost averaging", "promediar costo", "dca", "costo promedio", "promediar el costo", "dollar cost average"],
    explanation:
      "Esta estrategia (dollar-cost averaging) reduce el impacto de la volatilidad porque compras más unidades cuando el precio baja y menos cuando sube.",
  },
  {
    id: "inv-019",
    category: "inversiones",
    difficulty: "dificil",
    type: "single",
    prompt: "¿Qué ocurre generalmente con el precio de un bono existente cuando las tasas de interés del mercado suben?",
    options: [
      "El precio del bono sube",
      "El precio del bono baja",
      "El precio no se ve afectado",
      "El bono deja de pagar intereses",
    ],
    correctIndex: 1,
    explanation:
      "Los precios de los bonos y las tasas de interés se mueven en direcciones opuestas: si suben las tasas, los bonos ya emitidos con tasa fija pierden atractivo y su precio baja.",
  },
  {
    id: "inv-020",
    category: "inversiones",
    difficulty: "dificil",
    type: "order",
    prompt: "Ordena de MÁS a MENOS líquido: cuenta de ahorros, CDT a 360 días, un apartamento.",
    items: [
      { id: "ahorros", label: "Cuenta de ahorros" },
      { id: "cdt", label: "CDT a 360 días" },
      { id: "apto", label: "Un apartamento" },
    ],
    explanation:
      "La cuenta de ahorros permite retirar el dinero de inmediato; el CDT tiene un plazo fijo pactado; un inmueble puede tardar meses en venderse.",
  },
  {
    id: "inv-021",
    category: "inversiones",
    difficulty: "dificil",
    type: "single",
    prompt: "¿Qué es el 'riesgo país' al invertir en el exterior?",
    options: [
      "El riesgo de que cambie el clima en ese país",
      "El riesgo de que factores económicos o políticos de un país afecten el valor de las inversiones allí",
      "El riesgo de perder el pasaporte",
      "Un impuesto que cobra la DIAN por invertir afuera",
    ],
    correctIndex: 1,
    explanation:
      "El riesgo país refleja la probabilidad de que factores macroeconómicos, políticos o institucionales de una nación impacten negativamente las inversiones hechas allí.",
  },
];
