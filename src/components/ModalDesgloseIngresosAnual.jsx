import React, { useState } from "react";
import {
  X,
  Briefcase,
  Gift,
  Award,
  Palmtree,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Check,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { addIngresoPuntual, deleteIngresoPuntual } from "../lib/db";

const MES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function ModalDesgloseIngresosAnual({
  isOpen,
  onClose,
  year,
  resumenIngresos,
  totalGastosAnual = 0,
  fuentesIngreso = [],
  ingresosPuntuales = [],
  onNavigate,
}) {
  const [mostrarFormPuntual, setMostrarFormPuntual] = useState(false);
  const [tipoPuntual, setTipoPuntual] = useState("Bonificación");
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState(fuentesIngreso[0]?.id || "");
  const [montoPuntual, setMontoPuntual] = useState("");
  const [fechaPuntual, setFechaPuntual] = useState(`${year}-04-20`);
  const [notasPuntual, setNotasPuntual] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorPuntual, setErrorPuntual] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  if (!isOpen || !resumenIngresos) return null;

  const balanceNeto = resumenIngresos.totalIngresoAnual - totalGastosAnual;
  const esSuperavit = balanceNeto >= 0;

  const abrirFormParaTipo = (tipo, mesSugerido, montoSugerido) => {
    setTipoPuntual(tipo);
    setMontoPuntual(montoSugerido ? String(montoSugerido) : "");
    const mesStr = String(mesSugerido).padStart(2, "0");
    setFechaPuntual(`${year}-${mesStr}-20`);
    setNotasPuntual(`Presupuesto de ${tipo} ${year}`);
    setErrorPuntual(null);
    setMostrarFormPuntual(true);
  };

  const handleGuardarPuntual = async (e) => {
    e.preventDefault();
    const num = parseFloat(montoPuntual.replace(/,/g, "").trim());
    if (!Number.isFinite(num) || num <= 0) {
      setErrorPuntual("Ingresa un monto válido");
      return;
    }
    const fuente = fuentesIngreso.find((f) => f.id === fuenteSeleccionada) || fuentesIngreso[0];
    setGuardando(true);
    setErrorPuntual(null);
    try {
      await addIngresoPuntual({
        fuenteIngresoId: fuente?.id || null,
        fuenteIngresoNombre: fuente?.nombre || "General",
        tipo: tipoPuntual,
        monto: num,
        fecha: fechaPuntual,
        notas: notasPuntual || "",
      });
      setMostrarFormPuntual(false);
      setMontoPuntual("");
      setNotasPuntual("");
    } catch (err) {
      console.error("Error al guardar ingreso puntual:", err);
      setErrorPuntual("No se pudo guardar el ingreso");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarPuntual = async (id) => {
    setEliminandoId(id);
    try {
      await deleteIngresoPuntual(id);
    } catch (err) {
      console.error("Error al eliminar ingreso puntual:", err);
    } finally {
      setEliminandoId(null);
    }
  };

  // Filtrar ingresos registrados para el año seleccionado
  const puntualesDelAno = (ingresosPuntuales || []).filter((ip) => {
    if (!ip.fecha || typeof ip.fecha !== "string") return false;
    return parseInt(ip.fecha.slice(0, 4), 10) === year;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(5px)",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fade-in-quick"
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--card)",
          borderRadius: 16,
          border: "1px solid var(--line)",
          boxShadow: "0 14px 45px rgba(0, 0, 0, 0.45)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--sage-bg)",
                color: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DollarSign size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.2 }}>
                Presupuesto de Ingresos {year}
              </h2>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Ingresos mensuales con deducciones de ley, regalía pascual, bonificación y bono vacacional
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tarjetas KPI de Resumen Anual */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {/* KPI Ingreso Total */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--sage)", display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                <TrendingUp size={13} />
                <span>Ingreso Anual Presupuestado</span>
              </div>
              <div
                className="despensa-mono"
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: "var(--sage)",
                  marginTop: 4,
                }}
              >
                ${resumenIngresos.totalIngresoAnual.toLocaleString("es")}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
                ~${(resumenIngresos.totalIngresoAnual / 12).toLocaleString("es", { maximumFractionDigits: 0 })}/mes promedio
              </div>
            </div>

            {/* KPI Presupuesto Gastos */}
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingDown size={13} style={{ color: "var(--stamp)" }} />
                <span>Gastos y Compromisos {year}</span>
              </div>
              <div className="despensa-mono" style={{ fontSize: 19, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                ${totalGastosAnual.toLocaleString("es")}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
                Presupuesto anual de egresos
              </div>
            </div>

            {/* KPI Balance Neto (Superávit / Déficit) */}
            <div
              style={{
                background: esSuperavit ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                border: `1px solid ${esSuperavit ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: esSuperavit ? "var(--sage)" : "var(--stamp)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 600,
                }}
              >
                <span>{esSuperavit ? "Superávit Proyectado (Ahorro)" : "Déficit Proyectado"}</span>
              </div>
              <div
                className="despensa-mono"
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: esSuperavit ? "var(--sage)" : "var(--stamp)",
                  marginTop: 4,
                }}
              >
                {esSuperavit ? "+" : ""}${balanceNeto.toLocaleString("es")}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
                {esSuperavit ? "Margen libre para ahorro o inversión" : "Gastos superan ingresos anuales"}
              </div>
            </div>
          </div>

          {/* Formulario rápido para agregar ingreso puntual (Bonificación, Regalía, Bono Vacacional) */}
          {mostrarFormPuntual && (
            <form
              onSubmit={handleGuardarPuntual}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--sage)",
                borderRadius: 12,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
                  Registrar / Modificar {tipoPuntual} para {year}
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarFormPuntual(false)}
                  style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Tipo</label>
                  <select
                    value={tipoPuntual}
                    onChange={(e) => setTipoPuntual(e.target.value)}
                    style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink)" }}
                  >
                    <option value="Bonificación">Bonificación</option>
                    <option value="Regalía Pascual">Regalía Pascual (Sueldo 13)</option>
                    <option value="Bono Vacacional">Bono Vacacional</option>
                    <option value="Comisión">Comisión</option>
                    <option value="Otro">Otro extraordinario</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Monto ($)</label>
                  <input
                    type="number"
                    value={montoPuntual}
                    onChange={(e) => setMontoPuntual(e.target.value)}
                    placeholder="Monto $"
                    required
                    style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink)", textAlign: "right" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Fecha estimada</label>
                  <input
                    type="date"
                    value={fechaPuntual}
                    onChange={(e) => setFechaPuntual(e.target.value)}
                    required
                    style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Notas u observaciones</label>
                <input
                  type="text"
                  value={notasPuntual}
                  onChange={(e) => setNotasPuntual(e.target.value)}
                  placeholder="ej. 45 días de utilidades presupuestados"
                  style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink)" }}
                />
              </div>

              {errorPuntual && <div style={{ fontSize: 11, color: "var(--stamp)" }}>{errorPuntual}</div>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setMostrarFormPuntual(false)}
                  style={{ padding: "5px 12px", fontSize: 11.5, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ padding: "5px 14px", fontSize: 11.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: guardando ? "wait" : "pointer" }}
                >
                  {guardando ? "Guardando…" : "Guardar en Presupuesto"}
                </button>
              </div>
            </form>
          )}

          {/* Desglose de Componentes del Ingreso Anual */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Desglose Detallado de Ingresos {year}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTipoPuntual("Bonificación");
                  setMontoPuntual("");
                  setFechaPuntual(`${year}-04-20`);
                  setNotasPuntual("");
                  setMostrarFormPuntual(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--sage)",
                  background: "var(--sage-bg)",
                  border: "1px solid var(--sage)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Agregar ingreso puntual
              </button>
            </div>

            {/* 1. Salario Regular (12 meses con deducciones de ley) */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--blue-bg)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                      1. Ingresos Mensuales Regulares (12 Meses)
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Sueldos y fuentes activas ({formatMoney(resumenIngresos.regularNetoQuincenal)} quincenal neto)
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                    ${resumenIngresos.regularNetoAnual.toLocaleString("es")}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--sage)", fontWeight: 600 }}>
                    Neto anual presupuestado
                  </div>
                </div>
              </div>

              {/* Sub-bloque de Deducciones de Ley */}
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: "var(--card)",
                  borderRadius: 8,
                  border: "1px solid var(--line-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)" }}>
                  <span>Sueldo Bruto Anual estimado (12 meses):</span>
                  <strong style={{ color: "var(--ink)" }}>${resumenIngresos.regularBrutoAnual.toLocaleString("es")}</strong>
                </div>

                {resumenIngresos.totalDeduccionesAnual > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--stamp)" }}>
                      <span>• AFP (Fondo de Pensiones - 2.87%):</span>
                      <span>-${resumenIngresos.afpAnual.toLocaleString("es")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--stamp)" }}>
                      <span>• SFS (Seguro Familiar de Salud - 3.04%):</span>
                      <span>-${resumenIngresos.sfsAnual.toLocaleString("es")}</span>
                    </div>
                    {resumenIngresos.isrAnual > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--stamp)" }}>
                        <span>• ISR (Impuesto sobre la Renta DGII):</span>
                        <span>-${resumenIngresos.isrAnual.toLocaleString("es")}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderTop: "1px dashed var(--line)",
                        paddingTop: 4,
                        marginTop: 2,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      <span>Total Deducciones de Ley retenidas:</span>
                      <span style={{ color: "var(--stamp)" }}>-${resumenIngresos.totalDeduccionesAnual.toLocaleString("es")}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. Regalía Pascual (Salario de Navidad / Ley 16-92) */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(16, 185, 129, 0.14)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Gift size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>2. Regalía Pascual (Salario de Navidad / Sueldo 13)</span>
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "var(--sage-bg)", color: "var(--sage)", fontWeight: 700 }}>
                        Ley 16-92
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Programado en Diciembre 2da quincena · 100% libre de retenciones TSS e ISR
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--sage)" }}>
                      ${resumenIngresos.regaliaPascual.monto.toLocaleString("es")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                      {resumenIngresos.regaliaPascual.esEstimada ? "Proyección legal (1 mes bruto)" : "Personalizado"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirFormParaTipo("Regalía Pascual", 12, resumenIngresos.regaliaPascual.monto)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Ajustar
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Bonificación Anual (Art. 223 Código de Trabajo) */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Award size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>3. Bonificación Anual (Participación de Beneficios)</span>
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "rgba(245, 158, 11, 0.15)", color: "var(--amber)", fontWeight: 700 }}>
                        Art. 223 CT
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Programado en Abril 2da quincena · Utilidades anuales de la empresa (45 a 60 días)
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--amber)" }}>
                      ${resumenIngresos.bonificacion.monto.toLocaleString("es")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                      {resumenIngresos.bonificacion.esEstimada ? "Proyección legal (~45 días)" : "Personalizado"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirFormParaTipo("Bonificación", 4, resumenIngresos.bonificacion.monto)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Ajustar
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Bono Vacacional (Art. 177 Código de Trabajo) */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Palmtree size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>4. Bono Vacacional / Compensación de Vacaciones</span>
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", fontWeight: 700 }}>
                        Art. 177 CT
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Remuneración de descanso anual (14 a 18 días laborables de salario ordinario)
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "#2563eb" }}>
                      ${resumenIngresos.bonoVacacional.monto.toLocaleString("es")}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                      {resumenIngresos.bonoVacacional.esEstimada ? "Proyección legal (14 días)" : "Personalizado"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirFormParaTipo("Bono Vacacional", 7, resumenIngresos.bonoVacacional.monto)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Ajustar
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Otros Ingresos Puntuales Registrados */}
            {puntualesDelAno.length > 0 && (
              <div
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  Ingresos Puntuales Registrados para {year} ({puntualesDelAno.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {puntualesDelAno.map((ip) => (
                    <div
                      key={ip.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background: "var(--card)",
                        border: "1px solid var(--line-soft)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--ink)" }}>{ip.tipo}</strong>
                        {ip.fuenteIngresoNombre && (
                          <span style={{ color: "var(--ink-soft)", marginLeft: 6 }}>({ip.fuenteIngresoNombre})</span>
                        )}
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                          Fecha: {formatDate(ip.fecha)} {ip.notas ? `· ${ip.notas}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="despensa-mono" style={{ fontWeight: 700, color: "var(--sage)" }}>
                          {formatMoney(ip.monto)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarPuntual(ip.id)}
                          disabled={eliminandoId === ip.id}
                          title="Eliminar este ingreso puntual"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--stamp)",
                            cursor: "pointer",
                            padding: 3,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nota Legal y Financiera */}
          <div
            style={{
              padding: "10px 12px",
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: 10,
              fontSize: 11.5,
              color: "var(--ink)",
              lineHeight: 1.45,
            }}
          >
            🛡️ <strong>Marco Legal Dominicano (Código de Trabajo RD):</strong> La Regalía Pascual (Art. 219) está 100% exenta de TSS e ISR y no computa para el tope de renta. La Bonificación (Art. 223) y el Bono Vacacional (Art. 177) forman parte de tus derechos adquiridos que impulsan tu excedente y ahorro anual.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            background: "var(--paper)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {onNavigate && (
            <button
              onClick={() => {
                onClose();
                onNavigate("fuentes-ingreso");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--sage)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span>Configurar Fuentes de Ingreso</span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--ink)",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
