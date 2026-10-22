// Proyecta, según el ritmo real de pago de un préstamo (no el plazo
// original), cuándo quedaría saldado por completo.
//
// Lógica:
// 1. Ritmo diario = total pagado ÷ días desde el primer pago hasta hoy.
// 2. Saldo pendiente = total del préstamo − total pagado.
// 3. Días restantes = saldo pendiente ÷ ritmo diario.
// 4. Fecha proyectada = hoy + días restantes.
export function calcularProyeccionPago(prestamo, movimientos, hoy = new Date()) {
  const pagos = (movimientos || [])
    .filter((m) => m.prestamoId === prestamo.id && m.date)
    .map((m) => ({ date: m.date, amount: Number(m.amount) || 0 }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (pagos.length === 0) return null;

  let totalAPagar = 0;
  if (prestamo.frecuenciaCuota === "Personalizado") {
    totalAPagar = (prestamo.cuotasPersonalizadas || []).reduce((s, c) => s + (Number(c.monto) || 0), 0);
  } else {
    const meses = prestamo.plazoUnidad === "años" ? (Number(prestamo.plazo) || 0) * 12 : Number(prestamo.plazo) || 0;
    totalAPagar = (Number(prestamo.cuota) || 0) * meses;
  }
  if (totalAPagar <= 0) return null;

  const totalPagado = pagos.reduce((s, p) => s + p.amount, 0);
  const saldoPendiente = totalAPagar - totalPagado;
  if (saldoPendiente <= 0) {
    return { yaSaldado: true, totalPagado, totalAPagar };
  }

  const primerPagoFecha = new Date(pagos[0].date + "T00:00:00");
  const diasTranscurridos = Math.max(1, Math.round((hoy - primerPagoFecha) / (1000 * 60 * 60 * 24)));
  const ritmoDiario = totalPagado / diasTranscurridos;
  if (ritmoDiario <= 0) return null;

  const diasRestantes = Math.ceil(saldoPendiente / ritmoDiario);
  const fechaProyectada = new Date(hoy);
  fechaProyectada.setDate(fechaProyectada.getDate() + diasRestantes);

  // Fecha de vencimiento según el plazo ORIGINAL, para comparar.
  let fechaOriginal = null;
  if (prestamo.fechaInicio && prestamo.frecuenciaCuota !== "Personalizado") {
    const inicio = new Date(prestamo.fechaInicio + "T00:00:00");
    const mesesPlazo = prestamo.plazoUnidad === "años" ? (Number(prestamo.plazo) || 0) * 12 : Number(prestamo.plazo) || 0;
    fechaOriginal = new Date(inicio);
    fechaOriginal.setMonth(fechaOriginal.getMonth() + mesesPlazo);
  } else if (prestamo.frecuenciaCuota === "Personalizado") {
    const fechas = (prestamo.cuotasPersonalizadas || []).map((c) => c.fecha).filter(Boolean).sort();
    if (fechas.length > 0) fechaOriginal = new Date(fechas[fechas.length - 1] + "T00:00:00");
  }

  let diasDiferencia = null;
  if (fechaOriginal) {
    diasDiferencia = Math.round((fechaProyectada - fechaOriginal) / (1000 * 60 * 60 * 24));
  }

  return {
    yaSaldado: false,
    fechaProyectada,
    fechaOriginal,
    diasDiferencia, // positivo = atrasado respecto al plan, negativo = adelantado
    totalPagado,
    totalAPagar,
    saldoPendiente,
    ritmoDiario,
  };
}
