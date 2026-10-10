// Analizador universal de intenciones y acciones para el chat de IA de Smart Finance.
// Permite detectar y procesar en lenguaje natural dominicano/español:
// - Pagos de préstamos específicos (ej: "PT09 paga el total de este prestamo")
// - Consultas de saldo de deudas (ej: "¿Cuánto me falta para saldar PT09?")
// - Agregar productos a la orden de compra abierta (ej: "Agrega leche a la orden de compra")
// - Pagos de tarjetas de crédito
// - Ingresos (salario, freelance)
// - Gastos de cualquier categoría (gasolina, alimentación, servicios, salud, etc.)

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
  if (termino.length <= 4) {
    const escaped = termino.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(texto);
  }
  return texto.includes(termino);
}

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
    terminos: ["luz", "edeeste", "edesur", "edenorte", "agua", "caasd", "internet", "claro", "altice", "telefono"],
  },
  {
    categoria: "Vivienda",
    terminos: ["alquiler", "renta", "mantenimiento edificio", "casa"],
  },
];

function extraerMonto(textoNorm) {
  const matchMil = textoNorm.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/);
  if (matchMil) {
    const base = parseFloat(matchMil[1].replace(",", "."));
    if (Number.isFinite(base)) return base * 1000;
  }

  const numeros = [...textoNorm.matchAll(/\b(?:rd\$|\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\b/g)];
  for (const match of numeros) {
    const valorStr = match[1].replace(/,/g, "");
    const val = parseFloat(valorStr);
    if (Number.isFinite(val) && val > 0) {
      return val;
    }
  }
  return null;
}

/**
 * Analizador universal de intenciones y acciones del usuario
 */
