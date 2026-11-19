// Cálculo unificado del saldo disponible real por cuenta bancaria/financiera.
// Respeta el histórico existente de aportes a cuentas (category === c.tipo),
// suma desembolsos de préstamos / ingresos asignados a la cuenta (incluidos
// préstamos existentes con cuenta destino propia que aún no tengan movimiento
// de desembolso), y resta los pagos y gastos cubiertos desde esa cuenta.

function normalizarTexto(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function soloDigitos(txt) {
  return String(txt || "").replace(/\D/g, "");
}

export function prestamoApuntaACuenta(prestamo, cuenta) {
  if (!prestamo || !cuenta?.id) return false;
  if (prestamo.acreditarEnCuenta === false) return false;
  if (prestamo.cuentaDestinoModo === "tercero" && prestamo.cuentaDestinoId !== cuenta.id) {
    return false;
  }

  // 1. Vinculación directa por ID de cuenta destino
  if (prestamo.cuentaDestinoId && prestamo.cuentaDestinoId === cuenta.id) {
    // Si es un préstamo ya saldado que nunca se marcó explícitamente para acreditar, no sumarlo
    if (prestamo.estado === "Pagado" && prestamo.acreditarEnCuenta !== true) return false;
    return true;
  }

  // 2. Respaldo para préstamos ya existentes sin cuentaDestinoId donde el número/banco coincide
  if (!prestamo.cuentaDestinoId && prestamo.estado !== "Pagado") {
    const numPrestamo = soloDigitos(prestamo.cuentaDestinoNumero);
    const candidatosCuenta = [soloDigitos(cuenta.numeroCuenta), soloDigitos(cuenta.nombre)].filter(
      (d) => d.length >= 4
    );
    if (numPrestamo.length >= 4 && candidatosCuenta.length > 0) {
      const ult4Prestamo = numPrestamo.slice(-4);
      const mismoNumero = candidatosCuenta.some((numCuenta) => {
        const ult4Cuenta = numCuenta.slice(-4);
        return (
          numPrestamo === numCuenta ||
          ult4Prestamo === ult4Cuenta ||
          numPrestamo.endsWith(numCuenta) ||
          numCuenta.endsWith(numPrestamo)
        );
      });
      if (mismoNumero) {
        const bancoPrestamo = normalizarTexto(prestamo.cuentaDestinoBanco);
        const bancoCuenta = normalizarTexto(cuenta.entidadName || cuenta.nombre);
        if (!bancoPrestamo || !bancoCuenta || bancoCuenta.includes(bancoPrestamo) || bancoPrestamo.includes(bancoCuenta)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function calcularDesgloseCuenta(cuenta, movimientos = [], prestamos = []) {
  const saldoInicial = Number(cuenta?.saldoInicial) || 0;
  let creditos = 0;
  let debitos = 0;

  if (!cuenta?.id) {
    return { saldoInicial: 0, creditos: 0, debitos: 0, saldoDisponible: 0 };
  }

  const desembolsosRegistrados = new Set();

  for (const mv of movimientos || []) {
    if (!mv) continue;
    const monto = Number(mv.amount) || 0;
    if (monto <= 0) continue;

    if ((mv.category === "Desembolso de préstamo" || mv.type === "Desembolso") && mv.prestamoId) {
      desembolsosRegistrados.add(mv.prestamoId);
    }

    // Aportes / depósitos / desembolsos acreditados en esta cuenta
    const esAporteTipoCuenta = mv.cuentaId === cuenta.id && mv.category === cuenta.tipo;
    const esDesembolsoPrestamo =
      mv.cuentaId === cuenta.id &&
      (mv.category === "Desembolso de préstamo" || mv.type === "Desembolso");
    const esIngresoACuenta = mv.cuentaId === cuenta.id && mv.type === "Ingreso";

    if (esAporteTipoCuenta || esDesembolsoPrestamo || esIngresoACuenta) {
      creditos += monto;
    }

    // Débitos / pagos realizados con fondos de esta cuenta
    const esOrigenPago = mv.cuentaOrigenId === cuenta.id;
    const esDebitoDirecto =
      mv.cuentaId === cuenta.id &&
      mv.type === "Gasto" &&
      mv.category !== cuenta.tipo &&
      mv.category !== "Desembolso de préstamo";

    if (esOrigenPago || esDebitoDirecto) {
      debitos += monto;
    }
  }

  // Préstamos vinculados a esta cuenta destino que aún no tienen movimiento de desembolso registrado
  for (const p of prestamos || []) {
    if (!p || !p.id) continue;
    if (desembolsosRegistrados.has(p.id)) continue;
    const monto = Number(p.montoAprobado) || 0;
    if (monto <= 0) continue;
    if (prestamoApuntaACuenta(p, cuenta)) {
      creditos += monto;
    }
  }

  return {
    saldoInicial,
    creditos,
    debitos,
    saldoDisponible: saldoInicial + creditos - debitos,
  };
}

export function calcularSaldosCuentas(cuentas = [], movimientos = [], prestamos = []) {
  const map = {};
  for (const c of cuentas || []) {
    if (!c?.id) continue;
    map[c.id] = calcularDesgloseCuenta(c, movimientos, prestamos);
  }
  return map;
}

export function evaluarCuentasParaPago(
  cuentas = [],
  movimientos = [],
  montoNecesario = 0,
  opciones = {},
  prestamos = []
) {
  const monto = Math.max(Number(montoNecesario) || 0, 0);
  const { entidadPreferidaId = null, cuentaPreferidaId = null } = opciones;

  const evaluadas = (cuentas || []).map((c) => {
    const desglose = calcularDesgloseCuenta(c, movimientos, prestamos);
    const suficiente = monto > 0 ? desglose.saldoDisponible >= monto : desglose.saldoDisponible > 0;
    const faltante = monto > 0 ? Math.max(monto - desglose.saldoDisponible, 0) : 0;
    return {
      ...c,
      ...desglose,
      suficiente,
      faltante,
    };
  });

  // Orden: primero las que tienen fondos suficientes (preferida/entidad arriba, luego mayor saldo),
  // después las que no alcanzan (mayor saldo primero).
  const ordenadas = [...evaluadas].sort((a, b) => {
    if (a.suficiente !== b.suficiente) return a.suficiente ? -1 : 1;
    if (cuentaPreferidaId) {
      if (a.id === cuentaPreferidaId && b.id !== cuentaPreferidaId) return -1;
      if (b.id === cuentaPreferidaId && a.id !== cuentaPreferidaId) return 1;
    }
    if (entidadPreferidaId) {
      const aMatch = a.entidadId === entidadPreferidaId;
      const bMatch = b.entidadId === entidadPreferidaId;
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
    }
    return b.saldoDisponible - a.saldoDisponible;
  });

  const sugerida = ordenadas.find((c) => c.suficiente) || null;

  return {
    cuentas: ordenadas,
    cuentaSugeridaId: sugerida ? sugerida.id : "",
    hayCuentaConFondos: !!sugerida,
  };
}
