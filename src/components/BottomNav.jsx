import React, { useState } from "react";
import {
  Home,
  CalendarDays,
  TrendingDown,
  ShoppingCart,
  Bell,
  ArrowLeftRight,
  CheckSquare,
  X,
  ChevronRight,
  Route,
} from "lucide-react";
import QuickGasto from "./QuickGasto.jsx";
import { useNotificaciones } from "./NotificationBell.jsx";

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    compras: ["catalogo", "ordenes-compra"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

function contarNoLeidas(notificaciones) {
  let leidas;
  try {
    leidas = new Set(JSON.parse(localStorage.getItem("smart-finance-notif-leidas") || "[]"));
  } catch (e) {
    leidas = new Set();
  }
  return notificaciones.filter((n) => !leidas.has(`${n.id}:${n.dias}`)).length;
}

export default function BottomNav({
  tab,
  setTab,
  isOwner = false,
  categoriasGasto,
  prestamos,
  tarjetas,
  membresias,
  contratos,
  movimientos,
  products,
  entidades,
  fuentesIngreso,
  eventos,
  presupuesto,
  presupuestoYear,
  seguros,
  ingresosPuntuales,
  ajustesPresupuesto,
  sugerenciasInversion,
  diasCobro,
  habitosPenalizaciones,
  versiculoHoy,
  habitos,
  habitosRegistro,
  checklistTodos,
}) {
  const [showGasto, setShowGasto] = useState(false);
  const [showOpciones, setShowOpciones] = useState(false);

  const notificaciones = useNotificaciones({
    prestamos,
    tarjetas,
    membresias,
    contratos,
    movimientos,
    products,
    entidades,
    eventos,
    fuentesIngreso,
    presupuesto,
    presupuestoYear,
    seguros,
    categoriasGasto,
    ingresosPuntuales,
    ajustesPresupuesto,
    sugerenciasInversion,
    diasCobro,
    habitosPenalizaciones,
    versiculoHoy,
    habitos,
    habitosRegistro,
    isOwner,
    checklistTodos,
  });
  const noLeidas = contarNoLeidas(notificaciones);

  return (
    <>
      <nav className={`despensa-bottomnav${tab === "asistente" ? " despensa-bottomnav--assistant" : ""}`}>
        <button
          onClick={() => setTab("calendario")}
          className="despensa-bottomnav-item"
          title="Calendario"
          style={{ color: activoEnGrupo(tab, "calendario") ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <CalendarDays size={22} />
          {activoEnGrupo(tab, "calendario") && <span className="despensa-bottomnav-dot" />}
        </button>

        <button
          onClick={() => setShowOpciones(true)}
          className="despensa-bottomnav-item"
          title="Registrar gasto o Checklist de pagos"
          style={{ color: tab === "checklist-pagos" ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <TrendingDown size={22} />
          {tab === "checklist-pagos" && <span className="despensa-bottomnav-dot" />}
        </button>

        <button
          onClick={() => setTab("inicio")}
          className="despensa-bottomnav-item"
          title="Inicio"
          style={{ color: tab === "inicio" ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <Home size={22} />
          {tab === "inicio" && <span className="despensa-bottomnav-dot" />}
        </button>

        {isOwner ? (
          <button
            onClick={() => setTab("compras")}
            className="despensa-bottomnav-item"
            title="Compras"
            style={{ color: activoEnGrupo(tab, "compras") ? "var(--sage)" : "var(--ink-soft)" }}
          >
            <ShoppingCart size={22} />
            {activoEnGrupo(tab, "compras") && <span className="despensa-bottomnav-dot" />}
          </button>
        ) : (
          <button
            onClick={() => setTab("movimientos")}
            className="despensa-bottomnav-item"
            title="Movimientos"
            style={{ color: tab === "movimientos" ? "var(--sage)" : "var(--ink-soft)" }}
          >
            <ArrowLeftRight size={22} />
            {tab === "movimientos" && <span className="despensa-bottomnav-dot" />}
          </button>
        )}

        <button
          onClick={() => setTab("notificaciones")}
          className="despensa-bottomnav-item"
          title="Notificaciones"
          style={{ color: tab === "notificaciones" ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={22} />
            {noLeidas > 0 && (
              <span
                className="despensa-mono"
                style={{
                  position: "absolute",
                  top: -4,
                  right: -7,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 10,
                  background: "var(--stamp)",
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3.5px",
                  border: "1.5px solid var(--card)",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                {noLeidas > 99 ? "99+" : noLeidas}
              </span>
            )}
          </div>
          {tab === "notificaciones" && <span className="despensa-bottomnav-dot" />}
        </button>
      </nav>

      {showOpciones && (
        <div
          onClick={() => setShowOpciones(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--card)",
              borderTop: "1px solid var(--line)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.35)",
            }}
          >
            {/* Handle bar */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--line)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                  Acciones rápidas
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
                  ¿Qué deseas realizar en este momento?
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpciones(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
                aria-label="Cerrar opciones"
              >
                <X size={16} />
              </button>
            </div>

            {/* Opciones */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Opción 1: Registrar gasto rápido */}
              <button
                type="button"
                onClick={() => {
                  setShowOpciones(false);
                  setShowGasto(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "var(--stamp, #ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <TrendingDown size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                    Registrar gasto rápido
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.35 }}>
                    Compras pequeñas, combustible, salidas o gastos cotidianos
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
              </button>

              {/* Opción 2: Ir al Checklist de pagos */}
              <button
                type="button"
                onClick={() => {
                  setShowOpciones(false);
                  setTab("checklist-pagos");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 14px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(16, 185, 129, 0.4)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(16, 185, 129, 0.14)",
                    color: "var(--sage, #10b981)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckSquare size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>Ir al Checklist de pagos</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: "var(--sage-bg)",
                        color: "var(--sage)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      Préstamos
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.35 }}>
                    Pagar préstamos (PT01, etc.), tarjetas y obligaciones quincenales
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
              </button>

              {/* Opción 3: Ruta de flujo financiero */}
              <button
                type="button"
                onClick={() => {
                  setShowOpciones(false);
                  setTab("presupuesto-flujo");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 14px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(88, 204, 2, 0.4)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(88, 204, 2, 0.14)",
                    color: "#58cc02",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Route size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>Ruta de flujo financiero</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: "rgba(88, 204, 2, 0.15)",
                        color: "#58cc02",
                        border: "1px solid rgba(88, 204, 2, 0.3)",
                      }}
                    >
                      Interactivo
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.35 }}>
                    Ingresos, gastos fijos, deudas, metas y excedente
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
              </button>
            </div>

            {/* Botón cancelar */}
            <button
              type="button"
              onClick={() => setShowOpciones(false)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--ink-soft)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showGasto && (
        <QuickGasto
          categoriasGasto={categoriasGasto}
          onClose={() => setShowGasto(false)}
          tarjetas={tarjetas}
          movimientos={movimientos}
          presupuesto={presupuesto}
          presupuestoYear={presupuestoYear}
          diasCobro={diasCobro}
        />
      )}
    </>
  );
}
