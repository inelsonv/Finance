import React, { useEffect, useState } from "react";
import { Smartphone, RotateCw, Lock } from "lucide-react";
import { esDispositivoMovilHorizontal } from "../lib/orientacion";

export default function BloqueoOrientacionVertical() {
  const [esHorizontal, setEsHorizontal] = useState(false);
  const [ignoradoTemporal, setIgnoradoTemporal] = useState(false);

  useEffect(() => {
    const verificar = () => {
      const horizontal = esDispositivoMovilHorizontal();
      setEsHorizontal(horizontal);
      // Si el usuario regresa a vertical, reiniciamos el bypass para que si vuelve a girar se muestre la recomendación
      if (!horizontal) {
        setIgnoradoTemporal(false);
      }
    };

    verificar();

    window.addEventListener("resize", verificar, { passive: true });
    window.addEventListener("orientationchange", verificar, { passive: true });

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener("change", verificar, { passive: true });
    }

    return () => {
      window.removeEventListener("resize", verificar);
      window.removeEventListener("orientationchange", verificar);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener("change", verificar);
      }
    };
  }, []);

  const forzarVertical = async () => {
    try {
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock("portrait");
      }
    } catch (_) {}
  };

  if (!esHorizontal || ignoradoTemporal) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "var(--paper, #0a0f1d)",
        color: "var(--ink, #f8fafc)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 24px",
        textAlign: "center",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes girarTelefonoAnim {
          0%, 15% {
            transform: rotate(90deg);
          }
          45%, 70% {
            transform: rotate(0deg);
          }
          85%, 100% {
            transform: rotate(0deg);
          }
        }
        .anim-girar-telefono {
          animation: girarTelefonoAnim 3s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      {/* Tarjeta central */}
      <div
        style={{
          background: "var(--card, #111827)",
          border: "1px solid var(--line, #1f293d)",
          borderRadius: 16,
          padding: "20px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "var(--shadow-md, 0 8px 30px rgba(0,0,0,0.4))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icono animado de rotación */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--sage-bg, rgba(56,189,248,0.12))",
            color: "var(--sage, #38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div className="anim-girar-telefono" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Smartphone size={34} strokeWidth={2.2} />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              background: "var(--card, #111827)",
              borderRadius: "50%",
              padding: 3,
              display: "flex",
              color: "var(--sage, #38bdf8)",
            }}
          >
            <Lock size={12} strokeWidth={2.5} />
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--ink, #f8fafc)",
              marginBottom: 4,
            }}
          >
            Smart Finance solo se muestra en vertical
          </div>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.4,
              color: "var(--ink-soft, #94a3b8)",
              maxWidth: 340,
            }}
          >
            Para evitar que se distorsionen tus gráficos y listas financieras, por favor gira tu teléfono a posición vertical.
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <button
            onClick={forzarVertical}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--sage, #38bdf8)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <RotateCw size={13} /> Bloquear en vertical
          </button>
          <button
            onClick={() => setIgnoradoTemporal(true)}
            style={{
              padding: "7px 12px",
              fontSize: 11.5,
              color: "var(--ink-soft, #94a3b8)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Continuar en horizontal
          </button>
        </div>
      </div>
    </div>
  );
}
