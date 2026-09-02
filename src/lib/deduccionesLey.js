// Deducciones de ley sobre el salario en República Dominicana: AFP (fondo de
// pensiones), SFS (seguro familiar de salud), e ISR (impuesto sobre la
// renta, por tramos progresivos anuales).
//
// IMPORTANTE: estas tasas y tramos las fija el gobierno dominicano y el ISR
// se ajusta anualmente por inflación (DGII). Verifica de tiempo en tiempo
// que sigan vigentes — al momento de construir esto (verificado contra un
// volante de pago real de 2026) daban resultados exactos.

export const TASA_AFP = 0.0287; // 2.87% del salario, aporte del empleado
export const TASA_SFS = 0.0304; // 3.04% del salario, aporte del empleado

// Tramos de ISR sobre el ingreso anual gravable (después de restar AFP y
// SFS). "desde" y "hasta" son los límites del tramo; "base" es el impuesto
// acumulado de los tramos anteriores.
const TRAMOS_ISR_ANUAL = [
  { desde: 0, hasta: 416220, tasa: 0, base: 0 },
  { desde: 416220, hasta: 624329, tasa: 0.15, base: 0 },
  { desde: 624329, hasta: 867123, tasa: 0.2, base: 31216 },
  { desde: 867123, hasta: Infinity, tasa: 0.25, base: 79776 },
];

function calcularISRAnual(ingresoGravableAnual) {
  if (ingresoGravableAnual <= 0) return 0;
  const tramo = TRAMOS_ISR_ANUAL.find((t) => ingresoGravableAnual <= t.hasta) || TRAMOS_ISR_ANUAL[TRAMOS_ISR_ANUAL.length - 1];
  if (tramo.tasa === 0) return 0;
  return tramo.base + (ingresoGravableAnual - tramo.desde) * tramo.tasa;
}

// Dado un monto BRUTO mensual, calcula AFP, SFS, ISR (mensualizado) y el
// monto NETO resultante.
export function calcularDeduccionesLey(montoMensualBruto) {
  const bruto = Number(montoMensualBruto) || 0;
  if (bruto <= 0) return { bruto: 0, afp: 0, sfs: 0, isr: 0, totalDeducciones: 0, neto: 0 };

  const afp = Math.round(bruto * TASA_AFP * 100) / 100;
  const sfs = Math.round(bruto * TASA_SFS * 100) / 100;

  const anualBruto = bruto * 12;
  const anualAFP = anualBruto * TASA_AFP;
  const anualSFS = anualBruto * TASA_SFS;
  const gravableAnual = anualBruto - anualAFP - anualSFS;
  const isrAnual = calcularISRAnual(gravableAnual);
  const isr = Math.round((isrAnual / 12) * 100) / 100;

  const totalDeducciones = Math.round((afp + sfs + isr) * 100) / 100;
  const neto = Math.round((bruto - totalDeducciones) * 100) / 100;

  return { bruto, afp, sfs, isr, totalDeducciones, neto };
}

const FRECUENCIA_FACTOR_MENSUAL = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

// Suma el ingreso mensual de todas las fuentes activas — para las que
// tengan marcado "aplicaDeduccionesLey", usa el monto NETO (después de
// AFP/SFS/ISR) en vez del bruto.
export function ingresoMensualNeto(fuentesIngreso) {
  let total = 0;
  for (const f of fuentesIngreso || []) {
    if (f.estado !== "Activo" || f.montoEsperado == null) continue;
    const factor = FRECUENCIA_FACTOR_MENSUAL[f.frecuencia] ?? 1;
    const brutoMensual = f.montoEsperado * factor;
    if (f.aplicaDeduccionesLey) {
      total += calcularDeduccionesLey(brutoMensual).neto;
    } else {
      total += brutoMensual;
    }
  }
  return total;
}
