// Arma un resumen COMPACTO de las finanzas actuales del usuario, para
// mandárselo al asistente de IA en vez del historial crudo completo (más
// barato, más rápido, y evita exponer más datos de los necesarios).

function formatMoney(n) {
  return Math.round(Number(n) || 0);
}

export function construirResumenFinanciero({
  movimientos,
  presupuesto,
  presupuestoYear,
  prestamos,
  tarjetas,
  cuentas,
  fuentesIngreso,
  puntos,
  diasCobro,
}) {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const yearActual = hoy.getFullYear();

  // Gastos del mes actual, agrupados por categoría
  const gastosPorCategoria = {};
  let totalGastadoMes = 0;
  let totalIngresoMes = 0;
  for (const m of movimientos || []) {
    if (!m.date) continue;
    const [y, mo] = m.date.split("-").map(Number);
    if (y !== yearActual || mo !== mesActual) continue;
    if (m.type === "Gasto") {
      gastosPorCategoria[m.category] = (gastosPorCategoria[m.category] || 0) + (Number(m.amount) || 0);
      totalGastadoMes += Number(m.amount) || 0;
    } else if (m.type === "Ingreso") {
      totalIngresoMes += Number(m.amount) || 0;
    }
  }

  // Presupuesto del mes actual (ambas quincenas sumadas) por categoría
  const presupuestoDelMes = {};
  if (presupuesto && presupuestoYear === yearActual) {
    for (const [cat, porMes] of Object.entries(presupuesto)) {
      const datosMes = porMes?.[String(mesActual)];
      if (!datosMes) continue;
      presupuestoDelMes[cat] = formatMoney((datosMes.Q1 || 0) + (datosMes.Q2 || 0));
    }
  }

  const deudas = (prestamos || [])
    .filter((p) => p.estado !== "Pagado")
    .map((p) => ({
      entidad: p.entidadName || p.numero || "Préstamo",
      saldoPendiente: formatMoney(p.saldoActual ?? p.montoAprobado),
      cuotaMensual: formatMoney(p.cuotaMensual),
    }));

  const tarjetasResumen = (tarjetas || [])
    .filter((t) => t.estado === "Activa")
    .map((t) => ({
      nombre: t.nombre,
      saldoActual: formatMoney(t.saldoActual),
      limite: formatMoney(t.limite),
    }));

  const cuentasResumen = (cuentas || []).map((c) => ({ nombre: c.nombre, saldo: formatMoney(c.saldo) }));

  const ingresoFijoMensual = (fuentesIngreso || [])
    .filter((f) => f.estado === "Activo")
    .reduce((s, f) => s + (Number(f.montoMensual) || Number(f.montoQuincenal) * 2 || 0), 0);

  return {
    fechaHoy: hoy.toISOString().slice(0, 10),
    mesActual: `${mesActual}/${yearActual}`,
    gastosPorCategoriaEsteMes: Object.fromEntries(Object.entries(gastosPorCategoria).map(([k, v]) => [k, formatMoney(v)])),
    totalGastadoEsteMes: formatMoney(totalGastadoMes),
    totalIngresoEsteMes: formatMoney(totalIngresoMes),
    presupuestoMensualPorCategoria: presupuestoDelMes,
    ingresoFijoMensualConfigurado: formatMoney(ingresoFijoMensual),
    deudasPrestamos: deudas,
    tarjetasCredito: tarjetasResumen,
    cuentasBancarias: cuentasResumen,
    puntosAcumulados: typeof puntos === "number" ? puntos : puntos?.total || 0,
  };
}
