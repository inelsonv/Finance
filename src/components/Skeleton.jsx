import React from "react";

/**
 * Componente base de Skeleton con animación shimmer adaptativa al tema.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style = {},
  className = "",
  inline = false,
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        display: inline ? "inline-block" : "block",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCircle({ size = 32, style = {}, className = "" }) {
  return <Skeleton width={size} height={size} borderRadius="50%" style={style} className={className} />;
}

export function SkeletonText({ lines = 2, width = "100%", gap = 6, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, width, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 && lines > 1 ? "70%" : "100%"}
          borderRadius={4}
        />
      ))}
    </div>
  );
}

/**
 * Esqueleto para tarjetas de métricas o KPIs (ej. Balance, Ingresos, Gastos)
 */
export function SkeletonKPI({ style = {} }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="45%" height={11} borderRadius={4} />
        <SkeletonCircle size={18} />
      </div>
      <Skeleton width="75%" height={22} borderRadius={6} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
        <Skeleton width="30%" height={10} borderRadius={4} />
        <Skeleton width="20%" height={10} borderRadius={4} />
      </div>
    </div>
  );
}

/**
 * Esqueleto para una fila estándar (ej. movimiento, ítem de checklist, tarjeta, préstamo)
 */
export function SkeletonRow({ style = {}, showAmount = true }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 14px",
        background: "var(--card)",
        borderBottom: "1px solid var(--line-soft)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <SkeletonCircle size={30} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 }}>
          <Skeleton width="55%" height={13} borderRadius={4} />
          <Skeleton width="35%" height={10} borderRadius={4} />
        </div>
      </div>
      {showAmount && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Skeleton width={75} height={14} borderRadius={4} />
          <Skeleton width={45} height={9} borderRadius={4} />
        </div>
      )}
    </div>
  );
}

/**
 * Lista de filas skeleton
 */
export function SkeletonList({ count = 4, style = {}, showBorder = true }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: showBorder ? "1px solid var(--line)" : "none",
        borderRadius: 10,
        overflow: "hidden",
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} style={i === count - 1 ? { borderBottom: "none" } : {}} />
      ))}
    </div>
  );
}

/**
 * Esqueleto para gráficos de barras o histogramas de consumo
 */
export function SkeletonChart({ height = 180, bars = 7, style = {} }) {
  const barHeights = [40, 75, 55, 90, 65, 80, 45, 95, 60, 70];
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="40%" height={14} borderRadius={4} />
        <Skeleton width="20%" height={12} borderRadius={4} />
      </div>
      <div
        style={{
          height,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 10,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <Skeleton
              width="100%"
              height={`${barHeights[i % barHeights.length]}%`}
              borderRadius="4px 4px 0 0"
            />
            <Skeleton width="60%" height={9} borderRadius={3} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Esqueleto para burbujas de conversación en el Asistente
 */
export function SkeletonChat({ bubbles = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 6px" }}>
      {Array.from({ length: bubbles }).map((_, i) => {
        const isUser = i % 2 !== 0;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              justifyContent: isUser ? "flex-end" : "flex-start",
              alignItems: "flex-start",
            }}
          >
            {!isUser && <SkeletonCircle size={26} />}
            <div
              style={{
                background: isUser ? "var(--sage-bg, rgba(91,122,91,0.15))" : "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "10px 14px",
                maxWidth: "75%",
                width: isUser ? "45%" : "65%",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Skeleton width="90%" height={11} borderRadius={4} />
              <Skeleton width="70%" height={11} borderRadius={4} />
              {!isUser && <Skeleton width="40%" height={9} borderRadius={3} />}
            </div>
            {isUser && <SkeletonCircle size={26} />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Esqueleto para el bloque resumen de quincena (Inicio / Checklist)
 */
export function SkeletonQuincenaSummary({ style = {} }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Skeleton width="35%" height={16} borderRadius={5} />
        <Skeleton width="22%" height={14} borderRadius={5} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <Skeleton height={50} borderRadius={8} />
        <Skeleton height={50} borderRadius={8} />
        <Skeleton height={50} borderRadius={8} />
      </div>
      <Skeleton height={8} borderRadius={4} />
    </div>
  );
}
