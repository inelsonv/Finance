import React, { useState } from "react";
import { Home, CalendarDays, TrendingDown, ShoppingCart, Bell } from "lucide-react";
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
}) {
  const [showGasto, setShowGasto] = useState(false);

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
  });
  const noLeidas = contarNoLeidas(notificaciones);

  return (
    <>
      <nav className="despensa-bottomnav">
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
          onClick={() => setShowGasto(true)}
          className="despensa-bottomnav-item"
          title="Registrar gasto"
          style={{ color: "var(--ink-soft)" }}
        >
          <TrendingDown size={22} />
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

        <button
          onClick={() => setTab("compras")}
          className="despensa-bottomnav-item"
          title="Compras"
          style={{ color: activoEnGrupo(tab, "compras") ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <ShoppingCart size={22} />
          {activoEnGrupo(tab, "compras") && <span className="despensa-bottomnav-dot" />}
        </button>

        <button
          onClick={() => setTab("notificaciones")}
          className="despensa-bottomnav-item"
          title="Notificaciones"
          style={{ color: tab === "notificaciones" ? "var(--sage)" : "var(--ink-soft)", position: "relative" }}
        >
          <Bell size={22} />
          {noLeidas > 0 && (
            <span
              className="despensa-mono"
              style={{
                position: "absolute",
                top: 0,
                right: 6,
                minWidth: 15,
                height: 15,
                borderRadius: 8,
                background: "var(--stamp)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                border: "1.5px solid var(--card)",
              }}
            >
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
          {tab === "notificaciones" && <span className="despensa-bottomnav-dot" />}
        </button>
      </nav>

      {showGasto && <QuickGasto categoriasGasto={categoriasGasto} onClose={() => setShowGasto(false)} />}
    </>
  );
}
