import React from "react";
import { Package, ShoppingCart, Landmark } from "lucide-react";

const NAV_ITEMS = [
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "lista", label: "Lista de compra", icon: ShoppingCart },
  { id: "entidades", label: "Entidades", icon: Landmark },
];

export default function Sidebar({ tab, setTab, listCount }) {
  return (
    <nav className="despensa-sidebar">
      <div
        className="despensa-tab-font"
        style={{ fontSize: 18, fontWeight: 700, padding: "0 4px 1.25rem", letterSpacing: "-0.01em" }}
      >
        Smart Finance
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
