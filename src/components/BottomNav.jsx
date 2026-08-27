import React, { useState } from "react";
import { Home, CalendarDays, TrendingDown, ShoppingCart, Bell } from "lucide-react";
import QuickGasto from "./QuickGasto.jsx";

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    compras: ["catalogo", "ordenes-compra"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

export default function BottomNav({ tab, setTab, categoriasGasto }) {
  const [showGasto, setShowGasto] = useState(false);

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
          style={{ color: tab === "notificaciones" ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <Bell size={22} />
          {tab === "notificaciones" && <span className="despensa-bottomnav-dot" />}
        </button>
      </nav>

      {showGasto && <QuickGasto categoriasGasto={categoriasGasto} onClose={() => setShowGasto(false)} />}
    </>
  );
}
