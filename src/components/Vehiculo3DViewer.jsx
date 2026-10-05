import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  RotateCw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  Gauge,
  Fuel,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  LayoutGrid,
  Info,
  Car
} from "lucide-react";

const TOTAL_FRAMES = 18;

function getFrameUrl(index) {
  const num = String(index + 1).padStart(2, "0");
  const baseUrl = import.meta.env.BASE_URL || "/";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return `${cleanBase}crv3d/frame-${num}.jpg`;
}

export const ANGULOS_PREESTABLECIDOS = [
  { id: "hero", titulo: "Frontal 3/4", frame: 0, descripcion: "Perspectiva principal y parrilla aerodinámica" },
  { id: "lateral", titulo: "Lateral", frame: 4, descripcion: "Perfil SUV, rines de aleación y molduras inferiores" },
  { id: "cenital", titulo: "Ángulo Cenital", frame: 7, descripcion: "Vista superior, techo y barras longitudinales" },
  { id: "trasero34", titulo: "Trasero 3/4", frame: 9, descripcion: "Luces verticales emblemáticas y portón posterior" },
  { id: "trasero", titulo: "Trasera", frame: 13, descripcion: "Vista posterior completa y moldura cromada" },
  { id: "frontal", titulo: "Frontal", frame: 17, descripcion: "Parrilla cromada de 3 barras y faros proyectores" },
];

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

