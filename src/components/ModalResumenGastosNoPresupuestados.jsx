import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Receipt,
  Calendar,
  Wallet,
  TrendingDown,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  HelpCircle,
  Copy,
  ExternalLink,
  PieChart,
} from "lucide-react";
import { obtenerGastosNoPresupuestados } from "../lib/gastosNoPresupuestados";
import { setPresupuestoCelda, setPresupuestoCeldaCompartida } from "../lib/db";
import { periodoActualConfigurado } from "../lib/quincenaConfig";

const MESES = [
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

export default function ModalResumenGastosNoPresupuestados({
  isOpen,
  onClose,
  presupuesto = {},
  movimientos = [],
  categoriasGasto = [],
  diasCobro = [15, 30],
  presupuestoYear,
  onNavigate,
  infoCompartido,
}) {
  const periodoActual = useMemo(() => periodoActualConfigurado(diasCobro), [diasCobro]);

  const [periodo, setPeriodo] = useState(() => ({
    year: periodoActual.year,
    month: periodoActual.month,
    quincena: periodoActual.quincena, // "Q1", "Q2" o "todas"
  }));

  const [presupuestandoCat, setPresupuestandoCat] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [guardandoMonto, setGuardandoMonto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const resumen = useMemo(() => {
    return obtenerGastosNoPresupuestados({
      presupuesto,
      movimientos,
      categoriasGasto,
      year: periodo.year,
      month: periodo.month,
      quincena: periodo.quincena,
      diasCobro,
    });
  }, [presupuesto, movimientos, categoriasGasto, periodo, diasCobro]);

  if (!isOpen) return null;

  const navegarMes = (direccion) => {
    setPeriodo((actual) => {
      let nuevoMes = actual.month + direccion;
      let nuevoYear = actual.year;
      if (nuevoMes > 12) {
        nuevoMes = 1;
        nuevoYear += 1;
      } else if (nuevoMes < 1) {
        nuevoMes = 12;
        nuevoYear -= 1;
      }
      return { ...actual, year: nuevoYear, month: nuevoMes };
    });
  };

  const handleGuardarPresupuesto = async (catNombre) => {
    const num = parseFloat(nuevoMonto.replace(/,/g, "").trim());
    if (!Number.isFinite(num) || num <= 0) return;

    setGuardandoMonto(true);
    try {
      const qDestino = periodo.quincena === "todas" ? "Q1" : periodo.quincena;
      await setPresupuestoCelda(periodo.year, catNombre, periodo.month, qDestino, num);

      if (infoCompartido?.tieneAcceso && infoCompartido?.titularEmail) {
        try {
          await setPresupuestoCeldaCompartida(
            periodo.year,
            catNombre,
            periodo.month,
            qDestino,
            num,
            infoCompartido.titularEmail,
            infoCompartido.titularUid
          );
        } catch (e) {
          console.warn("setPresupuestoCeldaCompartida:", e);
        }
      }

      setPresupuestandoCat(null);
      setNuevoMonto("");
    } catch (err) {
      console.error("Error al asignar presupuesto a la categoría:", err);
    } finally {
      setGuardandoMonto(false);
    }
  };

  const copiarResumenTexto = () => {
    const qLabel =
      periodo.quincena === "Q1"
        ? "1ra quincena"
        : periodo.quincena === "Q2"
        ? "2da quincena"
        : "Mes completo";

    let texto = `📊 Resumen de Gastos No Presupuestados (${qLabel} de ${MESES[periodo.month - 1]} ${periodo.year})\n`;
    texto += `Total gastado fuera de presupuesto: ${formatMoney(resumen.totalNoPresupuestado)}\n`;
    texto += `Cantidad de gastos: ${resumen.cantidadGastos}\n\n`;

    if (resumen.porCategoria.length > 0) {
      texto += `Por categoría:\n`;
      resumen.porCategoria.forEach((c) => {
        texto += `• ${c.categoria}: ${formatMoney(c.total)} (${c.cantidad} gastos - ${c.porcentaje.toFixed(1)}%)\n`;
      });
    }

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const gastosFiltrados = resumen.gastos.filter((g) => {
    if (filtroCategoria === "todas") return true;
    return g.category === filtroCategoria;
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
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
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
          maxWidth: 680,
          background: "var(--card)",
          borderRadius: 16,
          border: "1px solid var(--line)",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--amber-bg)",
                color: "var(--amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.2 }}>
                Gastos No Presupuestados
              </h2>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Movimientos registrados en rubros sin monto asignado en tu presupuesto
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

        {/* Controles de Navegación de Período */}
        <div
          style={{
            padding: "12px 20px",
            background: "var(--paper)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Selector de Mes */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => navegarMes(-1)}
              title="Mes anterior"
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", minWidth: 120, textAlign: "center" }}>
              {MESES[periodo.month - 1]} {periodo.year}
            </span>
            <button
              onClick={() => navegarMes(1)}
              title="Mes siguiente"
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Selector de Quincena */}
          <div style={{ display: "flex", gap: 4, background: "var(--card)", padding: "3px 4px", borderRadius: 8, border: "1px solid var(--line)" }}>
            <button
              onClick={() => setPeriodo((p) => ({ ...p, quincena: "Q1" }))}
              style={{
                padding: "3px 9px",
                fontSize: 11.5,
                fontWeight: periodo.quincena === "Q1" ? 700 : 500,
                borderRadius: 6,
                border: "none",
                background: periodo.quincena === "Q1" ? "var(--sage-bg)" : "transparent",
                color: periodo.quincena === "Q1" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              1ra quincena
            </button>
            <button
              onClick={() => setPeriodo((p) => ({ ...p, quincena: "Q2" }))}
              style={{
                padding: "3px 9px",
                fontSize: 11.5,
                fontWeight: periodo.quincena === "Q2" ? 700 : 500,
                borderRadius: 6,
                border: "none",
                background: periodo.quincena === "Q2" ? "var(--sage-bg)" : "transparent",
                color: periodo.quincena === "Q2" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              2da quincena
            </button>
            <button
              onClick={() => setPeriodo((p) => ({ ...p, quincena: "todas" }))}
              style={{
                padding: "3px 9px",
                fontSize: 11.5,
                fontWeight: periodo.quincena === "todas" ? 700 : 500,
                borderRadius: 6,
                border: "none",
                background: periodo.quincena === "todas" ? "var(--sage-bg)" : "transparent",
                color: periodo.quincena === "todas" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              Todo el mes
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tarjetas KPI de Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div
              style={{
                background: "var(--paper)",
                border: `1px solid ${resumen.totalNoPresupuestado > 0 ? "rgba(245, 158, 11, 0.4)" : "var(--line)"}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingDown size={13} style={{ color: resumen.totalNoPresupuestado > 0 ? "var(--amber)" : "var(--sage)" }} />
                <span>Total no presupuestado</span>
              </div>
              <div
                className="despensa-mono"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: resumen.totalNoPresupuestado > 0 ? "var(--amber)" : "var(--sage)",
                  marginTop: 4,
                }}
              >
                {formatMoney(resumen.totalNoPresupuestado)}
              </div>
            </div>

            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <Receipt size={13} style={{ color: "var(--ink-soft)" }} />
                <span>Gastos registrados</span>
              </div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                {resumen.cantidadGastos}
              </div>
            </div>

            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <PieChart size={13} style={{ color: "var(--ink-soft)" }} />
                <span>Categorías afectadas</span>
              </div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                {resumen.porCategoria.length}
              </div>
            </div>
          </div>

          {resumen.totalNoPresupuestado === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                background: "var(--paper)",
                borderRadius: 12,
                border: "1px dashed var(--line)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--sage-bg)",
                  color: "var(--sage)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Check size={24} strokeWidth={2.5} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
                ¡Excelente control presupuestario!
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
                No tienes gastos registrados fuera de presupuesto para este período. Todo lo gastado corresponde a rubros previamente planificados.
              </p>
            </div>
          ) : (
            <>
              {/* Desglose por Categoría */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Desglose por categoría ({resumen.porCategoria.length})
                  </span>
                  <button
                    onClick={copiarResumenTexto}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--sage)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    <Copy size={12} /> {copiado ? "¡Copiado!" : "Copiar resumen"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resumen.porCategoria.map((cat) => (
                    <div
                      key={cat.categoria}
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{cat.categoria}</span>
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: "1px 6px",
                              borderRadius: 6,
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--amber)",
                              fontWeight: 600,
                            }}
                          >
                            {cat.cantidad} gasto{cat.cantidad !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="despensa-mono" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--amber)" }}>
                            {formatMoney(cat.total)}
                          </span>
                          <button
                            onClick={() => {
                              if (presupuestandoCat === cat.categoria) {
                                setPresupuestandoCat(null);
                              } else {
                                setPresupuestandoCat(cat.categoria);
                                setNuevoMonto(String(cat.total));
                              }
                            }}
                            title="Asignar presupuesto a esta categoría para este período"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              background: "var(--sage-bg)",
                              color: "var(--sage)",
                              border: "1px solid var(--sage)",
                              borderRadius: 6,
                              cursor: "pointer",
                            }}
                          >
                            <Plus size={12} /> {presupuestandoCat === cat.categoria ? "Cancelar" : "Presupuestar"}
                          </button>
                        </div>
                      </div>

                      {/* Barra de proporción */}
                      <div style={{ height: 5, background: "var(--line-soft)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(cat.porcentaje, 100)}%`, background: "var(--amber)", borderRadius: 3 }} />
                      </div>

                      {/* Formulario rápido para presupuestar la categoría */}
                      {presupuestandoCat === cat.categoria && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "8px 10px",
                            background: "var(--card)",
                            borderRadius: 8,
                            border: "1px solid var(--sage)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                            Presupuestar para {periodo.quincena === "todas" ? "1ra quincena" : periodo.quincena}:
                          </span>
                          <input
                            type="number"
                            value={nuevoMonto}
                            onChange={(e) => setNuevoMonto(e.target.value)}
                            placeholder="Monto $"
                            autoFocus
                            style={{
                              width: 100,
                              padding: "4px 8px",
                              fontSize: 12,
                              border: "1px solid var(--line)",
                              borderRadius: 6,
                              background: "var(--paper)",
                              color: "var(--ink)",
                              textAlign: "right",
                            }}
                          />
                          <button
                            onClick={() => handleGuardarPresupuesto(cat.categoria)}
                            disabled={guardandoMonto}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: "var(--sage)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              cursor: guardandoMonto ? "wait" : "pointer",
                            }}
                          >
                            {guardandoMonto ? "Guardando…" : "Confirmar monto"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista Detallada de Movimientos */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Detalle de movimientos ({gastosFiltrados.length})
                  </span>
                  {resumen.porCategoria.length > 1 && (
                    <select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        color: "var(--ink)",
                      }}
                    >
                      <option value="todas">Todas las categorías</option>
                      {resumen.porCategoria.map((c) => (
                        <option key={c.categoria} value={c.categoria}>
                          {c.categoria} ({formatMoney(c.total)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {gastosFiltrados.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{g.description}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--amber)",
                            }}
                          >
                            {g.category}
                          </span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
                          {formatDate(g.date)} · {g.metodoPago}
                          {g.cuentaNombre ? ` · ${g.cuentaNombre}` : ""}
                        </div>
                      </div>
                      <div className="despensa-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", flexShrink: 0 }}>
                        {formatMoney(g.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Consejo financiero */}
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
            💡 <strong>Consejo financiero:</strong> Los gastos no presupuestados reducen tu excedente quincenal sin previo aviso. Si notas que una categoría se repite con frecuencia (ej. farmacia, salidas o compras menores), asígnale un monto realista en tu <strong>Presupuesto mensual</strong> para blindar tu flujo de caja.
          </div>
        </div>

        {/* Footer del Modal */}
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
                onNavigate("presupuesto-mensual");
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
              <span>Ir a Presupuesto mensual</span>
              <ExternalLink size={13} />
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
