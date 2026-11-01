// Un "fondo autosostenible" es un capital invertido cuyo rendimiento anual
// (a una tasa conservadora asumida) alcanza para pagar un gasto fijo
// recurrente indefinidamente — el mismo principio que usan las dotaciones
// (endowments): en vez de pagar la factura de tu bolsillo cada mes, el
// rendimiento de una inversión la paga por ti.

// Tasa de rendimiento anual conservadora asumida por defecto (punto medio
// de un rango razonable de 6-8% anual para una inversión de bajo riesgo).
export const TASA_RENDIMIENTO_DEFAULT = 0.07;

// Dado el monto mensual de un gasto fijo, calcula cuánto capital habría
// que tener invertido para que el rendimiento anual cubra ese gasto todo
// el año, sin tocar el capital.
export function calcularCapitalNecesario(montoMensual, tasaAnual = TASA_RENDIMIENTO_DEFAULT) {
  if (!montoMensual || montoMensual <= 0 || !tasaAnual || tasaAnual <= 0) return 0;
  const montoAnual = montoMensual * 12;
  return montoAnual / tasaAnual;
}

// Monto mensual promedio presupuestado para una categoría a lo largo del
// año (promedio de los meses que sí tienen algo presupuestado, sumando
// ambas quincenas) — más representativo que solo el mes actual, ya que
// algunos gastos fijos varían un poco de mes a mes (ej. luz).
export function montoMensualPromedio(categoriaNombre, presupuesto) {
  const porCategoria = presupuesto?.[categoriaNombre];
  if (!porCategoria) return 0;
  let sumaMeses = 0;
  let mesesConDato = 0;
  for (let m = 1; m <= 12; m++) {
    const q1 = Number(porCategoria[String(m)]?.Q1) || 0;
    const q2 = Number(porCategoria[String(m)]?.Q2) || 0;
    const totalMes = q1 + q2;
    if (totalMes > 0) {
      sumaMeses += totalMes;
      mesesConDato += 1;
    }
  }
  return mesesConDato > 0 ? sumaMeses / mesesConDato : 0;
}
