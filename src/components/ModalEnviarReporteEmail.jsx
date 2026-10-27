import React, { useState, useEffect, useMemo } from "react";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, X, Eye, EyeOff, Calendar, ChevronLeft, ChevronRight, ShieldCheck, Check } from "lucide-react";
import { generarHtmlDashboardEmail, enviarReportePorGmail } from "../lib/emailReporteQuincena";
import { getOrRequestGmailAccessToken, clearCachedGmailAccessToken } from "../firebase";
import { watchReportesQuincenaConfig, saveReportesQuincenaConfig, registrarEnvioReporteEmail, watchChecklistPeriodo } from "../lib/db";
import { periodoActualConfigurado, periodoAdyacenteConfigurado } from "../lib/quincenaConfig";
import { generarItemsPeriodo } from "../lib/generadorChecklistItems";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ModalEnviarReporteEmail({
  isOpen,
  onClose,
  periodo: periodoProp,
  items: itemsProp = [],
  totales: totalesProp = {},
  resumenPorMetodo: resumenPorMetodoProp = [],
  diasCobro = [15, 30],
  userEmail = "iventuramena@gmail.com",
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
  overridesLocales = {},
}) {
  const [config, setConfig] = useState({ email: userEmail, activoDiasCobro: true, ultimoEnvio: null });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [checklistPeriodo, setChecklistPeriodo] = useState({});

  // Calcular la "Próxima Quincena" por defecto según la regla financiera:
  // Si hoy es 10/10/2026, la quincena actual en curso es Q1 de Octubre (días 1 al 14).
  // La quincena que viene y que toca planificar/enviar es Q2 de Octubre.
  const periodoSiguienteDefault = useMemo(() => {
    const actual = periodoActualConfigurado(diasCobro);
    return periodoAdyacenteConfigurado(actual, diasCobro, 1);
  }, [diasCobro]);

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoSiguienteDefault);

  // Cada vez que se abra el modal, seleccionar por defecto la PRÓXIMA quincena
  useEffect(() => {
    if (isOpen) {
      const actual = periodoActualConfigurado(diasCobro);
      const sig = periodoAdyacenteConfigurado(actual, diasCobro, 1);
      setPeriodoSeleccionado(sig);
      setResultado(null);
      setError(null);
      setMostrarPreview(false);
    }
  }, [isOpen, diasCobro]);

  const periodoKey = `${periodoSeleccionado?.year}-${periodoSeleccionado?.month}-${periodoSeleccionado?.quincena}`;

  // Escuchar el checklist guardado del periodo seleccionado (para tomar montos overrides y estados de pagado)
  useEffect(() => {
    if (!isOpen || !periodoKey) return;
    const unsub = watchChecklistPeriodo(
      periodoKey,
      (data) => setChecklistPeriodo(data || {}),
      () => setChecklistPeriodo({})
    );
    return () => unsub();
  }, [isOpen, periodoKey]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = watchReportesQuincenaConfig(
      (cfg) => {
        if (cfg) setConfig(cfg);
      },
      () => {}
    );
    return () => unsub();
  }, [isOpen]);

  // Generar items dinámicos del periodo seleccionado
  const itemsCalculados = useMemo(() => {
    // Si coincide exactamente con el periodo prop y no hay checklist adicional, podemos usar itemsProp como base rápida
    if (
      periodoProp &&
      periodoProp.year === periodoSeleccionado.year &&
      periodoProp.month === periodoSeleccionado.month &&
      periodoProp.quincena === periodoSeleccionado.quincena &&
      itemsProp.length > 0
    ) {
      return itemsProp;
    }

    return generarItemsPeriodo({
      periodo: periodoSeleccionado,
      categoriasGasto,
      presupuesto,
      prestamos,
      tarjetas,
      presupuestoYear: presupuestoYear || periodoSeleccionado.year,
      movimientos,
      estrategiaDeudas,
      tipoCambio,
      pagoRapido,
      fuentesIngreso,
      checklist: checklistPeriodo,
      overridesLocales,
      diasCobro,
    });
  }, [
    periodoSeleccionado,
    periodoProp,
    itemsProp,
    categoriasGasto,
    presupuesto,
    prestamos,
    tarjetas,
    presupuestoYear,
    movimientos,
    estrategiaDeudas,
    tipoCambio,
    pagoRapido,
    fuentesIngreso,
    checklistPeriodo,
    overridesLocales,
    diasCobro,
  ]);

  const totalesCalculados = useMemo(() => {
    let total = 0;
    let pagado = 0;
    for (const it of itemsCalculados) {
      total += it.monto || 0;
      if (it.bloqueadoPagado || checklistPeriodo?.items?.[it.key]?.pagado) {
        pagado += it.monto || 0;
      }
    }
    return { total, pagado, pendiente: total - pagado };
  }, [itemsCalculados, checklistPeriodo]);

  const resumenPorMetodoCalculado = useMemo(() => {
    const map = {};
    for (const it of itemsCalculados) {
      if (it.bloqueadoPagado) continue;
      const estado = checklistPeriodo?.items?.[it.key] || {};
      if (estado.pagado) continue;
      const metodo = estado.metodoPago || it.metodoDefault || "Sin definir";
      map[metodo] = (map[metodo] || 0) + (it.monto || 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [itemsCalculados, checklistPeriodo]);

  if (!isOpen) return null;

  const quincenaLabel =
    periodoSeleccionado?.quincena === "Q1" ? "1ª Quincena (1-15)" : "2ª Quincena (16-Fin de mes)";
  const nombreMes = MESES[(periodoSeleccionado?.month || 1) - 1];

  const htmlBody = generarHtmlDashboardEmail({
    periodo: periodoSeleccionado,
    items: itemsCalculados,
    totales: totalesCalculados,
    resumenPorMetodo: resumenPorMetodoCalculado,
    diasCobro,
    userEmail,
  });

  const cambiarPeriodo = (dir) => {
    if (loading) return;
    setPeriodoSeleccionado((act) => periodoAdyacenteConfigurado(act, diasCobro, dir));
  };

  const handleToggleAutoDiasCobro = async () => {
    const nuevoValor = !config?.activoDiasCobro;
    try {
      await saveReportesQuincenaConfig({
        email: userEmail,
        activoDiasCobro: nuevoValor,
      });
      setConfig((prev) => ({ ...prev, activoDiasCobro: nuevoValor }));
    } catch (e) {
      console.error("Error al guardar preferencia:", e);
    }
  };

  const handleEnviarAhora = async (forceReauth = false) => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      if (forceReauth) {
        clearCachedGmailAccessToken();
      }
      // 1. Obtener token de Gmail con permisos
      const token = await getOrRequestGmailAccessToken(forceReauth);

      // 2. Asunto claro y estructurado con periodo que viene
      const subject = `📊 Dashboard de Pagos · ${quincenaLabel} ${nombreMes} ${periodoSeleccionado?.year} (${itemsCalculados.length} compromisos - Total: ${formatMoney(totalesCalculados?.total || 0)})`;

      // 3. Enviar a través de Gmail API
      const res = await enviarReportePorGmail({
        accessToken: token,
        to: userEmail,
        subject,
        htmlBody,
      });

      // 4. Registrar en base de datos
      const registro = {
        fecha: new Date().toISOString(),
        quincena: periodoSeleccionado?.quincena,
        year: periodoSeleccionado?.year,
        month: periodoSeleccionado?.month,
        total: totalesCalculados?.total || 0,
        pendiente: totalesCalculados?.pendiente || 0,
        itemsCount: itemsCalculados.length,
        messageId: res?.id || "enviado",
        destinatario: userEmail,
      };

      await registrarEnvioReporteEmail(registro);
      setResultado(registro);
    } catch (err) {
      console.error("Error al enviar reporte:", err);
      clearCachedGmailAccessToken();
      setError(err.message || "Error al enviar el reporte por Gmail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card, #1e293b)",
          color: "var(--ink, #ffffff)",
          border: "1px solid var(--line, #334155)",
          borderRadius: 16,
          maxWidth: 620,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line, #334155)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 27, 75, 0.2) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Enviar Dashboard de Pagos por Email
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft, #94a3b8)" }}>
                Reporte estructurado vía Gmail API · Próxima quincena
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft, #94a3b8)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Selector de Quincena a Enviar con badge de 'Próxima Quincena' */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)", fontWeight: 600 }}>
                  Quincena a despachar:
                </span>
                <span
                  style={{
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                  }}
                >
                  🚀 Próxima quincena (Siguiente cobro)
                </span>
              </div>
            </div>

            {/* Barra de navegación de periodo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--line, #334155)",
                borderRadius: 8,
                padding: "6px 12px",
              }}
            >
              <button
                type="button"
                onClick={() => cambiarPeriodo(-1)}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-soft, #94a3b8)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
                title="Quincena anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <div style={{ textAlign: "center" }}>
                <strong style={{ fontSize: 14, color: "#ffffff", display: "block" }}>
                  {nombreMes} {periodoSeleccionado?.year} · {periodoSeleccionado?.quincena === "Q1" ? "1ª Quincena (Días 1-15)" : "2ª Quincena (Días 16-30)"}
                </strong>
                <span style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)" }}>
                  {itemsCalculados.length} compromisos detectados en checklist
                </span>
              </div>

              <button
                type="button"
                onClick={() => cambiarPeriodo(1)}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-soft, #94a3b8)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
                title="Quincena siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Tarjeta de Destinatario y Configuración */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid var(--line, #334155)",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)", fontWeight: 600 }}>Destinatario oficial:</span>
              <strong style={{ fontSize: 13, color: "#60a5fa" }}>{userEmail}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)", fontWeight: 600 }}>Días de cobro habituales:</span>
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>
                📅 Días {diasCobro.join(" y ")} de cada mes
              </span>
            </div>
          </div>

          {/* Resumen Métrico de lo que se enviará */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--line, #334155)",
                borderRadius: 10,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)" }}>Total a pagar</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{formatMoney(totalesCalculados?.total || 0)}</div>
            </div>
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 10,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#34d399" }}>Ya saldado</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399", marginTop: 4 }}>
                {formatMoney(totalesCalculados?.pagado || 0)}
              </div>
            </div>
            <div
              style={{
                background: (totalesCalculados?.pendiente || 0) > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.04)",
                border: (totalesCalculados?.pendiente || 0) > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--line, #334155)",
                borderRadius: 10,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: (totalesCalculados?.pendiente || 0) > 0 ? "#f87171" : "var(--ink-soft, #94a3b8)" }}>
                Por pagar
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: (totalesCalculados?.pendiente || 0) > 0 ? "#f87171" : "#34d399", marginTop: 4 }}>
                {formatMoney(totalesCalculados?.pendiente || 0)}
              </div>
            </div>
          </div>

          {/* Segmentación rápida por método de pago */}
          {resumenPorMetodoCalculado.length > 0 && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--line, #334155)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--ink-soft, #94a3b8)" }}>
                💳 Desglose de compromisos por método a utilizar:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {resumenPorMetodoCalculado.map(([metodo, monto]) => (
                  <div
                    key={metodo}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{metodo}:</span>
                    <strong style={{ color: "#60a5fa" }}>{formatMoney(monto)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automatización programada (Días 15 y 30) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={18} style={{ color: "#60a5fa", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Envío automático los días de cobro (15 y 30)
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)" }}>
                  Recibirás el dashboard de la quincena correspondiente directo a {userEmail}.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoDiasCobro}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                background: config?.activoDiasCobro ? "#3b82f6" : "#475569",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#ffffff",
                  position: "absolute",
                  top: 3,
                  left: config?.activoDiasCobro ? 23 : 3,
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>

          {/* Botón para previsualizar el diseño del email */}
          <div>
            <button
              type="button"
              onClick={() => setMostrarPreview(!mostrarPreview)}
              style={{
                background: "transparent",
                border: "1px solid var(--line, #334155)",
                color: "var(--ink-soft, #94a3b8)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                justifyContent: "center",
              }}
            >
              {mostrarPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {mostrarPreview ? "Ocultar vista previa del email" : "Ver diseño y estructura del email dashboard"}
            </button>
          </div>

          {/* Vista previa en iframe */}
          {mostrarPreview && (
            <div
              style={{
                border: "1px solid var(--line, #334155)",
                borderRadius: 10,
                overflow: "hidden",
                height: 320,
                background: "#0b0f19",
              }}
            >
              <iframe
                title="Preview Email"
                srcDoc={htmlBody}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 10,
                }}
              />
            </div>
          )}

          {/* Feedback de resultado */}
          {resultado && (
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                borderRadius: 12,
                color: "#34d399",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", fontSize: 13, marginBottom: 2 }}>
                  ¡Dashboard enviado exitosamente a {userEmail}!
                </strong>
                <span style={{ fontSize: 12, color: "#cbd5e1" }}>
                  Se ha generado y entregado el correo con los {resultado.itemsCount} pagos de {quincenaLabel}. Revisa tu bandeja de entrada en Gmail.
                </span>
              </div>
            </div>
          )}

          {/* Feedback de error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid #ef4444",
                borderRadius: 12,
                color: "#f87171",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: 13, marginBottom: 2 }}>
                  No se pudo enviar el correo:
                </strong>
                <span style={{ fontSize: 12, display: "block" }}>{error}</span>
                <button
                  type="button"
                  onClick={() => handleEnviarAhora(true)}
                  disabled={loading}
                  style={{
                    marginTop: 8,
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🔄 Autorizar cuenta Google y reintentar
                </button>
              </div>
            </div>
          )}

          {/* Último envío registrado si existe */}
          {config?.ultimoEnvio && !resultado && (
            <div style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)", textAlign: "center" }}>
              Último reporte enviado: {new Date(config.ultimoEnvio.timestamp || config.ultimoEnvio.fecha).toLocaleString("es-DO")}
            </div>
          )}

        </div>

        {/* Botones de acción inferior */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line, #334155)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15, 23, 42, 0.4)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: "1px solid var(--line, #334155)",
              color: "var(--ink-soft, #94a3b8)",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={() => handleEnviarAhora(false)}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Enviando por Gmail...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Enviar {quincenaLabel} a {userEmail}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
