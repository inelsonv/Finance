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
  Coins,
  Wallet as WalletIcon,
  HeartPulse,
  Library,
  Map as MapIcon,
  Bot,
} from "lucide-react";
import SmartFinanceLogo, { SmartFinanceMark } from "./SmartFinanceLogo.jsx";

const NAV_ITEMS = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "asistente", label: "Consultor Financiero", icon: Bot },
  {
    id: "presupuesto",
    label: "Presupuesto",
    icon: Wallet,
    children: [
      { id: "presupuesto-metodologia", label: "Tipos de Presupuesto" },
      { id: "presupuesto-categoria-gasto", label: "Categoría de gasto" },
      { id: "presupuesto-flujo", label: "Editor de flujo" },
      { id: "estrategia-deudas", label: "Estrategia de deudas" },
      { id: "checklist-pagos", label: "Checklist de pagos" },
      { id: "vacaciones", label: "Vacaciones" },
      { id: "vuelos", label: "Consultar Vuelos" },
    ],
  },
  { id: "movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  {
    id: "dinero-cuentas",
    label: "Finanzas",
    icon: Coins,
    children: [
      { id: "cuentas", label: "Cuentas" },
      { id: "ahorro", label: "Ahorro" },
      { id: "inversion", label: "Inversión" },
      { id: "ingresos", label: "Ingresos" },
    ],
  },
  {
    id: "deudas-pagos",
    label: "Pagos fijos",
    icon: Banknote,
    children: [
      { id: "prestamos", label: "Préstamos" },
      { id: "tarjetas", label: "Tarjetas" },
      { id: "membresias", label: "Membresías y suscripciones" },
      { id: "contratos", label: "Contratos" },
    ],
  },
  {
    id: "activos",
    label: "Activos",
    icon: Car,
    children: [
      { id: "seguros", label: "Seguros" },
      { id: "renovaciones", label: "Renovaciones y Trámites" },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: ShoppingCart,
    children: [
      { id: "catalogo", label: "Catálogo" },
      { id: "recetas", label: "Sugeridor de platos" },
      { id: "ordenes-compra", label: "Órdenes de compra" },
    ],
  },
  { id: "entidades", label: "Entidades", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
  { id: "biblioteca", label: "Biblioteca", icon: Library },
  { id: "habitos", label: "Salud", icon: HeartPulse },
  { id: "mapa-progreso", label: "Mapa de progreso", icon: MapIcon },
];

export default function Sidebar({ tab, setTab, listCount, prestamosActivosCount, theme, onToggleTheme, collapsed, onToggleCollapsed, isOwner = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const badgeCounts = { "ordenes-compra": listCount, prestamos: prestamosActivosCount };

  const navItems = NAV_ITEMS.filter((item) => {
    if (!isOwner) {
      if (item.id === "biblioteca" || item.id === "compras") return false;
    }
    return true;
  });

  return (
    <nav className={`despensa-sidebar${collapsed ? " despensa-sidebar--collapsed" : ""}`}>
      {collapsed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <SmartFinanceMark size={28} />
          <button
            onClick={onToggleCollapsed}
            title="Expandir menú"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              border: "1px solid var(--line)",
              borderRadius: 7,
              background: "var(--card)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <PanelLeftOpen size={14} />
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2px 1.25rem",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <SmartFinanceMark size={28} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span
                className="despensa-tab-font"
                style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}
              >
                Smart<span style={{ color: "var(--sage)" }}>Finance</span>
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                Patrimonio & Tesorería
              </span>
            </div>
          </div>
          <button
            onClick={onToggleCollapsed}
            title="Colapsar menú"
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
            <PanelLeftClose size={14} />
          </button>
        </div>
      )}

      <div className="despensa-navlist">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id || (item.id === "presupuesto" && tab === "presupuesto-mensual");
          const itemHasChildren = item.children && item.children.length > 0;
          const hasChildren = !collapsed && itemHasChildren;
          const expanded = hasChildren && expandedId === item.id;
          const childrenCount = itemHasChildren
            ? item.children.reduce((s, c) => s + (badgeCounts[c.id] || 0), 0)
            : undefined;
          const count = badgeCounts[item.id] ?? childrenCount;
          return (
            <div key={item.id}>
              <button
                onClick={() => setTab(item.id === "presupuesto" ? "presupuesto-mensual" : item.id)}
                onDoubleClick={hasChildren ? () => setExpandedId(expanded ? null : item.id) : undefined}
                title={collapsed ? item.label : hasChildren ? `${item.label} (doble clic para ver subcategorías)` : undefined}
                className="despensa-tab-font despensa-navitem"
                style={{
                  background: active ? "var(--sage-bg)" : "transparent",
                  color: active ? "var(--sage)" : "var(--ink)",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && <span className="despensa-navlabel">{item.label}</span>}
                {!collapsed && count > 0 && (
                  <span
                    className="despensa-mono"
                    style={{
                      marginLeft: "auto",
                      flexShrink: 0,
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
                    className="despensa-navchevron"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expanded ? null : item.id);
                    }}
                    style={{ marginLeft: "auto", flexShrink: 0, display: "flex", color: "var(--ink-soft)" }}
                  >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                )}
              </button>

              {expanded && (
                <div className="despensa-submenu" style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 1 }}>
                  {item.children.map((child) => {
                    const childActive = tab === child.id;
                    const childCount = badgeCounts[child.id];
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
                        {childCount > 0 && (
                          <span
                            className="despensa-mono"
                            style={{
                              marginLeft: "auto",
                              background: childActive ? "var(--sage)" : "var(--line)",
                              color: childActive ? "#fff" : "var(--ink)",
                              borderRadius: 10,
                              fontSize: 10.5,
                              padding: "1px 6px",
                            }}
                          >
                            {childCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
