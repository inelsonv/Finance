import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  RotateCw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Eye,
  Box,
  Compass,
  LayoutGrid
} from "lucide-react";

// 18 fotogramas del render 3D de estudio de la Honda CR-V 2014 Blanca
// correspondientes exactamente al modelo 3D de alta fidelidad solicitado por el usuario
const TOTAL_FRAMES = 18;

function getFrameUrl(index) {
  const num = String(index + 1).padStart(2, "0");
  const baseUrl = import.meta.env.BASE_URL || "/";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return `${cleanBase}crv3d/frame-${num}.jpg`;
}

// Ángulos clave con sus nombres descriptivos
export const ANGULOS_PREESTABLECIDOS = [
  { id: "hero", titulo: "Frontal 3/4", frame: 0, descripcion: "Perspectiva principal y parrilla aerodinámica" },
  { id: "lateral", titulo: "Lateral", frame: 4, descripcion: "Perfil SUV, rines de aleación y molduras inferiores" },
  { id: "cenital", titulo: "Ángulo Cenital", frame: 7, descripcion: "Vista superior, techo y barras longitudinales" },
  { id: "trasero34", titulo: "Trasero 3/4", frame: 9, descripcion: "Luces verticales emblemáticas y portón posterior" },
  { id: "trasero", titulo: "Trasera", frame: 13, descripcion: "Vista posterior completa y moldura cromada" },
  { id: "frontal", titulo: "Frontal", frame: 17, descripcion: "Parrilla cromada de 3 barras y faros proyectores" },
];

export const COLORES_VEHICULO = [
  { id: "blanco", nombre: "Blanco Perla (CR-V 2014)", hex: "#f4f5f8", metalness: 0.15, roughness: 0.2 },
  { id: "plata", nombre: "Plata Alabaster", hex: "#c7cbd1", metalness: 0.5, roughness: 0.25 },
  { id: "negro", nombre: "Negro Cristal", hex: "#18191c", metalness: 0.3, roughness: 0.15 },
  { id: "azul", nombre: "Azul Obsidiana", hex: "#1e375a", metalness: 0.4, roughness: 0.2 },
  { id: "rojo", nombre: "Rojo Vasco Perla", hex: "#8c1d28", metalness: 0.35, roughness: 0.2 },
];

