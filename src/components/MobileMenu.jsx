import React from "react";
import { X, ArrowLeftRight, Wallet, Banknote, Car, Landmark, Settings, LogOut, Coins, Flame, WalletCards } from "lucide-react";
import { confirm } from "../lib/confirm";

const OPCIONES = [
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "dinero-cuentas", label: "Finanzas", icon: Coins },
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "deudas-pagos", label: "Pagos fijos", icon: Banknote },
  { id: "activos", label: "Activos", icon: Car },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: WalletCards },
  { id: "habitos", label: "Hábitos", icon: Flame },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    "dinero-cuentas": ["cuentas", "ahorro", "inversion", "ingresos"],
    "deudas-pagos": ["prestamos", "tarjetas", "membresias", "contratos"],
    activos: ["activos", "seguros"],
    presupuesto: ["presupuesto-categoria-gasto", "presupuesto-mensual", "presupuesto-flujo", "estrategia-deudas", "checklist-pagos", "vacaciones"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

export default function MobileMenu({ tab, setTab, onClose, onSignOut }) {
  const irA = (id) => {
    setTab(id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(280px, 82vw)",
          height: "100%",
          background: "var(--card)",
          borderRight: "1px solid var(--line)",
          padding: "1.25rem 1rem",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700 }}>Smart Finance</span>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "var(--paper)", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {OPCIONES.map((item) => {
            const Icon = item.icon;
            const activo = activoEnGrupo(tab, item.id);
            return (
              <button
                key={item.id}
                onClick={() => irA(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 10px",
                  borderRadius: 9,
                  border: "none",
                  background: activo ? "var(--sage-bg)" : "transparent",
                  color: activo ? "var(--sage)" : "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={async () => {
            onClose();
            if (await confirm("¿Cerrar sesión?", { confirmLabel: "Cerrar sesión", danger: false })) onSignOut();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 10px",
            borderRadius: 9,
            border: "none",
            background: "transparent",
            color: "var(--stamp)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "left",
            marginTop: "auto",
          }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
