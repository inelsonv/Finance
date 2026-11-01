import React from "react";

/**
 * SmartFinanceLogo - Identidad visual corporativa de alta precisión para Smart Finance.
 * Diseño geométrico institucional que fusiona el monograma 'SF' con un lingote/bóveda
 * y vector de crecimiento patrimonial, proyectando solidez, privacidad y elegancia bancaria.
 */
export function SmartFinanceMark({ size = 28, hasBox = true, className = "", style = {} }) {
  const gradientId = `sf-grad-${size}-${hasBox ? "boxed" : "free"}`;
  const strokeGradId = `sf-stroke-${size}-${hasBox ? "boxed" : "free"}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={hasBox ? "0 0 40 40" : "8 8 24 24"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        flexShrink: 0,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Gradiente principal con los tonos del tema activo */}
        <linearGradient id={gradientId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--sage)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--sage)" stopOpacity="0.82" />
        </linearGradient>
        {/* Borde sutil para darle profundidad y aspecto refinado */}
        <linearGradient id={strokeGradId} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.6" />
          <stop offset="50%" stopColor="var(--line)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--sage)" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Base arquitectónica de soporte (prisma exterior sutil) solo si hasBox es true */}
      {hasBox && (
        <rect
          x="3"
          y="3"
          width="34"
          height="34"
          rx="9"
          fill="var(--sage-bg)"
          stroke="var(--line)"
          strokeWidth="1"
        />
      )}

      {/* Geometría Monograma S-F: Facetas dinámicas de tesorería y crecimiento */}
      {/* Barra superior de entrada (Bóveda y liquidez) */}
      <path
        d="M11 13.5C11 11.567 12.567 10 14.5 10H25.5C27.433 10 29 11.567 29 13.5V14.5H16.5C14.567 14.5 13 16.067 13 18V18H11V13.5Z"
        fill={`url(#${gradientId})`}
      />

      {/* Eje central de transición 'S-F' (Trazo diagonal de avance financiero) */}
      <path
        d="M13 18.5C13 17.119 14.119 16 15.5 16H25C26.105 16 27 16.895 27 18V19.5C27 20.881 25.881 22 24.5 22H15.5C14.119 22 13 20.881 13 19.5V18.5Z"
        fill="var(--ink)"
        fillOpacity="0.9"
      />

      {/* Base de solidez patrimonial y anclaje inferior */}
      <path
        d="M11 26.5C11 24.567 12.567 23 14.5 23H27V26.5C27 28.433 25.433 30 23.5 30H14.5C12.567 30 11 28.433 11 26.5Z"
        fill={`url(#${gradientId})`}
      />

      {/* Detalle de precisión: microindicador de pulso de activos (dorado/ámbar sutil) */}
      <circle cx="27.5" cy="12.5" r="2" fill="var(--amber)" />
    </svg>
  );
}

export default function SmartFinanceLogo({
  size = 28,
  markOnly = false,
  showTagline = false,
  tagline = "Pequeños hábitos, grandes resultados",
  className = "",
  style = {},
}) {
  if (markOnly) {
    return <SmartFinanceMark size={size} className={className} style={style} />;
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size > 30 ? 12 : 9,
        textDecoration: "none",
        userSelect: "none",
        ...style,
      }}
    >
      <SmartFinanceMark size={size} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.15 }}>
        <div
          className="despensa-tab-font"
          style={{
            fontSize: size > 30 ? 19 : 17,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span>Smart</span>
          <span style={{ color: "var(--sage)" }}>Finance</span>
        </div>
        {showTagline && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-soft)",
              marginTop: 2,
            }}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}
