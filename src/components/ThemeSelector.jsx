import React, { useState } from "react";
import { Check, Sun, Moon, Shield, Landmark, Compass, Crown, Coffee, Zap, Palette, CheckCircle2 } from "lucide-react";
import { THEMES } from "../lib/themes";

const ICON_MAP = {
  Sun,
  Moon,
  Shield,
  Landmark,
  Compass,
  Crown,
  Coffee,
  Zap,
};

export function ThemeThumbnail({ theme, isSelected }) {
  const { colors } = theme;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 104,
        borderRadius: 8,
        border: `1.5px solid ${colors.line}`,
        background: colors.paper,
        overflow: "hidden",
        boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.18)" : "0 2px 6px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Mini App Header Bar */}
      <div
        style={{
          height: 16,
          background: colors.card,
          borderBottom: `1px solid ${colors.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: colors.sage }} />
          <div style={{ width: 22, height: 3, borderRadius: 2, background: colors.ink, opacity: 0.85 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 14, height: 5, borderRadius: 3, background: colors.amber, opacity: 0.9 }} />
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors.blue }} />
        </div>
      </div>

      {/* Mini App Body */}
      <div style={{ display: "flex", height: "calc(100% - 16px)" }}>
        {/* Mini Left Sidebar */}
        <div
          style={{
            width: 24,
            background: colors.card,
            borderRight: `1px solid ${colors.lineSoft}`,
            padding: "4px 3px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "center",
          }}
        >
          {/* Active nav item */}
          <div
            style={{
              width: "100%",
              height: 7,
              borderRadius: 3,
              background: colors.sageBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 8, height: 2, borderRadius: 1, background: colors.sage }} />
          </div>
          {/* Inactive nav items */}
          <div style={{ width: 10, height: 2, borderRadius: 1, background: colors.line }} />
          <div style={{ width: 8, height: 2, borderRadius: 1, background: colors.line }} />
          <div style={{ width: 10, height: 2, borderRadius: 1, background: colors.line }} />
        </div>

        {/* Mini Content Area */}
        <div
          style={{
            flex: 1,
            padding: "5px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: colors.paper,
          }}
        >
          {/* Mini Hero Balance Card */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.line}`,
              borderRadius: 5,
              padding: "4px 5px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ width: 28, height: 3, borderRadius: 1.5, background: colors.inkSoft, opacity: 0.8 }} />
              <div
                style={{
                  width: 14,
                  height: 4,
                  borderRadius: 2,
                  background: colors.sageBg,
                  border: `0.5px solid ${colors.sage}`,
                }}
              />
            </div>
            <div style={{ width: "58%", height: 5, borderRadius: 2, background: colors.ink }} />
          </div>

          {/* Mini 2-Column Stats */}
          <div style={{ display: "flex", gap: 4 }}>
            {/* Stat 1 (Ingreso) */}
            <div
              style={{
                flex: 1,
                background: colors.card,
                border: `1px solid ${colors.lineSoft}`,
                borderRadius: 4,
                padding: "3px 4px",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div style={{ width: 3, height: 8, borderRadius: 1, background: colors.sage }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <div style={{ width: "80%", height: 2.5, borderRadius: 1, background: colors.ink }} />
                <div style={{ width: "45%", height: 2, borderRadius: 1, background: colors.inkSoft, opacity: 0.6 }} />
              </div>
            </div>

            {/* Stat 2 (Gasto) */}
            <div
              style={{
                flex: 1,
                background: colors.card,
                border: `1px solid ${colors.lineSoft}`,
                borderRadius: 4,
                padding: "3px 4px",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div style={{ width: 3, height: 8, borderRadius: 1, background: colors.stamp }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <div style={{ width: "70%", height: 2.5, borderRadius: 1, background: colors.ink }} />
                <div style={{ width: "50%", height: 2, borderRadius: 1, background: colors.inkSoft, opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Mini progress tracker */}
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: colors.lineSoft,
              overflow: "hidden",
              marginTop: "auto",
            }}
          >
            <div style={{ width: "68%", height: "100%", background: colors.sage }} />
          </div>
        </div>
      </div>

      {/* Selected badge overlay on thumbnail */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            background: colors.sage,
            color: "#ffffff",
            borderRadius: "50%",
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          <Check size={11} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

export default function ThemeSelector({ currentTheme, onSelectTheme }) {
  const [filtro, setFiltro] = useState("todos");

  const themesFiltrados = THEMES.filter((t) => {
    if (filtro === "todos") return true;
    return t.categoria === filtro;
  });

  const temaActualObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Banner de estado actual */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          background: "var(--sage-bg)",
          border: "1px solid var(--sage)",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--sage)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Palette size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              Tema actual: <span style={{ color: "var(--sage)" }}>{temaActualObj.nombre}</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              Modo {temaActualObj.categoriaLabel} • {temaActualObj.descripcion}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--line)",
            color: "var(--sage)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <CheckCircle2 size={12} /> Activo en tu dispositivo
        </div>
      </div>

      {/* Selector de pestañas / filtro rápido */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { id: "todos", label: `Todos (${THEMES.length})` },
          { id: "claro", label: `Claros (${THEMES.filter((t) => t.categoria === "claro").length})` },
          { id: "oscuro", label: `Oscuros (${THEMES.filter((t) => t.categoria === "oscuro").length})` },
          { id: "oled", label: `OLED (${THEMES.filter((t) => t.categoria === "oled").length})` },
        ].map((btn) => {
          const activo = filtro === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFiltro(btn.id)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: activo ? 600 : 500,
                borderRadius: 20,
                border: activo ? "1px solid var(--sage)" : "1px solid var(--line)",
                background: activo ? "var(--sage-bg)" : "var(--card)",
                color: activo ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Grid de temas con miniatura */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 12,
        }}
      >
        {themesFiltrados.map((theme) => {
          const isSelected = currentTheme === theme.id;
          const IconComp = ICON_MAP[theme.icon] || Palette;

          return (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                background: isSelected ? "var(--sage-bg)" : "var(--card)",
                border: isSelected ? "2px solid var(--sage)" : "1px solid var(--line)",
                borderRadius: 12,
                padding: 10,
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: isSelected
                  ? "0 4px 16px rgba(0,0,0,0.12)"
                  : "0 1px 3px rgba(0,0,0,0.04)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--muted-line)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {/* Miniatura gráfica interactiva del tema */}
              <ThemeThumbnail theme={theme} isSelected={isSelected} />

              {/* Contenido descriptivo del tema */}
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Fila con nombre, icono y etiqueta */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        color: isSelected ? "var(--sage)" : "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <IconComp size={15} />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {theme.nombre}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background:
                        theme.categoria === "oled"
                          ? "#000000"
                          : theme.categoria === "oscuro"
                          ? "rgba(0,0,0,0.12)"
                          : "rgba(0,0,0,0.05)",
                      color:
                        theme.categoria === "oled"
                          ? "#00e676"
                          : isSelected
                          ? "var(--sage)"
                          : "var(--ink-soft)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    {theme.categoriaLabel}
                  </span>
                </div>

                {/* Explicación corta */}
                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: "var(--ink-soft)",
                    minHeight: 32,
                  }}
                >
                  {theme.descripcion}
                </div>

                {/* Muestrario de paleta de colores */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "var(--ink-soft)", marginRight: 2 }}>Paleta:</span>
                    {[
                      theme.colors.paper,
                      theme.colors.card,
                      theme.colors.sage,
                      theme.colors.stamp,
                      theme.colors.amber,
                    ].map((col, idx) => (
                      <span
                        key={idx}
                        title={col}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: col,
                          border: "1px solid rgba(120,120,120,0.3)",
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </div>

                  {/* Estado / Botón */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isSelected ? "var(--sage)" : "var(--ink-soft)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check size={12} strokeWidth={2.5} />
                        Activo
                      </>
                    ) : (
                      "Seleccionar"
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
