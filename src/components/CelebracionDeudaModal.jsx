import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  if (!visible || !datosCelebracion || typeof document === "undefined") return null;

  const {
    monto = 0,
    moneda = "RD$",
    deudaNombre = "Deuda",
    porcentajeReduccionTotal = 0,
    porcentajeReduccionEspecifica = null,
    porcentajeGlobalPagado = 0,
    esLiquidacionTotal = false,
  } = datosCelebracion;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(2, 6, 23, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={cerrar}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(180deg, #0f172a 0%, #090e17 100%)",
          color: "#f8fafc",
          borderRadius: "24px",
          padding: "24px 22px",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(16, 185, 129, 0.2)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resplandor decorativo de fondo */}
        <div style={{ position: "absolute", top: -96, left: -96, width: 200, height: 200, background: "rgba(16, 185, 129, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -96, right: -96, width: 200, height: 200, background: "rgba(245, 158, 11, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />

        {/* Botón cerrar */}
        <button
          onClick={cerrar}
          aria-label="Cerrar felicitación"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            padding: 8,
            color: "#94a3b8",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <X size={18} />
        </button>

        {/* Encabezado con Avatar festivo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 4, paddingBottom: 14 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ position: "absolute", inset: -8, background: "linear-gradient(90deg, #10b981, #14b8a6, #f59e0b)", borderRadius: "50%", filter: "blur(8px)", opacity: 0.7 }} />
            <div style={{ position: "relative", background: "#0f172a", padding: 6, borderRadius: "50%", border: "2px solid rgba(52, 211, 153, 0.8)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }}>
              <AgenteAvatar size={56} estado="celebrando" showBadge={false} />
            </div>
            <span style={{ position: "absolute", bottom: -4, right: -4, fontSize: 24 }}>🎉</span>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 9999, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(52, 211, 153, 0.35)", color: "#6ee7b7", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            <Sparkles size={13} style={{ color: "#fcd34d" }} />
            <span>{esLiquidacionTotal ? "¡Deuda 100% Cancelada!" : "¡Reducción de Deuda Lograda!"}</span>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#ffffff", letterSpacing: "-0.01em" }}>
            {esLiquidacionTotal ? "¡Felicidades! Liquidaste esta deuda 🏆" : "¡Excelente pago registrado!"}
          </h3>

          <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0, maxWidth: 360, lineHeight: 1.45 }}>
            Abonaste <strong style={{ color: "#34d399", fontWeight: 700 }}>{formatMoney(monto, moneda)}</strong> a{" "}
            <span style={{ color: "#ffffff", fontWeight: 600, textDecoration: "underline", textDecorationColor: "rgba(16, 185, 129, 0.6)", textUnderlineOffset: 3 }}>
              {deudaNombre}
            </span>.
          </p>
        </div>

        {/* Panel de métricas y porcentajes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "8px 0" }}>
          {/* Tarjeta principal con el porcentaje de reducción total */}
          <div style={{
            background: "linear-gradient(135deg, rgba(6, 78, 59, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)",
            borderRadius: 16,
            padding: "14px 16px",
            border: "1px solid rgba(16, 185, 129, 0.45)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(52, 211, 153, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399", flexShrink: 0 }}>
                <TrendingDown size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, color: "#6ee7b7" }}>
                  Reducción de Deuda Total
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Menos carga financiera global
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#34d399", letterSpacing: "-0.02em", lineHeight: 1, display: "flex", alignItems: "baseline", justifyContent: "flex-end" }}>
                <span>-{porcentajeReduccionTotal > 0 ? porcentajeReduccionTotal : "100"}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#6ee7b7", marginLeft: 2 }}>%</span>
              </div>
              <div style={{ fontSize: 10, color: "#a7f3d0", fontWeight: 600, marginTop: 3 }}>de tu deuda total</div>
            </div>
          </div>

          {/* Tarjeta secundaria de deuda específica (si aplica) */}
          {porcentajeReduccionEspecifica != null && porcentajeReduccionEspecifica > 0 && (
            <div style={{
              background: "rgba(30, 41, 59, 0.6)",
              borderRadius: 14,
              padding: "10px 14px",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}>
              <span style={{ color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={16} style={{ color: "#2dd4bf" }} />
                Reducción directa en {deudaNombre}:
              </span>
              <span style={{ fontWeight: 800, color: "#5eead4", fontSize: 14 }}>
                -{porcentajeReduccionEspecifica}%
              </span>
            </div>
          )}

          {/* Barra de progreso global hacia la meta de Cero Deuda */}
          <div style={{
            background: "rgba(30, 41, 59, 0.7)",
            borderRadius: 14,
            padding: "12px 14px",
            border: "1px solid rgba(51, 65, 85, 0.8)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
              <span style={{ color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} style={{ color: "#fbbf24" }} />
                Progreso hacia Libertad Financiera:
              </span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fcd34d", fontSize: 13 }}>
                {porcentajeGlobalPagado}% Pagado
              </span>
            </div>
            <div style={{ width: "100%", height: 12, background: "#020617", borderRadius: 9999, overflow: "hidden", padding: 2, border: "1px solid #334155" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(5, barraProgresoAnimada))}%`,
                  background: "linear-gradient(90deg, #10b981 0%, #14b8a6 50%, #f59e0b 100%)",
                  borderRadius: 9999,
                  transition: "width 1s ease-out",
                  boxShadow: "0 1px 4px rgba(16, 185, 129, 0.5)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Mensaje motivacional del Guardián */}
        <div style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          fontSize: 12,
          color: "#a7f3d0",
          lineHeight: 1.5,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <Flame size={16} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
          <span>
            {esLiquidacionTotal
              ? "¡Hito desbloqueado! Esta deuda quedó completamente eliminada de tu vida. Libera ese flujo mensual para tu fondo de paz o liquidar la siguiente cuota."
              : "¡Gran disciplina financiera! Cada cuota que pagas a tiempo reduce intereses, protege tu historial de crédito y te aleja de los sobregiros."}
          </span>
        </div>

        {/* Botón de acción principal */}
        <button
          onClick={cerrar}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 18px",
            borderRadius: 14,
            background: "linear-gradient(90deg, #10b981 0%, #0d9488 100%)",
            color: "#022c22",
            fontWeight: 800,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 6px 18px rgba(16, 185, 129, 0.35)",
            transition: "all 0.15s ease",
          }}
        >
          <span>¡Continuar Ganando!</span>
          <ArrowRight size={16} strokeWidth={3} />
        </button>
      </div>
    </div>,
    document.body
  );
}
