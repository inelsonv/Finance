// Utilidades para la división de cuotas de préstamos entre quincenas (Q1 y Q2)
// con soporte para diversos escenarios: Anual, Semestral, Trimestral y Personalizado.

export const ESCENARIOS_DIVISION = [
  { id: "anual", label: "Anual", descripcion: "Todo el año (los 12 meses)", icon: "📅" },
  { id: "semestral", label: "Semestral", descripcion: "Por semestres (1er o 2do semestre)", icon: "🌓" },
  { id: "trimestral", label: "Trimestral", descripcion: "Por trimestres (T1, T2, T3, T4)", icon: "📊" },
  { id: "personalizado", label: "Meses específicos", descripcion: "Elegir meses individualmente", icon: "🗓️" },
];

export const NOMBRES_MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const TRIMESTRES_INFO = [
  { id: 1, label: "T1", nombre: "1er Trimestre", mesesTexto: "Ene - Mar", meses: [1, 2, 3] },
  { id: 2, label: "T2", nombre: "2do Trimestre", mesesTexto: "Abr - Jun", meses: [4, 5, 6] },
  { id: 3, label: "T3", nombre: "3er Trimestre", mesesTexto: "Jul - Sep", meses: [7, 8, 9] },
  { id: 4, label: "T4", nombre: "4to Trimestre", mesesTexto: "Oct - Dic", meses: [10, 11, 12] },
];

export const SEMESTRES_INFO = [
  { id: 1, label: "S1", nombre: "1er Semestre", mesesTexto: "Enero a Junio", meses: [1, 2, 3, 4, 5, 6] },
  { id: 2, label: "S2", nombre: "2do Semestre", mesesTexto: "Julio a Diciembre", meses: [7, 8, 9, 10, 11, 12] },
];

/**
 * Determina si un préstamo tiene activa la división de cuota en un mes específico.
 * @param {object} prestamo - Objeto del préstamo
 * @param {number} mes - Mes a consultar (1 al 12)
 * @param {number} [anio] - Año opcional
 * @returns {boolean}
 */
export function esCuotaDivididaEnMes(prestamo, mes, anio) {
  if (!prestamo || !prestamo.dividirEnQuincenas) return false;
  if (prestamo.frecuenciaCuota && prestamo.frecuenciaCuota !== "Mensual") return false;

  const numMes = Number(mes);
  if (!numMes || numMes < 1 || numMes > 12) return false;

  const escenario = prestamo.escenarioDivision || "anual";

  if (escenario === "anual") {
    return true;
  }

  if (escenario === "semestral") {
    const semestreActual = numMes <= 6 ? 1 : 2;
    const semestres = Array.isArray(prestamo.semestresDivision) && prestamo.semestresDivision.length > 0
      ? prestamo.semestresDivision
      : [1]; // Por defecto 1er semestre
    return semestres.includes(semestreActual);
  }

  if (escenario === "trimestral") {
    const trimestreActual = Math.ceil(numMes / 3);
    const trimestres = Array.isArray(prestamo.trimestresDivision) && prestamo.trimestresDivision.length > 0
      ? prestamo.trimestresDivision
      : [1]; // Por defecto T1
    return trimestres.includes(trimestreActual);
  }

  if (escenario === "personalizado") {
    const meses = Array.isArray(prestamo.mesesDivision) ? prestamo.mesesDivision : [];
    return meses.includes(numMes);
  }

  return true;
}

/**
 * Obtiene los montos correspondientes a Q1 y Q2 para un préstamo en un mes determinado.
 * @param {object} prestamo - Objeto del préstamo
 * @param {number} mes - Mes a evaluar (1 al 12)
 * @param {number} [anio] - Año a evaluar
 * @returns {{ dividida: boolean, q1: number, q2: number, total: number }}
 */
export function obtenerMontosQuincenaPrestamo(prestamo, mes, anio) {
  const cuotaTotal = Number(prestamo?.cuota) || 0;
  const dividida = esCuotaDivididaEnMes(prestamo, mes, anio);

  if (!dividida) {
    return {
      dividida: false,
      q1: cuotaTotal,
      q2: 0,
      total: cuotaTotal,
    };
  }

  const q1 = prestamo.cuotaQ1 != null ? Number(prestamo.cuotaQ1) : Math.round(cuotaTotal / 2);
  const q2 = prestamo.cuotaQ2 != null ? Number(prestamo.cuotaQ2) : cuotaTotal - q1;

  return {
    dividida: true,
    q1,
    q2,
    total: cuotaTotal,
  };
}

/**
 * Genera una descripción legible del alcance/escenario en español.
 * @param {object} prestamo
 * @returns {string}
 */
export function describirEscenarioDivision(prestamo) {
  if (!prestamo || !prestamo.dividirEnQuincenas) return "No dividida";

  const escenario = prestamo.escenarioDivision || "anual";

  if (escenario === "anual") {
    return "Anual (Todo el año · 12 meses)";
  }

  if (escenario === "semestral") {
    const sem = Array.isArray(prestamo.semestresDivision) && prestamo.semestresDivision.length > 0
      ? prestamo.semestresDivision
      : [1];
    if (sem.length === 2) return "Semestral (Ambos semestres)";
    if (sem.includes(1)) return "Semestral (1er Semestre · Ene a Jun)";
    if (sem.includes(2)) return "Semestral (2do Semestre · Jul a Dic)";
  }

  if (escenario === "trimestral") {
    const tri = Array.isArray(prestamo.trimestresDivision) && prestamo.trimestresDivision.length > 0
      ? prestamo.trimestresDivision
      : [1];
    if (tri.length === 4) return "Trimestral (Todo el año · 4 trimestres)";
    return `Trimestral (${tri.map((t) => `T${t}`).join(", ")})`;
  }

  if (escenario === "personalizado") {
    const meses = Array.isArray(prestamo.mesesDivision) ? prestamo.mesesDivision : [];
    if (meses.length === 0) return "Personalizado (Sin meses elegidos)";
    if (meses.length === 12) return "Personalizado (Todos los meses)";
    return `Meses específicos (${meses.length} de 12)`;
  }

  return "Anual";
}

/**
 * Cuenta cuántos meses al año aplica la división para este préstamo.
 * @param {object} prestamo
 * @returns {number} 0 a 12
 */
export function contarMesesDivision(prestamo) {
  if (!prestamo || !prestamo.dividirEnQuincenas) return 0;
  let count = 0;
  for (let m = 1; m <= 12; m++) {
    if (esCuotaDivididaEnMes(prestamo, m)) count++;
  }
  return count;
}
