import React, { useEffect, useMemo, useState } from "react";
import {
  Lock,
  Check,
  MapPin,
  X,
  Crown,
  Flame,
  Heart,
  Sparkles,
  ChevronRight,
  Trophy,
  Zap,
  Shield,
  Target,
  Award,
  Gem,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { calcularMapaProgreso } from "../lib/mapaProgreso";
import { watchMundosPremiados, premiarMundoCompletado } from "../lib/db";
import { calcularRacha } from "../lib/racha";
import { calcularRachaHabito } from "../lib/rachaHabito";

// Iconografía temática para cada uno de los 10 mundos del camino Duolingo
const MUNDOS_CONFIG = [
  { emoji: "🌱", color: "#58cc02", shadowColor: "#46a302", label: "Primeros pasos" },
  { emoji: "🎯", color: "#ce82ff", shadowColor: "#a556d8", label: "Presupuesto" },
  { emoji: "⚔️", color: "#ce82ff", shadowColor: "#a556d8", label: "Caza de gastos" },
  { emoji: "🛡️", color: "#1cb0f6", shadowColor: "#1899d6", label: "Fondo ahorro" },
  { emoji: "💳", color: "#00cd9c", shadowColor: "#00a37b", label: "Anti-deuda" },
  { emoji: "📈", color: "#00cd9c", shadowColor: "#00a37b", label: "Inversión" },
  { emoji: "🏛️", color: "#1cb0f6", shadowColor: "#1899d6", label: "Patrimonio" },
  { emoji: "🧭", color: "#ff9600", shadowColor: "#d87f00", label: "Protección" },
  { emoji: "⚡", color: "#ff9600", shadowColor: "#d87f00", label: "Piloto auto" },
  { emoji: "🏆", color: "#ffc800", shadowColor: "#d8a000", label: "Libertad fin." },
];

// Estructura visual de filas al estilo exacto del árbol de lecciones de Duolingo:
// Fila 0: 1 nodo centrado (Mundo 1)
// Fila 1: 2 nodos lado a lado (Mundo 2, Mundo 3)
// Fila 2: 1 nodo centrado (Mundo 4)
// Fila 3: 3 nodos (Mundo 5, Mundo 6, Mundo 7)
// Fila 4: 1 nodo centrado (Mundo 8)
// Fila 5: 2 nodos lado a lado (Mundo 9, Mundo 10)
const FILAS_LAYOUT = [
  { mundos: [0], justify: "center" },
  { mundos: [1, 2], justify: "space-around" },
  { mundos: [3], justify: "center" },
  { mundos: [4, 5, 6], justify: "space-between" },
  { mundos: [7], justify: "center" },
  { mundos: [8, 9], justify: "space-around" },
];

export default function MapaProgreso({
  fuentesIngreso = [],
  categoriasGasto = [],
  movimientos = [],
  presupuesto = {},
  checklistTodos = [],
  prestamos = [],
  tarjetas = [],
  estrategiaDeudas = {},
  metasAhorro = [],
  cuentas = [],
  activos = [],
  seguros = [],
  puntos = {},
  recompensas = {},
  habitos = [],
  habitosRegistro = {},
  onNavigate,
}) {
  const [mundoSeleccionado, setMundoSeleccionado] = useState(null);
  const [mundosPremiados, setMundosPremiados] = useState(null);
  const [showPlusModal, setShowPlusModal] = useState(false);

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

  // Premiar automáticamente cuando se completa un mundo por primera vez
  useEffect(() => {
    if (mundosPremiados === null) return;
    for (const mundo of mundos) {
      if (mundo.completado && !mundosPremiados.includes(mundo.id)) {
        premiarMundoCompletado(mundo.id, mundo.puntos, mundo.nombre).catch(() => {});
      }
    }
  }, [mundos, mundosPremiados]);

  const completados = useMemo(() => mundos.filter((m) => m.completado).length, [mundos]);

  // Cálculo de racha (máximo entre quincenas y hábitos para mostrar el valor más alto alcanzado)
  const rachaQuincenas = useMemo(() => calcularRacha(checklistTodos), [checklistTodos]);
  const rachaHabitos = useMemo(() => {
    if (!habitos?.length) return 0;
    return habitos.reduce((max, h) => {
      const fechas = h.registro || habitosRegistro[h.id] || [];
      const r = calcularRachaHabito(fechas, h.frecuencia || "Diaria");
      return Math.max(max, r);
    }, 0);
  }, [habitos, habitosRegistro]);

  const racha = Math.max(rachaQuincenas, rachaHabitos, 1);
  const coronas = completados;
  const vidas = recompensas?.protectoresRacha ?? 1;
  const puntosTotal = puntos?.puntosTotal ?? (completados * 150);

  const mundoActual = useMemo(() => mundos.find((m) => m.esActual) || mundos[0], [mundos]);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 40 }}>
      <style>{`
        @keyframes duolingoBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes flamePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255,150,0,0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(255,150,0,0.8)); }
        }
        @keyframes crownShine {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        .duo-bounce {
          animation: duolingoBounce 1.2s ease-in-out infinite;
        }
        .duo-flame-anim {
          animation: flamePulse 1.8s ease-in-out infinite;
        }
        .duo-btn-3d {
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .duo-btn-3d:active:not(:disabled) {
          transform: translateY(4px) !important;
          box-shadow: 0 2px 0 var(--btn-shadow) !important;
        }
      `}</style>

      {/* 1. BARRA SUPERIOR EXACTA A DUOLINGO (Bandera, Coronas, Racha 🔥, Vidas ❤️, Gemas 💎) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--card, #ffffff)",
          borderBottom: "2px solid var(--line, #e5e5e5)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          borderRadius: "0 0 16px 16px",
          marginBottom: 16,
        }}
      >
        {/* Bandera / Emblema */}
        <div
          style={{
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
          }}
          title="Smart Finance República Dominicana"
        >
          🇩🇴
        </div>

        {/* Coronas (Mundos completados) */}
        <div
          onClick={() => onNavigate && onNavigate("puntos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 12,
            transition: "background 0.15s ease",
          }}
          title={`${coronas} mundos completados de ${mundos.length}`}
        >
          <Crown size={22} style={{ color: "#ffc800", fill: "#ffc800", filter: "drop-shadow(0 1px 2px rgba(255,200,0,0.4))" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffc800", fontFamily: "var(--font-mono, monospace)" }}>
            {coronas}
          </span>
        </div>

        {/* Racha 🔥 (con animación y destacado idéntico a la imagen) */}
        <div
          onClick={() => onNavigate && onNavigate("habitos")}
          className="duo-flame-anim"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            padding: "4px 10px",
            borderRadius: 14,
            background: "rgba(255,150,0,0.12)",
            border: "1.5px solid rgba(255,150,0,0.35)",
          }}
          title={`Racha activa: ${racha} ${racha === 1 ? "día/quincena" : "días/quincenas"} seguidos`}
        >
          <Flame size={24} style={{ color: "#ff9600", fill: "#ff9600" }} />
          <span style={{ fontSize: 17, fontWeight: 900, color: "#ff9600", fontFamily: "var(--font-mono, monospace)" }}>
            {racha}
          </span>
        </div>

        {/* Vidas ❤️ (Protectores de racha disponibles) */}
        <div
          onClick={() => setShowPlusModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 12,
          }}
          title={`${vidas} protector${vidas !== 1 ? "es" : ""} de racha disponibles`}
        >
          <Heart size={21} style={{ color: "#ff4b4b", fill: "#ff4b4b" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ff4b4b", fontFamily: "var(--font-mono, monospace)" }}>
            {vidas}
          </span>
        </div>

        {/* Gemas / Puntos 💎 */}
        <div
          onClick={() => onNavigate && onNavigate("puntos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 12,
          }}
          title={`${puntosTotal} puntos acumulados`}
        >
          <Gem size={20} style={{ color: "#1cb0f6", fill: "#1cb0f6" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "#1cb0f6", fontFamily: "var(--font-mono, monospace)" }}>
            {puntosTotal}
          </span>
        </div>
      </div>

      {/* 2. ENCABEZADO DE UNIDAD ESTILO DUOLINGO CON MASCOTA "PLUS" FLOTANTE */}
      <div style={{ position: "relative", marginBottom: 26, padding: "0 6px" }}>
        {/* Banner de Unidad */}
        <div
          style={{
            background: "linear-gradient(135deg, #58cc02 0%, #46a302 100%)",
            color: "#ffffff",
            borderRadius: 18,
            padding: "16px 18px",
            boxShadow: "0 6px 0 #337a01, 0 8px 18px rgba(88,204,2,0.3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.9,
                  marginBottom: 3,
                }}
              >
                Sección 1 · Fundamentos
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                Ruta de Dominio Financiero
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.95, marginTop: 4 }}>
                {completados} de {mundos.length} mundos completados
              </div>
            </div>

            {/* Guía rápida / info */}
            <button
              onClick={() => {
                if (mundoActual) setMundoSeleccionado(mundoActual);
              }}
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "2px solid rgba(255,255,255,0.45)",
                color: "#ffffff",
                borderRadius: 12,
                padding: "6px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                backdropFilter: "blur(4px)",
              }}
            >
              <span>Continuar</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Barra de progreso de la unidad */}
          <div style={{ marginTop: 12, height: 7, background: "rgba(0,0,0,0.2)", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.round((completados / mundos.length) * 100)}%`,
                background: "#ffc800",
                borderRadius: 6,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Mascota PLUS flotante (como en el screenshot superior derecho) */}
        <div
          onClick={() => setShowPlusModal(true)}
          style={{
            position: "absolute",
            top: -12,
            right: 14,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
            zIndex: 10,
          }}
          title="Smart Finance PLUS / Recompensas"
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1cb0f6 0%, #0077b6 100%)",
              border: "3px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🤖
          </div>
          <span
            style={{
              marginTop: -6,
              background: "#1cb0f6",
              color: "#ffffff",
              fontSize: 9.5,
              fontWeight: 900,
              padding: "1px 6px",
              borderRadius: 8,
              border: "1.5px solid #ffffff",
              letterSpacing: "0.05em",
            }}
          >
            PLUS
          </span>
        </div>
      </div>

      {/* 3. CAMINO DE LECCIONES DUOLINGO (BOTONES CIRCULARES 3D Y CURVAS) */}
      <div style={{ position: "relative", padding: "10px 10px 40px" }}>
        {FILAS_LAYOUT.map((fila, filaIdx) => (
          <div
            key={filaIdx}
            style={{
              display: "flex",
              justifyContent: fila.justify,
              alignItems: "center",
              marginBottom: 44,
              position: "relative",
            }}
          >
            {fila.mundos.map((mundoIndex) => {
              const mundo = mundos[mundoIndex];
              if (!mundo) return null;
              const cfg = MUNDOS_CONFIG[mundoIndex] || MUNDOS_CONFIG[0];

              const esActivo = mundo.esActual;
              const esCompletado = mundo.completado;
              const esBloqueado = mundo.bloqueado;

              // Paleta de color 3D al estilo Duolingo
              const bgBtn = esBloqueado
                ? "var(--line, #e5e5e5)"
                : cfg.color;
              const shadowBtn = esBloqueado
                ? "var(--line-soft, #afafaf)"
                : cfg.shadowColor;

              const pctPasos = mundo.totalPasos ? Math.round((mundo.pasosCompletos / mundo.totalPasos) * 100) : 0;

              return (
                <div
                  key={mundo.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    width: fila.mundos.length === 1 ? "100%" : fila.mundos.length === 2 ? "45%" : "30%",
                  }}
                >
                  {/* Bouncing Pointer para el nivel actual ("¡AQUÍ!" / "START") */}
                  {esActivo && (
                    <div
                      className="duo-bounce"
                      style={{
                        position: "absolute",
                        top: -38,
                        zIndex: 20,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          background: "#ffffff",
                          color: "#58cc02",
                          border: "2px solid #58cc02",
                          fontSize: 10.5,
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: 10,
                          boxShadow: "0 3px 6px rgba(0,0,0,0.12)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ¡EMPIEZA AQUÍ!
                      </div>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderRight: "6px solid transparent",
                          borderTop: "6px solid #58cc02",
                          marginTop: -1,
                        }}
                      />
                    </div>
                  )}

                  {/* Botón Circular 3D Duolingo */}
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    {/* Anillo de progreso concéntrico (solo activo o en curso) */}
                    {esActivo && (
                      <svg
                        style={{
                          position: "absolute",
                          inset: -7,
                          width: 94,
                          height: 94,
                          transform: "rotate(-90deg)",
                          pointerEvents: "none",
                        }}
                      >
                        <circle
                          cx="47"
                          cy="47"
                          r="42"
                          stroke="var(--line, #e5e5e5)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          cx="47"
                          cy="47"
                          r="42"
                          stroke="#58cc02"
                          strokeWidth="5"
                          strokeDasharray="264"
                          strokeDashoffset={264 - (264 * Math.max(pctPasos, 15)) / 100}
                          strokeLinecap="round"
                          fill="none"
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                    )}

                    <button
                      onClick={() => !esBloqueado && setMundoSeleccionado(mundo)}
                      disabled={esBloqueado}
                      className="duo-btn-3d"
                      title={`${mundo.nombre} (${mundo.pasosCompletos}/${mundo.totalPasos})`}
                      style={{
                        "--btn-shadow": shadowBtn,
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: bgBtn,
                        boxShadow: `0 8px 0 ${shadowBtn}, 0 10px 14px rgba(0,0,0,0.12)`,
                        border: "none",
                        cursor: esBloqueado ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 34,
                        padding: 0,
                        position: "relative",
                        outline: "none",
                        filter: esBloqueado ? "grayscale(0.6) opacity(0.85)" : "none",
                      }}
                    >
                      {esBloqueado ? (
                        <Lock size={28} strokeWidth={2.4} style={{ color: "#8a96a3" }} />
                      ) : (
                        <span style={{ transform: "translateY(-2px)" }}>{cfg.emoji}</span>
                      )}
                    </button>

                    {/* Corona dorada al completar el nivel (idéntico a Basics 1 en el screenshot) */}
                    {esCompletado && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -3,
                          right: -3,
                          background: "#ffc800",
                          color: "#784a00",
                          borderRadius: 12,
                          padding: "2px 5px",
                          boxShadow: "0 3px 0 #cc9b00",
                          border: "2px solid #ffffff",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          fontSize: 10,
                          fontWeight: 900,
                          zIndex: 10,
                        }}
                      >
                        <Crown size={12} style={{ fill: "#784a00" }} />
                        <span>{mundo.niveles.length + 1}</span>
                      </div>
                    )}

                    {/* Indicador de pasos si está en curso */}
                    {!esCompletado && !esBloqueado && pctPasos > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -3,
                          right: -3,
                          background: "#ffffff",
                          color: "#58cc02",
                          borderRadius: 12,
                          padding: "1px 5px",
                          boxShadow: "0 2px 0 rgba(0,0,0,0.1)",
                          border: "2px solid #58cc02",
                          fontSize: 9.5,
                          fontWeight: 900,
                          zIndex: 10,
                        }}
                      >
                        {mundo.pasosCompletos}/{mundo.totalPasos}
                      </div>
                    )}
                  </div>

                  {/* Nombre de la lección / mundo bajo el círculo */}
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      color: esBloqueado ? "var(--ink-soft, #8a96a3)" : "var(--ink, #3c3c3c)",
                      textAlign: "center",
                      letterSpacing: "-0.01em",
                      maxWidth: 110,
                      lineHeight: 1.2,
                    }}
                  >
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 4. MODAL DETALLE DE RETO ESTILO DUOLINGO */}
      {mundoSeleccionado && (
        <div
          onClick={() => setMundoSeleccionado(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card, #ffffff)",
              border: "2px solid var(--line, #e5e5e5)",
              borderRadius: 24,
              padding: 22,
              maxWidth: 420,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Header del modal con color temático */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: MUNDOS_CONFIG[mundos.indexOf(mundoSeleccionado)]?.color || "#58cc02",
                    boxShadow: `0 4px 0 ${MUNDOS_CONFIG[mundos.indexOf(mundoSeleccionado)]?.shadowColor || "#46a302"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                  }}
                >
                  {MUNDOS_CONFIG[mundos.indexOf(mundoSeleccionado)]?.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "#1cb0f6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Mundo {mundos.indexOf(mundoSeleccionado) + 1}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                    {mundoSeleccionado.nombre}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMundoSeleccionado(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--line-soft, #f4f4f4)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Progreso del mundo */}
            <div style={{ background: "var(--paper, #f7f9fa)", padding: "12px 14px", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: "var(--ink-soft)" }}>Progreso del reto</span>
                <span style={{ color: "#58cc02" }}>
                  {mundoSeleccionado.pasosCompletos} de {mundoSeleccionado.totalPasos} niveles
                </span>
              </div>
              <div style={{ height: 8, background: "var(--line, #e5e5e5)", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((mundoSeleccionado.pasosCompletos / mundoSeleccionado.totalPasos) * 100)}%`,
                    background: "#58cc02",
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>

            {/* Lista de pasos / niveles intermedios */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pasos para superar este mundo
              </div>

              {mundoSeleccionado.niveles.map((nivel, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: nivel.completo ? "rgba(88,204,2,0.08)" : "var(--card)",
                    border: `1.5px solid ${nivel.completo ? "#58cc02" : "var(--line)"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: nivel.completo ? "#58cc02" : "var(--line-soft)",
                        color: nivel.completo ? "#ffffff" : "var(--ink-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {nivel.completo ? <Check size={13} strokeWidth={3} /> : idx + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{nivel.nombre}</div>
                      {!nivel.completo && nivel.accion && (
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{nivel.accion}</div>
                      )}
                    </div>
                  </div>

                  {!nivel.completo && nivel.tab && onNavigate && (
                    <button
                      onClick={() => {
                        onNavigate(nivel.tab);
                        setMundoSeleccionado(null);
                      }}
                      style={{
                        background: "#1cb0f6",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 10,
                        padding: "6px 12px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 3px 0 #1899d6",
                      }}
                    >
                      Ir ahora
                    </button>
                  )}
                </div>
              ))}

              {/* Reto del Jefe Final (Corona) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: mundoSeleccionado.jefe.completo ? "rgba(255,200,0,0.12)" : "rgba(255,200,0,0.05)",
                  border: `2px solid ${mundoSeleccionado.jefe.completo ? "#ffc800" : "rgba(255,200,0,0.3)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#ffc800",
                      color: "#784a00",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 0 #cc9b00",
                    }}
                  >
                    <Crown size={15} style={{ fill: "#784a00" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>
                      👑 Reto del jefe: {mundoSeleccionado.jefe.nombre}
                    </div>
                    {!mundoSeleccionado.jefe.completo && mundoSeleccionado.jefe.accion && (
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                        {mundoSeleccionado.jefe.accion}
                      </div>
                    )}
                  </div>
                </div>

                {!mundoSeleccionado.jefe.completo && mundoSeleccionado.jefe.tab && onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate(mundoSeleccionado.jefe.tab);
                      setMundoSeleccionado(null);
                    }}
                    style={{
                      background: "#ffc800",
                      color: "#784a00",
                      border: "none",
                      borderRadius: 10,
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 3px 0 #cc9b00",
                    }}
                  >
                    Vencer jefe
                  </button>
                )}
              </div>
            </div>

            {/* Botón principal verde 3D estilo Duolingo */}
            <button
              onClick={() => {
                const primerIncompleto = mundoSeleccionado.niveles.find((n) => !n.completo) || (!mundoSeleccionado.jefe.completo ? mundoSeleccionado.jefe : null);
                if (primerIncompleto?.tab && onNavigate) {
                  onNavigate(primerIncompleto.tab);
                }
                setMundoSeleccionado(null);
              }}
              className="duo-btn-3d"
              style={{
                "--btn-shadow": "#46a302",
                background: "#58cc02",
                color: "#ffffff",
                border: "none",
                borderRadius: 16,
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.04em",
                cursor: "pointer",
                width: "100%",
                boxShadow: "0 6px 0 #46a302, 0 8px 16px rgba(88,204,2,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <span>{mundoSeleccionado.completado ? "REPASAR MUNDO" : "CONTINUAR APRENDIZAJE"}</span>
              <ArrowRight size={18} strokeWidth={2.8} />
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL MASCOTA SMART FINANCE PLUS */}
      {showPlusModal && (
        <div
          onClick={() => setShowPlusModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card, #ffffff)",
              border: "2px solid var(--line, #e5e5e5)",
              borderRadius: 24,
              padding: 24,
              maxWidth: 380,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 8 }}>🤖✨</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              Smart Finance PLUS
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.4 }}>
              Mantén tu racha activa y desbloquea recompensas especiales al cumplir tus metas financieras.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(255,150,0,0.1)", textAlign: "left" }}>
                <Flame size={22} style={{ color: "#ff9600", fill: "#ff9600" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Racha de {racha} días/quincenas</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Marcando gastos y metas a tiempo</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(255,75,75,0.1)", textAlign: "left" }}>
                <Heart size={22} style={{ color: "#ff4b4b", fill: "#ff4b4b" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{vidas} Protector{vidas !== 1 ? "es" : ""} de racha</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Salva tu racha si se te pasa un día</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(28,176,246,0.1)", textAlign: "left" }}>
                <Gem size={22} style={{ color: "#1cb0f6", fill: "#1cb0f6" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{puntosTotal} Puntos acumulados</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Cofres, multiplicadores y premios</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPlusModal(false);
                if (onNavigate) onNavigate("puntos");
              }}
              className="duo-btn-3d"
              style={{
                "--btn-shadow": "#1899d6",
                background: "#1cb0f6",
                color: "#ffffff",
                border: "none",
                borderRadius: 14,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                width: "100%",
                boxShadow: "0 5px 0 #1899d6",
              }}
            >
              VER PREMIOS Y COFRES
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
