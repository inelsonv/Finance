import React, { useState } from "react";
import {
  Home,
  CalendarDays,
  MoreHorizontal,
  X,
  Vault,
  ArrowLeftRight,
  Wallet,
  Banknote,
  Car,
  ShoppingCart,
  Landmark,
  Settings,
} from "lucide-react";

const PRINCIPALES = [
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "dinero-cuentas", label: "Finanzas", icon: Vault },
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "compras", label: "Compras", icon: ShoppingCart },
];

const MAS = [
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "deudas-pagos", label: "Pagos fijos", icon: Banknote },
  { id: "activos", label: "Activos", icon: Car },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

function activoEnGrupo(tab, grupoId) {
  if (tab === grupoId) return true;
  const prefijosPorGrupo = {
    "dinero-cuentas": ["cuentas", "ahorro", "inversion", "ingresos"],
    "deudas-pagos": ["prestamos", "tarjetas", "membresias", "contratos"],
    activos: ["activos", "seguros"],
    compras: ["catalogo", "ordenes-compra"],
    presupuesto: ["presupuesto-categoria-gasto", "presupuesto-mensual", "presupuesto-flujo", "estrategia-deudas", "checklist-pagos", "vacaciones"],
  };
  return (prefijosPorGrupo[grupoId] || []).includes(tab);
}

export default function BottomNav({ tab, setTab }) {
  const [showMore, setShowMore] = useState(false);

  const irA = (id) => {
    setTab(id);
    setShowMore(false);
  };

  const todosLosGrupos = [...PRINCIPALES, ...MAS];
  const masActivo = MAS.some((m) => activoEnGrupo(tab, m.id)) && !PRINCIPALES.some((p) => activoEnGrupo(tab, p.id));

  return (
    <>
      <nav className="despensa-bottomnav">
        {PRINCIPALES.map((item) => {
          const Icon = item.icon;
          const activo = activoEnGrupo(tab, item.id);
          return (
            <button
              key={item.id}
              onClick={() => irA(item.id)}
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
          onClick={() => setShowMore(true)}
          className="despensa-bottomnav-item"
          title="Más opciones"
          style={{ color: masActivo ? "var(--sage)" : "var(--ink-soft)" }}
        >
          <MoreHorizontal size={22} />
          {masActivo && <span className="despensa-bottomnav-dot" />}
        </button>
      </nav>

      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--card)",
              borderTop: "1px solid var(--line)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: "var(--line)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 600 }}>Más opciones</span>
              <button
                onClick={() => setShowMore(false)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--paper)", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {MAS.map((item) => {
                const Icon = item.icon;
                const activo = activoEnGrupo(tab, item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => irA(item.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "14px 6px",
                      borderRadius: 12,
                      border: "1px solid var(--line)",
                      background: activo ? "var(--sage-bg)" : "var(--paper)",
                      color: activo ? "var(--sage)" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={20} />
                    <span style={{ fontSize: 11, textAlign: "center" }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
