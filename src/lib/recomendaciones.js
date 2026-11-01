// A partir del historial de compras (fechas en que se compró cada producto),
// calcula el intervalo promedio entre compras y sugiere cuáles productos ya
// deberían reabastecerse según ese patrón.

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(fechaA, fechaB) {
  const a = new Date(fechaA + "T00:00:00");
  const b = new Date(fechaB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

// Requiere al menos 2 compras para poder calcular un intervalo. Con 2 compras el
// intervalo es una sola muestra (menos confiable); con 3+ se promedia.
export function calcularSugerenciasRecompra(historial, { minCompras = 2 } = {}) {
  const porProducto = {};
  for (const h of historial) {
    if (!h.productId || !h.fecha) continue;
    if (!porProducto[h.productId]) porProducto[h.productId] = { productName: h.productName, fechas: [] };
    porProducto[h.productId].fechas.push(h.fecha);
    if (h.productName) porProducto[h.productId].productName = h.productName;
  }

  const hoy = todayStr();
  const sugerencias = [];

  for (const [productId, info] of Object.entries(porProducto)) {
    const fechas = [...new Set(info.fechas)].sort();
    if (fechas.length < minCompras) continue;

    const intervalos = [];
    for (let i = 1; i < fechas.length; i++) {
      intervalos.push(diasEntre(fechas[i - 1], fechas[i]));
    }
    const intervalosValidos = intervalos.filter((d) => d > 0);
    if (intervalosValidos.length === 0) continue;

    const promedio = intervalosValidos.reduce((s, d) => s + d, 0) / intervalosValidos.length;
    const ultimaCompra = fechas[fechas.length - 1];
    const diasDesdeUltima = diasEntre(ultimaCompra, hoy);
    const diasParaProxima = Math.round(promedio - diasDesdeUltima);

    // Solo sugerir si ya se cumplió al menos el 85% del intervalo habitual.
    if (diasDesdeUltima >= promedio * 0.85) {
      sugerencias.push({
        productId,
        productName: info.productName,
        promedioDias: Math.round(promedio),
        diasDesdeUltima,
        diasParaProxima,
        vencido: diasParaProxima < 0,
        totalCompras: fechas.length,
      });
    }
  }

  return sugerencias.sort((a, b) => a.diasParaProxima - b.diasParaProxima);
}
