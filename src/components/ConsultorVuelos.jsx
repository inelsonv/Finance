import React, { useState, useMemo } from "react";
import {
  Plane,
  ArrowRightLeft,
  Calendar,
  Users,
  ExternalLink,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
  Check,
  Palmtree,
  DollarSign,
  TrendingDown,
  Compass,
  Luggage,
  BookmarkCheck,
  MapPin,
  ChevronRight
} from "lucide-react";
import { addVacacion } from "../lib/db";

// Aeropuertos de Origen con énfasis en República Dominicana
export const AEROPUERTOS_ORIGEN = [
  { codigo: "SDQ", ciudad: "Santo Domingo", pais: "República Dominicana", nombre: "Aeropuerto Internacional Las Américas (SDQ)", bandera: "🇩🇴" },
  { codigo: "PUJ", ciudad: "Punta Cana", pais: "República Dominicana", nombre: "Aeropuerto Internacional de Punta Cana (PUJ)", bandera: "🇩🇴" },
  { codigo: "STI", ciudad: "Santiago de los Caballeros", pais: "República Dominicana", nombre: "Aeropuerto Internacional del Cibao (STI)", bandera: "🇩🇴" },
  { codigo: "POP", ciudad: "Puerto Plata", pais: "República Dominicana", nombre: "Aeropuerto Internacional Gregorio Luperón (POP)", bandera: "🇩🇴" },
  { codigo: "JBQ", ciudad: "Santo Domingo Norte", pais: "República Dominicana", nombre: "Aeropuerto Internacional La Isabela (JBQ)", bandera: "🇩🇴" },
  { codigo: "BOG", ciudad: "Bogotá", pais: "Colombia", nombre: "Aeropuerto El Dorado (BOG)", bandera: "🇨🇴" },
  { codigo: "PTY", ciudad: "Ciudad de Panamá", pais: "Panamá", nombre: "Aeropuerto Tocumen (PTY)", bandera: "🇵🇦" },
  { codigo: "MAD", ciudad: "Madrid", pais: "España", nombre: "Aeropuerto Barajas (MAD)", bandera: "🇪🇸" },
];

