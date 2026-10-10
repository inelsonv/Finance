// Generador universal de items de compromisos para cualquier período de quincena
import { Landmark, Wallet, CreditCard, Banknote, ArrowLeftRight, HelpCircle, Briefcase } from "lucide-react";
import { ingresoMensualNeto } from "./deduccionesLey";
import { calcularResumenQuincena } from "./quincenaResumen";
import { consumoPresupuesto } from "./presupuestoConsumo";

const MES_NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fechaCuotaEnMes(year, month, day) {
  const ultimoDia = new Date(year, month, 0).getDate();
  const dia = Math.min(Math.max(Number(day) || 1, 1), ultimoDia);
  return `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function celdaPrestamo(prestamo, year, mes) {
  if (!prestamo.fechaInicio || !prestamo.cuota) return { activo: false, quincena: null };
  const [sy, sm, sd] = prestamo.fechaInicio.split("-").map(Number);
  if (!sy || !sm) return { activo: false, quincena: null };
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return { activo: false, quincena: null };
  const offset = (year - sy) * 12 + (mes - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  const quincena = sd && sd >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

export function generarItemsPeriodo({
  periodo,
  categoriasGasto = [],
  presupuesto = {},
  prestamos = [],
  tarjetas = [],
  presupuestoYear,
  movimientos = [],
  estrategiaDeudas,
  tipoCambio,
  pagoRapido = {},
  fuentesIngreso = [],
  checklist = {},
  overridesLocales = {},
  diasCobro = [15, 30],
}) {
  const list = [];
  const presupuestoDisponible = periodo.year === presupuestoYear;

  let idPrioridadDeuda = null;
  if (estrategiaDeudas?.activo) {
    const pagadoPorPrestamoLocal = {};
    for (const m of movimientos || []) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      pagadoPorPrestamoLocal[m.prestamoId] = (pagadoPorPrestamoLocal[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    const candidatas = [];
    for (const p of prestamos || []) {
      if (p.estado !== "Activo") continue;
      const saldo = Math.max((Number(p.montoAprobado) || 0) - (pagadoPorPrestamoLocal[p.id] || 0), 0);
      if (saldo <= 0) continue;
      candidatas.push({ id: `prestamo-${p.id}`, saldo, tasaInteres: p.tasaInteres ?? null });
    }
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
      if (t.saldoActual != null && t.saldoActual > 0) {
        candidatas.push({ id: `tarjeta-${t.id}`, saldo: t.saldoActual, tasaInteres: t.tasaInteres ?? null });
      }
      if (t.saldoActualUSD != null && t.saldoActualUSD > 0) {
        const saldoEnRDS = tipoCambio ? t.saldoActualUSD * tipoCambio : t.saldoActualUSD;
        candidatas.push({ id: `tarjeta-${t.id}`, saldo: saldoEnRDS, tasaInteres: t.tasaInteres ?? null });
      }
    }
    const ordenadas =
      estrategiaDeudas.metodo === "bola"
        ? [...candidatas].sort((a, b) => a.saldo - b.saldo)
        : [...candidatas].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));
    idPrioridadDeuda = ordenadas[0]?.id || null;
  }

  if (presupuestoDisponible) {
    for (const c of categoriasGasto) {
      const val = presupuesto?.[c.nombre]?.[String(periodo.month)]?.[periodo.quincena];
      if (typeof val === "number" && val > 0) {
        const esVariable = c.clasificacion === "Variable";
        let gastadoReal = 0;
        if (esVariable) {
          const resultado = consumoPresupuesto({
            presupuesto,
            movimientos: movimientos || [],
            categoria: c.nombre,
            year: periodo.year,
            month: periodo.month,
            quincena: periodo.quincena,
            diasCobro,
          });
          gastadoReal = resultado?.gastado || 0;
        }
        list.push({
          key: c.nombre,
          nombre: c.nombre,
          monto: val,
          icon: Wallet,
          metodoDefault: c.metodoPagoDefault || null,
          esPrestamo: false,
          clasificacion: c.clasificacion || "Fijo",
          esVariable,
          gastadoReal,
        });
      }
    }
  }

  for (const p of prestamos || []) {
    if (p.estado !== "Activo" && p.estado !== "Pagado") continue;
    const saldado = p.estado === "Pagado";
    if (p.frecuenciaCuota === "Personalizado") {
      const fechasOverride = {
        ...(p.cuotasPersonalizadasOverrides || {}),
        ...(overridesLocales[p.id]?.personalizadas || {}),
      };
      for (const c of p.cuotasPersonalizadas || []) {
        if (!c.fecha || !c.monto) continue;
        const overrideFecha = fechasOverride[c.fecha];
        const fechaEfectiva = typeof overrideFecha === "string" ? overrideFecha : overrideFecha?.fecha || c.fecha;
        const [cy, cm, cd] = fechaEfectiva.split("-").map(Number);
        if (cy !== periodo.year || cm !== periodo.month) continue;
        const q = cd && cd >= 15 ? "Q2" : "Q1";
        if (q !== periodo.quincena) continue;
        list.push({
          key: `prestamo-${p.id}-${c.fecha}`,
          nombre: overrideFecha
            ? `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (movida desde ${c.fecha.split("-").reverse().slice(0, 2).join("/")})`
            : `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (${c.fecha.split("-").reverse().slice(0, 2).join("/")})`,
          monto: c.monto,
          icon: Landmark,
          metodoDefault: null,
          esPrestamo: true,
          esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
          prestamoId: p.id,
          prestamoNumero: p.numero,
          fechaCuota: fechaEfectiva,
          diaCuota: Number(fechaEfectiva.slice(-2)),
          entidadId: p.entidadId || "",
          entidadName: p.entidadName || "",
          bloqueadoPagado: saldado,
          origenKey: c.fecha,
          tieneOverride: !!overrideFecha,
          cuotaPersonalizada: true,
        });
      }
      continue;
    }

    const overrides = {
      ...(p.quincenaOverrides || {}),
      ...(overridesLocales[p.id]?.mensuales || {}),
    };
    const origenKeyEsteMes = `${periodo.month}-${periodo.year}`;
    const overrideEsteMesRaw = overrides[origenKeyEsteMes];
    const overrideEsteMes = overrideEsteMesRaw && typeof overrideEsteMesRaw === "object" ? overrideEsteMesRaw : null;

    const { activo, quincena } = celdaPrestamo(p, periodo.year, periodo.month);
    if (activo && !overrideEsteMes && quincena === periodo.quincena && p.cuota) {
      list.push({
        key: `prestamo-${p.id}`,
        nombre: `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""}`,
        monto: p.cuota,
        icon: Landmark,
        metodoDefault: null,
        esPrestamo: true,
        esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
        prestamoId: p.id,
        prestamoNumero: p.numero,
        fechaCuota: fechaCuotaEnMes(periodo.year, periodo.month, Number(p.fechaInicio.slice(-2))),
        diaCuota: Number(p.fechaInicio.slice(-2)),
        entidadId: p.entidadId || "",
        entidadName: p.entidadName || "",
        bloqueadoPagado: saldado,
        origenKey: origenKeyEsteMes,
        tieneOverride: false,
      });
    }

    for (const [origenKey, destino] of Object.entries(overrides)) {
      if (!destino || typeof destino !== "object") continue;
      if (destino.year !== periodo.year || destino.month !== periodo.month || destino.quincena !== periodo.quincena) continue;
      const [origMes] = origenKey.split("-").map(Number);
      list.push({
        key: `prestamo-${p.id}-mov-${origenKey}`,
        nombre: `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (movida de ${MES_NOMBRES[origMes - 1]})`,
        monto: p.cuota,
        icon: Landmark,
        metodoDefault: null,
        esPrestamo: true,
        esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
        prestamoId: p.id,
        prestamoNumero: p.numero,
        fechaCuota: destino.fecha || fechaCuotaEnMes(destino.year, destino.month, Number(p.fechaInicio?.slice(-2))),
        diaCuota: Number(p.fechaInicio?.slice(-2)),
        entidadId: p.entidadId || "",
        entidadName: p.entidadName || "",
        bloqueadoPagado: saldado,
        origenKey,
        tieneOverride: true,
      });
    }
  }

  for (const t of tarjetas || []) {
    const saldo = Number(t.saldoActual) || 0;
    const pagoMin = Number(t.pagoMinimo) || 0;
    if (saldo <= 0 || pagoMin <= 0 || !t.fechaPago) continue;
    const diasEnMes = new Date(periodo.year, periodo.month, 0).getDate();
    const diaPago = Math.min(Number(t.fechaPago), diasEnMes);
    const q = diaPago >= 15 ? "Q2" : "Q1";
    if (q !== periodo.quincena) continue;
    list.push({
      key: `tarjeta-${t.id}-${periodo.year}-${periodo.month}`,
      nombre: `Tarjeta ${t.nombre} — pago mínimo`,
      monto: pagoMin,
      icon: CreditCard,
      metodoDefault: null,
      esTarjeta: true,
      esPrioridadDeuda: idPrioridadDeuda === `tarjeta-${t.id}`,
      tarjetaId: t.id,
      tarjetaNombre: t.nombre,
    });
  }

  if (pagoRapido?.activo && fuentesIngreso && categoriasGasto && presupuesto) {
    const ingresoQuincenal = ingresoMensualNeto(fuentesIngreso) / 2;
    const resumenQuincena = calcularResumenQuincena({
      year: periodo.year,
      month: periodo.month,
      quincena: periodo.quincena,
      presupuesto,
      categoriasGasto,
      prestamos,
      movimientos,
      diasCobro,
    });
    let minimoTarjetasQuincena = 0;
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      const diasEnMesT = new Date(periodo.year, periodo.month, 0).getDate();
      const diaPagoT = Math.min(Number(t.fechaPago), diasEnMesT);
      const qT = diaPagoT >= 15 ? "Q2" : "Q1";
      if (qT !== periodo.quincena) continue;
      if (t.saldoActual > 0 && t.pagoMinimo) minimoTarjetasQuincena += Number(t.pagoMinimo) || 0;
      if (t.saldoActualUSD > 0 && t.pagoMinimoUSD) minimoTarjetasQuincena += (Number(t.pagoMinimoUSD) || 0) * (tipoCambio || 1);
    }
    const extraQuincenal = Math.max(ingresoQuincenal - resumenQuincena.presupuestado - minimoTarjetasQuincena, 0);
    if (extraQuincenal > 0) {
      for (const it of list) {
        const idComparable = it.esPrestamo ? `p-${it.prestamoId}` : it.esTarjeta ? `t-${it.tarjetaId}` : null;
        const idComparableUSD = it.esTarjeta ? `t-${it.tarjetaId}-usd` : null;
        if (idComparable && (idComparable === pagoRapido.deudaId || idComparableUSD === pagoRapido.deudaId)) {
          it.monto = (Number(it.monto) || 0) + extraQuincenal;
          it.esPagoRapido = true;
        }
      }
    }
  }

  for (const it of list) {
    it.montoPresupuestado = it.monto;
    const override = checklist?.items?.[it.key]?.montoOverride;
    if (override != null) it.monto = Number(override) || 0;
  }

  const esGastoPrioritario = (item) =>
    item.clasificacion === "Fijo" || /^(combustible|gasolina)$/i.test(item.nombre?.trim() || "");

  return list.sort((a, b) => {
    const prioridadA = esGastoPrioritario(a) ? 0 : 1;
    const prioridadB = esGastoPrioritario(b) ? 0 : 1;
    return prioridadA - prioridadB || b.monto - a.monto;
  });
}
