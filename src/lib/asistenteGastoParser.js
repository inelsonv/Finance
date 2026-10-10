// Analizador inteligente de intenciones de gastos para el chat de IA de Smart Finance.
// Permite detectar montos, categorías (como Gasolina / Combustible), métodos de pago,
// tarjetas y fechas a partir de mensajes en lenguaje natural dominicano/español.

import { GASTO_CATS_VARIABLE, GASTO_CATS_FIJO } from "./categorias.js";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function hoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fechaRelativa(diasOffset) {
  const d = new Date();
  d.setDate(d.getDate() + diasOffset);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function normalizar(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function contieneTermino(texto, termino) {
  if (!texto || !termino) return false;
  // Para términos de 4 caracteres o menos (como "gas", "bar", "luz", "taxi"), exige límite de palabra para no coincidir con "gasto", etc.
  if (termino.length <= 4) {
    const escaped = termino.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(texto);
  }
  return texto.includes(termino);
}

/**
 * Mapeo de términos coloquiales a categorías estándar
 */
const REGLAS_CATEGORIAS = [
  {
    categoria: "Combustible",
    terminos: [
      "gasolina",
      "combustible",
      "gasoil",
      "diesel",
      "gas",
      "glp",
      "tanque",
      "shell",
      "texaco",
      "total",
      "puma",
      "sunix",
      "esso",
      "bomba",
      "estacion de gasolina",
      "echar gasolina",
    ],
  },
  {
    categoria: "Alimentación",
    terminos: [
      "comida",
      "almuerzo",
      "cena",
      "desayuno",
      "cafe",
      "cafeteria",
      "restaurante",
      "colmado",
      "pica pollo",
      "hamburguesa",
      "pizza",
      "snack",
      "merienda",
      "bravo",
      "sirena",
      "nacional",
      "jumbo",
      "supermercado",
    ],
  },
  {
    categoria: "Transporte",
    terminos: [
      "transporte",
      "uber",
      "taxi",
      "indrive",
      "didi",
      "pasaje",
      "guagua",
      "metro",
      "teleferico",
      "peaje",
      "concho",
    ],
  },
  {
    categoria: "Estacionamiento",
    terminos: ["estacionamiento", "parqueo", "valet"],
  },
  {
    categoria: "Salud",
    terminos: [
      "farmacia",
      "medicina",
      "pastillas",
      "medicamento",
      "consulta",
      "doctor",
      "medico",
      "clinica",
      "analisis",
      "laboratorio",
      "dentista",
      "odontologo",
    ],
  },
  {
    categoria: "Entretenimiento",
    terminos: [
      "cine",
      "pelicula",
      "concierto",
      "evento",
      "fiesta",
      "discoteca",
      "bar",
      "trago",
      "videojuego",
      "juego",
    ],
  },
  {
    categoria: "Compras",
    terminos: ["ropa", "zapatos", "tienda", "mall", "shopping", "compra", "amazon"],
  },
  {
    categoria: "Servicios",
    terminos: ["luz", "edeeste", "edesur", "edenorte", "agua", "caasd", "internet", "claro", "altice"],
  },
];

/**
 * Analiza un texto de usuario para determinar si expresa la intención de
 * registrar un gasto (por ejemplo: "Registra 2000 en gasolina", "Gasté 500 pesos de combustible con tarjeta").
 * Devuelve null si no es un gasto, o un objeto con los datos estructurados.
 */
export function analizarIntencionGasto(texto, { categoriasGasto = [], tarjetas = [] } = {}) {
  if (!texto || typeof texto !== "string") return null;

  const limpio = texto.trim();
  const n = normalizar(limpio);

  // Palabras clave que indican intención de registrar o reportar un gasto
  const verbosRegistro = [
    "registra",
    "registrar",
    "anota",
    "anotar",
    "apunta",
    "apuntar",
    "pon",
    "ponme",
    "agrega",
    "agregar",
    "guarda",
    "guardar",
    "mete",
    "ingresa",
    "anotame",
    "apuntame",
    "registrame",
  ];

  const verbosGasto = [
    "gaste",
    "gasté",
    "pague",
    "pagué",
    "eche",
    "eché",
    "compre",
    "compré",
    "consumi",
    "consumí",
    "llene",
    "llené",
  ];

  const esComandoRegistro = verbosRegistro.some((v) => n.startsWith(v) || n.includes(` ${v} `) || n.includes(`quiero ${v}`));
  const esReporteGasto = verbosGasto.some((v) => n.startsWith(v) || n.includes(` ${v} `) || n.includes(`ya ${v}`));
  const tienePalabraGasto = n.includes("gasto") || n.includes("gasolina") || n.includes("combustible");

  // Si no parece intención de registrar un gasto, retornar null
  if (!esComandoRegistro && !esReporteGasto && !tienePalabraGasto) {
    return null;
  }

  // 1. Extraer el monto numérico
  // Soporta: "2000", "2,000", "2.000", "$1500", "RD$ 1,500", "1500.50", "2 mil", "2k"
  let monto = null;

  // Busca "X mil" ej: "2 mil", "1.5 mil"
  const matchMil = n.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/);
  if (matchMil) {
    const base = parseFloat(matchMil[1].replace(",", "."));
    if (Number.isFinite(base)) monto = base * 1000;
  }

  if (monto === null) {
    // Busca cifras numéricas precedidas o seguidas de moneda o palabras comunes
    const matchNumero = n.match(/(?:rd\$|\$|monto\s+de\s+|por\s+|de\s+)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\s*(?:pesos|dop|rd\$|\$)?/);
    // Para evitar capturar números aislados de fecha como 2026, buscar número adecuado
    const numeros = [...n.matchAll(/\b(?:rd\$|\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\b/g)];
    for (const match of numeros) {
      const valorStr = match[1].replace(/,/g, "");
      const val = parseFloat(valorStr);
      // Evitar años tipo 2024, 2025, 2026 si no hay contexto de monto, salvo que sea el único número
      if (Number.isFinite(val) && val > 0) {
        monto = val;
        break;
      }
    }
  }

  // Si no se encontró un monto válido pero el usuario dijo algo como "registra gasolina",
  // puede que quiera registrar pero faltó el monto. Retornamos con monto null para que la UI o IA pregunte.
  // 2. Extraer categoría
  let categoria = "Combustible";
  let categoriaEncontrada = false;

  // Primero buscar en categorías personalizadas del usuario
  for (const c of categoriasGasto) {
    const cNorm = normalizar(c.nombre);
    if (contieneTermino(n, cNorm)) {
      categoria = c.nombre;
      categoriaEncontrada = true;
      break;
    }
  }

  // Si no, buscar según términos de reglas conocidas
  if (!categoriaEncontrada) {
    for (const regla of REGLAS_CATEGORIAS) {
      if (regla.terminos.some((t) => contieneTermino(n, t))) {
        categoria = regla.categoria;
        categoriaEncontrada = true;
        break;
      }
    }
  }

  // Si no coincidió con ninguna regla pero mencionó gasolina/combustible:
  if (!categoriaEncontrada) {
    if (n.includes("gasolina") || n.includes("combustible")) {
      categoria = "Combustible";
    } else {
      categoria = "Otro variable";
    }
  }

  // 3. Extraer método de pago
  let metodoPago = "Efectivo";
  let tarjetaId = null;
  let tarjetaNombre = "";

  const tarjetasActivas = (tarjetas || []).filter((t) => t.estado === "Activa" && (t.tipoTarjeta || "Crédito") === "Crédito");

  const esTarjeta = n.includes("tarjeta") || n.includes("credito") || n.includes("crédito");
  const esTransferencia = n.includes("transferencia") || n.includes("transferi");
  const esDebito = n.includes("debito") || n.includes("débito");

  if (esTransferencia) {
    metodoPago = "Transferencia";
  } else if (esDebito) {
    metodoPago = "Débito";
  } else if (esTarjeta || tarjetasActivas.some((t) => n.includes(normalizar(t.nombre)) || (t.banco && n.includes(normalizar(t.banco))))) {
    metodoPago = "Tarjeta de crédito";

    // Intentar asociar con una tarjeta registrada específica
    for (const t of tarjetasActivas) {
      const nombreNorm = normalizar(t.nombre);
      const bancoNorm = normalizar(t.banco || "");
      if (nombreNorm && n.includes(nombreNorm)) {
        tarjetaId = t.id;
        tarjetaNombre = t.nombre;
        break;
      }
      if (bancoNorm && n.includes(bancoNorm)) {
        tarjetaId = t.id;
        tarjetaNombre = t.nombre;
        break;
      }
    }

    // Si solo tiene una tarjeta activa y dijo "con tarjeta", asociarla por defecto
    if (!tarjetaId && tarjetasActivas.length === 1) {
      tarjetaId = tarjetasActivas[0].id;
      tarjetaNombre = tarjetasActivas[0].nombre;
    }
  }

  // 4. Extraer fecha
  let fecha = hoyStr();
  if (n.includes("ayer")) {
    fecha = fechaRelativa(-1);
  } else if (n.includes("anteayer")) {
    fecha = fechaRelativa(-2);
  }

  // 5. Concepto o descripción
  let descripcion = categoria === "Combustible" ? "Gasolina" : categoria;
  if (n.includes("gasolina")) descripcion = "Gasolina";
  else if (n.includes("combustible")) descripcion = "Combustible";
  else if (n.includes("gasoil")) descripcion = "Gasoil";
  else if (n.includes("almuerzo")) descripcion = "Almuerzo";
  else if (n.includes("desayuno")) descripcion = "Desayuno";
  else if (n.includes("cena")) descripcion = "Cena";
  else if (n.includes("cafe") || n.includes("café")) descripcion = "Café";
  else if (n.includes("parqueo")) descripcion = "Parqueo";

  const clasificacion = GASTO_CATS_FIJO.includes(categoria) ? "Fijo" : "Variable";

  return {
    monto: monto ? Math.round(monto * 100) / 100 : null,
    categoria,
    clasificacion,
    metodoPago,
    tarjetaId,
    tarjetaNombre,
    fecha,
    descripcion,
    autoRegistrar: Boolean(monto && (esComandoRegistro || esReporteGasto)),
  };
}
