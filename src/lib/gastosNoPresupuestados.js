import { quincenaDeFecha } from "./presupuestoConsumo";

/**
 * Obtiene y analiza todos los gastos registrados que no fueron presupuestados
 * (o que tienen monto presupuestado <= 0 en esa quincena/mes).
 *
 * @param {Object} params
 * @param {Object} params.presupuesto - Objeto del presupuesto anual
 * @param {Array} params.movimientos - Lista de movimientos registrados
 * @param {Array} params.categoriasGasto - Lista de categorías de gasto configuradas
 * @param {number} params.year - Año a consultar
 * @param {number} params.month - Mes a consultar (1-12)
 * @param {string} [params.quincena] - "Q1" | "Q2" | "todas"
 * @param {Array} [params.diasCobro] - Días de cobro configurados ([15, 30])
 * @returns {Object} Resumen detallado de gastos no presupuestados
 */
export function obtenerGastosNoPresupuestados({
  presupuesto = {},
  movimientos = [],
  categoriasGasto = [],
  year,
  month,
  quincena = "todas",
  diasCobro = [15, 30],
}) {
  const targetYear = Number(year) || new Date().getFullYear();
  const targetMonth = Number(month) || new Date().getMonth() + 1;

  // Mapa de búsqueda rápida de categorías en minúsculas
  const categoriasMap = new Map();
  for (const c of categoriasGasto || []) {
    if (c?.nombre) {
      categoriasMap.set(c.nombre.trim().toLowerCase(), c);
    }
  }

  // Mapa auxiliar para normalizar nombres en el presupuesto
  const presupuestoLowerKeys = new Map();
  for (const [k, v] of Object.entries(presupuesto || {})) {
    if (k && typeof k === "string") {
      presupuestoLowerKeys.set(k.trim().toLowerCase(), { keyOriginal: k, data: v });
    }
  }

  const gastosNoPresupuestados = [];

  for (const m of movimientos || []) {
    // Solo consideramos gastos reales (no préstamos, no tarjetas, no ingresos, no transferencias)
    if (m.type !== "Gasto") continue;
    if (!m.date || typeof m.date !== "string") continue;

    const monto = Number(m.amount) || 0;
    if (monto <= 0) continue;

    const qInfo = quincenaDeFecha(m.date, diasCobro);
    if (!qInfo) continue;

    if (qInfo.year !== targetYear || qInfo.month !== targetMonth) continue;

    if (quincena !== "todas" && qInfo.quincena !== quincena) continue;

    const catNombre = (m.category || "Sin categoría").trim();
    const catLower = catNombre.toLowerCase();

    // Buscar en el presupuesto
    let presupuestadoQuincena = 0;
    const catPresupuesto = presupuestoLowerKeys.get(catLower);

    if (catPresupuesto && catPresupuesto.data) {
      const mesStr = String(qInfo.month);
      const mesPad = mesStr.padStart(2, "0");
      const valMes = catPresupuesto.data[mesStr] ?? catPresupuesto.data[qInfo.month] ?? catPresupuesto.data[mesPad];
      const valQ = valMes?.[qInfo.quincena];
      presupuestadoQuincena = Number(valQ) || 0;
    }

    // Si no tiene presupuesto asignado en esta quincena (0 o inexistente)
    if (presupuestadoQuincena <= 0) {
      const catConfig = categoriasMap.get(catLower);
      gastosNoPresupuestados.push({
        id: m.id || `${m.date}-${catNombre}-${monto}-${Math.random()}`,
        movimientoId: m.id,
        date: m.date,
        amount: monto,
        category: catNombre,
        description: m.description || catNombre,
        metodoPago: m.metodoPago || "Efectivo",
        quincena: qInfo.quincena,
        year: qInfo.year,
        month: qInfo.month,
        cuentaNombre: m.cuentaNombre || null,
        clasificacion: catConfig?.clasificacion || "Variable",
        origenChecklist: m.origenChecklist || null,
      });
    }
  }

  // Ordenar movimientos por fecha descendente
  gastosNoPresupuestados.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Agrupar por categoría
  const porCategoriaMap = new Map();
  let totalNoPresupuestado = 0;

  for (const g of gastosNoPresupuestados) {
    totalNoPresupuestado += g.amount;
    const existing = porCategoriaMap.get(g.category) || {
      categoria: g.category,
      total: 0,
      cantidad: 0,
      gastos: [],
      clasificacion: g.clasificacion,
    };
    existing.total += g.amount;
    existing.cantidad += 1;
    existing.gastos.push(g);
    porCategoriaMap.set(g.category, existing);
  }

  const porCategoria = Array.from(porCategoriaMap.values()).map((c) => ({
    ...c,
    porcentaje: totalNoPresupuestado > 0 ? (c.total / totalNoPresupuestado) * 100 : 0,
  }));

  porCategoria.sort((a, b) => b.total - a.total);

  return {
    totalNoPresupuestado,
    cantidadGastos: gastosNoPresupuestados.length,
    porCategoria,
    gastos: gastosNoPresupuestados,
    year: targetYear,
    month: targetMonth,
    quincena,
  };
}
