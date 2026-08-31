import React, { useMemo, useState } from "react";
import { Landmark, PiggyBank, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ClipboardList as ClipboardListIcon, Palmtree as PalmtreeIcon, HandCoins as HandCoinsIcon, ScrollText as ScrollTextIcon, ListOrdered } from "lucide-react";
import { setPresupuestoCelda } from "../lib/db";
import { consumoPresupuesto } from "../lib/presupuestoConsumo";
import { formatearOrdenPrioridad } from "../lib/flujoPrioridad";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const QUINCENAS = ["Q1", "Q2"];
const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };
const TIPOS_CUENTA_AHORRO = ["Ahorro", "Inversión", "Corretaje"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  if (v === 0) return "";
  return v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Calcula, para un préstamo dado, qué monto (cuota) le corresponde a un mes/quincena
// específico del año mostrado, basándose en su fecha de inicio y plazo.
function celdaPrestamo(prestamo, year, mes) {
  if (!prestamo.fechaInicio || !prestamo.cuota) return { activo: false, quincena: null };
  const [sy, sm, sd] = prestamo.fechaInicio.split("-").map(Number);
  if (!sy || !sm) return { activo: false, quincena: null };
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return { activo: false, quincena: null };
  const offset = (year - sy) * 12 + (mes - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  const quincena = sd && sd > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

// Calcula, para una meta de ahorro dada, cuánto le corresponde aportar en un mes
// específico. Si es por porcentaje de ingreso, es un monto fijo recurrente todos los
// meses. Si es una meta con monto y fecha objetivo, reparte lo que falta entre los
// meses que quedan desde hoy hasta esa fecha.
function celdaMeta(meta, year, mes, { ingresoMensual, aportadoPorCuenta }) {
  if (meta.estado !== "Activa") return { activo: false, monto: 0 };

  if (meta.tipoMeta === "Porcentaje de ingreso") {
    if (!meta.porcentaje || !ingresoMensual) return { activo: false, monto: 0 };
    return { activo: true, monto: ingresoMensual * (meta.porcentaje / 100) };
  }

  if (!meta.montoObjetivo || !meta.fechaObjetivo) return { activo: false, monto: 0 };
  const [ey, em] = meta.fechaObjetivo.split("-").map(Number);
  if (!ey || !em) return { activo: false, monto: 0 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const mesesRestantes = (ey - currentYear) * 12 + (em - currentMonth);
  if (mesesRestantes < 0) return { activo: false, monto: 0 };

  const aportado = meta.cuentaId ? aportadoPorCuenta[meta.cuentaId] || 0 : 0;
  const faltante = Math.max(meta.montoObjetivo - aportado, 0);
  const montoMensual = faltante / Math.max(mesesRestantes + 1, 1);

  const offsetDesdeHoy = (year - currentYear) * 12 + (mes - currentMonth);
  const offsetHastaMeta = (ey - year) * 12 + (em - mes);
  const activo = offsetDesdeHoy >= 0 && offsetHastaMeta >= 0;
  return { activo, monto: montoMensual };
}

// Calcula, para un evento del calendario vinculado a una categoría de gasto, en
// qué mes/quincena cae (una sola vez, según la fecha exacta del evento).
function celdaEvento(evento, year, mes) {
  if (!evento.fecha) return { activo: false, quincena: null };
  const [ey, em, ed] = evento.fecha.split("-").map(Number);
  if (!ey || !em) return { activo: false, quincena: null };
  const activo = ey === year && em === mes;
  const quincena = ed && ed > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

// Igual que celdaEvento, pero para una orden de compra usando su fecha planeada
// de compra (no la fecha en que se creó la orden).
function celdaOrdenCompra(orden, year, mes) {
  if (!orden.fechaPlaneada) return { activo: false, quincena: null };
  const [oy, om, od] = orden.fechaPlaneada.split("-").map(Number);
  if (!oy || !om) return { activo: false, quincena: null };
  const activo = oy === year && om === mes;
  const quincena = od && od > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

// Igual que las anteriores, pero para un periodo de vacaciones, usando su
// fecha de inicio como referencia.
function celdaVacacion(vacacion, year, mes) {
  if (!vacacion.fechaInicio) return { activo: false, quincena: null };
  const [vy, vm, vd] = vacacion.fechaInicio.split("-").map(Number);
  if (!vy || !vm) return { activo: false, quincena: null };
  const activo = vy === year && vm === mes;
  const quincena = vd && vd > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

function celdaRenovacion(renovacion, year, mes) {
  if (!renovacion.fechaInicio) return { activo: false, quincena: null };
  const [ry, rm, rd] = renovacion.fechaInicio.split("-").map(Number);
  if (!ry || !rm) return { activo: false, quincena: null };
  const activo = ry === year && rm === mes;
  const quincena = rd && rd > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

function totalItemsOrden(orden) {
  return (orden.items || []).reduce((s, it) => s + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 0), 0);
}

export default function PresupuestoAnual({ presupuesto, categoriasPersonalizadas, year, prestamos, metasAhorro, fuentesIngreso, cuentas, movimientos, eventos, ordenesCompra, vacaciones, diezmoConfig, tarjetas, ahorroConfig, onChangeYear, renovaciones, flujo }) {
  // Puramente informativo: el orden de prioridad definido en el Editor de
  // flujo, mostrado como referencia visual. No depende de ningún otro cálculo
  // de este componente ni los modifica.
  const ordenFlujoReferencia = useMemo(() => formatearOrdenPrioridad(flujo?.nodes, flujo?.edges), [flujo]);

  // Quincena activa y próxima, para resaltar la cabecera de la tabla. Cálculo
  // aislado, no depende de ningún otro dato del componente.
  const { mesActivo, quincenaActiva, mesProximo, quincenaProxima, yearProximo } = useMemo(() => {
    const hoy = new Date();
    const mesHoy = hoy.getMonth() + 1;
    const qHoy = hoy.getDate() > 15 ? "Q2" : "Q1";
    let mesProx = mesHoy;
    let yearProx = hoy.getFullYear();
    let qProx = qHoy === "Q1" ? "Q2" : "Q1";
    if (qHoy === "Q2") {
      mesProx = mesHoy + 1;
      if (mesProx > 12) {
        mesProx = 1;
        yearProx += 1;
      }
    }
    return {
      mesActivo: hoy.getFullYear() === year ? mesHoy : null,
      quincenaActiva: qHoy,
      mesProximo: yearProx === year ? mesProx : null,
      quincenaProxima: qProx,
      yearProximo: yearProx,
    };
  }, [year]);

  const [savingKey, setSavingKey] = useState(null);
  const [mostrarComparacion, setMostrarComparacion] = useState(true);
  const [mostrarPrestamos, setMostrarPrestamos] = useState(false);

  const categorias = useMemo(() => {
    return categoriasPersonalizadas.map((c) => ({ nombre: c.nombre, clasificacion: c.clasificacion }));
  }, [categoriasPersonalizadas]);

  const prestamosActivos = useMemo(
    () =>
      (prestamos || []).filter((p) => {
        if (p.estado !== "Activo") return false;
        if (p.frecuenciaCuota === "Personalizado") return (p.cuotasPersonalizadas || []).length > 0;
        return p.fechaInicio && p.cuota && p.plazo;
      }),
    [prestamos]
  );

  const ingresoMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentesIngreso || []) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
    }
    return total;
  }, [fuentesIngreso]);

  const aportadoPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentas || []) {
      if (!TIPOS_CUENTA_AHORRO.includes(c.tipo)) continue;
      let total = c.saldoInicial || 0;
      for (const mv of movimientos || []) {
        if (mv.cuentaId === c.id && mv.category === c.tipo) total += Number(mv.amount) || 0;
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const metasActivas = useMemo(
    () =>
      (metasAhorro || []).filter(
        (m) => m.estado === "Activa" && (m.tipoMeta === "Porcentaje de ingreso" ? m.porcentaje : m.montoObjetivo && m.fechaObjetivo)
      ),
    [metasAhorro]
  );

  const eventosConGasto = useMemo(
    () => (eventos || []).filter((e) => e.estado !== "Cancelado" && e.categoriaGasto && e.montoEstimado && e.fecha),
    [eventos]
  );

  const ordenesConGasto = useMemo(
    () =>
      (ordenesCompra || []).filter(
        (o) => o.estado !== "Cancelada" && o.categoriaGasto && o.fechaPlaneada && totalItemsOrden(o) > 0
      ),
    [ordenesCompra]
  );

  const vacacionesConGasto = useMemo(
    () =>
      (vacaciones || []).filter(
        (v) => v.estado !== "Cancelada" && v.categoriaGasto && v.presupuestoEstimado && v.fechaInicio
      ),
    [vacaciones]
  );

  const categoriasVacacionesUnicas = useMemo(
    () => [...new Set(vacacionesConGasto.map((v) => v.categoriaGasto))],
    [vacacionesConGasto]
  );

  const renovacionesConGasto = useMemo(
    () =>
      (renovaciones || []).filter(
        (r) => r.estado !== "Cancelado" && r.categoriaGasto && r.monto && r.fechaInicio
      ),
    [renovaciones]
  );

  const categoriasRenovacionesUnicas = useMemo(
    () => [...new Set(renovacionesConGasto.map((r) => r.categoriaGasto))],
    [renovacionesConGasto]
  );

  const getCeldaPrestamo = (prestamo, mes, quincena) => {
    if (prestamo.frecuenciaCuota === "Personalizado") {
      let total = 0;
      for (const c of prestamo.cuotasPersonalizadas || []) {
        if (!c.fecha) continue;
        const [cy, cm, cd] = c.fecha.split("-").map(Number);
        if (cy !== year || cm !== mes) continue;
        const q = cd && cd > 15 ? "Q2" : "Q1";
        if (q === quincena) total += Number(c.monto) || 0;
      }
      return total;
    }

    // Igual que en el Checklist de pagos: una cuota puede haberse movido
    // manualmente a otra quincena (incluso de otro mes). Revisa ambos casos:
    // 1) la cuota natural de este mes, si no fue movida a otro lado, y
    // 2) cuotas de otros meses que fueron movidas para caer aquí.
    const overrides = prestamo.quincenaOverrides || {};
    const overrideEsteMesRaw = overrides[`${mes}-${year}`];
    const overrideEsteMes = overrideEsteMesRaw && typeof overrideEsteMesRaw === "object" ? overrideEsteMesRaw : null;

    let total = 0;
    const { activo, quincena: q } = celdaPrestamo(prestamo, year, mes);
    if (activo && !overrideEsteMes && q === quincena) {
      total += Number(prestamo.cuota) || 0;
    }
    for (const destino of Object.values(overrides)) {
      if (!destino || typeof destino !== "object") continue;
      if (destino.year === year && destino.month === mes && destino.quincena === quincena) {
        total += Number(prestamo.cuota) || 0;
      }
    }
    return total;
  };

  const totalMesPrestamo = (prestamo, mes) => getCeldaPrestamo(prestamo, mes, "Q1") + getCeldaPrestamo(prestamo, mes, "Q2");

  const getCeldaMeta = (meta, mes, quincena) => {
    const { activo, monto } = celdaMeta(meta, year, mes, { ingresoMensual, aportadoPorCuenta });
    if (!activo) return 0;
    return monto / 2;
  };

  const totalMesMeta = (meta, mes) => getCeldaMeta(meta, mes, "Q1") + getCeldaMeta(meta, mes, "Q2");

  // El diezmo es un porcentaje fijo del ingreso mensual, recurrente todos los
  // meses (igual que una meta de ahorro por porcentaje de ingreso), sin
  // depender de una fecha específica.
  const diezmoMensual = diezmoConfig?.activo && ingresoMensual > 0 ? ingresoMensual * ((diezmoConfig.porcentaje || 0) / 100) : 0;
  const getCeldaDiezmo = () => (diezmoMensual > 0 ? diezmoMensual / 2 : 0);

  // Nivel de endeudamiento: % del ingreso mensual comprometido en cuotas de
  // préstamos + pagos mínimos de tarjetas (misma fórmula que el indicador de Inicio).
  const cuotaPrestamosMensual = useMemo(
    () => (prestamos || []).filter((p) => p.estado === "Activo").reduce((s, p) => s + (Number(p.cuota) || 0), 0),
    [prestamos]
  );
  const pagoTarjetasMensual = useMemo(
    () => (tarjetas || []).filter((t) => t.estado === "Activa").reduce((s, t) => s + (Number(t.pagoMinimo) || 0), 0),
    [tarjetas]
  );
  const nivelEndeudamiento = ingresoMensual > 0 ? ((cuotaPrestamosMensual + pagoTarjetasMensual) / ingresoMensual) * 100 : 0;
  const endeudamientoAlto = nivelEndeudamiento > 35;

  const ahorroSeSalta = ahorroConfig?.activo && ahorroConfig?.condicionadoADeuda !== false && endeudamientoAlto;
  const ahorroMensual =
    ahorroConfig?.activo && ingresoMensual > 0 && !ahorroSeSalta
      ? ingresoMensual * ((ahorroConfig.porcentaje || 0) / 100)
      : 0;
  const getCeldaAhorroAuto = () => (ahorroMensual > 0 ? ahorroMensual / 2 : 0);

  const getCeldaEvento = (evento, mes, quincena) => {
    const { activo, quincena: q } = celdaEvento(evento, year, mes);
    return activo && q === quincena ? evento.montoEstimado : 0;
  };

  const totalMesEvento = (evento, mes) => getCeldaEvento(evento, mes, "Q1") + getCeldaEvento(evento, mes, "Q2");

  // Varios eventos pueden compartir la misma categoría de gasto (ej. 3 citas
  // odontológicas en meses distintos) — se agrupan en UNA sola fila del
  // presupuesto en vez de una fila por cada evento.
  const categoriasEventosUnicas = useMemo(
    () => [...new Set(eventosConGasto.map((e) => e.categoriaGasto))],
    [eventosConGasto]
  );

  const getCeldaEventoCategoria = (categoriaNombre, mes, quincena) =>
    eventosConGasto
      .filter((e) => e.categoriaGasto === categoriaNombre)
      .reduce((s, e) => s + getCeldaEvento(e, mes, quincena), 0);

  const totalMesEventoCategoria = (categoriaNombre, mes) =>
    getCeldaEventoCategoria(categoriaNombre, mes, "Q1") + getCeldaEventoCategoria(categoriaNombre, mes, "Q2");

  const getCeldaOrden = (orden, mes, quincena) => {
    const { activo, quincena: q } = celdaOrdenCompra(orden, year, mes);
    return activo && q === quincena ? totalItemsOrden(orden) : 0;
  };

  const totalMesOrden = (orden, mes) => getCeldaOrden(orden, mes, "Q1") + getCeldaOrden(orden, mes, "Q2");

  const getCeldaVacacion = (vacacion, mes, quincena) => {
    const { activo, quincena: q } = celdaVacacion(vacacion, year, mes);
    return activo && q === quincena ? vacacion.presupuestoEstimado : 0;
  };

  const getCeldaVacacionCategoria = (categoriaNombre, mes, quincena) =>
    vacacionesConGasto
      .filter((v) => v.categoriaGasto === categoriaNombre)
      .reduce((s, v) => s + getCeldaVacacion(v, mes, quincena), 0);

  const totalMesVacacionCategoria = (categoriaNombre, mes) =>
    getCeldaVacacionCategoria(categoriaNombre, mes, "Q1") + getCeldaVacacionCategoria(categoriaNombre, mes, "Q2");

  const getCeldaRenovacion = (renovacion, mes, quincena) => {
    const { activo, quincena: q } = celdaRenovacion(renovacion, year, mes);
    return activo && q === quincena ? renovacion.monto : 0;
  };

  const getCeldaRenovacionCategoria = (categoriaNombre, mes, quincena) =>
    renovacionesConGasto
      .filter((r) => r.categoriaGasto === categoriaNombre)
      .reduce((s, r) => s + getCeldaRenovacion(r, mes, quincena), 0);

  const totalMesRenovacionCategoria = (categoriaNombre, mes) =>
    getCeldaRenovacionCategoria(categoriaNombre, mes, "Q1") + getCeldaRenovacionCategoria(categoriaNombre, mes, "Q2");

  const getCelda = (categoria, mes, quincena) => {
    const val = presupuesto?.[categoria]?.[String(mes)]?.[quincena];
    return typeof val === "number" ? val : null;
  };

  const totalMesCategoria = (categoria, mes) => (getCelda(categoria, mes, "Q1") || 0) + (getCelda(categoria, mes, "Q2") || 0);

  const totalPorMes = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const cat of categorias) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesCategoria(cat.nombre, m);
    }
    for (const p of prestamosActivos) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesPrestamo(p, m);
    }
    for (const meta of metasActivas) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesMeta(meta, m);
    }
    for (const evento of eventosConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesEvento(evento, m);
    }
    for (const orden of ordenesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesOrden(orden, m);
    }
    for (const vacacion of vacacionesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += getCeldaVacacion(vacacion, m, "Q1") + getCeldaVacacion(vacacion, m, "Q2");
    }
    for (const renovacion of renovacionesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += getCeldaRenovacion(renovacion, m, "Q1") + getCeldaRenovacion(renovacion, m, "Q2");
    }
    if (diezmoMensual > 0) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += diezmoMensual;
    }
    if (ahorroMensual > 0) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += ahorroMensual;
    }
    return totals;
  }, [categorias, presupuesto, prestamosActivos, metasActivas, eventosConGasto, ordenesConGasto, vacacionesConGasto, renovacionesConGasto, diezmoMensual, ahorroMensual, year, ingresoMensual, aportadoPorCuenta]);

  const totalPorQuincenaGlobal = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      totals[`${m}-Q1`] = 0;
      totals[`${m}-Q2`] = 0;
      for (const cat of categorias) {
        totals[`${m}-Q1`] += getCelda(cat.nombre, m, "Q1") || 0;
        totals[`${m}-Q2`] += getCelda(cat.nombre, m, "Q2") || 0;
      }
      for (const p of prestamosActivos) {
        totals[`${m}-Q1`] += getCeldaPrestamo(p, m, "Q1");
        totals[`${m}-Q2`] += getCeldaPrestamo(p, m, "Q2");
      }
      for (const meta of metasActivas) {
        totals[`${m}-Q1`] += getCeldaMeta(meta, m, "Q1");
        totals[`${m}-Q2`] += getCeldaMeta(meta, m, "Q2");
      }
      for (const evento of eventosConGasto) {
        totals[`${m}-Q1`] += getCeldaEvento(evento, m, "Q1");
        totals[`${m}-Q2`] += getCeldaEvento(evento, m, "Q2");
      }
      for (const orden of ordenesConGasto) {
        totals[`${m}-Q1`] += getCeldaOrden(orden, m, "Q1");
        totals[`${m}-Q2`] += getCeldaOrden(orden, m, "Q2");
      }
      for (const vacacion of vacacionesConGasto) {
        totals[`${m}-Q1`] += getCeldaVacacion(vacacion, m, "Q1");
        totals[`${m}-Q2`] += getCeldaVacacion(vacacion, m, "Q2");
      }
      for (const renovacion of renovacionesConGasto) {
        totals[`${m}-Q1`] += getCeldaRenovacion(renovacion, m, "Q1");
        totals[`${m}-Q2`] += getCeldaRenovacion(renovacion, m, "Q2");
      }
      if (diezmoMensual > 0) {
        totals[`${m}-Q1`] += getCeldaDiezmo();
        totals[`${m}-Q2`] += getCeldaDiezmo();
      }
      if (ahorroMensual > 0) {
        totals[`${m}-Q1`] += getCeldaAhorroAuto();
        totals[`${m}-Q2`] += getCeldaAhorroAuto();
      }
    }
    return totals;
  }, [categorias, presupuesto, prestamosActivos, metasActivas, eventosConGasto, ordenesConGasto, vacacionesConGasto, renovacionesConGasto, diezmoMensual, ahorroMensual, year, ingresoMensual, aportadoPorCuenta]);


  const totalPorCategoria = (categoria) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesCategoria(categoria, m);
    return total;
  };

  const totalPorPrestamo = (p) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesPrestamo(p, m);
    return total;
  };

  // Suma de TODOS los préstamos activos juntos, para la fila resumen
  // colapsable "Compromisos financieros".
  const getCeldaPrestamosTodos = (mes, quincena) =>
    prestamosActivos.reduce((s, p) => s + getCeldaPrestamo(p, mes, quincena), 0);

  const totalPrestamosTodos = () => prestamosActivos.reduce((s, p) => s + totalPorPrestamo(p), 0);

  const totalPorMeta = (meta) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesMeta(meta, m);
    return total;
  };

  const totalPorEvento = (evento) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesEvento(evento, m);
    return total;
  };

  const totalPorEventoCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesEventoCategoria(categoriaNombre, m);
    return total;
  };

  const totalPorOrden = (orden) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesOrden(orden, m);
    return total;
  };

  const totalPorVacacionCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesVacacionCategoria(categoriaNombre, m);
    return total;
  };

  const totalPorRenovacionCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesRenovacionCategoria(categoriaNombre, m);
    return total;
  };

  const totalAnual = totalPorMes.reduce((s, v) => s + v, 0);

  const ingresoQuincenal = ingresoMensual / 2;

  const excedeQuincena = (mes, q) => ingresoQuincenal > 0 && (totalPorQuincenaGlobal[`${mes}-${q}`] || 0) > ingresoQuincenal;

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const quincenaActual = hoy.getDate() <= 15 ? "Q1" : "Q2";
  const excesoActual =
    year === hoy.getFullYear() && ingresoQuincenal > 0
      ? (totalPorQuincenaGlobal[`${mesActual}-${quincenaActual}`] || 0) - ingresoQuincenal
      : 0;
  const quincenasExcedidas = useMemo(() => {
    if (ingresoQuincenal <= 0) return 0;
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      if (excedeQuincena(m, "Q1")) count++;
      if (excedeQuincena(m, "Q2")) count++;
    }
    return count;
  }, [totalPorQuincenaGlobal, ingresoQuincenal]);

  const comparacionActual = useMemo(() => {
    if (year !== hoy.getFullYear()) return [];
    return categorias
      .map((cat) => {
        const resultado = consumoPresupuesto({
          presupuesto,
          movimientos: movimientos || [],
          categoria: cat.nombre,
          year,
          month: mesActual,
          quincena: quincenaActual,
        });
        if (!resultado) return null;
        return { nombre: cat.nombre, ...resultado };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);
  }, [categorias, presupuesto, movimientos, year, mesActual, quincenaActual]);


  if (categorias.length === 0 && prestamosActivos.length === 0 && metasActivas.length === 0 && eventosConGasto.length === 0 && ordenesConGasto.length === 0 && vacacionesConGasto.length === 0 && renovacionesConGasto.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no has creado ninguna categoría propia. Ve a{" "}
        <strong style={{ color: "var(--ink)" }}>Presupuesto → Categoría de gasto</strong> y usa "Nueva
        categoría" para agregar las que quieras presupuestar aquí.
      </div>
    );
  }

  const handleBlur = async (categoria, mes, quincena, value) => {
    const key = `${categoria}-${mes}-${quincena}`;
    const num = parseFloat(value);
    setSavingKey(key);
    try {
      await setPresupuestoCelda(year, categoria, mes, quincena, Number.isFinite(num) && num > 0 ? num : 0);
    } finally {
      setSavingKey(null);
    }
  };

  const cellStyle = { border: "none", background: "transparent", textAlign: "right", padding: "6px 4px", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink)", width: 52 };

  return (
    <div>
      {ingresoQuincenal > 0 && excesoActual > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--stamp-bg)",
            border: "1px solid var(--stamp)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--stamp)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: "var(--stamp)", lineHeight: 1.5 }}>
            Tu presupuesto de esta quincena ({formatMoney(totalPorQuincenaGlobal[`${mesActual}-${quincenaActual}`])}) supera tu
            ingreso quincenal esperado ({formatMoney(ingresoQuincenal)}) por{" "}
            <strong>{formatMoney(excesoActual)}</strong>. Deberías reducir la distribución de esta quincena.
          </div>
        </div>
      )}

      {ahorroSeSalta && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--amber-bg)",
            border: "1px solid var(--amber)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: "var(--amber)", lineHeight: 1.5 }}>
            Tu ahorro automático no se aplicó este mes: tu nivel de endeudamiento está en{" "}
            <strong>{Math.round(nivelEndeudamiento)}%</strong> (Alto/Crítico). Prioriza gastos fijos y deudas
            primero. Puedes cambiar esto en Configuración → Modo Ahorro.
          </div>
        </div>
      )}

      {ordenFlujoReferencia && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--sage-bg)",
            border: "1px solid var(--sage)",
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 14,
            fontSize: 12,
            color: "var(--sage)",
            flexWrap: "wrap",
          }}
        >
          <ListOrdered size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Orden de prioridad (según tu Editor de flujo):</strong> {ordenFlujoReferencia}
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
        <button
          onClick={() => onChangeYear && onChangeYear(year - 1)}
          disabled={!onChangeYear}
          title="Año anterior"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink-soft)",
            cursor: onChangeYear ? "pointer" : "default",
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700, minWidth: 56, textAlign: "center" }}>
          {year}
        </span>
        <button
          onClick={() => onChangeYear && onChangeYear(year + 1)}
          disabled={!onChangeYear}
          title="Año siguiente"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink-soft)",
            cursor: onChangeYear ? "pointer" : "default",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Presupuesto total {year}:</span>
            <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>${totalAnual.toLocaleString("es")}</span>
          </div>
          {ingresoQuincenal > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ingreso quincenal estimado:</span>
              <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--sage)" }}>{formatMoney(ingresoQuincenal)}</span>
              {quincenasExcedidas > 0 && (
                <span className="despensa-tab-font" style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: "var(--stamp-bg)", color: "var(--stamp)" }}>
                  {quincenasExcedidas} quincena(s) excedida(s)
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          Cada mes tiene 2 columnas: Q1 (primera quincena) y Q2 (segunda quincena)
          {prestamosActivos.length > 0 && " · Las cuotas de préstamos (🏦) se calculan solas"}
          {metasActivas.length > 0 && " · Las metas de ahorro (🐷) también"}
          {eventosConGasto.length > 0 && " · Los eventos del calendario (📅) también"}
          {vacacionesConGasto.length > 0 && " · Tus vacaciones (🌴) también"}
        </div>
      </div>

      {comparacionActual.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setMostrarComparacion((s) => !s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--ink)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: mostrarComparacion ? 10 : 0,
            }}
          >
            Presupuestado vs. gastado real (quincena actual)
            {mostrarComparacion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {mostrarComparacion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {comparacionActual.map((c) => {
                const barColor = c.pct >= 100 ? "var(--stamp)" : c.pct >= 80 ? "var(--amber)" : "var(--sage)";
                return (
                  <div key={c.nombre} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.nombre}</span>
                      <span className="despensa-mono" style={{ fontSize: 11.5, color: barColor, fontWeight: 600 }}>
                        {formatMoney(c.gastado)} / {formatMoney(c.presupuestado)} ({Math.round(c.pct)}%)
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, c.pct)}%`, background: barColor, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
        <table className="despensa-mono" style={{ borderCollapse: "collapse", fontSize: 11, minWidth: 1500, width: "100%" }}>
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  zIndex: 2,
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--line)",
                  borderRight: "1px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  minWidth: 150,
                }}
              >
                Categoría
              </th>
              {MESES.map((m, i) => {
                const mesNum = i + 1;
                const esActivo = mesActivo === mesNum;
                const esProximo = !esActivo && mesProximo === mesNum;
                return (
                  <th
                    key={m}
                    colSpan={2}
                    style={{
                      padding: "6px 4px",
                      borderBottom: "1px solid var(--line-soft)",
                      borderLeft: "1px solid var(--line-soft)",
                      textAlign: "center",
                      fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      background: esActivo ? "var(--sage-bg)" : esProximo ? "var(--amber-bg)" : "transparent",
                      color: esActivo ? "var(--sage)" : esProximo ? "var(--amber)" : "var(--ink)",
                    }}
                  >
                    {m}
                  </th>
                );
              })}
              <th rowSpan={2} style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)" }}>
                Total
              </th>
            </tr>
            <tr>
              {MESES.map((m, i) =>
                QUINCENAS.map((q) => {
                  const mesNum = i + 1;
                  const esActivo = mesActivo === mesNum && quincenaActiva === q;
                  const esProximo = !esActivo && mesProximo === mesNum && quincenaProxima === q;
                  return (
                    <th
                      key={`${m}-${q}`}
                      style={{
                        padding: "4px 4px",
                        borderBottom: "1px solid var(--line)",
                        borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                        textAlign: "right",
                        fontWeight: esActivo || esProximo ? 700 : 500,
                        color: esActivo ? "var(--sage)" : esProximo ? "var(--amber)" : "var(--ink-soft)",
                        fontSize: 9.5,
                        minWidth: 52,
                        background: esActivo ? "var(--sage-bg)" : esProximo ? "var(--amber-bg)" : "transparent",
                      }}
                    >
                      {q}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, rowIdx) => (
              <tr key={cat.nombre} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: cat.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)",
                  }}
                  title={cat.clasificacion}
                >
                  {cat.nombre}
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  return QUINCENAS.map((q) => {
                    const key = `${cat.nombre}-${mes}-${q}`;
                    const val = getCelda(cat.nombre, mes, q);
                    return (
                      <td key={key} style={{ borderBottom: "1px solid var(--line-soft)", borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none", padding: 0 }}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={val ?? ""}
                          key={val}
                          onBlur={(e) => handleBlur(cat.nombre, mes, q, e.target.value)}
                          placeholder="—"
                          style={{ ...cellStyle, opacity: savingKey === key ? 0.5 : 1 }}
                        />
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {formatMoney(totalPorCategoria(cat.nombre)) || "0"}
                </td>
              </tr>
            ))}
            {prestamosActivos.length > 0 && (
              <tr style={{ background: "transparent" }}>
                <td
                  onClick={() => setMostrarPrestamos((s) => !s)}
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--stamp-bg)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--stamp)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer",
                  }}
                  title="Clic para ver el detalle de cada préstamo"
                >
                  {mostrarPrestamos ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <Landmark size={11} /> Compromisos financieros
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  return QUINCENAS.map((q) => {
                    const val = getCeldaPrestamosTodos(mes, q);
                    return (
                      <td
                        key={`prestamos-resumen-${mes}-${q}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                          padding: "6px 4px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: "var(--stamp)",
                          opacity: val ? 1 : 0.35,
                        }}
                      >
                        {formatMoney(val) || "—"}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 700,
                    background: "var(--stamp-bg)",
                    color: "var(--stamp)",
                  }}
                >
                  {formatMoney(totalPrestamosTodos()) || "0"}
                </td>
              </tr>
            )}
            {mostrarPrestamos &&
              prestamosActivos.map((p, idx) => {
              const rowIdx = categorias.length + idx;
              return (
                <tr key={`prestamo-${p.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px 6px 24px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--stamp)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Calculado automáticamente desde Préstamos"
                  >
                    <Landmark size={10} /> Préstamo {p.numero}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaPrestamo(p, mes, q);
                      return (
                        <td
                          key={`${p.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--stamp)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--stamp-bg)",
                      color: "var(--stamp)",
                    }}
                  >
                    {formatMoney(totalPorPrestamo(p)) || "0"}
                  </td>
                </tr>
              );
            })}
            {metasActivas.map((meta, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + idx;
              return (
                <tr key={`meta-${meta.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--sage)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Calculado automáticamente desde Ahorro"
                  >
                    <PiggyBank size={11} /> Meta: {meta.nombre}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaMeta(meta, mes, q);
                      return (
                        <td
                          key={`${meta.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--sage)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                    }}
                  >
                    {formatMoney(totalPorMeta(meta)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasEventosUnicas.map((catNombre, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + idx;
              return (
                <tr key={`evento-cat-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Suma todos los eventos del calendario vinculados a esta categoría"
                  >
                    <CalendarIcon size={11} /> {catNombre}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaEventoCategoria(catNombre, mes, q);
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorEventoCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {ordenesConGasto.map((orden, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + idx;
              return (
                <tr key={`orden-${orden.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Calculado automáticamente desde Órdenes de compra"
                  >
                    <ClipboardListIcon size={11} /> {orden.folio} ({orden.categoriaGasto})
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaOrden(orden, mes, q);
                      return (
                        <td
                          key={`${orden.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorOrden(orden)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasVacacionesUnicas.map((catNombre, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + ordenesConGasto.length + idx;
              return (
                <tr key={`vacacion-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Suma todos los periodos de vacaciones vinculados a esta categoría"
                  >
                    <PalmtreeIcon size={11} /> {catNombre}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaVacacionCategoria(catNombre, mes, q);
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorVacacionCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasRenovacionesUnicas.map((catNombre, idx) => {
              const rowIdx =
                categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + ordenesConGasto.length + categoriasVacacionesUnicas.length + idx;
              return (
                <tr key={`renovacion-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Suma todos los trámites y renovaciones vinculados a esta categoría"
                  >
                    <ScrollTextIcon size={11} /> {catNombre}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaRenovacionCategoria(catNombre, mes, q);
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorRenovacionCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {diezmoMensual > 0 && (
              <tr style={{ background: "var(--paper)" }}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--paper)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: "var(--sage)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Calculado automáticamente desde Configuración → Diezmo automático"
                >
                  <HandCoinsIcon size={11} /> Diezmo ({diezmoConfig.porcentaje}%)
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  return QUINCENAS.map((q) => (
                    <td
                      key={`diezmo-${mes}-${q}`}
                      style={{
                        borderBottom: "1px solid var(--line-soft)",
                        borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                        padding: "6px 4px",
                        textAlign: "right",
                        color: "var(--sage)",
                      }}
                    >
                      {formatMoney(getCeldaDiezmo())}
                    </td>
                  ));
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {formatMoney(diezmoMensual * 12)}
                </td>
              </tr>
            )}
            {ahorroMensual > 0 && (
              <tr style={{ background: "transparent" }}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--card)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: "var(--blue)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Calculado automáticamente desde Configuración → Modo Ahorro"
                >
                  <PiggyBank size={11} /> Modo Ahorro ({ahorroConfig.porcentaje}%)
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  return QUINCENAS.map((q) => (
                    <td
                      key={`ahorro-auto-${mes}-${q}`}
                      style={{
                        borderBottom: "1px solid var(--line-soft)",
                        borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                        padding: "6px 4px",
                        textAlign: "right",
                        color: "var(--blue)",
                      }}
                    >
                      {formatMoney(getCeldaAhorroAuto())}
                    </td>
                  ));
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--blue-bg)",
                    color: "var(--blue)",
                  }}
                >
                  {formatMoney(ahorroMensual * 12)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  padding: "8px 10px",
                  borderRight: "1px solid var(--line)",
                  borderTop: "2px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
              >
                Total
              </td>
              {MESES.map((_, i) => {
                const mes = i + 1;
                return QUINCENAS.map((q) => {
                  const excedido = excedeQuincena(mes, q);
                  return (
                    <td
                      key={`${mes}-${q}`}
                      title={excedido ? `Supera tu ingreso quincenal estimado (${formatMoney(ingresoQuincenal)})` : undefined}
                      style={{
                        padding: "8px 4px",
                        borderTop: "2px solid var(--line)",
                        borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                        textAlign: "right",
                        fontWeight: 600,
                        fontSize: 10.5,
                        background: excedido ? "var(--stamp-bg)" : "transparent",
                        color: excedido ? "var(--stamp)" : "var(--ink)",
                      }}
                    >
                      {formatMoney(totalPorQuincenaGlobal[`${mes}-${q}`]) || "0"}
                    </td>
                  );
                });
              })}
              <td style={{ padding: "8px 10px", borderTop: "2px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 700, background: "var(--sage-bg)", color: "var(--sage)" }}>
                {totalAnual.toLocaleString("es")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
