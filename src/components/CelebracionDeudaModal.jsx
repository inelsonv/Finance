import React, { useEffect, useState } from "react";
import { Sparkles, X, TrendingDown, CheckCircle2, Trophy, ArrowRight, ShieldCheck, Flame } from "lucide-react";
import AgenteAvatar from "./AgenteAvatar.jsx";
import { dispararConfetiCelebracion, calcularMetricasReduccionDeuda } from "../lib/celebracionDeuda";

function formatMoney(n, moneda = "RD$") {
  const v = Number.isFinite(n) ? n : 0;
  const prefijo = moneda === "USD" ? "US$" : "RD$";
  return `${prefijo} ${v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CelebracionDeudaModal({
  prestamos = [],
  tarjetas = [],
  movimientos = [],
}) {
  const [datosCelebracion, setDatosCelebracion] = useState(null);
  const [visible, setVisible] = useState(false);
  const [barraProgresoAnimada, setBarraProgresoAnimada] = useState(0);

  useEffect(() => {
    // 1. Escuchar evento explícito de celebración de deuda
    const handleCelebrar = (e) => {
      const detalle = e.detail || {};
      const monto = Number(detalle.monto) || 0;

      // Si vienen métricas precalculadas, úsalas; si no, calcúlalas
      let metricasFinales = detalle;
      if (!detalle.porcentajeReduccionTotal || detalle.porcentajeReduccionTotal <= 0) {
        const calculadas = calcularMetricasReduccionDeuda({
          prestamos,
          tarjetas,
          movimientos,
          montoPagado: monto,
          prestamoId: detalle.prestamoId,
          tarjetaId: detalle.tarjetaId,
          deudaNombre: detalle.deudaNombre || detalle.mensaje,
          moneda: detalle.moneda || "RD$",
          esLiquidacion: detalle.esLiquidacionTotal,
        });
        metricasFinales = { ...detalle, ...calculadas };
      }

      setDatosCelebracion(metricasFinales);
      setVisible(true);
      setBarraProgresoAnimada(0);

      // Animación suave de la barra de progreso
      setTimeout(() => {
        setBarraProgresoAnimada(metricasFinales.porcentajeGlobalPagado || 50);
      }, 150);
    };

    // 2. Escuchar también eventos generales de pago de deuda (lanzarCoheteDeuda)
    let ultimoDisparoTs = 0;
    const handleCohete = (e) => {
      const ahora = Date.now();
      if (ahora - ultimoDisparoTs < 1200) return;
      ultimoDisparoTs = ahora;

      const { puntos, mensaje, monto: montoDir } = e.detail || {};
      const esDeuda = mensaje &&
        (mensaje.toLowerCase().includes("préstamo") ||
          mensaje.toLowerCase().includes("prestamo") ||
          mensaje.toLowerCase().includes("tarjeta") ||
          mensaje.toLowerCase().includes("deuda") ||
          mensaje.toLowerCase().includes("cuota"));

      if (esDeuda || puntos > 0) {
        dispararConfetiCelebracion();

        // Si el modal no está visible actualmente, calcular métricas y desplegarlo
        const montoEstimado = Number(montoDir) || (puntos ? Math.round(puntos * 20) : 0);
        if (montoEstimado > 0) {
          const calculadas = calcularMetricasReduccionDeuda({
            prestamos,
            tarjetas,
            movimientos,
            montoPagado: montoEstimado,
            deudaNombre: mensaje || "Pago de deuda",
          });

          setDatosCelebracion({
            monto: montoEstimado,
            moneda: "RD$",
            deudaNombre: mensaje || "Pago de deuda",
            ...calculadas,
          });
          setVisible(true);
          setBarraProgresoAnimada(0);
          setTimeout(() => {
            setBarraProgresoAnimada(calculadas.porcentajeGlobalPagado || 50);
          }, 150);
        }
      }
    };

    window.addEventListener("celebrarReduccionDeuda", handleCelebrar);
    window.addEventListener("lanzarCoheteDeuda", handleCohete);

    return () => {
      window.removeEventListener("celebrarReduccionDeuda", handleCelebrar);
      window.removeEventListener("lanzarCoheteDeuda", handleCohete);
    };
  }, [prestamos, tarjetas, movimientos]);

  const cerrar = () => {
    setVisible(false);
    setTimeout(() => setDatosCelebracion(null), 300);
  };

  if (!visible || !datosCelebracion) return null;

  const {
    monto = 0,
    moneda = "RD$",
    deudaNombre = "Deuda",
    porcentajeReduccionTotal = 0,
    porcentajeReduccionEspecifica = null,
    porcentajeGlobalPagado = 0,
    esLiquidacionTotal = false,
  } = datosCelebracion;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={cerrar}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-500/30 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resplandor decorativo de fondo */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Botón cerrar */}
        <button
          onClick={cerrar}
          aria-label="Cerrar felicitación"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado con Avatar festivo */}
        <div className="flex flex-col items-center text-center pt-1 pb-4">
          <div className="relative mb-3">
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full blur-md opacity-75 animate-pulse" />
            <div className="relative bg-slate-900 p-1.5 rounded-full border-2 border-emerald-400/80 shadow-lg">
              <AgenteAvatar size={56} estado="celebrando" showBadge={false} />
            </div>
            <span className="absolute -bottom-1 -right-1 text-2xl animate-bounce">🎉</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: "3s" }} />
            {esLiquidacionTotal ? "¡Deuda 100% Cancelada!" : "¡Reducción de Deuda Lograda!"}
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {esLiquidacionTotal ? "¡Felicidades! Liquidaste esta deuda 🏆" : "¡Excelente pago registrado!"}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs">
            Abonaste <strong className="text-emerald-400 font-bold">{formatMoney(monto, moneda)}</strong> a{" "}
            <span className="text-white font-medium underline decoration-emerald-500/60 underline-offset-2">{deudaNombre}</span>.
          </p>
        </div>

        {/* Panel de métricas y porcentajes */}
        <div className="space-y-3 my-2">
          {/* Tarjeta principal con el porcentaje de reducción total */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-800/80 rounded-2xl p-4 border border-emerald-500/40 shadow-inner flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <TrendingDown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-300/90">
                  Reducción de Deuda Total
                </div>
                <div className="text-xs text-slate-300">
                  Menos carga financiera global
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight flex items-baseline justify-end">
                <span>-{porcentajeReduccionTotal > 0 ? porcentajeReduccionTotal : "100"}</span>
                <span className="text-base font-bold text-emerald-300 ml-0.5">%</span>
              </div>
              <div className="text-[10px] text-emerald-200/70 font-medium">de tu deuda total</div>
            </div>
          </div>

          {/* Tarjeta secundaria de deuda específica (si aplica) */}
          {porcentajeReduccionEspecifica != null && porcentajeReduccionEspecifica > 0 && (
            <div className="bg-slate-800/50 rounded-2xl p-3 px-4 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Reducción directa en {deudaNombre}:
              </span>
              <span className="font-bold text-teal-300 text-sm">
                -{porcentajeReduccionEspecifica}%
              </span>
            </div>
          )}

          {/* Barra de progreso global hacia la meta de Cero Deuda */}
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/80">
            <div className="flex justify-between items-center text-xs mb-2 font-medium">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Progreso hacia Libertad Financiera:
              </span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {porcentajeGlobalPagado}% Pagado
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${Math.min(100, Math.max(5, barraProgresoAnimada))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mensaje motivacional del Guardián */}
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
          <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {esLiquidacionTotal
              ? "¡Hito desbloqueado! Esta deuda quedó completamente eliminada de tu vida. Libera ese flujo mensual para tu fondo de paz o liquidar la siguiente cuota."
              : "¡Gran disciplina financiera! Cada cuota que pagas a tiempo reduce intereses, protege tu historial de crédito y te aleja de los sobregiros."}
          </span>
        </div>

        {/* Botón de acción principal */}
        <button
          onClick={cerrar}
          className="mt-5 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer"
        >
          <span>¡Continuar Ganando!</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
