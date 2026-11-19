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

export function obtenerTemaBanco(cuenta) {
  const ref = `${normalizarTexto(cuenta?.entidadName)} ${normalizarTexto(cuenta?.nombre)}`;
  if (ref.includes("popular") && !ref.includes("asociacion popular") && !ref.includes("apap")) {
    return {
      nombre: "Banco Popular",
      bg: "linear-gradient(135deg, #002b7f 0%, #0057b8 54%, #0077d4 100%)",
      text: "#ffffff",
      subtext: "rgba(224, 242, 254, 0.86)",
      accent: "#7dd3fc",
      border: "rgba(125, 211, 252, 0.35)",
      pattern: "rgba(255, 255, 255, 0.09)",
    };
  }
  if (ref.includes("banreservas") || ref.includes("reservas")) {
    return {
      nombre: "Banreservas",
      bg: "linear-gradient(135deg, #072247 0%, #0d4785 56%, #1463a8 100%)",
      text: "#ffffff",
      subtext: "rgba(241, 245, 249, 0.86)",
      accent: "#fbbf24",
      border: "rgba(251, 191, 36, 0.36)",
      pattern: "rgba(251, 191, 36, 0.11)",
    };
  }
  if (ref.includes("bhd")) {
    return {
      nombre: "Banco BHD",
      bg: "linear-gradient(135deg, #064e3b 0%, #047857 58%, #059669 100%)",
      text: "#ffffff",
      subtext: "rgba(236, 253, 245, 0.86)",
      accent: "#6ee7b7",
      border: "rgba(110, 231, 183, 0.34)",
      pattern: "rgba(255, 255, 255, 0.09)",
    };
  }
  if (ref.includes("scotia")) {
    return {
      nombre: "Scotiabank",
      bg: "linear-gradient(135deg, #691015 0%, #b91c1c 56%, #dc2626 100%)",
      text: "#ffffff",
      subtext: "rgba(254, 242, 242, 0.86)",
      accent: "#fca5a5",
      border: "rgba(252, 165, 165, 0.34)",
      pattern: "rgba(255, 255, 255, 0.09)",
    };
  }
  if (ref.includes("santa cruz") || ref.includes("santacruz")) {
    return {
      nombre: "Banco Santa Cruz",
      bg: "linear-gradient(135deg, #172554 0%, #1d4ed8 58%, #0284c7 100%)",
      text: "#ffffff",
      subtext: "rgba(239, 246, 255, 0.86)",
      accent: "#fca5a5",
      border: "rgba(147, 197, 253, 0.34)",
      pattern: "rgba(248, 113, 113, 0.11)",
    };
  }
  if (ref.includes("apap") || ref.includes("asociacion popular")) {
    return {
      nombre: "APAP",
      bg: "linear-gradient(135deg, #0f3d3e 0%, #0f6b6c 58%, #0d9488 100%)",
      text: "#ffffff",
      subtext: "rgba(240, 253, 250, 0.86)",
      accent: "#fcd34d",
      border: "rgba(94, 234, 212, 0.32)",
      pattern: "rgba(251, 191, 36, 0.09)",
    };
  }
  if (ref.includes("cibao") || ref.includes("acap")) {
    return {
      nombre: "Asociación Cibao",
      bg: "linear-gradient(135deg, #14532d 0%, #15803d 60%, #16a34a 100%)",
      text: "#ffffff",
      subtext: "rgba(240, 253, 244, 0.86)",
      accent: "#bbf7d0",
      border: "rgba(134, 239, 172, 0.32)",
      pattern: "rgba(255, 255, 255, 0.08)",
    };
  }
  if (ref.includes("qik")) {
    return {
      nombre: "Qik",
      bg: "linear-gradient(135deg, #090d16 0%, #1e1b4b 55%, #0369a1 100%)",
      text: "#ffffff",
      subtext: "rgba(224, 242, 254, 0.86)",
      accent: "#38bdf8",
      border: "rgba(56, 189, 248, 0.36)",
      pattern: "rgba(56, 189, 248, 0.12)",
    };
  }
  if (ref.includes("banesco")) {
    return {
      nombre: "Banesco",
      bg: "linear-gradient(135deg, #053b2f 0%, #0f766e 56%, #0284c7 100%)",
      text: "#ffffff",
      subtext: "rgba(240, 253, 250, 0.86)",
      accent: "#5eead4",
      border: "rgba(94, 234, 212, 0.32)",
      pattern: "rgba(255, 255, 255, 0.08)",
    };
  }
  if (ref.includes("promerica")) {
    return {
      nombre: "Promerica",
      bg: "linear-gradient(135deg, #06402b 0%, #166534 58%, #15803d 100%)",
      text: "#ffffff",
      subtext: "rgba(240, 253, 244, 0.86)",
      accent: "#86efac",
      border: "rgba(134, 239, 172, 0.32)",
      pattern: "rgba(255, 255, 255, 0.08)",
    };
  }
  if (ref.includes("caribe")) {
    return {
      nombre: "Banco Caribe",
      bg: "linear-gradient(135deg, #164e63 0%, #0e7490 58%, #0891b2 100%)",
      text: "#ffffff",
      subtext: "rgba(236, 254, 255, 0.86)",
      accent: "#67e8f9",
      border: "rgba(103, 232, 249, 0.32)",
      pattern: "rgba(255, 255, 255, 0.08)",
    };
  }
  if (ref.includes("ademi")) {
    return {
      nombre: "Banco Ademi",
      bg: "linear-gradient(135deg, #1e293b 0%, #334155 58%, #b45309 100%)",
      text: "#ffffff",
      subtext: "rgba(248, 250, 252, 0.86)",
      accent: "#fcd34d",
      border: "rgba(252, 211, 77, 0.3)",
      pattern: "rgba(255, 255, 255, 0.07)",
    };
  }
  if (cuenta?.tipo === "Inversión" || cuenta?.tipo === "Corretaje") {
    return {
      nombre: cuenta?.entidadName || "Inversión",
      bg: "linear-gradient(135deg, #18181b 0%, #27272a 58%, #3f3f46 100%)",
      text: "#ffffff",
      subtext: "rgba(244, 244, 245, 0.85)",
      accent: "#e4c27a",
      border: "rgba(228, 194, 122, 0.34)",
      pattern: "rgba(228, 194, 122, 0.09)",
    };
  }
  return {
    nombre: cuenta?.entidadName || "Cuenta",
    bg: "linear-gradient(135deg, #1f3a5c 0%, #2c5282 56%, #4a7fb5 100%)",
    text: "#ffffff",
    subtext: "rgba(239, 246, 255, 0.86)",
    accent: "#bfdbfe",
    border: "rgba(191, 219, 254, 0.32)",
    pattern: "rgba(255, 255, 255, 0.08)",
  };
}

function soloDigitos(txt) {
  return String(txt || "").replace(/\D/g, "");
}

export function ordenarCuentas(cuentas = []) {
  return [...(cuentas || [])].sort((a, b) => {
    const oa = Number(a?.orden);
    const ob = Number(b?.orden);
    const va = Number.isFinite(oa) && oa > 0 ? oa : Number.MAX_SAFE_INTEGER;
    const vb = Number.isFinite(ob) && ob > 0 ? ob : Number.MAX_SAFE_INTEGER;
    if (va !== vb) return va - vb;
    return String(a?.nombre || "").localeCompare(String(b?.nombre || ""));
  });
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
