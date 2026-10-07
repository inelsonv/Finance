// Metodologías de Presupuesto Financiero
// 50/30/20, Base Cero, 70/20/10, 80/20, 60/20/20, Sobres y Personalizado

export const METODOLOGIAS = {
  "50-30-20": {
    id: "50-30-20",
    nombre: "Regla 50 / 30 / 20",
    autor: "Elizabeth Warren",
    badge: "50% Necesidades · 30% Deseos · 20% Ahorro",
    resumenCorto: "El estándar de oro para finanzas balanceadas y sostenibles.",
    descripcion:
      "Destina el 50% de tus ingresos a Necesidades básicas (vivienda, comida, servicios, transporte, préstamos), 30% a Deseos (estilo de vida, salidas, entretenimiento), y 20% a Ahorro, Fondo de Emergencia e Inversión.",
    pilares: {
      necesidad: { pct: 50, label: "Necesidades Básicas", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
      deseo: { pct: 30, label: "Deseos y Estilo de Vida", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "☕" },
      ahorro: { pct: 20, label: "Ahorro e Inversión", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
    },
  },
  "base-cero": {
    id: "base-cero",
    nombre: "Presupuesto Base Cero (Zero-Based)",
    autor: "Dave Ramsey",
    badge: "Ingresos - Gastos - Ahorros = Exactamente $0",
    resumenCorto: "Cada peso tiene una misión asignada antes de gastarlo.",
    descripcion:
      "Cada centavo que entra tiene un propósito específico asignado. El ingreso total mensual menos todo lo presupuestado (gastos esenciales, deseos y ahorros) debe dar exactamente cero. Nada queda en el aire ni se gasta sin planificar.",
    esBaseCero: true,
    pilares: {
      necesidad: { pct: 55, label: "Necesidades y Compromisos", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
      deseo: { pct: 25, label: "Estilo de Vida y Deseos", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "☕" },
      ahorro: { pct: 20, label: "Ahorro, Inversión y Deudas", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
    },
  },
  "70-20-10": {
    id: "70-20-10",
    nombre: "Regla 70 / 20 / 10",
    autor: "Tradicional / Diezmo y Deudas",
    badge: "70% Vida · 20% Ahorro · 10% Diezmo / Deudas",
    resumenCorto: "Excelente para quienes diezman o amortizan deudas agresivamente.",
    descripcion:
      "70% para Gastos de vida (necesidades y estilo de vida combinados), 20% para Ahorro e Inversión de largo plazo, y 10% reservado para Diezmo, Donaciones o Reducción acelerada de deudas.",
    pilares: {
      necesidad: { pct: 70, label: "Gastos de Vida", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
      ahorro: { pct: 20, label: "Ahorro e Inversión", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
      donacion: { pct: 10, label: "Diezmo / Donaciones / Deudas", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)", icon: "🤝" },
    },
  },
  "80-20": {
    id: "80-20",
    nombre: "Regla 80 / 20 (Págate a ti primero)",
    autor: "Pay Yourself First",
    badge: "20% Ahorro Primero · 80% Gastos Libres",
    resumenCorto: "Sencillo: aparta tu ahorro primero y gasta el resto sin remordimientos.",
    descripcion:
      "Apenas recibes tus ingresos, apartas automáticamente el 20% para tu fondo de ahorro e inversión. Luego vives y cubres todas tus necesidades y gustos con el 80% restante sin tener que llevar un control micro.",
    pilares: {
      ahorro: { pct: 20, label: "Ahorro Prioritario (Primero)", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
      necesidad: { pct: 80, label: "Gastos y Vida Diaria", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
    },
  },
  "60-20-20": {
    id: "60-20-20",
    nombre: "Regla 60 / 20 / 20 (Equilibrado)",
    autor: "Richard Jenkins",
    badge: "60% Esenciales · 20% Metas/Deuda · 20% Deseos",
    resumenCorto: "Ideal si tus compromisos fijos ocupan más del 50%.",
    descripcion:
      "60% a Gastos esenciales y compromisos obligatorios, 20% para Ahorro a largo plazo y liquidación de deudas, y 20% para Recreación, salidas y gustos personales.",
    pilares: {
      necesidad: { pct: 60, label: "Gastos Esenciales", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
      ahorro: { pct: 20, label: "Metas Financieras y Deudas", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
      deseo: { pct: 20, label: "Deseos y Recreación", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "☕" },
    },
  },
  "sobres": {
    id: "sobres",
    nombre: "Sistema de Sobres (Envelopes)",
    autor: "Límites Estrictos",
    badge: "Topes fijos e inflexibles por categoría",
    resumenCorto: "Asigna un cupo estricto a cada sobre quincenal.",
    descripcion:
      "Asigna un límite máximo a cada categoría. Si el dinero del sobre se agota en la quincena, no se gasta más en esa categoría hasta el siguiente ciclo.",
    esSobres: true,
    pilares: {
      necesidad: { pct: 50, label: "Sobres de Necesidades", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "🏠" },
      deseo: { pct: 30, label: "Sobres de Deseos", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "☕" },
      ahorro: { pct: 20, label: "Sobres de Ahorro", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "📈" },
    },
  },
  "personalizado": {
    id: "personalizado",
    nombre: "Presupuesto Personalizado (Custom)",
    autor: "Tus Propias Reglas",
    badge: "Define tus propios porcentajes",
    resumenCorto: "Ajusta tus propios porcentajes según tu realidad.",
    descripcion:
      "Tú tienes el control absoluto. Ajusta los porcentajes de Necesidades, Deseos, Ahorro e Inversión y Donaciones para que se adapten con exactitud a tu estilo de vida.",
    esPersonalizado: true,
  },
};

// Clasificación automática de una categoría de gasto en su pilar correspondiente
export function clasificarPilarCategoria(categoriaNombre, pilaresGuardados = {}) {
  if (pilaresGuardados && pilaresGuardados[categoriaNombre]) {
    return pilaresGuardados[categoriaNombre];
  }
  const n = (categoriaNombre || "").toLowerCase();
  if (/diezmo|iglesia|donacion|ofrenda|caridad/i.test(n)) return "donacion";
  if (/ahorro|inversion|fondo|meta|retiro|emergencia|cripto|bolsa|acciones/i.test(n)) return "ahorro";
  if (
    /vivienda|alquiler|hipoteca|supermercado|comida|alimento|luz|agua|gas|internet|telefono|celular|salud|medico|farmacia|medicina|seguro|transporte|gasolina|combustible|colegio|educacion|mantenimiento|prestamo/i.test(
      n
    )
  ) {
    return "necesidad";
  }
  if (
    /restaurante|cafe|salida|entretenimiento|cine|ropa|moda|viaje|vacaciones|hobby|juegos|streaming|netflix|delivery|regalo|belleza|peluqueria|gym|gimnasio/i.test(
      n
    )
  ) {
    return "deseo";
  }
  return "necesidad";
}

// Calcula los montos reales actuales agrupados por pilar para un mes dado
export function calcularTotalesPorPilar({
  categorias = [],
  presupuesto = {},
  mes = 1,
  pilaresGuardados = {},
  prestamosTotalMes = 0,
  contratosTotalMes = 0,
  metasTotalMes = 0,
  vacacionesTotalMes = 0,
  renovacionesTotalMes = 0,
  diezmoTotalMes = 0,
  ahorroAutoTotalMes = 0,
}) {
  const totales = {
    necesidad: 0,
    deseo: 0,
    ahorro: 0,
    donacion: 0,
  };

  // Sumar categorías de gasto
  for (const cat of categorias) {
    const pilar = clasificarPilarCategoria(cat.nombre, pilaresGuardados);
    const q1 = Number(presupuesto?.[cat.nombre]?.[String(mes)]?.Q1) || 0;
    const q2 = Number(presupuesto?.[cat.nombre]?.[String(mes)]?.Q2) || 0;
    const sum = q1 + q2;
    if (totales[pilar] != null) {
      totales[pilar] += sum;
    } else {
      totales.necesidad += sum;
    }
  }

  // Préstamos y contratos fijos son Necesidades/Compromisos obligatorios
  totales.necesidad += Number(prestamosTotalMes) || 0;
  totales.necesidad += Number(contratosTotalMes) || 0;

  // Metas de ahorro van al pilar de Ahorro
  totales.ahorro += Number(metasTotalMes) || 0;
  totales.ahorro += Number(ahorroAutoTotalMes) || 0;

  // Vacaciones van a Deseos
  totales.deseo += Number(vacacionesTotalMes) || 0;

  // Renovaciones obligatorias van a Necesidades
  totales.necesidad += Number(renovacionesTotalMes) || 0;

  // Diezmo / Donaciones
  totales.donacion += Number(diezmoTotalMes) || 0;

  const totalPresupuestado = totales.necesidad + totales.deseo + totales.ahorro + totales.donacion;

  return { totales, totalPresupuestado };
}

// Genera una sugerencia de distribución automática según la metodología activa
export function generarDistribucionMetodologia({
  metodologiaId = "50-30-20",
  customPct = { necesidad: 50, deseo: 30, ahorro: 20 },
  ingresoMensual = 0,
  categorias = [],
  pilaresGuardados = {},
  prestamosTotalMes = 0,
  contratosTotalMes = 0,
  metasTotalMes = 0,
  diezmoTotalMes = 0,
  modoReparto = "proporcional", // "proporcional" | "equitativo"
  movimientos = [],
  presupuestoActual = {},
  mes = 1,
}) {
  if (!ingresoMensual || ingresoMensual <= 0) return {};

  const dist = {};
  const metodo = METODOLOGIAS[metodologiaId] || METODOLOGIAS["50-30-20"];

  // Separar categorías por pilar
  const catsPorPilar = {
    necesidad: [],
    deseo: [],
    ahorro: [],
    donacion: [],
  };

  for (const c of categorias) {
    if (c.soloAsignablePorPuntos) continue;
    const pilar = clasificarPilarCategoria(c.nombre, pilaresGuardados);
    if (catsPorPilar[pilar]) catsPorPilar[pilar].push(c);
    else catsPorPilar.necesidad.push(c);
  }

  // Determinar porcentajes de los pilares
  let pilaresConfig = {};
  if (metodo.esPersonalizado) {
    pilaresConfig = {
      necesidad: { pct: customPct.necesidad ?? 50 },
      deseo: { pct: customPct.deseo ?? 30 },
      ahorro: { pct: customPct.ahorro ?? 20 },
      ...(customPct.donacion > 0 ? { donacion: { pct: customPct.donacion } } : {}),
    };
  } else if (metodo.pilares) {
    pilaresConfig = metodo.pilares;
  } else {
    pilaresConfig = METODOLOGIAS["50-30-20"].pilares;
  }

  if (metodo.esBaseCero) {
    // BASE CERO:
    // Ingresos - Compromisos Fijos = Remanente disponible
    const fijos = Number(prestamosTotalMes) + Number(contratosTotalMes) + Number(metasTotalMes) + Number(diezmoTotalMes);
    const remanente = Math.max(0, ingresoMensual - fijos);

    // Asignar 60% del remanente a necesidades variables, 25% a deseos, 15% a ahorro extra
    const cupoNecesidades = remanente * 0.6;
    const cupoDeseos = remanente * 0.25;
    const cupoAhorro = remanente * 0.15;

    repartirEnCategorias(catsPorPilar.necesidad, cupoNecesidades, dist, modoReparto, movimientos, presupuestoActual, mes, "necesidad");
    repartirEnCategorias(catsPorPilar.deseo, cupoDeseos, dist, modoReparto, movimientos, presupuestoActual, mes, "deseo");
    repartirEnCategorias(catsPorPilar.ahorro, cupoAhorro, dist, modoReparto, movimientos, presupuestoActual, mes, "ahorro");
    if (catsPorPilar.donacion.length > 0 && diezmoTotalMes === 0) {
      repartirEnCategorias(catsPorPilar.donacion, remanente * 0.05, dist, modoReparto, movimientos, presupuestoActual, mes, "donacion");
    }
  } else {
    // Métodos basados en porcentajes (50/30/20, 70/20/10, 80/20, 60/20/20, Sobres, Personalizado)
    for (const [pilarKey, cfg] of Object.entries(pilaresConfig)) {
      const montoCupo = (ingresoMensual * (cfg.pct || 0)) / 100;
      let montoAjustado = montoCupo;

      // Restar préstamos y contratos del cupo de necesidades si corresponde
      if (pilarKey === "necesidad") {
        montoAjustado = Math.max(0, montoCupo - Number(prestamosTotalMes) - Number(contratosTotalMes));
      } else if (pilarKey === "ahorro") {
        montoAjustado = Math.max(0, montoCupo - Number(metasTotalMes));
      } else if (pilarKey === "donacion") {
        montoAjustado = Math.max(0, montoCupo - Number(diezmoTotalMes));
      }

      const lista = catsPorPilar[pilarKey] || [];
      repartirEnCategorias(lista, montoAjustado, dist, modoReparto, movimientos, presupuestoActual, mes, pilarKey);
    }
  }

  return dist;
}

function repartirEnCategorias(
  listaCategorias,
  montoTotal,
  outDist,
  modoReparto,
  movimientos = [],
  presupuestoActual = {},
  mes = 1,
  pilarKey = "necesidad"
) {
  if (!listaCategorias || listaCategorias.length === 0 || !montoTotal || montoTotal <= 0) return;

  if (modoReparto === "proporcional") {
    // Calcular pesos basados en historial de gastos reales o en presupuesto existente
    const pesos = {};
    let pesoTotal = 0;

    for (const c of listaCategorias) {
      // 1. Buscar gastos en movimientos
      const gastoHistorico = (movimientos || [])
        .filter((m) => m.type === "Gasto" && m.category === c.nombre)
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

      // 2. O presupuesto previo
      const q1 = Number(presupuestoActual?.[c.nombre]?.[String(mes)]?.Q1) || 0;
      const q2 = Number(presupuestoActual?.[c.nombre]?.[String(mes)]?.Q2) || 0;
      const presupPrevio = q1 + q2;

      const base = gastoHistorico > 0 ? gastoHistorico : presupPrevio > 0 ? presupPrevio : 1;
      pesos[c.nombre] = base;
      pesoTotal += base;
    }

    if (pesoTotal > 0) {
      let sumaAsignada = 0;
      listaCategorias.forEach((c, idx) => {
        const esUltimo = idx === listaCategorias.length - 1;
        const proporcion = pesos[c.nombre] / pesoTotal;
        const totalMes = esUltimo
          ? Math.max(0, Math.round(montoTotal - sumaAsignada))
          : Math.round(montoTotal * proporcion);
        sumaAsignada += totalMes;

        const q1 = Math.round(totalMes / 2);
        const q2 = totalMes - q1;
        outDist[c.nombre] = { Q1: q1, Q2: q2, totalMes, pilar: pilarKey };
      });
      return;
    }
  }

  // Reparto equitativo por defecto
  const porCategoria = Math.round(montoTotal / listaCategorias.length);
  const q1 = Math.round(porCategoria / 2);
  const q2 = porCategoria - q1;

  for (const c of listaCategorias) {
    outDist[c.nombre] = { Q1: q1, Q2: q2, totalMes: porCategoria, pilar: pilarKey };
  }
}
