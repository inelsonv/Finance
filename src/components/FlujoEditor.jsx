import React, { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  Home,
  ShoppingBag,
  CreditCard,
  Landmark,
  PiggyBank,
  Target,
  LineChart,
  Trophy,
  Crown,
  Flame,
  Heart,
  Gem,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  ChevronRight,
  ChevronDown,
  PieChart,
  Shield,
  Fuel,
  Sparkles,
  DollarSign,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { ingresoMensualNeto, calcularDeduccionesLey } from "../lib/deduccionesLey";
import { periodoActualConfigurado } from "../lib/quincenaConfig";

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return "RD$" + n.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function FlujoEditor({
  fuentesIngreso = [],
  ingresosPuntuales = [],
  categoriasGasto = [],
  movimientos = [],
  presupuesto = {},
  checklistTodos = [],
  prestamos = [],
  tarjetas = [],
  estrategiaDeudas = {},
  metasAhorro = [],
  cuentas = [],
  activos = [],
  seguros = [],
  puntos = {},
  recompensas = {},
  habitos = [],
  habitosRegistro = {},
  diasCobro,
  tipoCambio,
  onNavigate,
}) {
  const [nodoSeleccionado, setNodoSeleccionado] = useState(null);
  const [vistaPeriodo, setVistaPeriodo] = useState("mensual"); // "mensual" | "quincenal"
  const [mostrarDetallesDistribucion, setMostrarDetallesDistribucion] = useState(false);

  useEffect(() => {
    if (!nodoSeleccionado) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setNodoSeleccionado(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [nodoSeleccionado]);

  const factorPeriodo = vistaPeriodo === "quincenal" ? 0.5 : 1;

  // 1. Cálculos de Ingreso (Mensual y Quincenal)
  const { totalIngresoMensual, totalIngresoQuincenal, fuentesIngresoItems } = useMemo(() => {
    const items = [];
    let sumaMensual = 0;
    let sumaQuincenal = 0;

    (fuentesIngreso || []).forEach((f) => {
      if (f.estado === "Inactivo" || f.estado === "inactivo") return;
      const raw = Number(f.montoEsperado ?? f.monto ?? f.montoNeto ?? f.salario) || 0;
      if (raw <= 0) return;

      const freq = f.frecuencia || "Mensual";
      let factorMensual = 1;

      if (/quincenal/i.test(freq)) {
        factorMensual = 2;
      } else if (/semanal/i.test(freq)) {
        factorMensual = 52 / 12;
      } else if (/anual/i.test(freq)) {
        factorMensual = 1 / 12;
      } else if (/único|unico/i.test(freq)) {
        factorMensual = 0;
      } else {
        factorMensual = 1;
      }

      const brutoMensual = raw * factorMensual;
      const netoMensual = f.aplicaDeduccionesLey
        ? calcularDeduccionesLey(brutoMensual).neto
        : brutoMensual;

      // El monto quincenal exacto para esta fuente
      const netoQuincenal = netoMensual * 0.5;

      sumaMensual += netoMensual;
      sumaQuincenal += netoQuincenal;

      const montoActivo = vistaPeriodo === "quincenal" ? netoQuincenal : netoMensual;

      items.push({
        id: f.id,
        nombre: f.nombre || "Ingreso",
        monto: montoActivo,
        montoQuincenal: netoQuincenal,
        montoMensual: netoMensual,
        frecuencia: freq,
        detalle: `${freq}${f.diaPago ? ` (Día ${f.diaPago})` : ""}${f.aplicaDeduccionesLey ? " · Con deducciones de ley" : ""}`,
      });
    });

    // Si no hay fuentes en fuentesIngreso o la suma es 0, buscar respaldo en movimientos de Ingreso
    if (items.length === 0) {
      const now = new Date();
      const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let ingresosMvTotal = 0;
      let movsIngreso = (movimientos || []).filter(
        (m) => m.type === "Ingreso" && (m.date || "").startsWith(mesStr)
      );
      if (movsIngreso.length === 0) {
        // Fallback a los ingresos registrados más recientes
        movsIngreso = (movimientos || []).filter((m) => m.type === "Ingreso").slice(0, 10);
      }
      movsIngreso.forEach((m) => {
        const amt = Number(m.amount) || 0;
        if (amt > 0) {
          ingresosMvTotal += amt;
          items.push({
            id: m.id,
            nombre: m.note || m.concept || m.category || "Ingreso registrado",
            monto: vistaPeriodo === "quincenal" ? amt / 2 : amt,
            montoQuincenal: amt / 2,
            montoMensual: amt,
            frecuencia: "Mensual",
            detalle: m.date || "Movimiento",
          });
        }
      });
      if (ingresosMvTotal > 0) {
        sumaMensual = ingresosMvTotal;
        sumaQuincenal = ingresosMvTotal / 2;
      }
    }

    return {
      totalIngresoMensual: sumaMensual,
      totalIngresoQuincenal: sumaQuincenal,
      fuentesIngresoItems: items,
    };
  }, [fuentesIngreso, movimientos, vistaPeriodo]);

  const montoIngreso = vistaPeriodo === "quincenal" ? totalIngresoQuincenal : totalIngresoMensual;

  // 2. Gastos Fijos
  const { totalFijosMensual, fijosItems } = useMemo(() => {
    const fijos = categoriasGasto.filter(
      (c) => c.clasificacion === "Fijo" || c.clasificacion === "Necesario" || /fijo|renta|alquiler|casa|luz|agua|internet|telefono|colegio/i.test(c.nombre || "")
    );
    const mesIndex = new Date().getMonth();
    const now = new Date();
    const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let total = 0;
    const items = fijos.map((c) => {
      const q1 = Number(presupuesto?.[c.nombre]?.[String(mesIndex)]?.Q1) || 0;
      const q2 = Number(presupuesto?.[c.nombre]?.[String(mesIndex)]?.Q2) || 0;
      let mensual = q1 + q2;

      // Respaldo en movimientos si no hay presupuesto anual cargado
      if (mensual === 0) {
        const movsGasto = (movimientos || []).filter(
          (m) =>
            (m.type === "Gasto" || m.tipo === "Gasto") &&
            (m.category === c.nombre || m.categoria === c.nombre) &&
            (m.date || "").startsWith(mesStr)
        );
        mensual = movsGasto.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
      }

      total += mensual;
      return {
        id: c.id || c.nombre,
        nombre: c.nombre,
        monto: mensual * factorPeriodo,
        montoMensual: mensual,
        clasificacion: c.clasificacion || "Fijo",
      };
    });
    return { totalFijosMensual: total, fijosItems: items.filter((it) => it.monto > 0) };
  }, [categoriasGasto, presupuesto, factorPeriodo, movimientos]);
  const montoFijos = totalFijosMensual * factorPeriodo;

  // 3. Gastos Variables & Combustible
  const { totalVariablesMensual, variablesItems } = useMemo(() => {
    const variables = categoriasGasto.filter(
      (c) => c.clasificacion === "Variable" || c.clasificacion === "Deseo" || /variable|combustible|gasolina|supermercado|comida|alimentos|salidas|ocio/i.test(c.nombre || "")
    );
    const mesIndex = new Date().getMonth();
    const now = new Date();
    const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let total = 0;
    const items = variables.map((c) => {
      const q1 = Number(presupuesto?.[c.nombre]?.[String(mesIndex)]?.Q1) || 0;
      const q2 = Number(presupuesto?.[c.nombre]?.[String(mesIndex)]?.Q2) || 0;
      let mensual = q1 + q2;

      // Respaldo en movimientos si no hay presupuesto anual cargado
      if (mensual === 0) {
        const movsGasto = (movimientos || []).filter(
          (m) =>
            (m.type === "Gasto" || m.tipo === "Gasto") &&
            (m.category === c.nombre || m.categoria === c.nombre) &&
            (m.date || "").startsWith(mesStr)
        );
        mensual = movsGasto.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
      }

      total += mensual;
      return {
        id: c.id || c.nombre,
        nombre: c.nombre,
        monto: mensual * factorPeriodo,
        montoMensual: mensual,
        clasificacion: c.clasificacion || "Variable",
      };
    });
    return { totalVariablesMensual: total, variablesItems: items.filter((it) => it.monto > 0) };
  }, [categoriasGasto, presupuesto, factorPeriodo, movimientos]);
  const montoVariables = totalVariablesMensual * factorPeriodo;

  // 4. Deudas (Préstamos & Tarjetas)
  const {
    cuotasPrestamosTotal,
    capitalTotalPrestamos,
    balanceTarjetasTotal,
    montoOriginalPrestamosTotal,
    totalPagadoPrestamos,
    deudasItems,
  } = useMemo(() => {
    const items = [];
    let cuotas = 0;
    let capital = 0;
    let balanceTarj = 0;
    let originalPrestamos = 0;
    let pagadoPrestamos = 0;

    (prestamos || []).forEach((p) => {
      const cuota = Number(p.cuota) || 0;
      const cap = Number(p.capitalPendiente ?? p.montoPrestado) || 0;
      const orig = Number(p.montoPrestado) || cap;

      // Buscar pagos registrados en movimientos para este préstamo
      const pagosMovimientos = (movimientos || [])
        .filter(
          (m) =>
            m.category === "Pago de préstamo" &&
            (m.prestamoId === p.id || (p.numero && m.prestamoNumero === p.numero))
        )
        .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

      const pagado = Math.max(orig - cap, pagosMovimientos);
      const totalItemBase = Math.max(orig, cap + pagado);
      const pctItemPagado = totalItemBase > 0 ? Math.min(Math.round((pagado / totalItemBase) * 100), 100) : 0;
      const pctItemAdeudado = 100 - pctItemPagado;

      cuotas += cuota;
      capital += cap;
      originalPrestamos += totalItemBase;
      pagadoPrestamos += pagado;

      items.push({
        id: p.id,
        nombre: p.nombre || p.numero || "Préstamo",
        tipo: "prestamo",
        cuota: cuota * factorPeriodo,
        total: cap,
        adeudado: cap,
        pagado: pagado,
        original: totalItemBase,
        pctPagado: pctItemPagado,
        pctAdeudado: pctItemAdeudado,
        tasa: p.tasaInteres,
      });
    });

    (tarjetas || []).forEach((t) => {
      const balDOP = Number(t.saldoActual ?? t.balance) || 0;
      const balUSD = Number(t.saldoActualUSD) || 0;
      const rateUSD = Number(tipoCambio) > 0 ? Number(tipoCambio) : 60;
      const totalBal = balDOP + (balUSD > 0 ? balUSD * rateUSD : 0);
      const limite = Number(t.limiteCredito) || 0;
      const pagoMin = Number(t.pagoMinimo) || totalBal * 0.05;
      balanceTarj += totalBal;
      if (totalBal > 0 || limite > 0) {
        const pctUso = limite > 0 ? Math.round((totalBal / limite) * 100) : 100;
        items.push({
          id: t.id,
          nombre: t.nombre || "Tarjeta",
          tipo: "tarjeta",
          cuota: (pagoMin || totalBal) * factorPeriodo,
          total: totalBal,
          adeudado: totalBal,
          pagado: Math.max(limite - totalBal, 0),
          limite: limite,
          pctUso: pctUso,
          saldoActual: balDOP,
          saldoActualUSD: balUSD,
        });
      }
    });

    return {
      cuotasPrestamosTotal: cuotas,
      capitalTotalPrestamos: capital,
      balanceTarjetasTotal: balanceTarj,
      montoOriginalPrestamosTotal: originalPrestamos,
      totalPagadoPrestamos: pagadoPrestamos,
      deudasItems: items,
    };
  }, [prestamos, tarjetas, movimientos, factorPeriodo, tipoCambio]);

  const montoDeudasCuota = (cuotasPrestamosTotal + (balanceTarjetasTotal > 0 ? balanceTarjetasTotal * 0.1 : 0)) * factorPeriodo;

  // Métricas de salud del endeudamiento: Adeudado vs Pagado y clasificación de riesgo
  const deudaMetricas = useMemo(() => {
    const totalAdeudado = capitalTotalPrestamos + balanceTarjetasTotal;
    const totalPagado = totalPagadoPrestamos;
    const baseTotal = totalAdeudado + totalPagado;
    const pctPagado = baseTotal > 0 ? Math.round((totalPagado / baseTotal) * 100) : (totalAdeudado === 0 ? 100 : 0);
    const pctAdeudado = baseTotal > 0 ? 100 - pctPagado : 0;

    // Nivel de endeudamiento: % de compromiso mensual de deuda sobre ingreso total neto
    const cuotaMensualEstimada = cuotasPrestamosTotal + (balanceTarjetasTotal > 0 ? balanceTarjetasTotal * 0.05 : 0);
    const pctEndeudamiento = totalIngresoMensual > 0
      ? Math.round((cuotaMensualEstimada / totalIngresoMensual) * 100)
      : (totalAdeudado > 0 ? 100 : 0);

    let nivel = "saludable"; // "saludable" | "medio" | "alto"
    let color = "#3b82f6"; // Azul saludable para deudas bajo control (<= 20%)
    let shadowColor = "#2563eb";
    let etiquetaEstado = "Endeudamiento Saludable";
    let badge = "Saludable";
    let palpita = false;
    let fueraDeRango = false;
    let tooltip = "¡DEUDAS CONTROLADAS!";
    let accionRequerida = null;

    if (totalAdeudado > 0 || cuotaMensualEstimada > 0) {
      if (pctEndeudamiento > 35) {
        // Nivel ALTO: Rojo exclusivo para nodo fuera de rango con acción requerida
        nivel = "alto";
        color = "#ef4444";
        shadowColor = "#b91c1c";
        etiquetaEstado = "Endeudamiento Alto (Crítico)";
        badge = "¡Acción!";
        palpita = true;
        fueraDeRango = true;
        tooltip = "🚨 ¡ACCIÓN: ALTO ENDEUDAMIENTO!";
        accionRequerida = `Tus cuotas de deuda comprometen el ${pctEndeudamiento}% de tus ingresos netos (límite saludable: 35%). Se requiere amortizar capital de inmediato o reestructurar cuotas.`;
      } else if (pctEndeudamiento > 20) {
        // Nivel MEDIO: Ámbar / Amarillo moderado (no rojo)
        nivel = "medio";
        color = "#f59e0b";
        shadowColor = "#d97706";
        etiquetaEstado = "Endeudamiento en Rango Medio";
        badge = "Rango Medio";
        palpita = false;
        fueraDeRango = false;
        tooltip = "MONITOREAR CUOTAS";
        accionRequerida = null;
      } else {
        // Nivel SALUDABLE: Azul confiable
        nivel = "saludable";
        color = "#3b82f6";
        shadowColor = "#2563eb";
        etiquetaEstado = "Endeudamiento Saludable";
        badge = "Saludable";
        palpita = false;
        fueraDeRango = false;
        tooltip = "¡DEUDAS CONTROLADAS!";
        accionRequerida = null;
      }
    } else {
      badge = "Sin deudas";
      tooltip = "¡LIBRE DE DEUDAS!";
      color = "#3b82f6";
      shadowColor = "#2563eb";
    }

    return {
      totalAdeudado,
      totalPagado,
      baseTotal,
      pctPagado,
      pctAdeudado,
      pctEndeudamiento,
      nivel,
      color,
      shadowColor,
      etiquetaEstado,
      badge,
      palpita,
      fueraDeRango,
      tooltip,
      accionRequerida,
    };
  }, [capitalTotalPrestamos, balanceTarjetasTotal, totalPagadoPrestamos, cuotasPrestamosTotal, totalIngresoMensual]);

  // 5. Metas de Ahorro
  const { totalMetasAhorrado, totalMetasObjetivo, metasItems } = useMemo(() => {
    let ahorrado = 0;
    let objetivo = 0;
    const items = (metasAhorro || []).map((m) => {
      const ah = Number(m.montoAhorrado) || 0;
      const obj = Number(m.montoObjetivo) || 0;
      ahorrado += ah;
      objetivo += obj;
      return {
        id: m.id,
        nombre: m.nombre || "Meta de ahorro",
        ahorrado: ah,
        objetivo: obj,
        pct: obj > 0 ? Math.min(Math.round((ah / obj) * 100), 100) : 100,
      };
    });
    return { totalMetasAhorrado: ahorrado, totalMetasObjetivo: objetivo, metasItems: items };
  }, [metasAhorro]);

  // 6. Inversiones & Activos
  const { totalInversiones, activosItems } = useMemo(() => {
    let total = 0;
    const items = (activos || []).map((a) => {
      const val = Number(a.valorEstimado ?? a.costoOriginal) || 0;
      total += val;
      return {
        id: a.id,
        nombre: a.nombre || "Activo",
        tipo: a.categoria || "Inversión",
        monto: val,
      };
    });
    return { totalInversiones: total, activosItems: items };
  }, [activos]);

  // 7. Excedente Libre
  const gastosYCompromisosTotales = montoFijos + montoVariables + montoDeudasCuota;
  const montoExcedente = Math.max(montoIngreso - gastosYCompromisosTotales, 0);

  // Porcentaje asignado del flujo
  const pctAsignado = montoIngreso > 0 ? Math.min(Math.round((gastosYCompromisosTotales / montoIngreso) * 100), 100) : 0;

  // Métricas avanzadas de distribución y cascada del dinero (Cash Flow Waterfall)
  const metricasDistribucion = useMemo(() => {
    const base = montoIngreso > 0 ? montoIngreso : 1;
    const pctFijos = montoIngreso > 0 ? Math.round((montoFijos / base) * 100) : 0;
    const pctVariables = montoIngreso > 0 ? Math.round((montoVariables / base) * 100) : 0;
    const pctDeudas = montoIngreso > 0 ? Math.round((montoDeudasCuota / base) * 100) : 0;
    const totalComprometido = montoFijos + montoVariables + montoDeudasCuota;
    const pctComprometido = montoIngreso > 0 ? Math.round((totalComprometido / base) * 100) : 0;
    const remanenteReal = montoIngreso - totalComprometido;
    const pctExcedente = montoIngreso > 0 && remanenteReal > 0 ? Math.round((remanenteReal / base) * 100) : 0;
    const hayDeficit = remanenteReal < 0;
    const montoDeficit = Math.abs(Math.min(remanenteReal, 0));
    const pctDeficit = montoIngreso > 0 && hayDeficit ? Math.round((montoDeficit / base) * 100) : 0;

    let diagnostico = "Flujo Equilibrado";
    let diagnosticoColor = "#58cc02";
    let diagnosticoIcon = "🌱";
    let diagnosticoMensaje = "Tus ingresos cubren tus compromisos y te queda un margen libre saludable.";

    if (hayDeficit) {
      diagnostico = "Déficit / Sobreasignado";
      diagnosticoColor = "#ef4444";
      diagnosticoIcon = "🚨";
      diagnosticoMensaje = `Tus compromisos superan tu ingreso ${vistaPeriodo} por ${formatMoney(montoDeficit)} (${pctDeficit}% de exceso). Toma acción revisando gastos variables o refinanciando cuotas.`;
    } else if (pctDeudas > 35) {
      diagnostico = "Alto Endeudamiento";
      diagnosticoColor = "#ef4444";
      diagnosticoIcon = "🚨";
      diagnosticoMensaje = `Las cuotas de deuda absorben el ${pctDeudas}% de tu ingreso ${vistaPeriodo} (límite saludable: 35%). Toma acción priorizando amortizaciones.`;
    } else if (pctFijos > 55) {
      diagnostico = "Gastos Fijos Fuera de Rango";
      diagnosticoColor = "#ef4444";
      diagnosticoIcon = "🚨";
      diagnosticoMensaje = `Tus gastos fijos consumen el ${pctFijos}% del ingreso ${vistaPeriodo} (rango recomendado: máx 50-55%). Toma acción optimizando servicios o contratos fijos.`;
    } else if (pctVariables > 35) {
      diagnostico = "Día a Día Fuera de Rango";
      diagnosticoColor = "#ef4444";
      diagnosticoIcon = "🚨";
      diagnosticoMensaje = `Tus gastos del día a día consumen el ${pctVariables}% de tu ingreso ${vistaPeriodo} (rango recomendado: máx 30-35%). Toma acción moderando compras discrecionales.`;
    } else if (pctFijos > 45) {
      diagnostico = "Fijos en Rango Moderado";
      diagnosticoColor = "#ff9600";
      diagnosticoIcon = "🏠";
      diagnosticoMensaje = `Tus gastos fijos consumen el ${pctFijos}% del ingreso ${vistaPeriodo}. Tienes un margen manejable pero cuida nuevos compromisos.`;
    } else if (pctExcedente >= 20) {
      diagnostico = "Saludable y Holgado";
      diagnosticoColor = "#58cc02";
      diagnosticoIcon = "🏆";
      diagnosticoMensaje = `¡Excelente! Cuentas con un ${pctExcedente}% de excedente libre (${formatMoney(montoExcedente)}) para acelerar metas o invertir.`;
    }

    return {
      base,
      pctFijos,
      pctVariables,
      pctDeudas,
      pctComprometido,
      pctExcedente,
      hayDeficit,
      montoDeficit,
      pctDeficit,
      totalComprometido,
      remanenteReal,
      diagnostico,
      diagnosticoColor,
      diagnosticoIcon,
      diagnosticoMensaje,
    };
  }, [montoIngreso, montoFijos, montoVariables, montoDeudasCuota, montoExcedente, vistaPeriodo]);

  // Definición de los 7 nodos reales del flujo en formato Duolingo
  const nodosFlujo = useMemo(() => {
    return [
      {
        id: "ingresos",
        label: "Ingresos",
        sublabel: vistaPeriodo === "quincenal" ? "Quincenal" : "Mensual",
        monto: montoIngreso,
        color: "#58cc02",
        shadowColor: "#46a302",
        icon: TrendingUp,
        emoji: "🌱",
        badge: fuentesIngresoItems.length > 0 ? `${fuentesIngresoItems.length} fuente${fuentesIngresoItems.length > 1 ? "s" : ""}` : "0 fuentes",
        anilloPct: 100,
        anilloColor: "#58cc02",
        tooltip: "¡PUNTO DE PARTIDA!",
        esActual: true,
        tabDestino: "ingresos",
        pctFlujo: 100,
        pctTexto: "100% · Base",
        items: fuentesIngresoItems.map((f) => ({
          nombre: f.nombre,
          monto: f.monto,
          detalle: `${f.detalle} · ${vistaPeriodo === "quincenal" ? `Mensual: ${formatMoney(f.montoMensual)}` : `Quincenal: ${formatMoney(f.montoQuincenal)}`}`,
        })),
        descripcion: `Ingresos netos disponibles para el periodo ${vistaPeriodo === "quincenal" ? "quincenal" : "mensual"} (${formatMoney(montoIngreso)}). Todos los ingresos que entran a tu economía para financiar tu vida y metas.`,
      },
      {
        id: "fijos",
        label: "Gastos Fijos",
        sublabel: `${metricasDistribucion.pctFijos}% del ingreso`,
        monto: montoFijos,
        color: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "#ff9600",
        shadowColor: metricasDistribucion.pctFijos > 55 ? "#b91c1c" : "#d87f00",
        icon: Home,
        emoji: "🏠",
        badge: metricasDistribucion.pctFijos > 55 ? "¡Exceso!" : (fijosItems.length > 0 ? `${metricasDistribucion.pctFijos}%` : "0%"),
        anilloPct: Math.min(metricasDistribucion.pctFijos, 100),
        anilloColor: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "#ff9600",
        fueraDeRango: metricasDistribucion.pctFijos > 55,
        tooltip: metricasDistribucion.pctFijos > 55 ? "🚨 ¡REDUCIR FIJOS!" : null,
        accionRequerida: metricasDistribucion.pctFijos > 55
          ? `Tus gastos fijos consumen el ${metricasDistribucion.pctFijos}% del ingreso (rango recomendado: máx 50-55%). Revisa contratos de servicios o alquiler para liberar flujo.`
          : null,
        tabDestino: "presupuesto-mensual",
        pctFlujo: metricasDistribucion.pctFijos,
        pctTexto: metricasDistribucion.pctFijos > 55 ? `⚠️ ${metricasDistribucion.pctFijos}% (Excede 55%)` : `${metricasDistribucion.pctFijos}% del ingreso`,
        items: fijosItems.map((f) => ({
          nombre: f.nombre,
          monto: f.monto,
          detalle: f.clasificacion,
        })),
        descripcion: metricasDistribucion.pctFijos > 55
          ? `Alerta: Tus gastos fijos están fuera de rango (${metricasDistribucion.pctFijos}% del ingreso). Comprometen más de la mitad de lo que ganas y reducen tu liquidez.`
          : "Tus obligaciones recurrentes inevitables (vivienda, luz, agua, colegio, servicios).",
      },
      {
        id: "variables",
        label: "Día a Día",
        sublabel: `${metricasDistribucion.pctVariables}% del ingreso`,
        monto: montoVariables,
        color: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "#8b5cf6",
        shadowColor: metricasDistribucion.pctVariables > 35 ? "#b91c1c" : "#7c3aed",
        icon: ShoppingBag,
        emoji: "🛒",
        badge: metricasDistribucion.pctVariables > 35 ? "¡Exceso!" : (variablesItems.length > 0 ? `${metricasDistribucion.pctVariables}%` : "0%"),
        anilloPct: Math.min(metricasDistribucion.pctVariables, 100),
        anilloColor: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "#8b5cf6",
        fueraDeRango: metricasDistribucion.pctVariables > 35,
        tooltip: metricasDistribucion.pctVariables > 35 ? "🚨 ¡GASTOS VARIABLES ALTOS!" : null,
        accionRequerida: metricasDistribucion.pctVariables > 35
          ? `Tus gastos del día a día consumen el ${metricasDistribucion.pctVariables}% de tus ingresos (rango recomendado: máx 30-35%). Modera compras discrecionales y salidas.`
          : null,
        tabDestino: "presupuesto-categoria-gasto",
        pctFlujo: metricasDistribucion.pctVariables,
        pctTexto: metricasDistribucion.pctVariables > 35 ? `⚠️ ${metricasDistribucion.pctVariables}% (Excede 35%)` : `${metricasDistribucion.pctVariables}% del ingreso`,
        items: variablesItems.map((v) => ({
          nombre: v.nombre,
          monto: v.monto,
          detalle: v.clasificacion,
        })),
        descripcion: metricasDistribucion.pctVariables > 35
          ? `Alerta: Tus gastos del día a día están fuera de rango (${metricasDistribucion.pctVariables}%). Toma acción reduciendo consumos no esenciales.`
          : "Gastos variables que cambian semana a semana (combustible, compras, alimentación).",
      },
      {
        id: "deudas",
        label: "Deudas",
        sublabel: `${metricasDistribucion.pctDeudas}% en cuotas`,
        monto: montoDeudasCuota,
        color: deudaMetricas.color,
        shadowColor: deudaMetricas.shadowColor,
        icon: Landmark,
        emoji: "💳",
        badge: deudaMetricas.fueraDeRango ? "¡Acción!" : deudaMetricas.badge,
        anilloPct: Math.min(metricasDistribucion.pctDeudas, 100),
        anilloColor: deudaMetricas.color,
        tooltip: deudaMetricas.tooltip,
        palpita: deudaMetricas.palpita,
        fueraDeRango: deudaMetricas.fueraDeRango,
        accionRequerida: deudaMetricas.accionRequerida,
        deudaInfo: deudaMetricas,
        tabDestino: "prestamos",
        pctFlujo: metricasDistribucion.pctDeudas,
        pctTexto: deudaMetricas.fueraDeRango
          ? `⚠️ ${metricasDistribucion.pctDeudas}% (Crítico >35%)`
          : `${metricasDistribucion.pctDeudas}% en cuotas`,
        items: deudasItems.map((d) => ({
          nombre: d.nombre,
          monto: d.cuota,
          adeudado: d.adeudado,
          pagado: d.pagado,
          original: d.original,
          pctPagado: d.pctPagado,
          pctAdeudado: d.pctAdeudado,
          limite: d.limite,
          pctUso: d.pctUso,
          tipo: d.tipo,
          detalle: d.tipo === "prestamo"
            ? `Adeudado: ${formatMoney(d.adeudado)} · Pagado: ${formatMoney(d.pagado)}`
            : `Balance: ${formatMoney(d.adeudado)}${d.limite ? ` / Límite: ${formatMoney(d.limite)}` : ""}`,
        })),
        descripcion: deudaMetricas.fueraDeRango
          ? `Alerta crítica: Tu nivel de endeudamiento está fuera de rango (${deudaMetricas.pctEndeudamiento}% de tus ingresos). Toma acción inmediata para reducir cuotas y amortizar capital.`
          : deudaMetricas.nivel === "medio"
          ? `Tu nivel de endeudamiento está en rango moderado (${deudaMetricas.pctEndeudamiento}% de tus ingresos). Mantén disciplina para no comprometer liquidez.`
          : `Tu nivel de endeudamiento es saludable (${deudaMetricas.pctEndeudamiento}% de tus ingresos). Tienes holgura para ahorro e inversión.`,
      },
      {
        id: "ahorro",
        label: "Metas Ahorro",
        sublabel: `${metasItems.length} metas activas`,
        monto: totalMetasAhorrado,
        color: "#1cb0f6",
        shadowColor: "#1899d6",
        icon: Shield,
        emoji: "🛡️",
        badge: totalMetasObjetivo > 0 ? `${Math.round((totalMetasAhorrado / totalMetasObjetivo) * 100)}%` : "0%",
        anilloPct: totalMetasObjetivo > 0 ? Math.min(Math.round((totalMetasAhorrado / totalMetasObjetivo) * 100), 100) : 25,
        anilloColor: "#1cb0f6",
        tabDestino: "ahorro",
        pctFlujo: totalMetasObjetivo > 0 ? Math.round((totalMetasAhorrado / totalMetasObjetivo) * 100) : 0,
        pctTexto: totalMetasObjetivo > 0 ? `${Math.round((totalMetasAhorrado / totalMetasObjetivo) * 100)}% avance` : `${metasItems.length} metas`,
        items: metasItems.map((m) => ({
          nombre: m.nombre,
          monto: m.ahorrado,
          detalle: `Objetivo: ${formatMoney(m.objetivo)} (${m.pct}%)`,
        })),
        descripcion: "Tus fondos de emergencia, colchón de paz mental y proyectos futuros.",
      },
      {
        id: "inversion",
        label: "Inversión",
        sublabel: `${activosItems.length} activos`,
        monto: totalInversiones,
        color: "#00cd9c",
        shadowColor: "#00a37b",
        icon: LineChart,
        emoji: "📈",
        badge: activosItems.length > 0 ? `${activosItems.length} activos` : "0",
        anilloPct: totalInversiones > 0 ? 70 : 0,
        anilloColor: "#00cd9c",
        tabDestino: "activos",
        pctFlujo: totalInversiones > 0 ? 100 : 0,
        pctTexto: `${activosItems.length} activos`,
        items: activosItems.map((a) => ({
          nombre: a.nombre,
          monto: a.monto,
          detalle: a.tipo,
        })),
        descripcion: "Activos generadores de valor que hacen crecer tu patrimonio neto a largo plazo.",
      },
      {
        id: "excedente",
        label: "Excedente Libre",
        sublabel: metricasDistribucion.hayDeficit ? `Déficit ${formatMoney(metricasDistribucion.montoDeficit)}` : `${metricasDistribucion.pctExcedente}% disponible`,
        monto: montoExcedente,
        color: metricasDistribucion.hayDeficit ? "#ef4444" : "#ffc800",
        shadowColor: metricasDistribucion.hayDeficit ? "#b91c1c" : "#d8a000",
        icon: Trophy,
        emoji: metricasDistribucion.hayDeficit ? "🚨" : "🏆",
        badge: metricasDistribucion.hayDeficit ? "¡Déficit!" : `${metricasDistribucion.pctExcedente}%`,
        anilloPct: metricasDistribucion.hayDeficit ? 100 : Math.min(metricasDistribucion.pctExcedente, 100),
        anilloColor: metricasDistribucion.hayDeficit ? "#ef4444" : "#ffc800",
        fueraDeRango: metricasDistribucion.hayDeficit,
        tooltip: metricasDistribucion.hayDeficit ? "🚨 ¡DÉFICIT FINANCIERO!" : null,
        accionRequerida: metricasDistribucion.hayDeficit
          ? `Tus salidas superan tus ingresos por ${formatMoney(metricasDistribucion.montoDeficit)} (${metricasDistribucion.pctDeficit}%). Toma acción urgente para recortar gastos o balancear el flujo.`
          : null,
        tabDestino: "presupuesto-mensual",
        pctFlujo: metricasDistribucion.pctExcedente,
        pctTexto: metricasDistribucion.hayDeficit ? `⚠️ Déficit ${formatMoney(metricasDistribucion.montoDeficit)}` : `${metricasDistribucion.pctExcedente}% libre`,
        items: [
          {
            nombre: "Ingresos del periodo",
            monto: montoIngreso,
            detalle: "+ Entradas",
          },
          {
            nombre: "Total asignado a gastos y cuotas",
            monto: gastosYCompromisosTotales,
            detalle: "- Salidas",
          },
          {
            nombre: "Excedente neto disponible",
            monto: montoExcedente,
            detalle: "= Margen de libertad",
          },
        ],
        descripcion: "El margen libre que te sobra para ahorrar más, disfrutar o invertir sin estrés.",
      },
    ];
  }, [
    fuentesIngreso,
    fuentesIngresoItems,
    vistaPeriodo,
    montoIngreso,
    factorPeriodo,
    fijosItems,
    montoFijos,
    variablesItems,
    montoVariables,
    deudasItems,
    montoDeudasCuota,
    capitalTotalPrestamos,
    metasItems,
    totalMetasAhorrado,
    totalMetasObjetivo,
    activosItems,
    totalInversiones,
    montoExcedente,
    gastosYCompromisosTotales,
    metricasDistribucion,
    deudaMetricas,
  ]);

  // Filas en zigzag idénticas a Duolingo para los 7 nodos:
  // Fila 0: 1 nodo centrado (Ingresos)
  // Fila 1: 2 nodos lado a lado (Gastos Fijos, Día a Día)
  // Fila 2: 1 nodo centrado (Deudas)
  // Fila 3: 2 nodos lado a lado (Metas Ahorro, Inversión)
  // Fila 4: 1 nodo centrado (Excedente Libre)
  const FILAS = [
    { nodos: [0], justify: "center" },
    { nodos: [1, 2], justify: "space-around" },
    { nodos: [3], justify: "center" },
    { nodos: [4, 5], justify: "space-around" },
    { nodos: [6], justify: "center" },
  ];

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 60 }}>
      <style>{`
        @keyframes duolingoBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes flamePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,150,0,0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(255,150,0,0.8)); }
        }
        .duo-bounce {
          animation: duolingoBounce 1.2s ease-in-out infinite;
        }
        .duo-flame-anim {
          animation: flamePulse 1.8s ease-in-out infinite;
        }
        .duo-btn-3d {
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .duo-btn-3d:active {
          transform: translateY(4px) !important;
          box-shadow: 0 2px 0 var(--btn-shadow) !important;
        }
        @keyframes pulseModeradoAccion {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 0 var(--btn-shadow), 0 10px 14px rgba(0,0,0,0.18), 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 8px 0 var(--btn-shadow), 0 14px 22px rgba(239, 68, 68, 0.4), 0 0 0 13px rgba(239, 68, 68, 0);
          }
        }
        .duo-pulse-accion {
          animation: pulseModeradoAccion 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
        @keyframes pulseRojoAccion {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 0 var(--btn-shadow), 0 10px 16px rgba(239, 68, 68, 0.35), 0 0 0 0 rgba(239, 68, 68, 0.8);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 8px 0 var(--btn-shadow), 0 16px 26px rgba(239, 68, 68, 0.55), 0 0 0 15px rgba(239, 68, 68, 0);
          }
        }
        .duo-pulse-rojo-accion {
          animation: pulseRojoAccion 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }
        @keyframes alertaBlink {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.2); }
        }
        .duo-alerta-blink {
          animation: alertaBlink 1.2s ease-in-out infinite;
        }
        @keyframes duoFlowDash {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        .duo-flow-line {
          animation: duoFlowDash 1s linear infinite;
        }
        @keyframes popCenterModal {
          0% {
            transform: scale(0.93) translateY(6px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* 1. BARRA SUPERIOR HUD DUOLINGO CON LAS MÉTRICAS REALES DE TU DINERO */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--card, #ffffff)",
          borderBottom: "2px solid var(--line, #e5e5e5)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          borderRadius: "0 0 16px 16px",
          marginBottom: 16,
        }}
      >
        {/* DO Pill */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: "var(--ink, #ffffff)",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
          title="Moneda: Peso Dominicano (RD$)"
        >
          DO
        </div>

        {/* Ingreso Total */}
        <div
          onClick={() => onNavigate && onNavigate("ingresos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: "3px 6px",
            borderRadius: 10,
          }}
          title="Ingreso total del periodo"
        >
          <Crown size={19} style={{ color: "#ffc800", fill: "#ffc800" }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#ffc800", fontFamily: "var(--font-mono, monospace)" }}>
            {formatMoney(montoIngreso)}
          </span>
        </div>

        {/* Deudas Cuota */}
        <div
          onClick={() => onNavigate && onNavigate("prestamos")}
          className="duo-flame-anim"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: "3px 8px",
            borderRadius: 14,
            background: "rgba(255,150,0,0.12)",
            border: "1.5px solid rgba(255,150,0,0.35)",
          }}
          title="Total cuotas de préstamos y deudas"
        >
          <Flame size={19} style={{ color: "#ff9600", fill: "#ff9600" }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#ff9600", fontFamily: "var(--font-mono, monospace)" }}>
            {formatMoney(montoDeudasCuota)}
          </span>
        </div>

        {/* Excedente */}
        <div
          onClick={() => onNavigate && onNavigate("presupuesto-mensual")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: "3px 6px",
            borderRadius: 10,
          }}
          title="Excedente libre proyectado"
        >
          <Gem size={18} style={{ color: "#1cb0f6", fill: "#1cb0f6" }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#1cb0f6", fontFamily: "var(--font-mono, monospace)" }}>
            {formatMoney(montoExcedente)}
          </span>
        </div>
      </div>

      {/* SELECTOR MENSUAL / QUINCENAL */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--card-soft, rgba(0,0,0,0.06))",
            padding: 3,
            borderRadius: 12,
            border: "1px solid var(--line, #e5e5e5)",
          }}
        >
          <button
            onClick={() => setVistaPeriodo("mensual")}
            style={{
              padding: "5px 14px",
              borderRadius: 9,
              border: "none",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              background: vistaPeriodo === "mensual" ? "var(--card, #ffffff)" : "transparent",
              color: vistaPeriodo === "mensual" ? "var(--ink, #111827)" : "var(--ink-soft, #6b7280)",
              boxShadow: vistaPeriodo === "mensual" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Vista Mensual
          </button>
          <button
            onClick={() => setVistaPeriodo("quincenal")}
            style={{
              padding: "5px 14px",
              borderRadius: 9,
              border: "none",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              background: vistaPeriodo === "quincenal" ? "var(--card, #ffffff)" : "transparent",
              color: vistaPeriodo === "quincenal" ? "var(--ink, #111827)" : "var(--ink-soft, #6b7280)",
              boxShadow: vistaPeriodo === "quincenal" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Vista Quincenal
          </button>
        </div>
      </div>

      {/* BOTÓN PARA VER / OCULTAR DETALLES DE DISTRIBUCIÓN Y RUTA FINANCIERA */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <button
          onClick={() => setMostrarDetallesDistribucion((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            borderRadius: 14,
            border: "1.5px solid var(--line, #e5e5e5)",
            background: mostrarDetallesDistribucion ? "var(--card-soft, rgba(0,0,0,0.06))" : "var(--card, #ffffff)",
            color: "var(--ink, #111827)",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            transition: "all 0.15s ease",
          }}
        >
          <PieChart size={15} style={{ color: "#ff9600" }} />
          <span>
            {mostrarDetallesDistribucion
              ? "Ocultar análisis y ruta de distribución"
              : `Ver análisis y distribución del ingreso ${vistaPeriodo === "quincenal" ? "quincenal" : "mensual"}`}
          </span>
          <ChevronDown
            size={14}
            style={{
              transform: mostrarDetallesDistribucion ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>

      {mostrarDetallesDistribucion && (
        <>
          {/* 2. INDICADOR DE DISTRIBUCIÓN DEL FLUJO DE DINERO */}
          <div
            style={{
              background: "var(--card, #ffffff)",
              border: "2px solid var(--line, #e5e5e5)",
              borderRadius: 20,
              padding: "16px 18px",
              marginBottom: 20,
              boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
            }}
          >
        {/* Cabecera del Indicador */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} style={{ color: "#ffc800" }} />
              <span style={{ fontSize: 13.5, fontWeight: 900, color: "var(--ink, #111827)", letterSpacing: "-0.01em" }}>
                Distribución del Ingreso {vistaPeriodo === "quincenal" ? "Quincenal" : "Mensual"}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft, #6b7280)", marginTop: 2, fontWeight: 600 }}>
              Ingreso base: <strong style={{ color: "#58cc02", fontFamily: "var(--font-mono, monospace)" }}>{formatMoney(montoIngreso)}</strong>
            </div>
          </div>

          {/* Badge de diagnóstico */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: `${metricasDistribucion.diagnosticoColor}15`,
              color: metricasDistribucion.diagnosticoColor,
              border: `1.5px solid ${metricasDistribucion.diagnosticoColor}35`,
              borderRadius: 12,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <span>{metricasDistribucion.diagnosticoIcon}</span>
            <span>{metricasDistribucion.diagnostico}</span>
          </div>
        </div>

        {/* Barra de Distribución Proporcional Multifilamento */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              height: 22,
              borderRadius: 12,
              background: "var(--line, #e5e5e5)",
              overflow: "hidden",
              display: "flex",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.08)",
              position: "relative",
            }}
          >
            {/* Segmento 1: Fijos */}
            {metricasDistribucion.pctFijos > 0 && (
              <div
                onClick={() => setNodoSeleccionado(nodosFlujo[1])}
                title={`Gastos Fijos: ${metricasDistribucion.pctFijos}% (${formatMoney(montoFijos)})${metricasDistribucion.pctFijos > 55 ? " - ¡Fuera de rango!" : ""}`}
                style={{
                  width: `${metricasDistribucion.pctFijos}%`,
                  background: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "#ff9600",
                  height: "100%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 900,
                  transition: "width 0.4s ease",
                  borderRight: "1.5px solid rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metricasDistribucion.pctFijos >= 10 ? `${metricasDistribucion.pctFijos}%` : ""}
              </div>
            )}

            {/* Segmento 2: Día a Día */}
            {metricasDistribucion.pctVariables > 0 && (
              <div
                onClick={() => setNodoSeleccionado(nodosFlujo[2])}
                title={`Día a Día: ${metricasDistribucion.pctVariables}% (${formatMoney(montoVariables)})${metricasDistribucion.pctVariables > 35 ? " - ¡Fuera de rango!" : ""}`}
                style={{
                  width: `${metricasDistribucion.pctVariables}%`,
                  background: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "#8b5cf6",
                  height: "100%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 900,
                  transition: "width 0.4s ease",
                  borderRight: "1.5px solid rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metricasDistribucion.pctVariables >= 10 ? `${metricasDistribucion.pctVariables}%` : ""}
              </div>
            )}

            {/* Segmento 3: Deudas */}
            {metricasDistribucion.pctDeudas > 0 && (
              <div
                onClick={() => setNodoSeleccionado(nodosFlujo[3])}
                title={`Deudas: ${metricasDistribucion.pctDeudas}% (${formatMoney(montoDeudasCuota)})${deudaMetricas.fueraDeRango ? " - ¡Fuera de rango!" : ""}`}
                style={{
                  width: `${metricasDistribucion.pctDeudas}%`,
                  background: deudaMetricas.color,
                  height: "100%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 900,
                  transition: "width 0.4s ease",
                  borderRight: "1.5px solid rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metricasDistribucion.pctDeudas >= 10 ? `${metricasDistribucion.pctDeudas}%` : ""}
              </div>
            )}

            {/* Segmento 4: Excedente Libre */}
            {metricasDistribucion.pctExcedente > 0 && (
              <div
                onClick={() => setNodoSeleccionado(nodosFlujo[6])}
                title={`Excedente Libre: ${metricasDistribucion.pctExcedente}% (${formatMoney(montoExcedente)})`}
                style={{
                  width: `${metricasDistribucion.pctExcedente}%`,
                  background: "#58cc02",
                  height: "100%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 900,
                  transition: "width 0.4s ease",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {metricasDistribucion.pctExcedente >= 10 ? `${metricasDistribucion.pctExcedente}%` : ""}
              </div>
            )}

            {/* Segmento 5: Déficit / Sobreasignación si gastos > ingreso */}
            {metricasDistribucion.hayDeficit && (
              <div
                title={`Sobreasignado: Déficit de ${formatMoney(metricasDistribucion.montoDeficit)} (${metricasDistribucion.pctDeficit}%)`}
                style={{
                  flex: 1,
                  background: "repeating-linear-gradient(45deg, #ef4444, #ef4444 8px, #dc2626 8px, #dc2626 16px)",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 900,
                }}
              >
                ⚠️ -{metricasDistribucion.pctDeficit}%
              </div>
            )}
          </div>
        </div>

        {/* Chips interactivos de desglose de donde se va el dinero */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {/* Chip Fijos */}
          <div
            onClick={() => setNodoSeleccionado(nodosFlujo[1])}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              background: metricasDistribucion.pctFijos > 55 ? "rgba(239,68,68,0.1)" : "rgba(255,150,0,0.08)",
              border: `1.5px solid ${metricasDistribucion.pctFijos > 55 ? "rgba(239,68,68,0.4)" : "rgba(255,150,0,0.25)"}`,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "#ff9600" }}>
                {metricasDistribucion.pctFijos > 55 ? "🚨 Fijos" : "🏠 Fijos"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "#ff9600" }}>
                {metricasDistribucion.pctFijos}%
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: metricasDistribucion.pctFijos > 55 ? "#ef4444" : "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>
              {formatMoney(montoFijos)}
            </div>
          </div>

          {/* Chip Día a Día */}
          <div
            onClick={() => setNodoSeleccionado(nodosFlujo[2])}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              background: metricasDistribucion.pctVariables > 35 ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.08)",
              border: `1.5px solid ${metricasDistribucion.pctVariables > 35 ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.25)"}`,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "#8b5cf6" }}>
                {metricasDistribucion.pctVariables > 35 ? "🚨 Día a Día" : "🛒 Día a Día"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "#8b5cf6" }}>
                {metricasDistribucion.pctVariables}%
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: metricasDistribucion.pctVariables > 35 ? "#ef4444" : "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>
              {formatMoney(montoVariables)}
            </div>
          </div>

          {/* Chip Deudas */}
          <div
            onClick={() => setNodoSeleccionado(nodosFlujo[3])}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              background: deudaMetricas.fueraDeRango ? "rgba(239,68,68,0.1)" : `${deudaMetricas.color}12`,
              border: `1.5px solid ${deudaMetricas.fueraDeRango ? "rgba(239,68,68,0.4)" : `${deudaMetricas.color}35`}`,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: deudaMetricas.color }}>
                {deudaMetricas.fueraDeRango ? "🚨 Deudas" : "💳 Deudas"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: deudaMetricas.color }}>{metricasDistribucion.pctDeudas}%</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: deudaMetricas.fueraDeRango ? "#ef4444" : "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>
              {formatMoney(montoDeudasCuota)}
            </div>
          </div>

          {/* Chip Excedente */}
          <div
            onClick={() => setNodoSeleccionado(nodosFlujo[6])}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              background: metricasDistribucion.hayDeficit ? "rgba(239,68,68,0.1)" : "rgba(88,204,2,0.1)",
              border: `1.5px solid ${metricasDistribucion.hayDeficit ? "rgba(239,68,68,0.3)" : "rgba(88,204,2,0.3)"}`,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: metricasDistribucion.hayDeficit ? "#ef4444" : "#58cc02" }}>
                {metricasDistribucion.hayDeficit ? "🚨 Déficit" : "🏆 Libre"}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: metricasDistribucion.hayDeficit ? "#ef4444" : "#58cc02" }}>
                {metricasDistribucion.hayDeficit ? `-${metricasDistribucion.pctDeficit}%` : `${metricasDistribucion.pctExcedente}%`}
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: metricasDistribucion.hayDeficit ? "#ef4444" : "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>
              {metricasDistribucion.hayDeficit ? `-${formatMoney(metricasDistribucion.montoDeficit)}` : formatMoney(montoExcedente)}
            </div>
          </div>
        </div>

        {/* Mensaje diagnóstico y regla de referencia */}
        <div
          style={{
            background: "var(--card-soft, rgba(0,0,0,0.025))",
            border: "1px dashed var(--line, #e5e5e5)",
            borderRadius: 12,
            padding: "9px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--ink-soft, #4b5563)",
            lineHeight: 1.35,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <div>
            <strong>Diagnóstico del Flujo:</strong> {metricasDistribucion.diagnosticoMensaje}
          </div>
        </div>
      </div>

      {/* 3. ENCABEZADO DE UNIDAD ESTILO DUOLINGO CON MASCOTA "PLUS" FLOTANTE */}
      <div style={{ position: "relative", marginBottom: 30, padding: "0 6px" }}>
        {/* Banner de Unidad */}
        <div
          style={{
            background: "#58cc02",
            color: "#ffffff",
            borderRadius: 18,
            padding: "16px 18px",
            boxShadow: "0 6px 0 #46a302, 0 8px 18px rgba(88,204,2,0.25)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.95,
                  marginBottom: 3,
                }}
              >
                SECCIÓN 1 · RUTA DE TU DINERO ({vistaPeriodo.toUpperCase()})
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                Ruta de Dominio Financiero
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.95, marginTop: 4 }}>
                {pctAsignado}% de tus ingresos distribuidos en el flujo
              </div>
            </div>

            {/* Continuar button */}
            <button
              onClick={() => onNavigate && onNavigate("presupuesto-mensual")}
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "2px solid rgba(255,255,255,0.45)",
                color: "#ffffff",
                borderRadius: 14,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                backdropFilter: "blur(4px)",
              }}
            >
              <span>Ajustar</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Barra de progreso de la unidad */}
          <div style={{ marginTop: 12, height: 8, background: "#3e8e02", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pctAsignado}%`,
                background: "#ffc800",
                borderRadius: 8,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Mascota PLUS flotante */}
        <div
          onClick={() => onNavigate && onNavigate("asistente")}
          style={{
            position: "absolute",
            top: -12,
            right: 14,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
            zIndex: 10,
          }}
          title="Consultor Financiero Inteligente"
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1cb0f6 0%, #0077b6 100%)",
              border: "3px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🤖
          </div>
          <span
            style={{
              marginTop: -6,
              background: "#1cb0f6",
              color: "#ffffff",
              fontSize: 9.5,
              fontWeight: 900,
              padding: "1px 6px",
              borderRadius: 8,
              border: "1.5px solid #ffffff",
              letterSpacing: "0.05em",
            }}
          >
            PLUS
          </span>
        </div>
      </div>
      </>
      )}

      {/* 3. CAMINO DE NODOS FINANCIEROS REALES (BOTONES CIRCULARES 3D DUOLINGO EN ZIGZAG) */}
      <div style={{ position: "relative", padding: "10px 10px 40px" }}>
        {FILAS.map((fila, filaIdx) => (
          <React.Fragment key={filaIdx}>
            <div
              style={{
                display: "flex",
                justifyContent: fila.justify,
                alignItems: "center",
                marginBottom: 16,
                position: "relative",
              }}
            >
            {fila.nodos.map((nodoIdx) => {
              const nodo = nodosFlujo[nodoIdx];
              if (!nodo) return null;

              const bgBtn = nodo.color;
              const shadowBtn = nodo.shadowColor;
              const tieneAlerta = nodo.tooltip != null;

              return (
                <div
                  key={nodo.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    width: fila.nodos.length === 1 ? "100%" : "45%",
                  }}
                >
                  {/* Bouncing Pointer si tiene alerta o sugerencia ("¡EMPIEZA AQUÍ!", etc.) */}
                  {tieneAlerta && (
                    <div
                      className="duo-bounce"
                      style={{
                        position: "absolute",
                        top: -40,
                        zIndex: 20,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          background: nodo.fueraDeRango ? "#ef4444" : "#ffffff",
                          color: nodo.fueraDeRango ? "#ffffff" : nodo.color,
                          border: `2px solid ${nodo.fueraDeRango ? "#b91c1c" : nodo.color}`,
                          fontSize: 10,
                          fontWeight: 900,
                          padding: "2.5px 8px",
                          borderRadius: 10,
                          boxShadow: nodo.fueraDeRango ? "0 4px 12px rgba(239, 68, 68, 0.5)" : "0 3px 6px rgba(0,0,0,0.12)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {nodo.fueraDeRango && <AlertTriangle size={11} strokeWidth={3} />}
                        <span>{nodo.tooltip}</span>
                      </div>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderTop: `6px solid ${nodo.fueraDeRango ? "#b91c1c" : nodo.color}`,
                          marginTop: -1,
                        }}
                      />
                    </div>
                  )}

                  {/* Botón Circular 3D Duolingo */}
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    {/* Anillo de progreso concéntrico (0-100%) */}
                    {nodo.anilloPct > 0 && (
                      <svg
                        style={{
                          position: "absolute",
                          inset: -7,
                          width: 94,
                          height: 94,
                          transform: "rotate(-90deg)",
                          pointerEvents: "none",
                        }}
                      >
                        <circle
                          cx="47"
                          cy="47"
                          r="42"
                          stroke="var(--line, #e5e5e5)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          cx="47"
                          cy="47"
                          r="42"
                          stroke={nodo.anilloColor}
                          strokeWidth="5"
                          strokeDasharray="264"
                          strokeDashoffset={264 - (264 * Math.max(nodo.anilloPct, 10)) / 100}
                          strokeLinecap="round"
                          fill="none"
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                    )}

                    <button
                      onClick={() => setNodoSeleccionado(nodo)}
                      className={`duo-btn-3d ${nodo.fueraDeRango ? "duo-pulse-rojo-accion" : nodo.palpita ? "duo-pulse-accion" : ""}`}
                      title={`${nodo.label} · ${formatMoney(nodo.monto)}${nodo.fueraDeRango ? " (¡Fuera de rango - Clic para tomar acción!)" : ""}`}
                      style={{
                        "--btn-shadow": shadowBtn,
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: bgBtn,
                        boxShadow: `0 8px 0 ${shadowBtn}, 0 10px 14px rgba(0,0,0,0.15)`,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 34,
                        padding: 0,
                        position: "relative",
                        outline: "none",
                      }}
                    >
                      <span style={{ transform: "translateY(-2px)" }}>{nodo.emoji}</span>
                    </button>

                    {/* Badge en la esquina inferior derecha (alerta roja si está fuera de rango, corona si está en rango) */}
                    <div
                      className={nodo.fueraDeRango ? "duo-alerta-blink" : ""}
                      style={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        background: nodo.fueraDeRango ? "#ef4444" : "#ffc800",
                        color: nodo.fueraDeRango ? "#ffffff" : "#784a00",
                        borderRadius: 12,
                        padding: "2px 6px",
                        boxShadow: nodo.fueraDeRango ? "0 2px 0 #b91c1c, 0 3px 6px rgba(239, 68, 68, 0.45)" : "0 2px 0 #cc9b00",
                        border: "2px solid #ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        fontSize: 9.5,
                        fontWeight: 900,
                        zIndex: 10,
                      }}
                    >
                      {nodo.fueraDeRango ? (
                        <AlertTriangle size={11} strokeWidth={3} />
                      ) : (
                        <Crown size={11} style={{ fill: "#784a00" }} />
                      )}
                      <span>{nodo.badge}</span>
                    </div>
                  </div>

                  {/* Título y Monto real del nodo debajo del círculo (también clickeable en móvil) */}
                  <div
                    onClick={() => setNodoSeleccionado(nodo)}
                    role="button"
                    tabIndex={0}
                    style={{
                      marginTop: 14,
                      textAlign: "center",
                      maxWidth: 120,
                      lineHeight: 1.2,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #111827)", letterSpacing: "-0.01em" }}>
                      {nodo.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: nodo.color,
                        marginTop: 2,
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {formatMoney(nodo.monto)}
                    </div>
                    {/* Badge con el porcentaje de distribución del flujo o alerta para tomar acción */}
                    {nodo.pctTexto && (
                      <div style={{ marginTop: 4 }}>
                        {nodo.fueraDeRango ? (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 900,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.12)",
                              color: "#ef4444",
                              border: "1.5px solid rgba(239, 68, 68, 0.45)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              whiteSpace: "nowrap",
                              boxShadow: "0 1px 3px rgba(239, 68, 68, 0.2)",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#ef4444",
                                display: "inline-block",
                                boxShadow: "0 0 4px #ef4444",
                              }}
                            />
                            ¡Tomar Acción!
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: `${nodo.color}15`,
                              color: nodo.color,
                              border: `1px solid ${nodo.color}35`,
                              display: "inline-block",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {nodo.pctTexto}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conector dinámico de flujo entre niveles */}
          {filaIdx === 0 && (
            <ConectorFlujo
              tipo="split-1-to-2"
              label={`Distribución: Fijos (${metricasDistribucion.pctFijos}%) y Día a Día (${metricasDistribucion.pctVariables}%)`}
              color="#58cc02"
            />
          )}
          {filaIdx === 1 && (
            <ConectorFlujo
              tipo="merge-2-to-1"
              label={`Fluyendo a Deudas: ${metricasDistribucion.pctDeudas}%`}
              color="#ff9600"
            />
          )}
          {filaIdx === 2 && (
            <ConectorFlujo
              tipo="split-1-to-2"
              label="Fluyendo a Metas y Crecimiento"
              color="#1cb0f6"
            />
          )}
          {filaIdx === 3 && (
            <ConectorFlujo
              tipo="merge-2-to-1"
              label={`Margen Libre Restante: ${metricasDistribucion.pctExcedente}%`}
              color="#ffc800"
            />
          )}
        </React.Fragment>
        ))}
      </div>

      {/* 4. MODAL / DETALLE DE CADA NODO FINANCIERO AL TOCARLO (CENTRALIZADO EN PANTALLA) */}
      {nodoSeleccionado && (
        <div
          onClick={() => setNodoSeleccionado(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100dvh",
            background: "rgba(0,0,0,0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            padding: "calc(14px + env(safe-area-inset-top, 0px)) 14px calc(14px + env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, calc(100vw - 24px))",
              maxHeight: "min(85dvh, 660px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              background: "var(--card, #ffffff)",
              borderRadius: 24,
              border: "2px solid var(--line, #e5e5e5)",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5)",
              overflow: "hidden",
              animation: "popCenterModal 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header del modal con color temático del nodo */}
            <div
              style={{
                background: nodoSeleccionado.color,
                color: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  {nodoSeleccionado.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.9 }}>
                    Nodo de Flujo Financiero
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{nodoSeleccionado.label}</div>
                </div>
              </div>
              <button
                onClick={() => setNodoSeleccionado(null)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#ffffff",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido desplazable del modal */}
            <div
              style={{
                padding: "18px 20px",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                flex: 1,
              }}
            >
              {/* BANNER DESTACADO DE ACCIÓN REQUERIDA (CUANDO EL NODO ESTÁ FUERA DE RANGO) */}
              {nodoSeleccionado.fueraDeRango && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "2px solid rgba(239, 68, 68, 0.35)",
                    borderRadius: 16,
                    padding: "13px 15px",
                    marginBottom: 16,
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#ef4444",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <AlertTriangle size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#dc2626", letterSpacing: "-0.01em" }}>
                        ¡ACCIÓN REQUERIDA: FUERA DE RANGO!
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft, #6b7280)" }}>
                        Requiere ajuste para equilibrar tus finanzas
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink, #1f2937)",
                      margin: "6px 0 12px 0",
                      lineHeight: 1.45,
                      fontWeight: 600,
                    }}
                  >
                    {nodoSeleccionado.accionRequerida ||
                      "Este rubro excede los umbrales financieros recomendados. Se aconseja tomar medidas inmediatas para restablecer el equilibrio de tu flujo."}
                  </p>
                  <button
                    onClick={() => {
                      if (onNavigate && nodoSeleccionado.tabDestino) {
                        onNavigate(nodoSeleccionado.tabDestino);
                      }
                      setNodoSeleccionado(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      cursor: "pointer",
                      boxShadow: "0 2px 0 #b91c1c",
                    }}
                  >
                    <span>⚡ Tomar Acción Ahora en {nodoSeleccionado.label}</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--line, #e5e5e5)",
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--ink-soft, #6b7280)", fontWeight: 600 }}>
                  {nodoSeleccionado.id === "ingresos"
                    ? "Ingreso"
                    : nodoSeleccionado.id === "excedente"
                    ? "Excedente"
                    : "Compromiso"}{" "}
                  {vistaPeriodo}:
                </span>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: nodoSeleccionado.color,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {formatMoney(nodoSeleccionado.monto)}
                </span>
              </div>

              {/* Indicador de impacto en el flujo de dinero del periodo */}
              {nodoSeleccionado.id !== "ingresos" && montoIngreso > 0 && (
                <div
                  style={{
                    background: "var(--card-soft, rgba(0,0,0,0.03))",
                    border: "1px solid var(--line, #e5e5e5)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, fontWeight: 700 }}>
                    <span style={{ color: "var(--ink-soft, #6b7280)" }}>
                      Participación en ingreso {vistaPeriodo}:
                    </span>
                    <span style={{ color: nodoSeleccionado.color, fontWeight: 800, fontSize: 12.5 }}>
                      {Math.round((nodoSeleccionado.monto / montoIngreso) * 100)}% del total
                    </span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, background: "var(--line, #e5e5e5)", borderRadius: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(Math.round((nodoSeleccionado.monto / montoIngreso) * 100), 100)}%`,
                        background: nodoSeleccionado.color,
                        borderRadius: 6,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SECCIÓN ESPECIAL PARA DEUDAS: ESTADO DE ENDEUDAMIENTO Y BARRA ADEUDADO VS PAGADO */}
              {nodoSeleccionado.id === "deudas" && nodoSeleccionado.deudaInfo && (
                <div
                  style={{
                    background: "var(--card-soft, rgba(0,0,0,0.025))",
                    border: `1.5px solid ${nodoSeleccionado.color}40`,
                    borderRadius: 16,
                    padding: "14px",
                    marginBottom: 16,
                  }}
                >
                  {/* Badge de Nivel de Endeudamiento */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: nodoSeleccionado.color,
                          boxShadow: `0 0 8px ${nodoSeleccionado.color}`,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #111827)" }}>
                        {nodoSeleccionado.deudaInfo.etiquetaEstado}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 8,
                        background: `${nodoSeleccionado.color}18`,
                        color: nodoSeleccionado.color,
                        border: `1px solid ${nodoSeleccionado.color}35`,
                      }}
                    >
                      {nodoSeleccionado.deudaInfo.pctEndeudamiento}% de tus ingresos
                    </span>
                  </div>

                  {/* Banner de alerta si está alto */}
                  {nodoSeleccionado.deudaInfo.palpita && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#ef4444",
                        fontWeight: 700,
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        padding: "8px 10px",
                        borderRadius: 10,
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        lineHeight: 1.35,
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>
                        ¡Nivel de endeudamiento crítico! Se recomienda acelerar amortizaciones de capital o reestructurar.
                      </span>
                    </div>
                  )}

                  {/* Resumen numérico limpio de balance de Deuda */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        background: "var(--card, #ffffff)",
                        borderRadius: 10,
                        border: "1px solid var(--line, #e5e5e5)",
                      }}
                    >
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft, #6b7280)", fontWeight: 700 }}>
                        Total Adeudado:
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                        {formatMoney(nodoSeleccionado.deudaInfo.totalAdeudado)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "8px 10px",
                        background: "var(--card, #ffffff)",
                        borderRadius: 10,
                        border: "1px solid var(--line, #e5e5e5)",
                      }}
                    >
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft, #6b7280)", fontWeight: 700 }}>
                        Total Histórico:
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                        {formatMoney(nodoSeleccionado.deudaInfo.baseTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 13, color: "var(--ink-soft, #4b5563)", marginBottom: 16, lineHeight: 1.4 }}>
                {nodoSeleccionado.descripcion}
              </p>

              {/* Lista de elementos reales de este nodo */}
              <div style={{ marginBottom: 10, paddingRight: 2 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "var(--ink-soft, #9ca3af)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Desglose registrado ({nodoSeleccionado.items.length})
                </div>
                {nodoSeleccionado.items.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft, #9ca3af)", fontStyle: "italic", padding: "10px 0" }}>
                    No hay registros en este rubro para este periodo.
                  </div>
                ) : (
                  nodoSeleccionado.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        background: "var(--card-soft, rgba(0,0,0,0.02))",
                        borderRadius: 12,
                        marginBottom: 8,
                        border: "1px solid var(--line, #f3f4f6)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #111827)" }}>
                            {it.nombre}
                          </div>
                          {it.detalle && (
                            <div style={{ fontSize: 11, color: "var(--ink-soft, #6b7280)", marginTop: 1 }}>
                              {it.detalle}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: "var(--ink, #111827)",
                            fontFamily: "var(--font-mono, monospace)",
                            textAlign: "right",
                          }}
                        >
                          <div>{formatMoney(it.monto)}</div>
                          <div style={{ fontSize: 9.5, color: "var(--ink-soft, #9ca3af)", fontWeight: 600 }}>
                            cuota {vistaPeriodo}
                          </div>
                        </div>
                      </div>

                      {/* Detalle si es un préstamo */}
                      {nodoSeleccionado.id === "deudas" && it.tipo === "prestamo" && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--line, #e5e5e5)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft, #6b7280)" }}>
                          <span>Adeudado: <strong style={{ color: "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>{formatMoney(it.adeudado)}</strong></span>
                          <span>Pagado: <strong style={{ color: "var(--ink, #111827)", fontFamily: "var(--font-mono, monospace)" }}>{formatMoney(it.pagado)}</strong></span>
                        </div>
                      )}

                      {/* Mini barra de progreso si es una tarjeta */}
                      {nodoSeleccionado.id === "deudas" && it.tipo === "tarjeta" && it.limite > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed var(--line, #e5e5e5)" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 10.5,
                              color: "var(--ink-soft, #6b7280)",
                              marginBottom: 3,
                            }}
                          >
                            <span style={{ color: it.pctUso > 70 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                              Uso de límite: {it.pctUso}%
                            </span>
                            <span>Límite: {formatMoney(it.limite)}</span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 4,
                              background: "var(--line, #e5e5e5)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(it.pctUso, 100)}%`,
                                height: "100%",
                                background: it.pctUso > 70 ? "#ef4444" : "#f59e0b",
                                borderRadius: 4,
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer con botón de acción fijo (siempre visible y accesible en móvil) */}
            <div
              style={{
                flexShrink: 0,
                padding: "12px 18px",
                borderTop: "1px solid var(--line, #e5e5e5)",
                background: "var(--card, #ffffff)",
              }}
            >
              <button
                onClick={() => {
                  if (onNavigate && nodoSeleccionado.tabDestino) {
                    onNavigate(nodoSeleccionado.tabDestino);
                  }
                  setNodoSeleccionado(null);
                }}
                className="duo-btn-3d"
                style={{
                  "--btn-shadow": nodoSeleccionado.fueraDeRango ? "#b91c1c" : nodoSeleccionado.shadowColor,
                  width: "100%",
                  padding: "13px",
                  background: nodoSeleccionado.fueraDeRango ? "#ef4444" : nodoSeleccionado.color,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: `0 4px 0 ${nodoSeleccionado.fueraDeRango ? "#b91c1c" : nodoSeleccionado.shadowColor}`,
                }}
              >
                {nodoSeleccionado.fueraDeRango ? (
                  <>
                    <AlertTriangle size={16} strokeWidth={2.5} />
                    <span>⚡ Tomar Acción en {nodoSeleccionado.label}</span>
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    <span>Administrar {nodoSeleccionado.label}</span>
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConectorFlujo({ tipo, label, color = "#58cc02" }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 48,
        margin: "-8px 0 10px",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        {tipo === "split-1-to-2" ? (
          <>
            {/* Tubería base */}
            <path
              d="M 50 0 C 50 24, 25 24, 25 48"
              fill="none"
              stroke="var(--line, #e5e5e5)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 50 0 C 50 24, 75 24, 75 48"
              fill="none"
              stroke="var(--line, #e5e5e5)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Corriente activa fluyendo */}
            <path
              className="duo-flow-line"
              d="M 50 0 C 50 24, 25 24, 25 48"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
            <path
              className="duo-flow-line"
              d="M 50 0 C 50 24, 75 24, 75 48"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* Dos tuberías convergiendo a una */}
            <path
              d="M 25 0 C 25 24, 50 24, 50 48"
              fill="none"
              stroke="var(--line, #e5e5e5)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 75 0 C 75 24, 50 24, 50 48"
              fill="none"
              stroke="var(--line, #e5e5e5)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Corriente activa fluyendo */}
            <path
              className="duo-flow-line"
              d="M 25 0 C 25 24, 50 24, 50 48"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
            <path
              className="duo-flow-line"
              d="M 75 0 C 75 24, 50 24, 50 48"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* Badge flotante en el centro del conector */}
      {label && (
        <div
          style={{
            position: "absolute",
            background: "var(--card, #ffffff)",
            border: `1.5px solid ${color}45`,
            borderRadius: 14,
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 800,
            color: color,
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
            pointerEvents: "auto",
            zIndex: 5,
          }}
        >
          <span style={{ fontSize: 11 }}>💧</span>
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
