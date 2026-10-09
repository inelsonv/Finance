import React, { useEffect, useState } from "react";

/**
 * Pantalla y barra de progreso superior al abrir la aplicación.
 * En lugar de una barra gris tradicional, el logo oficial de Smart Finance
 * se llena progresivamente de líquido esmeralda y dorado de abajo hacia arriba.
 */
export default function AppLoadingScreen({ mensaje = "Preparando tus finanzas…" }) {
  // Progreso visual de llenado (0 a 100%)
  const [progreso, setProgreso] = useState(15);

  useEffect(() => {
    // Sube de forma fluida y orgánica
    const intervalo = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 98) return 98;
        const incremento = Math.max(1, Math.round((100 - prev) * 0.16));
        return Math.min(98, prev + incremento);
      });
    }, 110);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--paper, #fcfbf9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "max(32px, 8vh)",
        paddingLeft: 20,
        paddingRight: 20,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes despensa-liquid-wave {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.15); }
          100% { transform: translateX(-50%) scaleY(1); }
        }
        @keyframes despensa-logo-glow {
          0%, 100% { filter: drop-shadow(0 4px 14px rgba(91, 122, 91, 0.35)); }
          50% { filter: drop-shadow(0 8px 24px rgba(91, 122, 91, 0.65)) drop-shadow(0 0 16px rgba(245, 158, 11, 0.45)); }
        }
        @keyframes despensa-pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes despensa-shimmer-top {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Línea ambiental sutil en el borde superior exacto */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--line, rgba(0,0,0,0.06))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progreso}%`,
            background: "linear-gradient(90deg, var(--sage, #5b7a5b), #86efac, var(--amber, #f59e0b))",
            transition: "width 0.25s ease-out",
            boxShadow: "0 0 10px rgba(91, 122, 91, 0.8)",
          }}
        />
      </div>

      {/* Tarjeta superior flotante (Barra de progreso con Logo que se llena y Smart Finance) */}
      <div
        style={{
          width: "min(100%, 360px)",
          background: "var(--card, #ffffff)",
          border: "1px solid var(--line, rgba(0,0,0,0.08))",
          borderRadius: 20,
          padding: "24px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 12px 36px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)",
          animation: "despensa-pulse-subtle 3s ease-in-out infinite",
        }}
      >
        {/* Contenedor del Logo que se llena progresivamente */}
        <div
          style={{
            position: "relative",
            width: 76,
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "despensa-logo-glow 2.5s ease-in-out infinite",
          }}
        >
          {/* 1. Capa base del Logo (Vacío / Silueta tenue) */}
          <svg
            viewBox="0 0 512 512"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0.22,
            }}
          >
            <rect width="512" height="512" rx="108" fill="var(--line, #cbd5e1)" />
            <g transform="translate(256,256)">
              <rect
                x="-140"
                y="-96"
                width="280"
                height="192"
                rx="24"
                fill="none"
                stroke="var(--ink, #0f172a)"
                strokeWidth="20"
              />
              <circle cx="96" cy="0" r="22" fill="var(--ink, #0f172a)" />
              <rect x="-140" y="-96" width="280" height="52" rx="24" fill="var(--ink, #0f172a)" />
            </g>
          </svg>

          {/* 2. Capa que se llena: Logo con máscara de altura ascendente */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${progreso}%`,
              overflow: "hidden",
              transition: "height 0.22s cubic-bezier(0.2, 0.8, 0.4, 1)",
              borderRadius: progreso >= 95 ? 18 : "0 0 18px 18px",
            }}
          >
            {/* SVG completo a tamaño total anclado al fondo para revelarse de abajo hacia arriba */}
            <svg
              viewBox="0 0 512 512"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 76,
                height: 76,
              }}
            >
              <defs>
                <linearGradient id="despensaLogoGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#2e472e" />
                  <stop offset="60%" stopColor="#5b7a5b" />
                  <stop offset="100%" stopColor="#6da36d" />
                </linearGradient>
                <linearGradient id="despensaGoldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="108" fill="url(#despensaLogoGrad)" />
              <g transform="translate(256,256)">
                <rect
                  x="-140"
                  y="-96"
                  width="280"
                  height="192"
                  rx="24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="20"
                />
                <circle cx="96" cy="0" r="24" fill="url(#despensaGoldGrad)" stroke="#ffffff" strokeWidth="6" />
                <rect x="-140" y="-96" width="280" height="52" rx="24" fill="#ffffff" />
                {/* Detalle de tarjeta */}
                <rect x="-105" y="-18" width="130" height="12" rx="6" fill="rgba(255,255,255,0.7)" />
                <rect x="-105" y="10" width="85" height="10" rx="5" fill="rgba(255,255,255,0.5)" />
              </g>
            </svg>

            {/* Línea de brillo en la superficie del líquido mientras sube */}
            {progreso < 98 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.2), #ffffff, rgba(251,191,36,0.9), rgba(255,255,255,0.2))",
                  boxShadow: "0 0 8px rgba(255,255,255,0.9)",
                }}
              />
            )}
          </div>

          {/* Borde sutil del marco del logo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              border: "1.5px solid var(--line, rgba(0,0,0,0.12))",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Nombre de la aplicación */}
        <div style={{ textAlign: "center" }}>
          <div
            className="despensa-tab-font"
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink, #1e293b)",
              marginBottom: 4,
            }}
          >
            Smart Finance
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-soft, #64748b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>{mensaje}</span>
            <span
              className="despensa-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--sage, #5b7a5b)",
                background: "var(--sage-bg, rgba(91,122,91,0.1))",
                padding: "1px 6px",
                borderRadius: 999,
              }}
            >
              {progreso}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
