import React, { useEffect, useMemo, useState } from "react";
import { Lock, Check, MapPin, X } from "lucide-react";
import { calcularMapaProgreso } from "../lib/mapaProgreso";
import { watchMundosPremiados, premiarMundoCompletado } from "../lib/db";

// Posiciones (en % del ancho/alto del lienzo) de cada uno de los mundos,
// en zigzag ascendente — igual que un mapa clásico de mundos de plataformas.
const POSICIONES = [
  { x: 18, y: 94 },
  { x: 68, y: 84 },
  { x: 22, y: 74 },
  { x: 72, y: 64 },
  { x: 24, y: 54 },
  { x: 70, y: 44 },
  { x: 20, y: 34 },
  { x: 70, y: 24 },
  { x: 24, y: 14 },
  { x: 68, y: 5 },
];

const EMOJIS_MUNDO = ["🌱", "🎯", "⚔️", "🛡️", "💳", "📈", "🏛️", "🧭", "🏗️", "🏆"];

export default function MapaProgreso({
  fuentesIngreso,
  categoriasGasto,
  movimientos,
  presupuesto,
  checklistTodos,
  prestamos,
  tarjetas,
  estrategiaDeudas,
  metasAhorro,
  cuentas,
  activos,
  seguros,
  onNavigate,
}) {
  const [mundoSeleccionado, setMundoSeleccionado] = useState(null);
  const [mundosPremiados, setMundosPremiados] = useState(null); // null = aún no cargado

  const mundos = useMemo(
    () =>
      calcularMapaProgreso({
        fuentesIngreso,
        categoriasGasto,
        movimientos,
        presupuesto,
        checklistTodos,
        prestamos,
        tarjetas,
        estrategiaDeudas,
        metasAhorro,
        cuentas,
        activos,
        seguros,
      }),
    [fuentesIngreso, categoriasGasto, movimientos, presupuesto, checklistTodos, prestamos, tarjetas, estrategiaDeudas, metasAhorro, cuentas, activos, seguros]
  );

  useEffect(() => {
    const unsub = watchMundosPremiados(setMundosPremiados, () => setMundosPremiados([]));
    return () => unsub && unsub();
  }, []);

  // Cuando un mundo se completa por primera vez (y todavía no se le había
  // otorgado el premio), le da una cantidad considerable de puntos —
  // premiarMundoCompletado ya se encarga de no duplicar si ya se otorgó.
  useEffect(() => {
    if (mundosPremiados === null) return; // aún cargando, evita otorgar de más
    for (const mundo of mundos) {
      if (mundo.completado && !mundosPremiados.includes(mundo.id)) {
        premiarMundoCompletado(mundo.id, mundo.puntos, mundo.nombre).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mundos, mundosPremiados]);

  const completados = mundos.filter((m) => m.completado).length;

  const puntosPath = POSICIONES.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <style>{`
        @keyframes despensa-mapa-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      <div style={{ marginBottom: 16 }}>
        <div className="despensa-tab-font" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Mapa de progreso financiero
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          {completados} de {mundos.length} mundos completados — supera cada reto para desbloquear el siguiente.
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 6",
          maxWidth: 420,
          margin: "0 auto",
          background: "linear-gradient(180deg, var(--sage-bg) 0%, var(--card) 100%)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <polyline points={puntosPath} fill="none" stroke="var(--line)" strokeWidth="1.2" strokeDasharray="2,2" strokeLinecap="round" />
        </svg>

        {mundos.map((mundo, i) => {
          const pos = POSICIONES[i];
          return (
            <button
              key={mundo.id}
              onClick={() => !mundo.bloqueado && setMundoSeleccionado(mundo)}
              disabled={mundo.bloqueado}
              title={mundo.nombre}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: mundo.esActual ? "3px solid var(--sage)" : mundo.completado ? "3px solid var(--amber)" : "2px solid var(--line)",
                background: mundo.bloqueado ? "var(--paper)" : "var(--card)",
                boxShadow: mundo.esActual ? "0 0 0 6px var(--sage-bg)" : "0 2px 6px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                cursor: mundo.bloqueado ? "not-allowed" : "pointer",
                opacity: mundo.bloqueado ? 0.5 : 1,
                padding: 0,
              }}
            >
              {mundo.bloqueado ? (
                <Lock size={20} style={{ color: "var(--ink-soft)" }} />
              ) : mundo.completado ? (
                <span style={{ position: "relative" }}>
                  {EMOJIS_MUNDO[i]}
                  <span
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -8,
                      background: "var(--amber)",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={11} style={{ color: "#fff" }} />
                  </span>
                </span>
              ) : (
                EMOJIS_MUNDO[i]
              )}
              {mundo.esActual && (
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 26, animation: "despensa-mapa-bounce 1.1s ease-in-out infinite" }}>🧑</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "var(--sage)",
                      marginTop: -2,
                    }}
                  >
                    <MapPin size={10} /> Estás aquí
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {mundos.map((mundo, i) => (
          <button
            key={mundo.id}
            onClick={() => !mundo.bloqueado && setMundoSeleccionado(mundo)}
            disabled={mundo.bloqueado}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "var(--card)",
              border: `1px solid ${mundo.esActual ? "var(--sage)" : "var(--line)"}`,
              borderRadius: 10,
              cursor: mundo.bloqueado ? "not-allowed" : "pointer",
              opacity: mundo.bloqueado ? 0.55 : 1,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18 }}>{EMOJIS_MUNDO[i]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{mundo.nombre}</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                {mundo.bloqueado ? "Bloqueado" : `${mundo.pasosCompletos}/${mundo.totalPasos} pasos`}
                {!mundo.bloqueado && !mundo.completado && ` · ${mundo.puntos} pts al completar`}
              </div>
            </div>
            {mundo.completado && <Check size={16} style={{ color: "var(--amber)" }} />}
            {mundo.bloqueado && <Lock size={14} style={{ color: "var(--ink-soft)" }} />}
          </button>
        ))}
      </div>

      {mundoSeleccionado && (
        <div
          onClick={() => setMundoSeleccionado(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 20,
              maxWidth: 380,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{EMOJIS_MUNDO[mundos.indexOf(mundoSeleccionado)]}</span>
                <span className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700 }}>{mundoSeleccionado.nombre}</span>
              </div>
              <button
                onClick={() => setMundoSeleccionado(null)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>

            {mundoSeleccionado.niveles.map((nivel, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: nivel.completo ? "var(--sage-bg)" : "var(--paper)",
                    color: nivel.completo ? "var(--sage)" : "var(--ink-soft)",
                    border: `1px solid ${nivel.completo ? "var(--sage)" : "var(--line)"}`,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {nivel.completo ? <Check size={12} /> : <span style={{ fontSize: 10 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: nivel.completo ? "var(--ink)" : "var(--ink-soft)", fontWeight: 500 }}>{nivel.nombre}</div>
                  {!nivel.completo && nivel.accion && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>{nivel.accion}</div>
                  )}
                </div>
                {!nivel.completo && nivel.tab && onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate(nivel.tab);
                      setMundoSeleccionado(null);
                    }}
                    style={{ flexShrink: 0, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)", border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Ir ahora
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0 0", marginTop: 4 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: mundoSeleccionado.jefe.completo ? "var(--amber-bg)" : "var(--paper)",
                  color: mundoSeleccionado.jefe.completo ? "var(--amber)" : "var(--ink-soft)",
                  border: `1px solid ${mundoSeleccionado.jefe.completo ? "var(--amber)" : "var(--line)"}`,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {mundoSeleccionado.jefe.completo ? <Check size={13} /> : <span style={{ fontSize: 11 }}>👑</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: mundoSeleccionado.jefe.completo ? "var(--ink)" : "var(--ink-soft)" }}>
                  {mundoSeleccionado.jefe.nombre}
                </div>
                {!mundoSeleccionado.jefe.completo && mundoSeleccionado.jefe.accion && (
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>{mundoSeleccionado.jefe.accion}</div>
                )}
              </div>
              {!mundoSeleccionado.jefe.completo && mundoSeleccionado.jefe.tab && onNavigate && (
                <button
                  onClick={() => {
                    onNavigate(mundoSeleccionado.jefe.tab);
                    setMundoSeleccionado(null);
                  }}
                  style={{ flexShrink: 0, padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "var(--amber-bg)", color: "var(--amber)", border: "none", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Ir ahora
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
