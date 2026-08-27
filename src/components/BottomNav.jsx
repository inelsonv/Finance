import React from "react";
import { Home, CalendarDays, Vault, ShoppingCart, Bell } from "lucide-react";

const PRINCIPALES = [
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "dinero-cuentas", label: "Finanzas", icon: Vault },
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "compras", label: "Compras", icon: ShoppingCart },
];

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    "dinero-cuentas": ["cuentas", "ahorro", "inversion", "ingresos"],
    compras: ["catalogo", "ordenes-compra"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

export default function BottomNav({ tab, setTab }) {
  return (
    <nav className="despensa-bottomnav">
      {PRINCIPALES.map((item) => {
        const Icon = item.icon;
        const activo = activoEnGrupo(tab, item.id);
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="despensa-bottomnav-item"
            title={item.label}
            style={{ color: activo ? "var(--sage)" : "var(--ink-soft)" }}
          >
            <Icon size={22} />
            {activo && <span className="despensa-bottomnav-dot" />}
          </button>
        );
      })}
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
  );
}
