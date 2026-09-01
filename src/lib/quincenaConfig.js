// Clasifica cualquier fecha en la quincena (periodo de pago) a la que
// realmente pertenece, según los días de cobro configurados por el usuario
// (por defecto 15 y 30).
//
// Regla, con días de cobro [15, 30] como ejemplo:
//   - Días 1 al 14   → "Q1" de ESTE mes (la quincena arrancó el día 30/31
//     del mes ANTERIOR, y llega hasta el día 14 de este mes).
//   - Días 15 al 29  → "Q2" de ESTE mes (arranca el día 15, financiada por
//     ese cobro).
//   - Días 30/31     → "Q1" del mes SIGUIENTE (el cobro de hoy financia los
//     gastos que vienen, no los de este mes).
//
// Esto se generaliza a cualquier cantidad de días de cobro que el usuario
// configure (no solo 2): con días de cobro [c1, c2, ..., cK], cada mes tiene
// quincenas Q1 (arranca en el último cobro del mes anterior) hasta QK
// (arranca en el penúltimo cobro de este mes) — y el ÚLTIMO cobro de cada
// mes siempre arranca la Q1 del mes SIGUIENTE.
//
// Si un mes no llega a tener el día de cobro configurado (ej. día 30 en
// febrero), se usa el último día real de ese mes en su lugar.

export const DIAS_COBRO_DEFAULT = [15, 30];

function diasEnMes(year, month) {
  return new Date(year, month, 0).getDate();
}

function normalizarDiasCobro(diasCobroConfig) {
  const dias = diasCobroConfig && diasCobroConfig.length ? diasCobroConfig : DIAS_COBRO_DEFAULT;
  return [...new Set(dias)].sort((a, b) => a - b);
}

// Días de cobro reales aplicables a un mes específico (ajustando los que no
// existan en meses cortos, ej. día 30 en febrero pasa a ser 28).
function cortesDelMes(diasCobro, year, month) {
  const max = diasEnMes(year, month);
  return [...new Set(diasCobro.map((d) => Math.min(d, max)))].sort((a, b) => a - b);
}

// Clasifica una fecha "YYYY-MM-DD" y devuelve { year, month, quincena }.
export function clasificarFecha(fechaStr, diasCobroConfig) {
  const diasCobro = normalizarDiasCobro(diasCobroConfig);
  const [year, month, day] = fechaStr.split("-").map(Number);
  const cortes = cortesDelMes(diasCobro, year, month);

  // Antes del primer corte del mes → Q1 de ESTE mes (arrancó en el último
  // corte del mes anterior).
  if (day < cortes[0]) {
    return { year, month, quincena: "Q1" };
  }

  // Tramos internos del mes: del corte i al corte (i+1)-1, etiquetados
  // Q2, Q3, ... (nunca incluye el último corte, ese se maneja aparte abajo).
  for (let i = 0; i < cortes.length - 1; i++) {
    const inicio = cortes[i];
    const fin = cortes[i + 1] - 1;
    if (day >= inicio && day <= fin) {
      return { year, month, quincena: `Q${i + 2}` };
    }
  }

  // Día igual o después del ÚLTIMO corte del mes → Q1 del mes SIGUIENTE.
  let mesSiguiente = month + 1;
  let yearSiguiente = year;
  if (mesSiguiente > 12) {
    mesSiguiente = 1;
    yearSiguiente += 1;
  }
  return { year: yearSiguiente, month: mesSiguiente, quincena: "Q1" };
}

// Fecha de hoy, clasificada con la misma regla.
export function periodoActualConfigurado(diasCobroConfig, hoy = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const fechaStr = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  return clasificarFecha(fechaStr, diasCobroConfig);
}

// Cuántas quincenas tiene cada mes según la configuración (K días de cobro
// = K quincenas por mes).
export function cantidadQuincenas(diasCobroConfig) {
  return normalizarDiasCobro(diasCobroConfig).length;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Operación inversa de clasificarFecha: dado un periodo { year, month,
// quincena }, devuelve el rango real de fechas que cubre — que puede
// empezar en el mes ANTERIOR cuando quincena es "Q1" (ver la nota al
// principio del archivo).
export function rangoFechasQuincenaConfigurado(year, month, quincena, diasCobroConfig) {
  const diasCobro = normalizarDiasCobro(diasCobroConfig);
  const cortes = cortesDelMes(diasCobro, year, month);
  const num = parseInt(quincena.replace("Q", ""), 10);

  if (num === 1) {
    const mesAnterior = month === 1 ? 12 : month - 1;
    const yearAnterior = month === 1 ? year - 1 : year;
    const cortesMesAnterior = cortesDelMes(diasCobro, yearAnterior, mesAnterior);
    const inicioDia = cortesMesAnterior[cortesMesAnterior.length - 1];
    const finDia = cortes[0] - 1;
    return {
      fechaInicio: `${yearAnterior}-${pad2(mesAnterior)}-${pad2(inicioDia)}`,
      fechaFin: `${year}-${pad2(month)}-${pad2(finDia)}`,
    };
  }

  const inicioDia = cortes[num - 2];
  const finDia = cortes[num - 1] - 1;
  return {
    fechaInicio: `${year}-${pad2(month)}-${pad2(inicioDia)}`,
    fechaFin: `${year}-${pad2(month)}-${pad2(finDia)}`,
  };
}

// Dado un periodo { year, month, quincena }, devuelve el periodo siguiente
// (o anterior, si dir=-1), respetando cuántas quincenas tiene cada mes según
// la configuración.
export function periodoAdyacenteConfigurado({ year, month, quincena }, diasCobroConfig, dir = 1) {
  const total = cantidadQuincenas(diasCobroConfig);
  const num = parseInt(quincena.replace("Q", ""), 10);
  if (dir > 0) {
    if (num < total) return { year, month, quincena: `Q${num + 1}` };
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    return { year: y, month: m, quincena: "Q1" };
  } else {
    if (num > 1) return { year, month, quincena: `Q${num - 1}` };
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return { year: y, month: m, quincena: `Q${total}` };
  }
}