// Aeropuertos de Destino populares (EE.UU. y vacaciones internacionales)
export const AEROPUERTOS_DESTINO = [
  // Estados Unidos
  { codigo: "MIA", ciudad: "Miami, Florida", pais: "Estados Unidos", nombre: "Aeropuerto Internacional de Miami (MIA)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "FLL", ciudad: "Fort Lauderdale, Florida", pais: "Estados Unidos", nombre: "Aeropuerto Fort Lauderdale-Hollywood (FLL)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "MCO", ciudad: "Orlando, Florida", pais: "Estados Unidos", nombre: "Aeropuerto Internacional de Orlando (MCO) - Disney", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "JFK", ciudad: "Nueva York, NY", pais: "Estados Unidos", nombre: "John F. Kennedy Intl. (JFK)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "EWR", ciudad: "Newark / Nueva York", pais: "Estados Unidos", nombre: "Aeropuerto Internacional de Newark Liberty (EWR)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "BOS", ciudad: "Boston, Massachusetts", pais: "Estados Unidos", nombre: "Aeropuerto Logan de Boston (BOS)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "ATL", ciudad: "Atlanta, Georgia", pais: "Estados Unidos", nombre: "Aeropuerto Internacional Hartsfield-Jackson (ATL)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "IAH", ciudad: "Houston, Texas", pais: "Estados Unidos", nombre: "George Bush Intercontinental (IAH)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "ORD", ciudad: "Chicago, Illinois", pais: "Estados Unidos", nombre: "Aeropuerto O'Hare (ORD)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "CLT", ciudad: "Charlotte, NC", pais: "Estados Unidos", nombre: "Charlotte Douglas Intl. (CLT)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "LAX", ciudad: "Los Ángeles, California", pais: "Estados Unidos", nombre: "Aeropuerto Internacional de Los Ángeles (LAX)", bandera: "🇺🇸", region: "EE.UU." },
  { codigo: "IAD", ciudad: "Washington, D.C.", pais: "Estados Unidos", nombre: "Washington Dulles (IAD)", bandera: "🇺🇸", region: "EE.UU." },
  // Destinos Internacionales
  { codigo: "MAD", ciudad: "Madrid", pais: "España", nombre: "Aeropuerto Adolfo Suárez Madrid-Barajas (MAD)", bandera: "🇪🇸", region: "Europa" },
  { codigo: "MDE", ciudad: "Medellín", pais: "Colombia", nombre: "Aeropuerto José María Córdova (MDE)", bandera: "🇨🇴", region: "Latinoamérica" },
  { codigo: "CUN", ciudad: "Cancún", pais: "México", nombre: "Aeropuerto Internacional de Cancún (CUN)", bandera: "🇲🇽", region: "Latinoamérica" },
  { codigo: "PTY", ciudad: "Ciudad de Panamá", pais: "Panamá", nombre: "Aeropuerto Internacional de Tocumen (PTY)", bandera: "🇵🇦", region: "Latinoamérica" },
];

// Rutas frecuentes con datos de referencia
export const RUTAS_POPULARES = [
  {
    origen: "SDQ",
    destino: "MIA",
    nombre: "Santo Domingo ⇄ Miami",
    duracion: "2h 25m",
    tipo: "Directo",
    aerolineas: "American Airlines, Arajet, Sky High",
    precioEstimado: 240,
    rango: "$210 - $350 USD",
    destacado: "Ruta más rápida a Florida",
  },
  {
    origen: "SDQ",
    destino: "JFK",
    nombre: "Santo Domingo ⇄ Nueva York",
    duracion: "3h 50m",
    tipo: "Directo",
    aerolineas: "JetBlue, Delta Air Lines",
    precioEstimado: 320,
    rango: "$280 - $480 USD",
    destacado: "Múltiples vuelos diarios",
  },
  {
    origen: "SDQ",
    destino: "MCO",
    nombre: "Santo Domingo ⇄ Orlando (Disney)",
    duracion: "2h 45m",
    tipo: "Directo",
    aerolineas: "JetBlue, Spirit Airlines",
    precioEstimado: 260,
    rango: "$230 - $390 USD",
    destacado: "Ideal para vacaciones familiares",
  },
  {
    origen: "STI",
    destino: "JFK",
    nombre: "Santiago (Cibao) ⇄ Nueva York",
    duracion: "3h 45m",
    tipo: "Directo",
    aerolineas: "JetBlue, Delta",
    precioEstimado: 310,
    rango: "$280 - $490 USD",
    destacado: "Salida directa desde el Cibao",
  },
  {
    origen: "PUJ",
    destino: "MIA",
    nombre: "Punta Cana ⇄ Miami",
    duracion: "2h 30m",
    tipo: "Directo",
    aerolineas: "American Airlines, Frontier",
    precioEstimado: 270,
    rango: "$240 - $410 USD",
    destacado: "Conexión turística",
  },
  {
    origen: "SDQ",
    destino: "BOS",
    nombre: "Santo Domingo ⇄ Boston",
    duracion: "4h 10m",
    tipo: "Directo",
    aerolineas: "JetBlue",
    precioEstimado: 340,
    rango: "$300 - $510 USD",
    destacado: "Vuelo directo semanal",
  },
];

// Opciones de aerolíneas comunes en el corredor RD ⇄ EE.UU.
const AEROLINEAS_DETALLE = [
  { nombre: "JetBlue", codigo: "B6", equipajeMano: "Incluido (Blue)", equipajeBodega: "Desde $35 USD", web: "https://www.jetblue.com" },
  { nombre: "Arajet", codigo: "DM", equipajeMano: "Personal gratis / Carry-on pago", equipajeBodega: "Desde $25 USD", web: "https://www.arajet.com" },
  { nombre: "Delta Air Lines", codigo: "DL", equipajeMano: "Carry-on gratis", equipajeBodega: "Desde $35 USD", web: "https://www.delta.com" },
  { nombre: "American Airlines", codigo: "AA", equipajeMano: "Carry-on gratis", equipajeBodega: "Desde $35 USD", web: "https://www.aa.com" },
  { nombre: "United Airlines", codigo: "UA", equipajeMano: "Carry-on gratis", equipajeBodega: "Desde $35 USD", web: "https://www.united.com" },
  { nombre: "Spirit Airlines", codigo: "NK", equipajeMano: "Artículo personal gratis", equipajeBodega: "Desde $40 USD", web: "https://www.spirit.com" },
];

function formatDinero(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " USD";
}

function sumarDias(fechaStr, dias) {
  const d = new Date(fechaStr + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function ConsultorVuelos({ fuentesIngreso = [], categoriasGasto = [], onVacacionCreada }) {
  // Estado de búsqueda
  const [origen, setOrigen] = useState("SDQ");
  const [destino, setDestino] = useState("MIA");
  const [tipoViaje, setTipoViaje] = useState("redondo"); // 'redondo' | 'solo-ida'
  const [clase, setClase] = useState("economy");
  const [pasajeros, setPasajeros] = useState(1);

  // Fechas iniciales por defecto (en 3 semanas, duración de 7 días)
  const hoyStr = new Date().toISOString().slice(0, 10);
  const [fechaSalida, setFechaSalida] = useState(() => sumarDias(hoyStr, 21));
  const [fechaRegreso, setFechaRegreso] = useState(() => sumarDias(hoyStr, 28));

  // Modal para guardar en Vacaciones
  const [mostrarModalVacacion, setMostrarModalVacacion] = useState(false);
  const [empleoVacacion, setEmpleoVacacion] = useState(() => fuentesIngreso[0]?.id || "");
  const [categoriaVacacion, setCategoriaVacacion] = useState(() => {
    const cat = (categoriasGasto || []).find((c) => /viaje|vacacion|ocio/i.test(c.nombre));
    return cat?.nombre || "";
  });
  const [guardandoVacacion, setGuardandoVacacion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Objetos de aeropuertos seleccionados
  const origenObj = useMemo(() => {
    return AEROPUERTOS_ORIGEN.find((a) => a.codigo === origen) || {
      codigo: origen,
      ciudad: origen,
      pais: "",
      nombre: origen,
      bandera: "✈️",
    };
  }, [origen]);

  const destinoObj = useMemo(() => {
    return AEROPUERTOS_DESTINO.find((a) => a.codigo === destino) || {
      codigo: destino,
      ciudad: destino,
      pais: "",
      nombre: destino,
      bandera: "📍",
    };
  }, [destino]);

  // Si la ruta coincide con una conocida
  const rutaInfo = useMemo(() => {
    return RUTAS_POPULARES.find(
      (r) =>
        (r.origen === origen && r.destino === destino) ||
        (r.origen === destino && r.destino === origen)
    );
  }, [origen, destino]);

  // Estimación de costo por persona
  const precioBaseEstimado = rutaInfo?.precioEstimado || (destinoObj.pais === "Estados Unidos" ? 310 : 380);
  const factorViaje = tipoViaje === "redondo" ? 1 : 0.6;
  const precioPorPersona = Math.round(precioBaseEstimado * factorViaje);
  const precioTotalGrupo = precioPorPersona * pasajeros;

  // Intercambiar origen y destino
  const handleSwap = () => {
    const temp = origen;
    setOrigen(destino);
    setDestino(temp);
  };

  // Generador de enlaces directos a comparadores en vivo
  const urlGoogleFlights = useMemo(() => {
    // Formato Google Flights directo
    const typeParam = tipoViaje === "redondo" ? "2" : "1";
    return `https://www.google.com/travel/flights?q=Flights%20to%20${destino}%20from%20${origen}%20on%20${fechaSalida}${tipoViaje === "redondo" ? `%20through%20${fechaRegreso}` : ""}`;
  }, [origen, destino, fechaSalida, fechaRegreso, tipoViaje]);

  const urlSkyscanner = useMemo(() => {
    const dep = fechaSalida.replace(/-/g, "").slice(2);
    const ret = tipoViaje === "redondo" ? fechaRegreso.replace(/-/g, "").slice(2) : "";
    return `https://www.skyscanner.net/transport/flights/${origen.toLowerCase()}/${destino.toLowerCase()}/${dep}/${ret}?adultsv2=${pasajeros}`;
  }, [origen, destino, fechaSalida, fechaRegreso, tipoViaje, pasajeros]);

  const urlKayak = useMemo(() => {
    const dates = tipoViaje === "redondo" ? `${fechaSalida}/${fechaRegreso}` : fechaSalida;
    return `https://www.kayak.com/flights/${origen}-${destino}/${dates}/${pasajeros}adults?sort=bestflight_a`;
  }, [origen, destino, fechaSalida, fechaRegreso, tipoViaje, pasajeros]);

  // Aplicar ruta rápida
  const aplicarRutaRapida = (r) => {
    setOrigen(r.origen);
    setDestino(r.destino);
  };

  // Guardar en la base de datos de Vacaciones
  const handleGuardarVacacion = async () => {
    setGuardandoVacacion(true);
    try {
      const nombreDestino = `${destinoObj.ciudad} (${destinoObj.codigo}) - Vuelo desde ${origenObj.codigo}`;
      await addVacacion({
        destino: nombreDestino,
        fuenteIngresoId: empleoVacacion || null,
        fechaInicio: fechaSalida,
        fechaFin: tipoViaje === "redondo" ? fechaRegreso : fechaSalida,
        presupuestoEstimado: precioTotalGrupo,
        categoriaGasto: categoriaVacacion || null,
        estado: "Planificada",
        notas: `Vuelo consultado: ${origenObj.codigo} ⇄ ${destinoObj.codigo}. Pasajeros: ${pasajeros}. Tarifa estimada: ${formatDinero(precioTotalGrupo)}. Comparar en Google Flights/Skyscanner.`,
      });
      setMensajeExito("¡Vuelo y destino guardados exitosamente en tus Vacaciones!");
      setTimeout(() => {
        setMensajeExito(null);
        setMostrarModalVacacion(false);
      }, 2000);
      if (onVacacionCreada) onVacacionCreada();
    } catch (err) {
      alert("Error al guardar: " + (err.message || String(err)));
    } finally {
      setGuardandoVacacion(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* 1. ENCABEZADO CON RESUMEN Y CONTEXTO */}
      <div
        style={{
          background: "linear-gradient(135deg, #1f2733 0%, #2f3e52 100%)",
          color: "#fff",
          borderRadius: 14,
          padding: "20px 22px",
          marginBottom: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>
              <Compass size={13} style={{ color: "#7bc9a6" }} />
              Consultor de Vuelos & Destinos Vacacionales
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Consulta Vuelos desde República Dominicana hacia EE.UU. y el Mundo
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "6px 0 0", maxWidth: 620 }}>
              Cotiza tarifas estimadas, compara en tiempo real con <b>Google Flights, Skyscanner y Kayak</b>, y vincula el presupuesto directamente a tus vacaciones planificadas.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "10px 14px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Tarifa estimada para tu ruta</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#7bc9a6", fontFamily: "var(--font-mono, monospace)" }}>
              {formatDinero(precioTotalGrupo)}
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>
              {pasajeros} {pasajeros === 1 ? "pasajero" : "pasajeros"} · {tipoViaje === "redondo" ? "Ida y Vuelta" : "Solo Ida"}
            </div>
          </div>
        </div>

        {/* RUTAS RÁPIDAS CLICABLES */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 8, fontWeight: 600 }}>
            ⚡ Rutas frecuentes con alta demanda desde RD a EE.UU. (Toca para seleccionar):
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {RUTAS_POPULARES.map((r, i) => {
              const activo = r.origen === origen && r.destino === destino;
              return (
                <button
                  key={i}
                  onClick={() => aplicarRutaRapida(r)}
                  style={{
                    background: activo ? "#7bc9a6" : "rgba(255,255,255,0.1)",
                    color: activo ? "#15202b" : "#fff",
                    border: activo ? "1px solid #7bc9a6" : "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "6px 11px",
                    fontSize: 11.5,
                    fontWeight: activo ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>✈️ {r.origen} ⇄ {r.destino}</span>
                  <span style={{ opacity: activo ? 0.9 : 0.7, fontSize: 10 }}>({r.rango})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FORMULARIO INTERACTIVO DE BÚSQUEDA */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Selector de Tipo de Viaje y Pasajeros */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setTipoViaje("redondo")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: tipoViaje === "redondo" ? 700 : 500,
                background: tipoViaje === "redondo" ? "var(--ink)" : "var(--paper)",
                color: tipoViaje === "redondo" ? "var(--paper)" : "var(--ink)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              🔄 Ida y Vuelta
            </button>
            <button
              onClick={() => setTipoViaje("solo-ida")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: tipoViaje === "solo-ida" ? 700 : 500,
                background: tipoViaje === "solo-ida" ? "var(--ink)" : "var(--paper)",
                color: tipoViaje === "solo-ida" ? "var(--paper)" : "var(--ink)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              ➡️ Solo Ida
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Users size={14} style={{ color: "var(--ink-soft)" }} />
              <span style={{ color: "var(--ink-soft)" }}>Pasajeros:</span>
              <select
                value={pasajeros}
                onChange={(e) => setPasajeros(parseInt(e.target.value, 10))}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontSize: 12, fontWeight: 600 }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "Adulto" : "Pasajeros"}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Luggage size={14} style={{ color: "var(--ink-soft)" }} />
              <select
                value={clase}
                onChange={(e) => setClase(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", fontSize: 12, fontWeight: 600 }}
              >
                <option value="economy">Clase Económica</option>
                <option value="premium">Premium Economy</option>
                <option value="business">Ejecutiva / Business</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campos de Origen, Destino y Fechas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "center" }}>
          {/* Origen */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              🛫 Origen (Tu País / Ciudad)
            </label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              <optgroup label="República Dominicana (Aeropuertos Locales)">
                {AEROPUERTOS_ORIGEN.filter((a) => a.pais === "República Dominicana").map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.bandera} {a.ciudad} ({a.codigo})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Otros Aeropuertos">
                {AEROPUERTOS_ORIGEN.filter((a) => a.pais !== "República Dominicana").map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.bandera} {a.ciudad} ({a.codigo})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Botón de Intercambio */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", height: "100%", paddingBottom: 4 }}>
            <button
              onClick={handleSwap}
              title="Invertir origen y destino"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                cursor: "pointer",
                transition: "transform 0.2s ease",
              }}
            >
              <ArrowRightLeft size={15} />
            </button>
          </div>

          {/* Destino */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              🛬 Destino (EE.UU. / Vacaciones)
            </label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              <optgroup label="Estados Unidos (Destinos Principales)">
                {AEROPUERTOS_DESTINO.filter((a) => a.region === "EE.UU.").map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.bandera} {a.ciudad} ({a.codigo})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Internacional / Vacaciones">
                {AEROPUERTOS_DESTINO.filter((a) => a.region !== "EE.UU.").map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.bandera} {a.ciudad} ({a.codigo})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Fecha Salida */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              📅 Fecha de Ida
            </label>
            <input
              type="date"
              value={fechaSalida}
              min={hoyStr}
              onChange={(e) => setFechaSalida(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                fontSize: 13,
              }}
            />
          </div>

          {/* Fecha Regreso (si es redondo) */}
          {tipoViaje === "redondo" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                📅 Fecha de Vuelta
              </label>
              <input
                type="date"
                value={fechaRegreso}
                min={fechaSalida}
                onChange={(e) => setFechaRegreso(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  fontSize: 13,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTONES DE COMPARACIÓN EN VIVO (GOOGLE FLIGHTS, SKYSCANNER, KAYAK) */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              🌐 Comparar Precios en Vivo para: {origenObj.codigo} ➔ {destinoObj.codigo}
            </span>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Abre los buscadores oficiales con tus fechas y aeropuertos ya configurados para ver los precios exactos de hoy:
            </div>
          </div>

          <button
            onClick={() => setMostrarModalVacacion(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(91,122,91,0.25)",
            }}
          >
            <BookmarkCheck size={14} />
            + Guardar en mis Vacaciones
          </button>
        </div>

        {/* Tarjetas de Enlaces Directos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {/* Google Flights */}
          <a
            href={urlGoogleFlights}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "var(--ink)",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "var(--sage)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--line)";
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🔍 Google Flights</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                Calendario de tarifas y alertas
              </div>
            </div>
            <ExternalLink size={14} style={{ color: "var(--sage)" }} />
          </a>

          {/* Skyscanner */}
          <a
            href={urlSkyscanner}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "var(--ink)",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "var(--sage)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--line)";
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✈️ Skyscanner</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                Compara agencias y aerolíneas
              </div>
            </div>
            <ExternalLink size={14} style={{ color: "var(--sage)" }} />
          </a>

          {/* Kayak */}
          <a
            href={urlKayak}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "var(--ink)",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "var(--sage)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--line)";
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📊 Kayak</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                Predicción de momento de compra
              </div>
            </div>
            <ExternalLink size={14} style={{ color: "var(--sage)" }} />
          </a>
        </div>
      </div>

      {/* 4. INFORMACIÓN DE LA RUTA Y AEROLÍNEAS FRECUENTES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Ficha de la Ruta */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Clock size={15} style={{ color: "var(--sage)" }} />
            Detalles Operativos de la Ruta
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Origen:</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{origenObj.nombre}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Destino:</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{destinoObj.nombre}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Duración promedio de vuelo:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sage)" }}>
                {rutaInfo?.duracion || "2h 30m - 4h 00m (según escala)"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Aerolíneas frecuentes:</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: "right", maxWidth: 180 }}>
                {rutaInfo?.aerolineas || "JetBlue, Delta, American, Arajet, Spirit"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Rango de precio típico:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                {rutaInfo?.rango || "$250 - $450 USD"}
              </span>
            </div>
          </div>
        </div>

        {/* Políticas de Equipaje & Aerolíneas */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Luggage size={15} style={{ color: "var(--sage)" }} />
            Equipaje y Aerolíneas Populares (RD ⇄ EE.UU.)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AEROLINEAS_DETALLE.slice(0, 4).map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: 7,
                  background: "var(--paper)",
                  fontSize: 11.5,
                }}
              >
                <div>
                  <b style={{ color: "var(--ink)" }}>{a.nombre}</b>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Mano: {a.equipajeMano}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Bodega: {a.equipajeBodega}</div>
                  <a href={a.web} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "var(--sage)", textDecoration: "none", fontWeight: 600 }}>
                    Sitio web ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. CONSEJOS PRÁCTICOS PARA VIAJAR A EE.UU. DESDE REPÚBLICA DOMINICANA */}
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          fontSize: 12,
          color: "var(--ink)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--ink)" }}>
          <ShieldCheck size={15} style={{ color: "var(--sage)" }} />
          Requisitos y Consejos para Viajar desde República Dominicana a EE.UU.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          <div>
            • <b>Pasaporte Dominicano:</b> Debe tener al menos 6 meses de vigencia a partir de la fecha de entrada prevista a EE.UU.
          </div>
          <div>
            • <b>Visado de Turista (B1/B2) o ESTA:</b> Asegúrate de tener tu visa americana estampada y vigente o pasaporte elegible para ESTA.
          </div>
          <div>
            • <b>Formulario e-Ticket Dominicano:</b> Es 100% obligatorio y gratuito para salir y entrar a RD en el portal oficial de Migración (eticket.migracion.gob.do).
          </div>
          <div>
            • <b>Mejores Días para Comprar:</b> Volar los días martes y miércoles suele ser entre un 15% y 25% más económico que viernes o domingos.
          </div>
        </div>
      </div>

      {/* 6. MODAL PARA GUARDAR EN VACACIONES PLANIFICADAS */}
      {mostrarModalVacacion && (
        <div
          onClick={() => setMostrarModalVacacion(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 22,
              width: "min(480px, 100%)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Palmtree size={17} style={{ color: "var(--sage)" }} />
                Vincular Vuelo a tus Vacaciones
              </div>
              <button
                onClick={() => setMostrarModalVacacion(false)}
                style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {mensajeExito ? (
              <div style={{ padding: "14px", borderRadius: 8, background: "var(--sage-bg)", color: "var(--sage)", border: "1px solid var(--sage)", fontSize: 13, textAlign: "center", fontWeight: 600 }}>
                {mensajeExito}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
                  Esto registrará un periodo de vacaciones para <b>{destinoObj.ciudad}</b> con las fechas y presupuesto de vuelo seleccionados:
                </p>

                <div style={{ background: "var(--paper)", padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Ruta:</span>
                    <span style={{ fontWeight: 600 }}>{origenObj.codigo} ➔ {destinoObj.codigo} ({tipoViaje === "redondo" ? "Ida y Vuelta" : "Solo Ida"})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Fechas:</span>
                    <span style={{ fontWeight: 600 }}>{fechaSalida} al {fechaRegreso}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Presupuesto Estimado:</span>
                    <span style={{ fontWeight: 700, color: "var(--sage)" }}>{formatDinero(precioTotalGrupo)}</span>
                  </div>
                </div>

                {fuentesIngreso.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                      Empleo / Fuente de Ingreso vinculada:
                    </label>
                    <select
                      value={empleoVacacion}
                      onChange={(e) => setEmpleoVacacion(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--card)", fontSize: 12.5 }}
                    >
                      {fuentesIngreso.map((f) => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Categoría de Gasto para el Presupuesto (opcional):
                  </label>
                  <select
                    value={categoriaVacacion}
                    onChange={(e) => setCategoriaVacacion(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--card)", fontSize: 12.5 }}
                  >
                    <option value="">Seleccionar categoría…</option>
                    {(categoriasGasto || []).map((c) => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={() => setMostrarModalVacacion(false)}
                    style={{ padding: "7px 14px", borderRadius: 7, background: "transparent", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarVacacion}
                    disabled={guardandoVacacion}
                    style={{ padding: "7px 16px", borderRadius: 7, background: "var(--sage)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
                  >
                    {guardandoVacacion ? "Guardando…" : "Confirmar y Guardar Vacación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
