import { calcularDeduccionesLey } from "./deduccionesLey";
import { quincenaDeFecha } from "./presupuestoConsumo";

const FRECUENCIA_FACTOR_MENSUAL = {
  Semanal: 52 / 12,
  Quincenal: 2,
  Mensual: 1,
  Anual: 1 / 12,
  Único: 0,
};

/**
 * Calcula de manera exhaustiva el Presupuesto de Ingresos Anual para un año determinado,
 * considerando:
 * 1. Ingresos regulares mensuales con o sin deducciones de ley (AFP, SFS, ISR).
 * 2. Regalía Pascual (Salario de Navidad / Sueldo 13 - Ley 16-92) exenta de ley en diciembre Q2.
 * 3. Bonificación anual (participación de utilidades, Art. 223 Código de Trabajo RD).
 * 4. Bono vacacional (compensación por vacaciones, Art. 177 Código de Trabajo RD).
 * 5. Otros ingresos puntuales programados para ese año.
 *
 * @param {Object} params
 * @param {Array} params.fuentesIngreso - Fuentes de ingreso del usuario
 * @param {Array} params.ingresosPuntuales - Ingresos extraordinarios registrados
 * @param {Array} params.vacaciones - Registro de vacaciones
 * @param {number} params.year - Año a presupuestar (ej. 2026, 2027)
 * @param {Array} params.diasCobro - Días de corte quincenal [15, 30]
 */