export function analizarIntencionAccion(texto, { prestamos = [], tarjetas = [], ordenesCompra = [], products = [], categoriasGasto = [] } = {}) {
  if (!texto || typeof texto !== "string") return null;

  const limpio = texto.trim();
  const n = normalizar(limpio);

  // 1. DETECCIÓN DE PRÉSTAMOS / DEUDAS (ej: "PT09 paga el total de este prestamo", "¿cuánto me falta para saldar PT09?")
  const matchPT = n.match(/\b(?:pt|prestamo)\s*[-_#]?\s*0?(\d+)\b/i);
  let prestamoEncontrado = null;
  let codigoBuscado = null;

  if (matchPT) {
    const numBuscadoNum = parseInt(matchPT[1], 10);
    codigoBuscado = "PT" + String(numBuscadoNum).padStart(2, "0");
    prestamoEncontrado = (prestamos || []).find((p) => {
      const pNum = (p.numero || p.codigo || "").toUpperCase().replace(/\s+/g, "");
      const matchP = pNum.match(/PT\s*0?(\d+)/i);
      return pNum === codigoBuscado || (matchP && parseInt(matchP[1], 10) === numBuscadoNum);
    });
  }

  // Si no encontró por código PT pero menciona "prestamo" o "deuda" y la entidad bancaria
  if (!prestamoEncontrado && (n.includes("prestamo") || n.includes("deuda"))) {
    for (const p of prestamos || []) {
      const eNorm = normalizar(p.entidadName || p.entidad || "");
      if (eNorm && eNorm.length > 3 && n.includes(eNorm)) {
        prestamoEncontrado = p;
        break;
      }
    }
  }

  // Si no hay objeto en lista pero el usuario especificó claramente un código como PT09
  if (!prestamoEncontrado && codigoBuscado) {
    prestamoEncontrado = {
      id: null,
      numero: codigoBuscado,
      entidadName: "Préstamo " + codigoBuscado,
      montoAprobado: 0,
      saldoActual: null,
      cuota: 0,
    };
  }

  // 1A. Consulta de saldo / cuánto falta para saldar
  const esConsultaSaldar =
    n.includes("cuanto me falta") ||
    n.includes("cuanto resta") ||
    n.includes("cuanto debo") ||
    n.includes("saldo de") ||
    n.includes("para saldar");

  if (prestamoEncontrado && esConsultaSaldar) {
    const saldoPendiente = prestamoEncontrado.saldoPendienteNumero != null
      ? prestamoEncontrado.saldoPendienteNumero
      : Number(prestamoEncontrado.saldoActual ?? prestamoEncontrado.montoAprobado) || 0;
    return {
      tipoAccion: "consulta_prestamo",
      prestamo: prestamoEncontrado,
      saldoPendiente,
      respuestaDirecta: `Para saldar el préstamo **${prestamoEncontrado.numero}** (${prestamoEncontrado.entidadName || "Préstamo"}), te faltan **RD$ ${saldoPendiente.toLocaleString("es", { minimumFractionDigits: 2 })}**. Tu cuota mensual es de **RD$ ${(Number(prestamoEncontrado.cuota || prestamoEncontrado.cuotaMensual) || 0).toLocaleString("es", { minimumFractionDigits: 2 })}** con una tasa de ${prestamoEncontrado.tasaInteres || 0}%.`,
    };
  }

  // 1B. Registro de pago de préstamo (ej: "PT09 paga el total de este prestamo", "Paga cuota PT01")
  const esOrdenPagoPrestamo =
    n.includes("paga") ||
    n.includes("pagar") ||
    n.includes("pague") ||
    n.includes("pagué") ||
    n.includes("abona") ||
    n.includes("abonar") ||
    n.includes("salda") ||
    n.includes("saldar") ||
    n.includes("liquida") ||
    n.includes("liquidar");

  if (prestamoEncontrado && esOrdenPagoPrestamo) {
    const esTotal = n.includes("total") || n.includes("saldar") || n.includes("liquidar") || n.includes("completo") || n.includes("entero");
    const esCuota = n.includes("cuota") || n.includes("mensualidad");
    let monto = extraerMonto(n);

    const saldoPendiente = prestamoEncontrado.saldoPendienteNumero != null
      ? prestamoEncontrado.saldoPendienteNumero
      : Number(prestamoEncontrado.saldoActual ?? prestamoEncontrado.montoAprobado) || 0;
    const cuotaMensual = Number(prestamoEncontrado.cuota || prestamoEncontrado.cuotaMensual) || 0;

    if (esTotal || (monto === null && !esCuota)) {
      monto = saldoPendiente > 0 ? saldoPendiente : null;
    } else if (esCuota && monto === null) {
      monto = cuotaMensual > 0 ? cuotaMensual : null;
    }

    return {
      tipoAccion: "pago_prestamo",
      prestamoId: prestamoEncontrado.id,
      prestamoNumero: prestamoEncontrado.numero,
      entidadName: prestamoEncontrado.entidadName || "",
      entidadId: prestamoEncontrado.entidadId || null,
      monto: monto ? Math.round(monto * 100) / 100 : (saldoPendiente > 0 ? saldoPendiente : null),
      saldoPendiente,
      esTotal: esTotal || (monto && saldoPendiente > 0 && monto >= saldoPendiente),
      metodoPago: n.includes("transferencia") ? "Transferencia" : n.includes("tarjeta") ? "Tarjeta de crédito" : "Efectivo",
      fecha: hoyStr(),
      descripcion: `Pago ${esTotal ? "total de liquidación" : "a"} préstamo ${prestamoEncontrado.numero}`,
      autoRegistrar: true,
    };
  }

  // 2. DETECCIÓN DE AGREGAR A LA ORDEN DE COMPRA (ej: "Agrega leche a la orden de compra", "Pon 2 panes en la orden")
  const esOrdenCompra =
    n.includes("orden de compra") ||
    n.includes("orden abierta") ||
    n.includes("la orden") ||
    n.includes("a la orden") ||
    n.includes("en la orden");

  const verbosAgregar = ["agrega", "agregar", "pon", "ponme", "anade", "añade", "mete", "coloca", "suma"];
  const esVerboAgregar = verbosAgregar.some((v) => n.startsWith(v) || n.includes(` ${v} `));

  if (esOrdenCompra && esVerboAgregar) {
    // Extraer qué producto y cantidad pide agregar
    let productoTexto = limpio
      .replace(/^(?:por favor\s+)?(?:agrega|agregar|pon|ponme|anade|añade|mete|coloca|suma)\s+/i, "")
      .replace(/\s+(?:a|en)\s+(?:la\s+)?orden(?:\s+de\s+compra|\s+abierta)?.*$/i, "")
      .trim();

    // Extraer cantidad si viene al principio (ej: "2 leches", "3 panes")
    let cantidad = 1;
    const matchCant = productoTexto.match(/^(\d+)\s+(?:unidades?\s+(?:de\s+)?)?(.+)$/i);
    if (matchCant) {
      cantidad = parseInt(matchCant[1], 10) || 1;
      productoTexto = matchCant[2].trim();
    }

    // Buscar coincidencia en products si existe
    let matchedProduct = null;
    if (Array.isArray(products) && products.length > 0 && productoTexto) {
      const pNorm = normalizar(productoTexto);
      matchedProduct = products.find((p) => normalizar(p.name).includes(pNorm) || pNorm.includes(normalizar(p.name)));
    }

    const ordenBorrador = (ordenesCompra || []).find((o) => o.estado === "Borrador");

    return {
      tipoAccion: "agregar_orden_compra",
      productoNombre: matchedProduct ? matchedProduct.name : productoTexto,
      productId: matchedProduct ? matchedProduct.id : null,
      precioUnitario: matchedProduct ? matchedProduct.price || null : null,
      cantidad,
      ordenBorradorId: ordenBorrador ? ordenBorrador.id : null,
      folioOrden: ordenBorrador ? ordenBorrador.folio : null,
      autoRegistrar: true,
    };
  }

  // 3. DETECCIÓN DE PAGO DE TARJETA (ej: "Pagué 8000 a la tarjeta Banreservas")
  const esPagoTarjeta =
    (n.includes("tarjeta") || n.includes("credito") || n.includes("crédito")) &&
    (n.includes("paga") || n.includes("pagar") || n.includes("pague") || n.includes("pagué") || n.includes("abona"));

  if (esPagoTarjeta) {
    const tarjetasActivas = (tarjetas || []).filter((t) => t.estado === "Activa" && (t.tipoTarjeta || "Crédito") === "Crédito");
    let tarjetaSeleccionada = null;
    for (const t of tarjetasActivas) {
      if (n.includes(normalizar(t.nombre)) || (t.banco && n.includes(normalizar(t.banco)))) {
        tarjetaSeleccionada = t;
        break;
      }
    }
    if (!tarjetaSeleccionada && tarjetasActivas.length === 1) {
      tarjetaSeleccionada = tarjetasActivas[0];
    }
    const monto = extraerMonto(n);
    if (monto && tarjetaSeleccionada) {
      return {
        tipoAccion: "pago_tarjeta",
        tarjetaId: tarjetaSeleccionada.id,
        tarjetaNombre: tarjetaSeleccionada.nombre,
        monto: Math.round(monto * 100) / 100,
        fecha: hoyStr(),
        descripcion: `Pago a tarjeta ${tarjetaSeleccionada.nombre}`,
        autoRegistrar: true,
      };
    }
  }

  // 4. DETECCIÓN DE INGRESO (ej: "Registra ingreso de 45000 de salario", "Cobré 15000")
  const esIngreso =
    n.includes("ingreso") ||
    n.includes("sueldo") ||
    n.includes("salario") ||
    n.includes("honorarios") ||
    n.startsWith("cobre") ||
    n.startsWith("cobré") ||
    n.includes(" cobre ") ||
    n.includes(" cobré ");

  const esComandoIngreso = n.startsWith("registra") || n.startsWith("anota") || n.startsWith("agrega") || n.includes("cobre") || n.includes("cobré");

  if (esIngreso && esComandoIngreso && !n.includes("gasto")) {
    const monto = extraerMonto(n);
    if (monto) {
      let categoria = "Salario";
      if (n.includes("freelance") || n.includes("honorarios") || n.includes("servicio")) categoria = "Honorarios";
      else if (n.includes("negocio") || n.includes("venta")) categoria = "Ventas";
      else if (n.includes("alquiler") || n.includes("renta")) categoria = "Renta recibida";

      return {
        tipoAccion: "registrar_ingreso",
        monto: Math.round(monto * 100) / 100,
        categoria,
        fecha: hoyStr(),
        descripcion: n.includes("sueldo") ? "Sueldo" : n.includes("salario") ? "Salario" : "Ingreso",
        metodoPago: n.includes("efectivo") ? "Efectivo" : "Transferencia",
        autoRegistrar: true,
      };
    }
  }

  // 5. DETECCIÓN GENERAL DE GASTOS (Combustible, Alimentos, Salud, Servicios, etc.)
  const gastoRes = parsearGastoGeneral(limpio, n, { categoriasGasto, tarjetas });
  if (gastoRes) {
    return {
      tipoAccion: "registrar_gasto",
      ...gastoRes,
    };
  }

  return null;
}

/**
 * Función especializada en parsing de gastos
 */
function parsearGastoGeneral(limpio, n, { categoriasGasto = [], tarjetas = [] } = {}) {
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

  if (!esComandoRegistro && !esReporteGasto && !tienePalabraGasto) {
    return null;
  }

  const monto = extraerMonto(n);

  let categoria = "Combustible";
  let categoriaEncontrada = false;

  for (const c of categoriasGasto) {
    const cNorm = normalizar(c.nombre);
    if (contieneTermino(n, cNorm)) {
      categoria = c.nombre;
      categoriaEncontrada = true;
      break;
    }
  }

  if (!categoriaEncontrada) {
    for (const regla of REGLAS_CATEGORIAS) {
      if (regla.terminos.some((t) => contieneTermino(n, t))) {
        categoria = regla.categoria;
        categoriaEncontrada = true;
        break;
      }
    }
  }

  if (!categoriaEncontrada) {
    if (n.includes("gasolina") || n.includes("combustible")) {
      categoria = "Combustible";
    } else {
      categoria = "Otro variable";
    }
  }

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
    if (!tarjetaId && tarjetasActivas.length === 1) {
      tarjetaId = tarjetasActivas[0].id;
      tarjetaNombre = tarjetasActivas[0].nombre;
    }
  }

  let fecha = hoyStr();
  if (n.includes("ayer")) {
    fecha = fechaRelativa(-1);
  } else if (n.includes("anteayer")) {
    fecha = fechaRelativa(-2);
  }

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

/**
 * Wrapper de compatibilidad para código existente
 */
export function analizarIntencionGasto(texto, opciones) {
  const res = analizarIntencionAccion(texto, opciones);
  if (!res) return null;
  if (res.tipoAccion === "registrar_gasto") return res;
  return null;
}
