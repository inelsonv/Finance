import React, { useState } from "react";
import {
  Package,
  ShoppingCart,
  CalendarDays,
  Car,
  Landmark,
  Wallet,
  Banknote,
  ArrowLeftRight,
  Sun,
  Moon,
  Vault,
  PiggyBank,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Ticket,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Home,
  Zap,
  LineChart,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "inicio", label: "Inicio", icon: Home },
  {
    id: "presupuesto",
    label: "Presupuesto",
    icon: Wallet,
    children: [
      { id: "presupuesto-categoria-gasto", label: "Categoría de gasto" },
      { id: "presupuesto-mensual", label: "Presupuesto mensual" },
      { id: "presupuesto-flujo", label: "Editor de flujo" },
      { id: "estrategia-deudas", label: "Estrategia de deudas" },
      { id: "checklist-pagos", label: "Checklist de pagos" },
    ],
  },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "ingresos", label: "Ingresos", icon: Briefcase },
  { id: "inversion", label: "Inversión", icon: LineChart },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  {
    id: "activos",
    label: "Activos",
    icon: Car,
    children: [{ id: "seguros", label: "Seguros" }],
  },
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "lista", label: "Lista de compra", icon: ShoppingCart },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "cuentas", label: "Cuentas", icon: Vault },
  { id: "ahorro", label: "Ahorro", icon: PiggyBank },
  { id: "prestamos", label: "Préstamos", icon: Banknote },
  { id: "tarjetas", label: "Tarjetas", icon: CreditCard },
  { id: "membresias", label: "Membresías", icon: Ticket },
  { id: "contratos", label: "Contratos", icon: Zap },
];

export default function Sidebar({ tab, setTab, listCount, prestamosActivosCount, theme, onToggleTheme, collapsed, onToggleCollapsed }) {
  const [expandedId, setExpandedId] = useState(null);
  const badgeCounts = { lista: listCount, prestamos: prestamosActivosCount };

  return (
    <nav className={`despensa-sidebar${collapsed ? " despensa-sidebar--collapsed" : ""}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 0 1rem" : "0 4px 1.25rem",
          gap: 8,
        }}
      >
        {!collapsed && (
          <div
            className="despensa-tab-font"
            style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          >
            Smart Finance
          </div>
        )}
        {!collapsed && (
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
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggleTheme}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            margin: "0 auto 8px",
            border: "1px solid var(--line)",
            borderRadius: 7,
            background: "var(--card)",
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      )}

      <div className="despensa-navlist">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const hasChildren = !collapsed && item.children && item.children.length > 0;
          const expanded = hasChildren && expandedId === item.id;
          const count = badgeCounts[item.id];
          return (
            <div key={item.id}>
              <button
                onClick={() => setTab(item.id)}
                onDoubleClick={hasChildren ? () => setExpandedId(expanded ? null : item.id) : undefined}
                title={collapsed ? item.label : hasChildren ? `${item.label} (doble clic para ver subcategorías)` : undefined}
                className="despensa-tab-font despensa-navitem"
                style={{
                  background: active ? "var(--sage-bg)" : "transparent",
                  color: active ? "var(--sage)" : "var(--ink)",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={16} />
                {!collapsed && <span className="despensa-navlabel">{item.label}</span>}
                {!collapsed && count > 0 && (
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
                    {count}
                  </span>
                )}
                {collapsed && count > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--stamp)",
                    }}
                  />
                )}
                {hasChildren && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expanded ? null : item.id);
                    }}
                    style={{ marginLeft: "auto", display: "flex", color: "var(--ink-soft)" }}
                  >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                )}
              </button>

              {expanded && (
                <div className="despensa-submenu" style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                  {item.children.map((child) => {
                    const childActive = tab === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => setTab(child.id)}
                        className="despensa-tab-font despensa-navitem"
                        style={{
                          background: childActive ? "var(--sage-bg)" : "transparent",
                          color: childActive ? "var(--sage)" : "var(--ink-soft)",
                          justifyContent: "flex-start",
                          paddingLeft: 30,
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                        <span className="despensa-navlabel">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onToggleCollapsed}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="despensa-collapse-btn"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && <span>Colapsar</span>}
      </button>
    </nav>
  );
}
