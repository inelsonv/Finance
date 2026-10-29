import confetti from "canvas-confetti";
import { reproducirSonidoCelebracionDeuda } from "./sonidos";

/**
 * Lanza una animación de confeti festivo y multicolor con ráfagas laterales y estallido central.
 */
export function dispararConfetiCelebracion() {
  if (typeof window === "undefined") return;

  try {
    // 1. Estallido central inicial
    confetti({
      particleCount: 85,
      spread: 75,
      origin: { y: 0.62 },
      colors: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"],
      zIndex: 9999999,
    });

    // 2. Cañón lateral izquierdo
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.72 },
        colors: ["#10b981", "#fbbf24", "#60a5fa", "#34d399"],
        zIndex: 9999999,
      });
    }, 180);

    // 3. Cañón lateral derecho
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.72 },
        colors: ["#10b981", "#fbbf24", "#f43f5e", "#a855f7"],
        zIndex: 9999999,
      });
    }, 360);

    // 4. Lluvia dorada de estrellas y chispas
    setTimeout(() => {
      confetti({
        particleCount: 45,
        spread: 110,
        origin: { y: 0.4 },
        shapes: ["circle", "square"],
        colors: ["#f59e0b", "#fbbf24", "#fef08a", "#10b981", "#ffffff"],
        zIndex: 9999999,
      });
    }, 550);
  } catch (err) {
    console.debug("Error ejecutando confetti:", err);
  }
}

/**
 * Calcula de manera precisa el impacto de un pago en la reducción de deudas.
 * @param {Object} params
 * @param {Array} params.prestamos - Lista de préstamos activos
 * @param {Array} params.tarjetas - Lista de tarjetas
 * @param {Array} params.movimientos - Movimientos históricos
 * @param {number|string} params.montoPagado - Monto abonado
 * @param {string} [params.prestamoId]
 * @param {string} [params.tarjetaId]
 * @param {string} [params.deudaNombre]
 * @param {string} [params.moneda] - "RD$" o "USD"
 * @param {boolean} [params.esLiquidacion]
 */
export function calcularMetricasReduccionDeuda({
  prestamos = [],
  tarjetas = [],
  movimientos = [],
  montoPagado = 0,
  prestamoId = null,
  tarjetaId = null,
  deudaNombre = "",
  moneda = "RD$",
  esLiquidacion = false,
}) {
  const monto = Math.max(0, Number(montoPagado) || 0);

  // 1. Calcular deudas de préstamos
  let totalPrestamosPendiente = 0;
  let totalPrestamosOriginal = 0;
  let deudaEspecificaAntes = 0;
  let deudaEspecificaNombre = deudaNombre || "";
  let prestamoEncontrado = null;

  for (const p of prestamos || []) {
    let totalAPagar = 0;
    if (p.frecuenciaCuota === "Personalizado") {
      totalAPagar = (p.cuotasPersonalizadas || []).reduce((s, c) => s + (Number(c.monto) || 0), 0);
    } else {
      const meses = p.plazoUnidad === "años" ? (Number(p.plazo) || 0) * 12 : Number(p.plazo) || 0;
      totalAPagar = meses > 0 && p.cuota ? Number(p.cuota) * meses : Number(p.montoAprobado || p.monto || 0);
    }
    if (totalAPagar <= 0) totalAPagar = Number(p.montoAprobado || p.monto || 0);

    const pagosDeEste = (movimientos || [])
      .filter((m) => m.category === "Pago de préstamo" && (m.prestamoId === p.id || (m.prestamoNumero && m.prestamoNumero === p.numero)))
      .reduce((s, m) => s + (Number(m.amount) || 0), 0);

    const pendiente = p.estado === "Pagado" ? 0 : Math.max(0, totalAPagar - pagosDeEste);
    totalPrestamosPendiente += pendiente;
    totalPrestamosOriginal += totalAPagar;

    if (prestamoId && (p.id === prestamoId || p.numero === prestamoId)) {
      prestamoEncontrado = p;
      deudaEspecificaAntes = pendiente + monto;
      if (!deudaEspecificaNombre) {
        deudaEspecificaNombre = `Préstamo ${p.numero || p.entidadName || ""}`.trim();
      }
    }
  }

  // 2. Calcular deudas de tarjetas de crédito
  let totalTarjetasPendiente = 0;
  let tarjetaEncontrada = null;

  for (const t of tarjetas || []) {
    const sRD = Number(t.saldoActual) || 0;
    const sUSD = (Number(t.saldoActualUSD) || 0) * 60; // Tasa promedio aproximada RD
    totalTarjetasPendiente += sRD + sUSD;

    if (tarjetaId && t.id === tarjetaId) {
      tarjetaEncontrada = t;
      const sT = moneda === "USD" ? Number(t.saldoActualUSD) || 0 : sRD;
      deudaEspecificaAntes = sT + monto;
      if (!deudaEspecificaNombre) {
        deudaEspecificaNombre = `Tarjeta ${t.alias || t.nombre || t.banco || ""}`.trim();
      }
    }
  }

  // Total deuda antes y después del pago
  const deudaTotalActual = totalPrestamosPendiente + totalTarjetasPendiente;
  const deudaTotalAntes = Math.max(monto, deudaTotalActual + monto);
  const deudaTotalDespues = Math.max(0, deudaTotalAntes - monto);

  // Porcentaje de reducción de la deuda global
  const porcentajeReduccionTotal = deudaTotalAntes > 0
    ? Number(((monto / deudaTotalAntes) * 100).toFixed(1))
    : 100;

  // Porcentaje de reducción de la deuda específica (si aplica)
  let porcentajeReduccionEspecifica = null;
  if (deudaEspecificaAntes > 0) {
    porcentajeReduccionEspecifica = Number(
      Math.min(100, (monto / deudaEspecificaAntes) * 100).toFixed(1)
    );
  }

  // Porcentaje acumulado histórico pagado
  const totalHistorico = Math.max(deudaTotalAntes, totalPrestamosOriginal + totalTarjetasPendiente);
  const totalPagadoHistorico = Math.max(0, totalHistorico - deudaTotalDespues);
  const porcentajeGlobalPagado = totalHistorico > 0
    ? Number(Math.min(100, (totalPagadoHistorico / totalHistorico) * 100).toFixed(1))
    : 100;

  const esSaldada = esLiquidacion ||
    (prestamoEncontrado && prestamoEncontrado.estado === "Pagado") ||
    (deudaEspecificaAntes > 0 && monto >= deudaEspecificaAntes);

  return {
    monto,
    moneda,
    deudaNombre: deudaEspecificaNombre || (prestamoId ? "Préstamo" : tarjetaId ? "Tarjeta de Crédito" : "Deuda"),
    tipo: prestamoId ? "prestamo" : tarjetaId ? "tarjeta" : "cuota",
    deudaTotalAntes,
    deudaTotalDespues,
    porcentajeReduccionTotal,
    porcentajeReduccionEspecifica,
    porcentajeGlobalPagado,
    esLiquidacionTotal: esSaldada,
  };
}