export default function Vehiculo3DViewer({
  nombreVehiculo = "Honda CR-V 2014",
  colorInicial = "blanco",
  matricula = "",
  anio = "2014",
  onClose,
  esModal = false,
}) {
  // Pestañas principales: 'turntable' (giro 3D realista 360°), 'cuadricula' (vista múltiple como la imagen de referencia), 'webgl' (Three.js)
  const [modo, setModo] = useState("turntable");

  // Estado del Turntable 360° interactivo
  const [frameActual, setFrameActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [autoGiro, setAutoGiro] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Arrastre con ratón / touch
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startFrameRef = useRef(0);
  const autoGiroIntervalRef = useRef(null);

  // Pre-cargar todos los 18 fotogramas en memoria para rotación a 60 FPS sin parpadeos
  useEffect(() => {
    let cargados = 0;
    const imagenes = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new window.Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        cargados++;
        if (cargados >= TOTAL_FRAMES) {
          setCargando(false);
        }
      };
      img.onerror = () => {
        cargados++;
        if (cargados >= TOTAL_FRAMES) {
          setCargando(false);
        }
      };
      imagenes.push(img);
    }

    return () => {
      imagenes.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  // Manejo de Auto-Giro 360°
  useEffect(() => {
    if (autoGiro && modo === "turntable") {
      autoGiroIntervalRef.current = setInterval(() => {
        setFrameActual((f) => (f + 1) % TOTAL_FRAMES);
      }, 140);
    } else {
      if (autoGiroIntervalRef.current) clearInterval(autoGiroIntervalRef.current);
    }
    return () => {
      if (autoGiroIntervalRef.current) clearInterval(autoGiroIntervalRef.current);
    };
  }, [autoGiro, modo]);

  // Controles de ratón para rotación continua 360°
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startFrameRef.current = frameActual;
    if (autoGiro) setAutoGiro(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    // Cada ~25px de movimiento horizontal avanza un fotograma de rotación
    const framesDiff = Math.round(deltaX / 25);
    let nuevoFrame = (startFrameRef.current + framesDiff) % TOTAL_FRAMES;
    while (nuevoFrame < 0) nuevoFrame += TOTAL_FRAMES;
    setFrameActual(nuevoFrame);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Soporte táctil para smartphones y tablets
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      startXRef.current = e.touches[0].clientX;
      startFrameRef.current = frameActual;
      if (autoGiro) setAutoGiro(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const framesDiff = Math.round(deltaX / 22);
    let nuevoFrame = (startFrameRef.current + framesDiff) % TOTAL_FRAMES;
    while (nuevoFrame < 0) nuevoFrame += TOTAL_FRAMES;
    setFrameActual(nuevoFrame);
  };

  // Ángulo en grados aproximado
  const gradosRotacion = Math.round((frameActual / TOTAL_FRAMES) * 360);

  // Información del ángulo actual
  const presetActivo = useMemo(() => {
    return (
      ANGULOS_PREESTABLECIDOS.find((p) => Math.abs(p.frame - frameActual) <= 1) || {
        titulo: `Ángulo ${gradosRotacion}°`,
        descripcion: "Vista interactiva en 360° de la Honda CR-V 2014 Blanca",
      }
    );
  }, [frameActual, gradosRotacion]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: esModal ? 0 : 12,
        overflow: "hidden",
        background: "linear-gradient(180deg, #5b5e64 0%, #46484d 100%)",
        border: esModal ? "none" : "1px solid var(--line)",
        userSelect: "none",
        boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
        color: "#fff",
      }}
    >
      {/* Barra superior con navegación de modos y título */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(35,37,42,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
          flexWrap: "wrap",
          gap: 8,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setModo("turntable")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: modo === "turntable" ? "var(--sage)" : "rgba(255,255,255,0.08)",
              color: modo === "turntable" ? "#fff" : "rgba(255,255,255,0.85)",
              border: modo === "turntable" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCw size={13} />
            Rotación 360° con Mouse
          </button>

          <button
            onClick={() => setModo("cuadricula")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: modo === "cuadricula" ? "var(--sage)" : "rgba(255,255,255,0.08)",
              color: modo === "cuadricula" ? "#fff" : "rgba(255,255,255,0.85)",
              border: modo === "cuadricula" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <LayoutGrid size={13} />
            Mosaico de Ángulos de Estudio
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar vista 3D"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* MODO 1: TURNTABLE 360° INTERACTIVO CON ROTACIÓN DE RATÓN */}
      {modo === "turntable" && (
        <div style={{ position: "relative", width: "100%", minHeight: 380, height: 420 }}>
          {/* Contenedor de la imagen con rotación por arrastre */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isDraggingRef.current ? "grabbing" : "grab",
              overflow: "hidden",
              position: "relative",
              background: "radial-gradient(circle at center, #6b6e74 0%, #4a4c52 100%)",
            }}
          >
            <img
              src={getFrameUrl(frameActual)}
              alt={`Honda CR-V 2014 Blanca - ${presetActivo.titulo}`}
              style={{
                maxWidth: "92%",
                maxHeight: "92%",
                objectFit: "contain",
                transform: `scale(${zoom})`,
                transition: isDraggingRef.current ? "none" : "transform 0.15s ease",
                pointerEvents: "none",
                filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.35))",
              }}
              draggable={false}
            />

            {/* Flechas directas de paso a paso */}
            <button
              onClick={() => {
                if (autoGiro) setAutoGiro(false);
                setFrameActual((f) => (f - 1 + TOTAL_FRAMES) % TOTAL_FRAMES);
              }}
              title="Girar a la izquierda"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(20,22,25,0.7)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => {
                if (autoGiro) setAutoGiro(false);
                setFrameActual((f) => (f + 1) % TOTAL_FRAMES);
              }}
              title="Girar a la derecha"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(20,22,25,0.7)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Placa superior izquierda con datos del modelo */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    background: "rgba(15,18,22,0.85)",
                    backdropFilter: "blur(6px)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 6,
                    padding: "4px 9px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Sparkles size={13} style={{ color: "var(--sage)" }} />
                  {nombreVehiculo} Blanca ({anio})
                </span>
                <span
                  style={{
                    background: "var(--sage)",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "3px 7px",
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  Modelo 3D Real
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  background: "rgba(15,18,22,0.6)",
                  padding: "2px 7px",
                  borderRadius: 4,
                  width: "fit-content",
                }}
              >
                {presetActivo.titulo} · {gradosRotacion}°
              </span>
            </div>

            {/* Controles superior derecho: Auto-rotación y zoom */}
            <div
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                zIndex: 10,
              }}
            >
              <button
                onClick={() => setAutoGiro((s) => !s)}
                title={autoGiro ? "Pausar giro automático" : "Iniciar giro automático 360°"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 9px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: autoGiro ? "var(--sage)" : "rgba(15,18,22,0.75)",
                  color: "#fff",
                  border: autoGiro ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                {autoGiro ? <Pause size={12} /> : <Play size={12} />}
                {autoGiro ? "Pausar" : "Auto-Giro"}
              </button>

              <button
                onClick={() => setZoom((z) => (z >= 1.4 ? 1 : z + 0.2))}
                title="Zoom"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  background: "rgba(15,18,22,0.75)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                {zoom > 1 ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
              </button>
            </div>
          </div>

          {/* Barra inferior: Botones de ángulos preestablecidos */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              right: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexWrap: "wrap",
              zIndex: 10,
            }}
          >
            {ANGULOS_PREESTABLECIDOS.map((preset) => {
              const activo = Math.abs(preset.frame - frameActual) <= 1;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (autoGiro) setAutoGiro(false);
                    setFrameActual(preset.frame);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: activo ? 700 : 500,
                    background: activo ? "var(--sage)" : "rgba(20,24,28,0.8)",
                    color: activo ? "#fff" : "rgba(255,255,255,0.85)",
                    border: activo ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    backdropFilter: "blur(6px)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {preset.titulo}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODO 2: MOSAICO DE ÁNGULOS DE ESTUDIO (COMO EN LA IMAGEN DE REFERENCIA DEL USUARIO) */}
      {modo === "cuadricula" && (
        <div style={{ padding: 16, background: "radial-gradient(circle at center, #5d6067 0%, #414348 100%)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <LayoutGrid size={15} style={{ color: "var(--sage)" }} />
            Vistas de Estudio 3D · Honda CR-V 2014 Blanca (4 Perspectivas)
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {[
              { titulo: "1. Perfil Lateral Completo", frame: 4, desc: "Líneas de carrocería y rines 17\"" },
              { titulo: "2. Cenital 3/4 Posterior", frame: 7, desc: "Techo, spoiler y barras superiores" },
              { titulo: "3. Trasero 3/4 Ángulo Bajo", frame: 9, desc: "Luces verticales y portón trasero" },
              { titulo: "4. Frontal 3/4 Perspectiva", frame: 0, desc: "Parrilla cromada y faros proyectores" },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setFrameActual(item.frame);
                  setModo("turntable");
                }}
                style={{
                  background: "rgba(25,28,32,0.65)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.18s ease, border-color 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "var(--sage)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
              >
                <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>{item.titulo}</span>
                  <span style={{ fontSize: 9.5, color: "var(--sage)", fontWeight: 600 }}>Toca para rotar</span>
                </div>
                <div style={{ padding: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#4a4c52", height: 160 }}>
                  <img
                    src={getFrameUrl(item.frame)}
                    alt={item.titulo}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" }}
                    draggable={false}
                  />
                </div>
                <div style={{ padding: "6px 12px", fontSize: 10.5, color: "rgba(255,255,255,0.7)" }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button
              onClick={() => setModo("turntable")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              <RotateCw size={14} />
              Volver a Rotar 360° con el Ratón
            </button>
          </div>
        </div>
      )}

      {/* Pie de controles: Indicador de uso */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "rgba(25,27,31,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontSize: 11,
          color: "rgba(255,255,255,0.75)",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RotateCw size={11} style={{ color: "var(--sage)" }} />
          Haz clic y <b>arrastra con el mouse hacia los lados</b> para rotar los 360° de la camioneta
        </span>
        <span style={{ fontFamily: "monospace", color: "var(--sage)", fontWeight: 600 }}>
          Fotograma {frameActual + 1} de {TOTAL_FRAMES} (360°)
        </span>
      </div>
    </div>
  );
}