export function calcularPresupuestoIngresosAnual({
  fuentesIngreso = [],
  ingresosPuntuales = [],
  vacaciones = [],
  year = new Date().getFullYear(),
  diasCobro = [15, 30],
}) {
  const targetYear = Number(year) || new Date().getFullYear();

  // 1. ANÁLISIS DE FUENTES DE INGRESO REGULARES
  let regularBrutoMensual = 0;
  let regularNetoMensual = 0;
  let afpMensual = 0;
  let sfsMensual = 0;
  let isrMensual = 0;
  let totalDeduccionesMensual = 0;

  // Salario ordinario mensual específico de fuentes tipo "Salario" (para regalía y bonificaciones)
  let salarioOrdinarioBrutoMensual = 0;
  let tieneFuentesSalario = false;
  let diasVacacionesTotales = 0;

  for (const f of fuentesIngreso || []) {
    if (f.estado === "Inactivo" || f.estado === "inactivo") continue;
    const montoRaw = Number(f.montoEsperado ?? f.monto ?? f.montoNeto ?? f.salario) || 0;
    if (montoRaw <= 0) continue;

    const factor =
      FRECUENCIA_FACTOR_MENSUAL[f.frecuencia] ??
      (f.frecuencia === "quincenal" ? 2 : f.frecuencia === "semanal" ? 52 / 12 : 1);
    const brutoMensual = montoRaw * factor;
    regularBrutoMensual += brutoMensual;

    const esSalario = (f.tipo || "").toLowerCase() === "salario" || f.aplicaDeduccionesLey;
    if (esSalario) {
      salarioOrdinarioBrutoMensual += brutoMensual;
      tieneFuentesSalario = true;
      if (f.diasVacacionesAnuales) {
        diasVacacionesTotales += Number(f.diasVacacionesAnuales) || 0;
      }
    }

    if (f.aplicaDeduccionesLey) {
      const ded = calcularDeduccionesLey(brutoMensual);
      regularNetoMensual += ded.neto;
      afpMensual += ded.afp;
      sfsMensual += ded.sfs;
      isrMensual += ded.isr;
      totalDeduccionesMensual += ded.totalDeducciones;
    } else {
      regularNetoMensual += brutoMensual;
    }
  }

  const regularBrutoAnual = regularBrutoMensual * 12;
  const regularNetoAnual = regularNetoMensual * 12;
  const afpAnual = afpMensual * 12;
  const sfsAnual = sfsMensual * 12;
  const isrAnual = isrMensual * 12;
  const totalDeduccionesAnual = totalDeduccionesMensual * 12;
  const regularNetoQuincenal = regularNetoMensual / 2;

  // 2. BUSCAR O PROYECTAR INGRESOS PUNTUALES DEL AÑO
  // Filtrar ingresos puntuales registrados para este año
  const puntualesDelAno = (ingresosPuntuales || []).filter((ip) => {
    if (!ip.fecha || typeof ip.fecha !== "string") return false;
    const y = parseInt(ip.fecha.slice(0, 4), 10);
    return y === targetYear;
  });

  // A) REGALÍA PASCUAL (Salario de Navidad / Sueldo 13 / Ley 16-92)
  // 100% exenta de TSS e ISR en República Dominicana.
  const regaliasRegistradas = puntualesDelAno.filter((ip) => {
    const t = (ip.tipo || "").toLowerCase();
    return t.includes("regalía") || t.includes("regalia") || t.includes("navidad") || t.includes("sueldo 13");
  });

  let regaliaPascualMonto = 0;
  let regaliaPascualQuincena = "12-Q2"; // Diciembre segunda quincena por ley (antes del 20 de dic)
  let regaliaEsEstimada = false;

  if (regaliasRegistradas.length > 0) {
    regaliaPascualMonto = regaliasRegistradas.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    const primerReg = regaliasRegistradas[0];
    const qInfo = quincenaDeFecha(primerReg.fecha, diasCobro);
    if (qInfo) regaliaPascualQuincena = `${qInfo.month}-${qInfo.quincena}`;
  } else if (tieneFuentesSalario && salarioOrdinarioBrutoMensual > 0) {
    // Estimación legal: 1 salario mensual ordinario bruto exento de ley
    regaliaPascualMonto = salarioOrdinarioBrutoMensual;
    regaliaEsEstimada = true;
  }

  // B) BONIFICACIÓN ANUAL (Art. 223 Código de Trabajo RD)
  // Participación en beneficios de la empresa (generalmente entre 45 y 60 días de salario)
  const bonificacionesRegistradas = puntualesDelAno.filter((ip) => {
    const t = (ip.tipo || "").toLowerCase();
    return t.includes("bonific") || t.includes("utilidad");
  });

  let bonificacionMonto = 0;
  let bonificacionQuincena = "4-Q2"; // Típicamente abril o mayo en RD tras cierre fiscal
  let bonificacionEsEstimada = false;

  if (bonificacionesRegistradas.length > 0) {
    bonificacionMonto = bonificacionesRegistradas.reduce((sum, b) => sum + (Number(b.monto) || 0), 0);
    const primerB = bonificacionesRegistradas[0];
    const qInfo = quincenaDeFecha(primerB.fecha, diasCobro);
    if (qInfo) bonificacionQuincena = `${qInfo.month}-${qInfo.quincena}`;
  } else if (tieneFuentesSalario && salarioOrdinarioBrutoMensual > 0) {
    // Estimación legal estándar (45 días = 1.5 meses de salario ordinario)
    // Se proyecta por defecto si el usuario tiene salario
    bonificacionMonto = Math.round(salarioOrdinarioBrutoMensual * 1.5);
    bonificacionEsEstimada = true;
  }

  // C) BONO VACACIONAL (Art. 177 Código de Trabajo RD)
  // En RD por ley son 14 días laborables de salario ordinario (salario diario = salario / 23.83)
  const bonosVacacionalesRegistrados = puntualesDelAno.filter((ip) => {
    const t = (ip.tipo || "").toLowerCase();
    return t.includes("vacacion") || t.includes("vacacional");
  });

  let bonoVacacionalMonto = 0;
  let bonoVacacionalQuincena = "7-Q1"; // Típicamente mitad de año o cuando hay vacaciones
  let bonoVacacionalEsEstimado = false;

  if (bonosVacacionalesRegistrados.length > 0) {
    bonoVacacionalMonto = bonosVacacionalesRegistrados.reduce((sum, bv) => sum + (Number(bv.monto) || 0), 0);
    const primerBV = bonosVacacionalesRegistrados[0];
    const qInfo = quincenaDeFecha(primerBV.fecha, diasCobro);
    if (qInfo) bonoVacacionalQuincena = `${qInfo.month}-${qInfo.quincena}`;
  } else if (tieneFuentesSalario && salarioOrdinarioBrutoMensual > 0) {
    // 14 días laborables: (salario / 23.83) * 14 = ~0.587 de salario mensual
    const dias = diasVacacionesTotales > 0 ? diasVacacionesTotales : 14;
    const salarioDiario = salarioOrdinarioBrutoMensual / 23.83;
    bonoVacacionalMonto = Math.round(salarioDiario * dias);
    bonoVacacionalEsEstimado = true;

    // Si hay vacaciones registradas en el año, usar el mes de la primera vacación
    const vacacionEnAno = (vacaciones || []).find((v) => {
      if (!v.fechaInicio) return false;
      return parseInt(v.fechaInicio.slice(0, 4), 10) === targetYear;
    });
    if (vacacionEnAno) {
      const qInfo = quincenaDeFecha(vacacionEnAno.fechaInicio, diasCobro);
      if (qInfo) bonoVacacionalQuincena = `${qInfo.month}-${qInfo.quincena}`;
    }
  }

  // D) OTROS INGRESOS PUNTUALES
  const otrosPuntualesRegistrados = puntualesDelAno.filter((ip) => {
    const t = (ip.tipo || "").toLowerCase();
    return (
      !t.includes("regalía") &&
      !t.includes("regalia") &&
      !t.includes("navidad") &&
      !t.includes("sueldo 13") &&
      !t.includes("bonific") &&
      !t.includes("utilidad") &&
      !t.includes("vacacion")
    );
  });
  const otrosPuntualesMonto = otrosPuntualesRegistrados.reduce((sum, op) => sum + (Number(op.monto) || 0), 0);

  // 3. CONSTRUCCIÓN DE LA MALLA QUINCENAL (24 quincenas: 1-Q1 a 12-Q2)
  const ingresosPorQuincena = {};
  for (let m = 1; m <= 12; m++) {
    for (const q of ["Q1", "Q2"]) {
      const key = `${m}-${q}`;
      ingresosPorQuincena[key] = {
        regularNeto: regularNetoQuincenal,
        regalia: 0,
        bonificacion: 0,
        bonoVacacional: 0,
        otrosPuntuales: 0,
        total: regularNetoQuincenal,
        detallesPuntuales: [],
      };
    }
  }

  // Asignar Regalía Pascual a su quincena
  if (regaliaPascualMonto > 0 && ingresosPorQuincena[regaliaPascualQuincena]) {
    ingresosPorQuincena[regaliaPascualQuincena].regalia += regaliaPascualMonto;
    ingresosPorQuincena[regaliaPascualQuincena].total += regaliaPascualMonto;
    ingresosPorQuincena[regaliaPascualQuincena].detallesPuntuales.push({
      tipo: "Regalía Pascual (Sueldo 13)",
      monto: regaliaPascualMonto,
      estimada: regaliaEsEstimada,
    });
  }

  // Asignar Bonificación a su quincena
  if (bonificacionMonto > 0 && ingresosPorQuincena[bonificacionQuincena]) {
    ingresosPorQuincena[bonificacionQuincena].bonificacion += bonificacionMonto;
    ingresosPorQuincena[bonificacionQuincena].total += bonificacionMonto;
    ingresosPorQuincena[bonificacionQuincena].detallesPuntuales.push({
      tipo: "Bonificación Anual",
      monto: bonificacionMonto,
      estimada: bonificacionEsEstimada,
    });
  }

  // Asignar Bono Vacacional a su quincena
  if (bonoVacacionalMonto > 0 && ingresosPorQuincena[bonoVacacionalQuincena]) {
    ingresosPorQuincena[bonoVacacionalQuincena].bonoVacacional += bonoVacacionalMonto;
    ingresosPorQuincena[bonoVacacionalQuincena].total += bonoVacacionalMonto;
    ingresosPorQuincena[bonoVacacionalQuincena].detallesPuntuales.push({
      tipo: "Bono Vacacional",
      monto: bonoVacacionalMonto,
      estimada: bonoVacacionalEsEstimado,
    });
  }

  // Asignar otros ingresos puntuales
  for (const op of otrosPuntualesRegistrados) {
    const qInfo = quincenaDeFecha(op.fecha, diasCobro);
    if (!qInfo) continue;
    const key = `${qInfo.month}-${qInfo.quincena}`;
    if (ingresosPorQuincena[key]) {
      const monto = Number(op.monto) || 0;
      ingresosPorQuincena[key].otrosPuntuales += monto;
      ingresosPorQuincena[key].total += monto;
      ingresosPorQuincena[key].detallesPuntuales.push({
        tipo: op.tipo || "Ingreso extraordinario",
        monto,
        notas: op.notas || "",
        fecha: op.fecha,
      });
    }
  }

  // Total anual global de ingresos
  const totalIngresoAnual =
    regularNetoAnual +
    regaliaPascualMonto +
    bonificacionMonto +
    bonoVacacionalMonto +
    otrosPuntualesMonto;

  return {
    year: targetYear,
    // Valores mensuales regulares
    regularBrutoMensual,
    regularNetoMensual,
    afpMensual,
    sfsMensual,
    isrMensual,
    totalDeduccionesMensual,
    regularNetoQuincenal,

    // Valores anuales
    regularBrutoAnual,
    afpAnual,
    sfsAnual,
    isrAnual,
    totalDeduccionesAnual,
    regularNetoAnual,

    // Ingresos extraordinarios y beneficios anuales
    regaliaPascual: {
      monto: regaliaPascualMonto,
      quincena: regaliaPascualQuincena,
      esEstimada: regaliaEsEstimada,
    },
    bonificacion: {
      monto: bonificacionMonto,
      quincena: bonificacionQuincena,
      esEstimada: bonificacionEsEstimada,
    },
    bonoVacacional: {
      monto: bonoVacacionalMonto,
      quincena: bonoVacacionalQuincena,
      esEstimada: bonoVacacionalEsEstimado,
    },
    otrosPuntuales: {
      monto: otrosPuntualesMonto,
      items: otrosPuntualesRegistrados,
    },

    // Total general anual
    totalIngresoAnual,

    // Malla quincenal para la tabla
    ingresosPorQuincena,
  };
}
