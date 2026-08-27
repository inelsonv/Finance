import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const UMBRAL = 70;
const MAX_PULL = 110;

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refrescando, setRefrescando] = useState(false);
  const startY = useRef(null);
  const activo = useRef(false);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY <= 0 && !refrescando) {
        startY.current = e.touches[0].clientY;
        activo.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!activo.current || startY.current == null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        setPull(Math.min(delta * 0.5, MAX_PULL));
      } else {
        activo.current = false;
        setPull(0);
      }
    };

    const onTouchEnd = () => {
      if (!activo.current) return;
      activo.current = false;
      if (pull >= UMBRAL) {
        setRefrescando(true);
        setPull(UMBRAL);
        setTimeout(() => window.location.reload(), 350);
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull, refrescando]);

  if (pull === 0 && !refrescando) return null;

  const progreso = Math.min(pull / UMBRAL, 1);

  return (
    <div
      className="despensa-pulltorefresh"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 200,
        pointerEvents: "none",
        transform: `translateY(${pull - 40}px)`,
        transition: activo.current ? "none" : "transform 0.2s ease",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--card)",
          border: "1px solid var(--line)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: progreso >= 1 ? "var(--sage)" : "var(--ink-soft)",
          marginTop: 10,
        }}
      >
        <RefreshCw
          size={16}
          style={{
            transform: `rotate(${progreso * 360}deg)`,
            animation: refrescando ? "spin 0.7s linear infinite" : "none",
          }}
        />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