function formatDinero(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Vehiculo3DViewer({
  nombreVehiculo = "Honda CR-V 2014",
  colorInicial = "blanco",
  matricula = "",
  anio = "2014",
  activo = null,
  mantenimientos = [],
  seguro = null,
  onRegistrarMantenimiento,
  onClose,
  esModal = false,
}) {
  const [modo, setModo] = useState("turntable"); // 'turntable' | 'cuadricula' | 'ficha'
  const [frameActual, setFrameActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [autoGiro, setAutoGiro] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mostrarHotspots, setMostrarHotspots] = useState(true);
  const [sistemaSeleccionado, setSistemaSeleccionado] = useState(null);

  // Formulario rápido de mantenimiento dentro del visor 3D
  const [mostrarFormMant, setMostrarFormMant] = useState(false);
  const [tipoMantForm, setTipoMantForm] = useState("Cambio de aceite");
  const [costoMantForm, setCostoMantForm] = useState("");
  const [kmMantForm, setKmMantForm] = useState("");
  const [fechaMantForm, setFechaMantForm] = useState(() => new Date().toISOString().slice(0, 10));
  const [notasMantForm, setNotasMantForm] = useState("");
  const [guardandoMant, setGuardandoMant] = useState(false);
  const [mensajeExitoMant, setMensajeExitoMant] = useState(null);

  // Arrastre con ratón / touch
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startFrameRef = useRef(0);
  const autoGiroIntervalRef = useRef(null);

  // Pre-carga de imágenes
  useEffect(() => {
    let cargados = 0;
    const imagenes = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new window.Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        cargados++;
        if (cargados >= TOTAL_FRAMES) setCargando(false);
      };
      img.onerror = () => {
        cargados++;
        if (cargados >= TOTAL_FRAMES) setCargando(false);
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

  // Auto-giro
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

  // Controles de ratón
  const handleMouseDown = (e) => {
    // Si hace clic en un hotspot o botón, no arrastrar
    if (e.target.closest("button") || e.target.closest(".no-drag")) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startFrameRef.current = frameActual;
    if (autoGiro) setAutoGiro(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const framesDiff = Math.round(deltaX / 24);
    let nuevoFrame = (startFrameRef.current + framesDiff) % TOTAL_FRAMES;
    while (nuevoFrame < 0) nuevoFrame += TOTAL_FRAMES;
    setFrameActual(nuevoFrame);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Controles touch
  const handleTouchStart = (e) => {
    if (e.target.closest("button") || e.target.closest(".no-drag")) return;
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

  // Evaluación de Salud y Diagnóstico
  const diasSeguro = seguro?.fechaVencimiento ? diasHasta(seguro.fechaVencimiento) : null;
  const diasProximoMant = activo?.proximoMantenimiento ? diasHasta(activo.proximoMantenimiento) : null;

  // Último cambio de aceite registrado
  const ultimoAceite = useMemo(() => {
    return mantenimientos.find((m) => /aceite/i.test(m.tipo || "")) || null;
  }, [mantenimientos]);

  // Último mantenimiento de frenos / llantas
  const ultimosFrenos = useMemo(() => {
    return mantenimientos.find((m) => /freno|llanta|neumático/i.test(m.tipo || "")) || null;
  }, [mantenimientos]);

  // Cálculo del puntaje de salud del vehículo (0 - 100)
  const puntajeSalud = useMemo(() => {
    let score = 100;
    // Seguro
    if (!seguro) score -= 15;
    else if (diasSeguro != null && diasSeguro < 0) score -= 25;
    else if (diasSeguro != null && diasSeguro <= 15) score -= 10;

    // Próximo mantenimiento
    if (diasProximoMant != null && diasProximoMant < 0) score -= 20;
    else if (diasProximoMant != null && diasProximoMant <= 7) score -= 10;

    // Si nunca ha tenido cambio de aceite registrado
    if (!ultimoAceite) score -= 10;

    return Math.max(20, Math.min(100, score));
  }, [seguro, diasSeguro, diasProximoMant, ultimoAceite]);

  // Estado del Seguro
  const estadoSeguro = useMemo(() => {
    if (!seguro) {
      return {
        tipo: "alerta",
        color: "#d9a441",
        titulo: "Sin seguro registrado",
        subtitulo: "Se recomienda registrar póliza para la Honda CR-V",
        icono: ShieldAlert,
      };
    }
    if (diasSeguro != null && diasSeguro < 0) {
      return {
        tipo: "vencido",
        color: "var(--stamp)",
        titulo: `Seguro vencido (${Math.abs(diasSeguro)}d)`,
        subtitulo: `${seguro.entidadName || "Póliza"} requiere renovación inmediata`,
        icono: ShieldAlert,
      };
    }
    if (diasSeguro != null && diasSeguro <= 30) {
      return {
        tipo: "por-vencer",
        color: "#d9a441",
        titulo: `Vence en ${diasSeguro} días`,
        subtitulo: `${seguro.entidadName || "Seguro"} por vencer`,
        icono: ShieldAlert,
      };
    }
    return {
      tipo: "optimo",
      color: "var(--sage)",
      titulo: `Seguro al día (${diasSeguro != null ? `${diasSeguro}d restantes` : "Vigente"})`,
      subtitulo: `${seguro.entidadName || "Póliza activa"}`,
      icono: ShieldCheck,
    };
  }, [seguro, diasSeguro]);

  // Estado del Motor / Aceite
  const estadoMotor = useMemo(() => {
    if (diasProximoMant != null && diasProximoMant < 0) {
      return {
        tipo: "vencido",
        color: "var(--stamp)",
        titulo: `Mantenimiento vencido (${Math.abs(diasProximoMant)}d)`,
        subtitulo: "Cambio de aceite / inspección de motor requerida",
      };
    }
    if (diasProximoMant != null && diasProximoMant <= 15) {
      return {
        tipo: "proximo",
        color: "#d9a441",
        titulo: `Service en ${diasProximoMant} días`,
        subtitulo: "Próximo cambio de aceite programado",
      };
    }
    if (ultimoAceite) {
      return {
        tipo: "optimo",
        color: "var(--sage)",
        titulo: "Motor y Aceite al día",
        subtitulo: `Último service: ${ultimoAceite.fecha || "Registrado"}`,
      };
    }
    return {
      tipo: "normal",
      color: "var(--sage)",
      titulo: "Motor 2.4L i-VTEC Óptimo",
      subtitulo: "Revisar nivel de aceite 0W-20 sintético",
    };
  }, [diasProximoMant, ultimoAceite]);

  // Estado de Frenos y Llantas
  const estadoFrenos = useMemo(() => {
    if (ultimosFrenos) {
      return {
        color: "var(--sage)",
        titulo: "Frenos y Neumáticos al día",
        subtitulo: `Última revisión: ${ultimosFrenos.fecha || "Registrada"}`,
      };
    }
    return {
      color: "var(--sage)",
      titulo: "Presión 30-32 PSI recomendada",
      subtitulo: "Rines 17\" con pastillas de freno en estado normal",
    };
  }, [ultimosFrenos]);

  // Guardar mantenimiento express desde el 3D
  const handleGuardarMantenimiento = async (e) => {
    e.preventDefault();
    if (!onRegistrarMantenimiento) return;
    setGuardandoMant(true);
    try {
      await onRegistrarMantenimiento({
        tipo: tipoMantForm,
        costo: parseFloat(costoMantForm) || null,
        kilometraje: parseInt(kmMantForm, 10) || null,
        fecha: fechaMantForm,
        notas: notasMantForm.trim() || `Registrado desde el centro de inspección 3D (${nombreVehiculo})`,
      });
      setCostoMantForm("");
      setKmMantForm("");
      setNotasMantForm("");
      setMensajeExitoMant("¡Servicio registrado exitosamente en el historial!");
      setTimeout(() => {
        setMensajeExitoMant(null);
        setMostrarFormMant(false);
      }, 1600);
    } catch (err) {
      alert("Error al registrar: " + (err.message || String(err)));
    } finally {
      setGuardandoMant(false);
    }
  };

  const presetActivo = ANGULOS_PREESTABLECIDOS.find((p) => Math.abs(p.frame - frameActual) <= 1) || {
    titulo: `Giro ${Math.round((frameActual / TOTAL_FRAMES) * 360)}°`,
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: esModal ? 0 : 12,
        overflow: "hidden",
        background: "linear-gradient(180deg, #4d5056 0%, #3a3c42 100%)",
        border: esModal ? "none" : "1px solid var(--line)",
        userSelect: "none",
        boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
        color: "#fff",
      }}
    >
      {/* 1. BARRA SUPERIOR DE SALUD DEL VEHÍCULO & TELEMETRÍA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(25,27,31,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
          flexWrap: "wrap",
          gap: 10,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: puntajeSalud >= 80 ? "rgba(86,171,95,0.2)" : "rgba(217,164,65,0.2)",
              color: puntajeSalud >= 80 ? "var(--sage)" : "#d9a441",
              border: `1px solid ${puntajeSalud >= 80 ? "var(--sage)" : "#d9a441"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {puntajeSalud}%
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{nombreVehiculo}</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                }}
              >
                {matricula || "2014 Blanca"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Salud del Vehículo: <b style={{ color: puntajeSalud >= 80 ? "var(--sage)" : "#d9a441" }}>{puntajeSalud >= 85 ? "Excelente" : puntajeSalud >= 70 ? "Bueno" : "Atención requerida"}</b>
            </div>
          </div>
        </div>

        {/* Botones de Modo */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setMostrarHotspots((s) => !s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: mostrarHotspots ? "rgba(86,171,95,0.25)" : "rgba(255,255,255,0.08)",
              color: mostrarHotspots ? "var(--sage)" : "rgba(255,255,255,0.75)",
              border: mostrarHotspots ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
            }}
          >
            <Info size={12} />
            {mostrarHotspots ? "Puntos Activos" : "Ocultar Puntos"}
          </button>

          <button
            onClick={() => setModo("turntable")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: modo === "turntable" ? "var(--sage)" : "rgba(255,255,255,0.08)",
              color: "#fff",
              border: modo === "turntable" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
            }}
          >
            <RotateCw size={12} />
            3D 360°
          </button>

          <button
            onClick={() => setModo("cuadricula")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: modo === "cuadricula" ? "var(--sage)" : "rgba(255,255,255,0.08)",
              color: "#fff",
              border: modo === "cuadricula" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={12} />
            Mosaico
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Cerrar vista"
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
      </div>

      {/* 2. CHIPS DE ESTADO RÁPIDO (SEGURO, MOTOR, FRENOS, RENDIMIENTO) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "rgba(18,20,24,0.75)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setSistemaSeleccionado("seguro")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: sistemaSeleccionado === "seguro" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${estadoSeguro.color}`,
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoSeguro.color }} />
          🛡️ Seguro: {estadoSeguro.titulo}
        </button>

        <button
          onClick={() => setSistemaSeleccionado("motor")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: sistemaSeleccionado === "motor" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${estadoMotor.color}`,
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoMotor.color }} />
          🛢️ Motor/Aceite: {estadoMotor.titulo}
        </button>

        <button
          onClick={() => setSistemaSeleccionado("frenos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: sistemaSeleccionado === "frenos" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)",
            border: `1px solid ${estadoFrenos.color}`,
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoFrenos.color }} />
          🛞 Frenos & Neumáticos
        </button>

        <button
          onClick={() => setSistemaSeleccionado("rendimiento")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: sistemaSeleccionado === "rendimiento" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Fuel size={12} style={{ color: "var(--sage)" }} />
          23-31 MPG (15.3 Gal)
        </button>

        {onRegistrarMantenimiento && (
          <button
            onClick={() => {
              setMostrarFormMant((s) => !s);
              setSistemaSeleccionado(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              marginLeft: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={12} />
            + Registrar Mantenimiento
          </button>
        )}
      </div>

      {/* 3. VISOR TURNTABLE 360° CON PUNTOS DE INSPECCIÓN FLOTANTES */}
      {modo === "turntable" && (
        <div style={{ position: "relative", width: "100%", minHeight: 380, height: 420 }}>
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
              alt={`${nombreVehiculo} - ${presetActivo.titulo}`}
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

            {/* PUNTOS DE INSPECCIÓN INTERACTIVOS SOBRE EL AUTO */}
            {mostrarHotspots && (
              <>
                {/* Hotspot 1: SEGURO (Sobre parabrisas / cabina) */}
                <div
                  className="no-drag"
                  onClick={() => setSistemaSeleccionado("seguro")}
                  style={{
                    position: "absolute",
                    top: "32%",
                    left: "48%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 9px",
                    borderRadius: 20,
                    background: "rgba(15,18,22,0.85)",
                    border: `1.5px solid ${estadoSeguro.color}`,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    transition: "transform 0.15s ease",
                    zIndex: 15,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoSeguro.color, animation: "pulse 2s infinite" }} />
                  🛡️ Seguro
                </div>

                {/* Hotspot 2: MOTOR & ACEITE (Sobre el capó) */}
                <div
                  className="no-drag"
                  onClick={() => setSistemaSeleccionado("motor")}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "26%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 9px",
                    borderRadius: 20,
                    background: "rgba(15,18,22,0.85)",
                    border: `1.5px solid ${estadoMotor.color}`,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    transition: "transform 0.15s ease",
                    zIndex: 15,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoMotor.color }} />
                  🛢️ Motor/Aceite
                </div>

                {/* Hotspot 3: FRENOS Y LLANTAS (Sobre la rueda delantera) */}
                <div
                  className="no-drag"
                  onClick={() => setSistemaSeleccionado("frenos")}
                  style={{
                    position: "absolute",
                    top: "66%",
                    left: "32%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 9px",
                    borderRadius: 20,
                    background: "rgba(15,18,22,0.85)",
                    border: `1.5px solid ${estadoFrenos.color}`,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    transition: "transform 0.15s ease",
                    zIndex: 15,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: estadoFrenos.color }} />
                  🛞 Frenos & Rines
                </div>

                {/* Hotspot 4: RENDIMIENTO Y COMBUSTIBLE (Lateral / Tanque) */}
                <div
                  className="no-drag"
                  onClick={() => setSistemaSeleccionado("rendimiento")}
                  style={{
                    position: "absolute",
                    top: "45%",
                    left: "72%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 9px",
                    borderRadius: 20,
                    background: "rgba(15,18,22,0.85)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    transition: "transform 0.15s ease",
                    zIndex: 15,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)")}
                >
                  <Fuel size={12} style={{ color: "var(--sage)" }} />
                  Tanque (15.3 Gal)
                </div>
              </>
            )}

            {/* Flechas de giro */}
            <button
              onClick={() => {
                if (autoGiro) setAutoGiro(false);
                setFrameActual((f) => (f - 1 + TOTAL_FRAMES) % TOTAL_FRAMES);
              }}
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

            {/* Controles superior derecho */}
            <div style={{ position: "absolute", top: 12, right: 14, display: "flex", gap: 6, zIndex: 10 }}>
              <button
                onClick={() => setAutoGiro((s) => !s)}
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
                }}
              >
                {autoGiro ? <Pause size={12} /> : <Play size={12} />}
                {autoGiro ? "Pausar" : "Auto-Giro"}
              </button>

              <button
                onClick={() => setZoom((z) => (z >= 1.4 ? 1 : z + 0.2))}
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

          {/* Botones de ángulos en la base */}
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
                    padding: "4px 9px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: activo ? 700 : 500,
                    background: activo ? "var(--sage)" : "rgba(20,24,28,0.85)",
                    color: activo ? "#fff" : "rgba(255,255,255,0.85)",
                    border: activo ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {preset.titulo}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODAL / DRAWER DE INSPECCIÓN DETALLADA DEL SISTEMA SELECCIONADO */}
      {sistemaSeleccionado && (
        <div
          style={{
            padding: 16,
            background: "rgba(20,22,26,0.98)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {sistemaSeleccionado === "seguro" && <ShieldCheck size={18} style={{ color: estadoSeguro.color }} />}
              {sistemaSeleccionado === "motor" && <Wrench size={18} style={{ color: estadoMotor.color }} />}
              {sistemaSeleccionado === "frenos" && <Gauge size={18} style={{ color: estadoFrenos.color }} />}
              {sistemaSeleccionado === "rendimiento" && <Fuel size={18} style={{ color: "var(--sage)" }} />}
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {sistemaSeleccionado === "seguro" && "Estado de Seguro & Cobertura"}
                {sistemaSeleccionado === "motor" && "Inspección de Motor & Aceite"}
                {sistemaSeleccionado === "frenos" && "Inspección de Frenos & Neumáticos"}
                {sistemaSeleccionado === "rendimiento" && "Consumo & Rendimiento de Combustible"}
              </span>
            </div>
            <button
              onClick={() => setSistemaSeleccionado(null)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* DETALLES DE SEGURO */}
          {sistemaSeleccionado === "seguro" && (
            <div>
              {seguro ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Aseguradora & Tipo</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{seguro.entidadName || seguro.tipo || "Seguro Vehicular"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{seguro.cobertura || "Cobertura completa"}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Vigencia & Días Restantes</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: estadoSeguro.color, marginTop: 2 }}>
                      {diasSeguro != null ? (diasSeguro < 0 ? `Vencido hace ${Math.abs(diasSeguro)} días` : `${diasSeguro} días restantes`) : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Vence el: {seguro.fechaVencimiento || "—"}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Póliza & Costo</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{seguro.poliza ? `#${seguro.poliza}` : "Registrada"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                      {seguro.costoMensual ? `${formatDinero(seguro.costoMensual)} / mes` : seguro.costoAnual ? `${formatDinero(seguro.costoAnual)} / año` : "Al día"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "rgba(217,164,65,0.12)", border: "1px solid rgba(217,164,65,0.3)", padding: 12, borderRadius: 8, fontSize: 12, color: "#f1d48c" }}>
                  ⚠️ Aún no has vinculado una póliza en la sección <b>Seguros</b> para este vehículo. Ve a la pestaña Seguros para registrar tu cobertura y hacer seguimiento automático de renovación.
                </div>
              )}
            </div>
          )}

          {/* DETALLES DE MOTOR */}
          {sistemaSeleccionado === "motor" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Aceite Oficial Honda CR-V 2014</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>0W-20 Full Sintético</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Capacidad: 4.2 L (4.4 qt con filtro)</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Próximo Service Programado</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: estadoMotor.color, marginTop: 2 }}>
                    {activo?.proximoMantenimiento ? activo.proximoMantenimiento : "Cada 5,000 - 8,000 km"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                    {diasProximoMant != null ? (diasProximoMant < 0 ? `Vencido hace ${Math.abs(diasProximoMant)} días` : `Faltan ${diasProximoMant} días`) : "Al día"}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Último Cambio Registrado</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {ultimoAceite ? ultimoAceite.fecha : "Sin registros previos"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                    {ultimoAceite?.costo ? `Costo: ${formatDinero(ultimoAceite.costo)}` : "Recomendado registrar"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6 }}>
                💡 <b>Especificación técnica Honda:</b> El motor 2.4L K24Z7 i-VTEC utiliza cadena de distribución (no requiere cambio de correa). Se recomienda revisar bujías de iridio a los 100,000 km y filtro de aire de motor cada 15,000 km.
              </div>
            </div>
          )}

          {/* DETALLES DE FRENOS */}
          {sistemaSeleccionado === "frenos" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Medida de Neumáticos</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>225/65 R17 102T</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Rines de aleación de 17 pulgadas</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Presión de Inflado en Frío</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)", marginTop: 2 }}>30 PSI Adelante / 30 PSI Atrás</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>32 PSI en carga completa / carretera</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Discos y Pastillas</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Discos Ventilados 296mm</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Sistema ABS, EBD y Asistente de Frenado</div>
                </div>
              </div>
            </div>
          )}

          {/* DETALLES DE RENDIMIENTO */}
          {sistemaSeleccionado === "rendimiento" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Capacidad del Tanque</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>15.3 Galones (58 Litros)</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Gasolina regular (87 octanos o +)</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Consumo Oficial EPA</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)", marginTop: 2 }}>23 Ciudad / 31 Carretera MPG</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Modo ECON Assist para ahorro de combustible</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Autonomía Estimada por Tanque</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>350 a 450 Millas (~600 km)</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Según estilo de manejo y tráfico</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. FORMULARIO EXPRESS PARA REGISTRAR MANTENIMIENTO */}
      {mostrarFormMant && (
        <form
          onSubmit={handleGuardarMantenimiento}
          style={{
            padding: 16,
            background: "rgba(18,20,24,0.98)",
            borderTop: "1px solid var(--sage)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={14} style={{ color: "var(--sage)" }} />
              Registrar Mantenimiento para {nombreVehiculo}
            </div>
            <button
              type="button"
              onClick={() => setMostrarFormMant(false)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}
            >
              <X size={15} />
            </button>
          </div>

          {mensajeExitoMant && (
            <div style={{ padding: "8px 12px", background: "rgba(86,171,95,0.25)", border: "1px solid var(--sage)", borderRadius: 6, fontSize: 12, color: "var(--sage)", marginBottom: 10 }}>
              {mensajeExitoMant}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 3 }}>Tipo de Servicio</label>
              <select
                value={tipoMantForm}
                onChange={(e) => setTipoMantForm(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}
              >
                <option value="Cambio de aceite" style={{ background: "#222" }}>Cambio de aceite y filtro (0W-20)</option>
                <option value="Frenos" style={{ background: "#222" }}>Frenos (Pastillas / Discos)</option>
                <option value="Llantas/Neumáticos" style={{ background: "#222" }}>Llantas (Alineación / Balanceo)</option>
                <option value="Batería" style={{ background: "#222" }}>Batería / Sistema Eléctrico</option>
                <option value="Revisión general" style={{ background: "#222" }}>Revisión general preventiva</option>
                <option value="Reparación" style={{ background: "#222" }}>Reparación mecánica</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 3 }}>Costo ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="ej. 85.00"
                value={costoMantForm}
                onChange={(e) => setCostoMantForm(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 3 }}>Kilometraje (km)</label>
              <input
                type="number"
                placeholder="ej. 120500"
                value={kmMantForm}
                onChange={(e) => setKmMantForm(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 3 }}>Fecha</label>
              <input
                type="date"
                value={fechaMantForm}
                onChange={(e) => setFechaMantForm(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 3 }}>Notas del taller / mecánico</label>
            <input
              type="text"
              placeholder="ej. Taller Honda oficial, filtro nuevo, niveles revisados"
              value={notasMantForm}
              onChange={(e) => setNotasMantForm(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setMostrarFormMant(false)}
              style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 12 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoMant}
              style={{ padding: "6px 14px", borderRadius: 6, background: "var(--sage)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
            >
              {guardandoMant ? "Guardando..." : "Guardar Mantenimiento"}
            </button>
          </div>
        </form>
      )}

      {/* 6. MODO MOSAICO (4 ÁNGULOS COMO EN LA IMAGEN DE REFERENCIA) */}
      {modo === "cuadricula" && (
        <div style={{ padding: 16, background: "radial-gradient(circle at center, #5d6067 0%, #414348 100%)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <LayoutGrid size={15} style={{ color: "var(--sage)" }} />
            Vistas de Estudio 3D · Honda CR-V 2014 Blanca (4 Perspectivas)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
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

      {/* 7. PIE DE CONTROLES */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "rgba(20,22,26,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontSize: 11,
          color: "rgba(255,255,255,0.75)",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RotateCw size={11} style={{ color: "var(--sage)" }} />
          Arrastra con el mouse para rotar 360° · Toca los <b>puntos flotantes</b> para ver seguro y mantenimientos
        </span>
        <span style={{ fontFamily: "monospace", color: "var(--sage)", fontWeight: 600 }}>
          Fotograma {frameActual + 1} de {TOTAL_FRAMES} (360°)
        </span>
      </div>
    </div>
  );
}
