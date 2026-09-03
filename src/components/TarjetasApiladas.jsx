import React, { useEffect, useRef, useState } from "react";
import { CardVisual } from "./Tarjetas.jsx";

const UMBRAL_ARRASTRE = 70;
const UMBRAL_TAP = 6;

// Vista de tarjetas apiladas, al estilo Apple Wallet: se ven ligeramente
// escalonadas, y arrastrando la de enfrente hacia abajo se manda al fondo
// del montón, revelando la siguiente. Tocar (sin arrastrar) la tarjeta de
// enfrente dispara onTapFrente — útil para seleccionarla o abrir su detalle.
export default function TarjetasApiladas({ tarjetas, onChangeFrente, onTapFrente }) {
  const [orden, setOrden] = useState(tarjetas || []);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animando, setAnimando] = useState(false);
  const startY = useRef(0);
  const movidoRef = useRef(false);

  // Si la lista de tarjetas cambia desde fuera (se agregó/eliminó una),
  // reconcilia el orden conservando la posición relativa de las que siguen
  // existiendo.
  useEffect(() => {
    setOrden((prev) => {
      const idsNuevos = new Set((tarjetas || []).map((t) => t.id));
      const conservadas = prev.filter((t) => idsNuevos.has(t.id));
      const idsConservados = new Set(conservadas.map((t) => t.id));
      const nuevas = (tarjetas || []).filter((t) => !idsConservados.has(t.id));
      return [...conservadas, ...nuevas];
    });
  }, [tarjetas]);

  useEffect(() => {
    if (orden.length > 0) onChangeFrente && onChangeFrente(orden[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden]);

  const handlePointerDown = (e) => {
    if (animando) return;
    startY.current = e.clientY;
    movidoRef.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const delta = e.clientY - startY.current;
    if (Math.abs(delta) > UMBRAL_TAP) movidoRef.current = true;
    setDragY(Math.max(0, delta));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);

    if (!movidoRef.current) {
      // Fue un toque, no un arrastre.
      setDragY(0);
      if (orden[0]) onTapFrente && onTapFrente(orden[0]);
      return;
    }

    if (dragY > UMBRAL_ARRASTRE && orden.length > 1) {
      setAnimando(true);
      setDragY(500); // termina de mandarla hacia abajo, fuera de vista
      setTimeout(() => {
        setOrden((prev) => [...prev.slice(1), prev[0]]);
        setDragY(0);
        setAnimando(false);
      }, 220);
    } else {
      setDragY(0);
    }
  };

  if (orden.length === 0) {
    return <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>No hay tarjetas activas.</div>;
  }

  const MAX_VISIBLE = 4;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 300, margin: "0 auto", height: 190 + (Math.min(orden.length, MAX_VISIBLE) - 1) * 16 }}>
      {orden.slice(0, MAX_VISIBLE).map((t, i) => {
        const esFrente = i === 0;
        const offsetY = i * 16 + (esFrente ? dragY : 0);
        const scale = 1 - i * 0.035;
        return (
          <div
            key={t.id}
            onPointerDown={esFrente ? handlePointerDown : undefined}
            onPointerMove={esFrente ? handlePointerMove : undefined}
            onPointerUp={esFrente ? handlePointerUp : undefined}
            onPointerCancel={esFrente ? handlePointerUp : undefined}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px) scale(${scale})`,
              transformOrigin: "top center",
              zIndex: MAX_VISIBLE - i,
              opacity: esFrente ? Math.max(0.15, 1 - dragY / 300) : 1,
              transition: dragging && esFrente ? "none" : "transform 0.25s ease, opacity 0.25s ease",
              cursor: esFrente ? (dragging ? "grabbing" : "grab") : "default",
              touchAction: esFrente ? "none" : "auto",
            }}
          >
            <CardVisual tarjeta={t} />
          </div>
        );
      })}
    </div>
  );
}
