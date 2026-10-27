import React, { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const REVEAL = 76;

// Envuelve una fila para permitir deslizar hacia la izquierda y revelar un
// botón de eliminar (patrón típico de apps móviles). En escritorio, sin touch,
// simplemente no pasa nada — la fila se ve y se comporta igual que siempre.
export default function SwipeableRow({ children, onDelete }) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const dragging = useRef(false);

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onTouchMove = (e) => {
    if (!dragging.current || startX.current == null) return;
    const delta = e.touches[0].clientX - startX.current;
    const base = open ? -REVEAL : 0;
    const next = base + delta;
    setDx(Math.max(Math.min(next, 0), -REVEAL - 20));
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (dx < -REVEAL / 2) {
      setDx(-REVEAL);
      setOpen(true);
    } else {
      setDx(0);
      setOpen(false);
    }
  };

  const cerrar = () => {
    setDx(0);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: REVEAL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--stamp)",
        }}
      >
        <button
          onClick={() => {
            cerrar();
            onDelete();
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            width: "100%",
            height: "100%",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Trash2 size={16} />
          <span style={{ fontSize: 9.5 }}>Eliminar</span>
        </button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => open && cerrar()}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? "none" : "transform 0.2s ease",
          background: "var(--card)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