let ultimaCelebracionTimestamp = 0;

/**
 * Dispara la celebración completa de reducción de deuda:
 * 1. Confeti espectacular (canvas-confetti)
 * 2. Fanfarria de sonido triunfal
 * 3. Evento global para desplegar el modal de felicitaciones con el % exacto de reducción
 */
export function dispararCelebracionDeuda(opciones = {}) {
  const ahora = Date.now();
  // Evitar disparos duplicados en menos de 800ms
  if (ahora - ultimaCelebracionTimestamp < 800) return;
  ultimaCelebracionTimestamp = ahora;

  // 1. Lanzar confeti
  dispararConfetiCelebracion();

  // 2. Reproducir fanfarria musical
  try {
    reproducirSonidoCelebracionDeuda();
  } catch (_) {}

  // 3. Preparar payload con felicitación y porcentaje
  const detalle = {
    monto: Number(opciones.monto) || 0,
    moneda: opciones.moneda || "RD$",
    deudaNombre: opciones.deudaNombre || opciones.mensaje || "Deuda saldada",
    tipo: opciones.tipo || "prestamo",
    porcentajeReduccionTotal: opciones.porcentajeReduccionTotal ?? 0,
    porcentajeReduccionEspecifica: opciones.porcentajeReduccionEspecifica ?? null,
    porcentajeGlobalPagado: opciones.porcentajeGlobalPagado ?? 0,
    deudaTotalDespues: opciones.deudaTotalDespues ?? 0,
    esLiquidacionTotal: Boolean(opciones.esLiquidacionTotal),
    mensajePersonalizado: opciones.mensajePersonalizado || "",
    timestamp: ahora,
  };

  // 4. Notificar a toda la ventana para abrir el modal de celebración
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("celebrarReduccionDeuda", {
          detail: detalle,
        })
      );
      // Notificar también al avatar del agente para que sonría y celebre
      window.dispatchEvent(
        new CustomEvent("agenteCelebrarPagoDeuda", {
          detail: detalle,
        })
      );
      sessionStorage.setItem("ultimaCelebracionDeuda", JSON.stringify(detalle));
    } catch (_) {}
  }
}
