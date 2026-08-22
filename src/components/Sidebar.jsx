import React from "react";
import { Package, ShoppingCart, Landmark, Wallet, Banknote, ArrowLeftRight, Sun, Moon, PiggyBank } from "lucide-react";

const NAV_ITEMS = [
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "lista", label: "Lista de compra", icon: ShoppingCart },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "cuentas", label: "Cuentas", icon: PiggyBank },
  { id: "prestamos", label: "Préstamos", icon: Banknote },
];

export default function Sidebar({ tab, setTab, listCount, theme, onToggleTheme }) {
  return (
    <nav className="despensa-sidebar">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 1.25rem", gap: 8 }}>
        <div
          className="despensa-tab-font"
          style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Smart Finance
        </div>
        <button
          onClick={onToggleTheme}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            flexShrink: 0,
            border: "1px solid var(--line)",
            borderRadius: 7,
            background: "var(--card)",
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
      <div className="despensa-navlist">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="despensa-tab-font despensa-navitem"
              style={{
                background: active ? "var(--sage-bg)" : "transparent",
                color: active ? "var(--sage)" : "var(--ink)",
              }}
            >
              <Icon size={16} />
              <span className="despensa-navlabel">{item.label}</span>
              {item.id === "lista" && listCount > 0 && (
                <span
                  className="despensa-mono"
                  style={{
                    marginLeft: "auto",
                    background: active ? "var(--sage)" : "var(--line)",
                    color: active ? "#fff" : "var(--ink)",
                    borderRadius: 10,
                    fontSize: 11,
                    padding: "1px 6px",
                  }}
                >
                  {listCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
