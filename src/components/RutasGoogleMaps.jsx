import React, { useState, useEffect, useRef, useMemo } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  MapPin,
  Navigation,
  ArrowRightLeft,
  Fuel,
  Clock,
  Gauge,
  Plus,
  Trash2,
  BookmarkCheck,
  Calendar,
  Car,
  DollarSign,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Upload,
  Play,
  Square,
  FileText,
  Info,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { addRutaVehiculo, deleteRutaVehiculo } from "../lib/db";
import { confirm } from "../lib/confirm";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyC9ViJpHkdrsXDtcOxxKuMYoQPLZAitmy0";

// Lugares frecuentes y ciudades principales en República Dominicana
const DESTINOS_FRECUENTES_RD = [
  "Santo Domingo, República Dominicana",
  "Santiago de los Caballeros, República Dominicana",
  "Punta Cana, La Altagracia, República Dominicana",
  "Las Terrenas, Samaná, República Dominicana",
  "La Romana, República Dominicana",
  "Puerto Plata, República Dominicana",
  "Jarabacoa, La Vega, República Dominicana",
  "San Cristóbal, República Dominicana",
  "Baní, Peravia, República Dominicana",
  "Barahona, República Dominicana",
  "Aeropuerto Internacional Las Américas (SDQ)",
  "Aeropuerto Internacional del Cibao (STI)",
];

// Fórmula de Haversine para calcular distancia en km entre 2 puntos GPS
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parser de archivos de Google Maps Timeline / Cronología
function parsearCronologiaGoogleMaps(texto) {
  const data = JSON.parse(texto);
  const viajes = [];

  // Formato 1: timelineObjects (Semantic Location History)
  if (data.timelineObjects && Array.isArray(data.timelineObjects)) {
    for (const item of data.timelineObjects) {
      if (item.activitySegment) {
        const act = item.activitySegment;
        const tipo = (act.activityType || "").toUpperCase();
        const esVehiculo =
          tipo.includes("VEHICLE") ||
          tipo.includes("DRIVING") ||
          tipo.includes("CAR") ||
          tipo.includes("MOTORCYCLING");

        if (esVehiculo) {
          const distanciaM = act.distance || 0;
          const distanciaKm = parseFloat((distanciaM / 1000).toFixed(1));
          const startStr = act.duration?.startTimestamp || "";
          const endStr = act.duration?.endTimestamp || "";
          const fecha = startStr ? startStr.slice(0, 10) : new Date().toISOString().slice(0, 10);

          let duracionMinutos = 0;
          if (startStr && endStr) {
            const diffMs = new Date(endStr) - new Date(startStr);
            duracionMinutos = Math.max(1, Math.round(diffMs / 60000));
          }

          if (distanciaKm > 0.2) {
            viajes.push({
              id: "gm_" + Math.random().toString(36).substring(2, 9),
              origen: act.startLocation?.address || (act.startLocation ? `GPS (${(act.startLocation.latitudeE7 / 1e7).toFixed(3)}, ${(act.startLocation.longitudeE7 / 1e7).toFixed(3)})` : "Salida registrada"),
              destino: act.endLocation?.address || (act.endLocation ? `GPS (${(act.endLocation.latitudeE7 / 1e7).toFixed(3)}, ${(act.endLocation.longitudeE7 / 1e7).toFixed(3)})` : "Llegada registrada"),
              distanciaKm,
              duracionMinutos,
              fecha,
              tipo: act.activityType || "En vehículo",
            });
          }
        }
      }
    }
  } else if (Array.isArray(data)) {
    // Si es un arreglo directo de segmentos
    for (const item of data) {
      if (item.distance && item.activityType) {
        viajes.push({
          id: "gm_" + Math.random().toString(36).substring(2, 9),
          origen: item.startAddress || "Origen",
          destino: item.endAddress || "Destino",
          distanciaKm: parseFloat((item.distance / 1000).toFixed(1)),
          duracionMinutos: item.durationMinutes || 15,
          fecha: item.date || new Date().toISOString().slice(0, 10),
          tipo: item.activityType,
        });
      }
    }
  }

  return viajes;
}

// Componente interno que dibuja en Google Maps
function RouteCalculatorMap({ origen, destino, onRouteCalculated, onError, triggerCalculation }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!routesLib || !map || !origen || !destino) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin: origen,
      destination: destino,
      travelMode: "DRIVING",
      fields: ["path", "distanceMeters", "durationMillis", "viewport", "legs"],
    };

    if (routesLib.Route && typeof routesLib.Route.computeRoutes === "function") {
      routesLib.Route.computeRoutes(request)
        .then(({ routes }) => {
          if (!routes || routes.length === 0) {
            fallbackDirectionsService();
            return;
          }
          const primaryRoute = routes[0];
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((poly) => {
            poly.setOptions({
              strokeColor: "#2563eb",
              strokeWeight: 6,
              strokeOpacity: 0.85,
            });
            poly.setMap(map);
          });
          polylinesRef.current = newPolylines;

          if (primaryRoute.viewport) {
            map.fitBounds(primaryRoute.viewport);
          }

          const km = (primaryRoute.distanceMeters / 1000).toFixed(1);
          const mins = Math.round(primaryRoute.durationMillis / 60000);
          onRouteCalculated({
            distanciaKm: parseFloat(km),
            duracionMinutos: mins,
          });
        })
        .catch(() => fallbackDirectionsService());
    } else {
      fallbackDirectionsService();
    }

    function fallbackDirectionsService() {
      if (!window.google || !window.google.maps) return;
      const ds = new window.google.maps.DirectionsService();
      ds.route(
        {
          origin: origen,
          destination: destino,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result.routes && result.routes[0]) {
            const route = result.routes[0];
            const leg = route.legs[0];

            const poly = new window.google.maps.Polyline({
              path: route.overview_path,
              strokeColor: "#2563eb",
              strokeWeight: 6,
              strokeOpacity: 0.85,
              map: map,
            });
            polylinesRef.current = [poly];

            if (route.bounds) map.fitBounds(route.bounds);

            const km = (leg.distance.value / 1000).toFixed(1);
            const mins = Math.round(leg.duration.value / 60);
            onRouteCalculated({
              distanciaKm: parseFloat(km),
              duracionMinutos: mins,
            });
          } else {
            onError("No se pudo calcular la ruta entre estos dos puntos. Verifica las direcciones.");
          }
        }
      );
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, triggerCalculation]);

  return null;
}

export default function RutasGoogleMaps({ activos = [], rutas = [] }) {
  // Pestañas principales de la herramienta
  const [modo, setModo] = useState("planificador"); // 'planificador' | 'gps' | 'cronologia'

  // Parámetros de vehículos
  const vehiculos = useMemo(() => (activos || []).filter((a) => a.tipo === "Vehículo"), [activos]);
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(() => vehiculos[0]?.id || "");
  const vehiculoActual = vehiculos.find((v) => v.id === vehiculoSeleccionadoId) || vehiculos[0];

  // Configuración de Rendimiento y Precio
  const [rendimientoKmGal, setRendimientoKmGal] = useState("28"); // km/galón promedio
  const [precioGalonDOP, setPrecioGalonDOP] = useState("290"); // RD$ por galón

  // Modo 1: Planificador con Google Maps
  const [origen, setOrigen] = useState("Santo Domingo, República Dominicana");
  const [destino, setDestino] = useState("Santiago de los Caballeros, República Dominicana");
  const [calculando, setCalculando] = useState(false);
  const [errorRuta, setErrorRuta] = useState(null);
  const [resultadoRuta, setResultadoRuta] = useState(null);
  const [triggerCount, setTriggerCount] = useState(0);

  // Modo 2: Odómetro GPS en Vivo
  const [gpsActivo, setGpsActivo] = useState(false);
  const [gpsKmRecorridos, setGpsKmRecorridos] = useState(0);
  const [gpsVelocidadKmH, setGpsVelocidadKmH] = useState(0);
  const [gpsTiempoSegundos, setGpsTiempoSegundos] = useState(0);
  const [gpsError, setGpsError] = useState(null);
  const ultimaPosRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalTimerRef = useRef(null);

  // Modo 3: Importador de Cronología de Google Maps
  const [viajesImportados, setViajesImportados] = useState([]);
  const [archivoCargando, setArchivoCargando] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState(null);

  // Modal para guardar
  const [mostrarModalGuardar, setMostrarModalGuardar] = useState(false);
  const [fechaViaje, setFechaViaje] = useState(() => new Date().toISOString().slice(0, 10));
  const [notasViaje, setNotasViaje] = useState("");
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Consumo calculado
  const consumoEstimado = useMemo(() => {
    const km = modo === "gps" ? gpsKmRecorridos : (resultadoRuta ? resultadoRuta.distanciaKm : 0);
    if (!km || km <= 0) return null;
    const rend = parseFloat(rendimientoKmGal) || 28;
    const precio = parseFloat(precioGalonDOP) || 290;
    const galones = km / rend;
    const costoDOP = galones * precio;
    return {
      galones: galones.toFixed(2),
      litros: (galones * 3.78541).toFixed(1),
      costoDOP: Math.round(costoDOP),
    };
  }, [resultadoRuta, gpsKmRecorridos, modo, rendimientoKmGal, precioGalonDOP]);

  // Manejo del Planificador
  const handleCalcular = (e) => {
    if (e) e.preventDefault();
    if (!origen.trim() || !destino.trim()) {
      setErrorRuta("Por favor ingresa un origen y un destino.");
      return;
    }
    setErrorRuta(null);
    setCalculando(true);
    setTriggerCount((c) => c + 1);
  };

  const handleSwap = () => {
    const temp = origen;
    setOrigen(destino);
    setDestino(temp);
    setTriggerCount((c) => c + 1);
  };

  // Manejo del GPS en Vivo
  const iniciarGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Tu navegador no soporta geolocalización GPS.");
      return;
    }
    setGpsError(null);
    setGpsKmRecorridos(0);
    setGpsTiempoSegundos(0);
    ultimaPosRef.current = null;
    setGpsActivo(true);

    intervalTimerRef.current = setInterval(() => {
      setGpsTiempoSegundos((s) => s + 1);
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        if (speed != null && speed >= 0) {
          setGpsVelocidadKmH(Math.round(speed * 3.6)); // m/s a km/h
        }

        if (ultimaPosRef.current) {
          const dist = calcularDistanciaHaversine(
            ultimaPosRef.current.lat,
            ultimaPosRef.current.lng,
            latitude,
            longitude
          );
          // Filtrar pequeños ruidos GPS cuando está detenido (< 10 metros)
          if (dist > 0.01) {
            setGpsKmRecorridos((prev) => parseFloat((prev + dist).toFixed(2)));
            ultimaPosRef.current = { lat: latitude, lng: longitude };
          }
        } else {
          ultimaPosRef.current = { lat: latitude, lng: longitude };
        }
      },
      (err) => {
        setGpsError("Error al leer el sensor GPS: " + err.message);
        detenerGps();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  };

  const detenerGps = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    setGpsActivo(false);
    setGpsVelocidadKmH(0);
  };

  useEffect(() => {
    return () => detenerGps();
  }, []);

  // Manejo del archivo de Cronología
  const handleCargarArchivoCronologia = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoCargando(true);
    setMensajeImportacion(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const contenido = event.target?.result;
        const viajes = parsearCronologiaGoogleMaps(contenido);
        if (viajes.length === 0) {
          setMensajeImportacion("No se encontraron tramos marcados como 'En vehículo' en este archivo. Asegúrate de exportar la cronología de recorridos de Google Maps.");
        } else {
          setViajesImportados(viajes);
          setMensajeImportacion(`¡Se detectaron ${viajes.length} recorridos en vehículo en tu historial de Google Maps!`);
        }
      } catch (err) {
        setMensajeImportacion("Error al leer el archivo: " + err.message);
      } finally {
        setArchivoCargando(false);
      }
    };
    reader.readAsText(file);
  };

  // Guardar viaje en Firestore / Local
  const handleGuardarRecorrido = async (datos) => {
    setGuardandoRuta(true);
    try {
      await addRutaVehiculo({
        activoId: vehiculoActual?.id || null,
        activoNombre: vehiculoActual?.nombre || "Mi Vehículo",
        origen: datos.origen,
        destino: datos.destino,
        distanciaKm: datos.distanciaKm,
        duracionMinutos: datos.duracionMinutos || 0,
        fecha: datos.fecha || fechaViaje,
        combustibleEstimadoGal: datos.combustibleGal || (consumoEstimado ? parseFloat(consumoEstimado.galones) : null),
        costoEstimadoCombustible: datos.costoDOP || (consumoEstimado ? consumoEstimado.costoDOP : null),
        notas: datos.notas || notasViaje.trim() || `Recorrido de ${datos.distanciaKm} km registrado con Google Maps.`,
      });
      setMensajeExito("¡Recorrido registrado exitosamente en el historial del vehículo!");
      setTimeout(() => {
        setMensajeExito(null);
        setMostrarModalGuardar(false);
        setNotasViaje("");
      }, 1500);
    } catch (err) {
      alert("Error al guardar: " + (err.message || String(err)));
    } finally {
      setGuardandoRuta(false);
    }
  };

  // Calcular la ruta inicial
  useEffect(() => {
    handleCalcular();
  }, []);

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* 1. HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "#fff",
          borderRadius: 14,
          padding: "20px 22px",
          marginBottom: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>
              <Navigation size={13} style={{ color: "#38bdf8" }} />
              Recorridos, Odómetro y Consumo de tu Vehículo
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Control de Kilómetros Reales y Gasolina ({vehiculoActual?.nombre || "Tu Vehículo"})
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "6px 0 0", maxWidth: 640 }}>
              Calcula tus rutas antes de salir, usa el odómetro GPS en vivo mientras manejas o importa tu historial de conducción desde tu cuenta de Google Maps.
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
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Vehículo Activo</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#38bdf8" }}>
              🚗 {vehiculoActual?.nombre || "Vehículo"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              {rendimientoKmGal} km/gal · RD$ {precioGalonDOP}/gal
            </div>
          </div>
        </div>

        {/* SELECTOR DE MODO (3 FORMAS DE VINCULAR) */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", flexWrap: "wrap" }}>
          <button
            onClick={() => setModo("planificador")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              background: modo === "planificador" ? "#38bdf8" : "rgba(255,255,255,0.1)",
              color: modo === "planificador" ? "#0f172a" : "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Navigation size={14} /> 1. Planificador de Rutas en Mapa
          </button>

          <button
            onClick={() => setModo("gps")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              background: modo === "gps" ? "#38bdf8" : "rgba(255,255,255,0.1)",
              color: modo === "gps" ? "#0f172a" : "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Gauge size={14} /> 2. Odómetro GPS en Vivo (Manejando)
          </button>

          <button
            onClick={() => setModo("cronologia")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              background: modo === "cronologia" ? "#38bdf8" : "rgba(255,255,255,0.1)",
              color: modo === "cronologia" ? "#0f172a" : "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Upload size={14} /> 3. Importar Cronología de Google Maps
          </button>
        </div>
      </div>

      {/* MODO 1: PLANIFICADOR DE RUTAS GOOGLE MAPS */}
      {modo === "planificador" && (
        <>
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
            <form onSubmit={handleCalcular}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    📍 Punto de Salida / Origen:
                  </label>
                  <input
                    type="text"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="ej. Santo Domingo, Av. Winston Churchill"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, fontWeight: 500 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", height: "100%", paddingBottom: 2 }}>
                  <button
                    type="button"
                    onClick={handleSwap}
                    title="Invertir origen y destino"
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--paper)", border: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    🏁 Punto de Llegada / Destino:
                  </label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="ej. Santiago de los Caballeros, Autopista Duarte"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 2 }}>
                      Rendimiento (km/galón):
                    </label>
                    <input
                      type="number"
                      value={rendimientoKmGal}
                      onChange={(e) => setRendimientoKmGal(e.target.value)}
                      style={{ width: 85, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 2 }}>
                      Precio del Galón (RD$):
                    </label>
                    <input
                      type="number"
                      value={precioGalonDOP}
                      onChange={(e) => setPrecioGalonDOP(e.target.value)}
                      style={{ width: 85, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12, fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={calculando}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--ink)", color: "var(--paper)", border: "none", cursor: "pointer" }}
                  >
                    <Navigation size={14} />
                    {calculando ? "Calculando..." : "Calcular con Google Maps"}
                  </button>

                  {resultadoRuta && (
                    <button
                      type="button"
                      onClick={() => setMostrarModalGuardar(true)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "var(--sage)", color: "#fff", border: "none", cursor: "pointer" }}
                    >
                      <BookmarkCheck size={15} />
                      + Guardar Recorrido
                    </button>
                  )}
                </div>
              </div>
            </form>

            {errorRuta && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "var(--stamp-bg)", color: "var(--stamp)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} /> {errorRuta}
              </div>
            )}
          </div>

          {resultadoRuta && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Gauge size={13} style={{ color: "var(--sage)" }} /> Distancia
                </div>
                <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                  {resultadoRuta.distanciaKm} km
                </div>
              </div>

              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} style={{ color: "var(--sage)" }} /> Tiempo Estimado
                </div>
                <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                  {Math.floor(resultadoRuta.duracionMinutos / 60)}h {resultadoRuta.duracionMinutos % 60}m
                </div>
              </div>

              {consumoEstimado && (
                <>
                  <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                      <Fuel size={13} style={{ color: "var(--sage)" }} /> Consumo
                    </div>
                    <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                      {consumoEstimado.galones} gal
                    </div>
                  </div>

                  <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                      <DollarSign size={13} style={{ color: "var(--sage)" }} /> Costo Combustible
                    </div>
                    <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--sage)" }}>
                      RD$ {consumoEstimado.costoDOP.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ width: "100%", height: 420, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 16 }}>
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{ lat: 18.7357, lng: -70.1627 }}
                defaultZoom={8}
                gestureHandling="greedy"
                fullscreenControl={true}
                internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
                style={{ width: "100%", height: "100%" }}
              >
                <RouteCalculatorMap
                  origen={origen}
                  destino={destino}
                  onRouteCalculated={(res) => {
                    setResultadoRuta(res);
                    setCalculando(false);
                  }}
                  onError={(err) => {
                    setErrorRuta(err);
                    setCalculando(false);
                  }}
                  triggerCalculation={triggerCount}
                />
              </Map>
            </APIProvider>
          </div>
        </>
      )}

      {/* MODO 2: ODÓMETRO GPS EN VIVO (MIENTRAS CONDUCES) */}
      {modo === "gps" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Gauge size={18} style={{ color: "var(--sage)" }} />
                Odómetro GPS en Vivo
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "4px 0 0" }}>
                Coloca tu teléfono en el tablero. La app rastreará los kilómetros reales de tu recorrido mientras conduces.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!gpsActivo ? (
                <button
                  onClick={iniciarGps}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: "var(--sage)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(86,171,95,0.3)",
                  }}
                >
                  <Play size={15} /> Iniciar Viaje en Auto
                </button>
              ) : (
                <button
                  onClick={detenerGps}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: "var(--stamp)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Square size={15} /> Pausar / Detener
                </button>
              )}
            </div>
          </div>

          {gpsError && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--stamp-bg)", color: "var(--stamp)", fontSize: 12.5, marginBottom: 16 }}>
              {gpsError}
            </div>
          )}

          {/* Tablero del Odómetro */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ background: "var(--paper)", padding: 18, borderRadius: 12, border: "1px solid var(--line)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>Kilómetros Recorridos</div>
              <div className="despensa-mono" style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", marginTop: 6 }}>
                {gpsKmRecorridos.toFixed(2)} <span style={{ fontSize: 16 }}>km</span>
              </div>
            </div>

            <div style={{ background: "var(--paper)", padding: 18, borderRadius: 12, border: "1px solid var(--line)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>Velocidad Actual</div>
              <div className="despensa-mono" style={{ fontSize: 32, fontWeight: 800, color: "var(--sage)", marginTop: 6 }}>
                {gpsVelocidadKmH} <span style={{ fontSize: 16 }}>km/h</span>
              </div>
            </div>

            <div style={{ background: "var(--paper)", padding: 18, borderRadius: 12, border: "1px solid var(--line)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>Tiempo en Marcha</div>
              <div className="despensa-mono" style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", marginTop: 6 }}>
                {Math.floor(gpsTiempoSegundos / 60)}:{(gpsTiempoSegundos % 60).toString().padStart(2, "0")}
              </div>
            </div>

            {consumoEstimado && (
              <div style={{ background: "var(--paper)", padding: 18, borderRadius: 12, border: "1px solid var(--line)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>Gasto Estimado</div>
                <div className="despensa-mono" style={{ fontSize: 26, fontWeight: 800, color: "var(--sage)", marginTop: 6 }}>
                  RD$ {consumoEstimado.costoDOP}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{consumoEstimado.galones} galones</div>
              </div>
            )}
          </div>

          {gpsKmRecorridos > 0 && !gpsActivo && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() =>
                  handleGuardarRecorrido({
                    origen: "Viaje en auto (GPS)",
                    destino: "Destino alcanzado",
                    distanciaKm: gpsKmRecorridos,
                    duracionMinutos: Math.round(gpsTiempoSegundos / 60),
                    fecha: new Date().toISOString().slice(0, 10),
                    notas: `Rastreo GPS en tiempo real: ${gpsKmRecorridos} km recorridos.`,
                  })
                }
                disabled={guardandoRuta}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 8,
                  background: "var(--sage)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <BookmarkCheck size={15} />
                Guardar este Recorrido en {vehiculoActual?.nombre}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODO 3: IMPORTAR CRONOLOGÍA DE GOOGLE MAPS */}
      {modo === "cronologia" && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Upload size={18} style={{ color: "var(--sage)" }} />
              Importar Cronología / Historial de Google Maps
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "6px 0 14px", lineHeight: 1.5 }}>
              Google Maps registra tus viajes y trayectos en auto de forma privada en tu teléfono. Puedes exportar el archivo de tu cronología y subirlo aquí para que la app extraiga tus kilómetros y consumo automáticamente.
            </p>

            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginBottom: 18, fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Info size={14} style={{ color: "var(--sage)" }} />
                ¿Cómo exportar tu cronología desde Google Maps en tu celular?
              </div>
              <ol style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--ink-soft)" }}>
                <li>Abre la app de <b>Google Maps</b> en tu teléfono móvil.</li>
                <li>Toca tu foto de perfil (arriba a la derecha) y selecciona <b>Tu cronología</b> (Timeline).</li>
                <li>Toca los 3 puntos (arriba a la derecha) ➔ <b>Ajustes y privacidad</b>.</li>
                <li>Busca la opción <b>Exportar datos de la cronología</b> o entra a <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sage)", fontWeight: 600 }}>Google Takeout ↗</a> y descarga el archivo JSON.</li>
                <li>Sube el archivo descargado en el botón de abajo:</li>
              </ol>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 8,
                background: "var(--ink)",
                color: "var(--paper)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Upload size={15} />
              {archivoCargando ? "Leyendo archivo..." : "Seleccionar Archivo de Google Maps (.json)"}
              <input type="file" accept=".json,.kml" onChange={handleCargarArchivoCronologia} style={{ display: "none" }} />
            </label>

            {mensajeImportacion && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "var(--sage-bg)", color: "var(--sage)", border: "1px solid var(--sage)", fontSize: 12.5, fontWeight: 600 }}>
                {mensajeImportacion}
              </div>
            )}
          </div>

          {/* Lista de viajes detectados en el archivo */}
          {viajesImportados.length > 0 && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line-soft)", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                  Recorridos detectados en el archivo ({viajesImportados.length})
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  Total: {viajesImportados.reduce((s, v) => s + v.distanciaKm, 0).toFixed(1)} km
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
                {viajesImportados.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Car size={13} style={{ color: "var(--sage)" }} />
                        <span>{v.origen} ➔ {v.destino}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                        Fecha: {v.fecha} · {v.duracionMinutos} min · {v.tipo}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="despensa-mono" style={{ fontSize: 14, fontWeight: 700 }}>
                        {v.distanciaKm} km
                      </span>
                      <button
                        onClick={() =>
                          handleGuardarRecorrido({
                            origen: v.origen,
                            destino: v.destino,
                            distanciaKm: v.distanciaKm,
                            duracionMinutos: v.duracionMinutos,
                            fecha: v.fecha,
                            notas: `Importado de Google Maps Timeline (${v.tipo}).`,
                          })
                        }
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          background: "var(--sage)",
                          color: "#fff",
                          border: "none",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Asignar a {vehiculoActual?.nombre || "Vehículo"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BITÁCORA HISTÓRICA DE RECORRIDOS */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              Bitácora de Kilómetros Registrados ({rutas.length})
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Historial de trayectos del vehículo para control de odómetro y combustible
            </div>
          </div>

          {rutas.length > 0 && (
            <div className="despensa-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--sage)" }}>
              Total: {rutas.reduce((s, r) => s + (Number(r.distanciaKm) || 0), 0).toFixed(1)} km acumulados
            </div>
          )}
        </div>

        {rutas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 12.5, background: "var(--paper)", borderRadius: 8 }}>
            Aún no has registrado ningún recorrido para tu vehículo. Puedes calcular uno en el mapa, usar el odómetro GPS en vivo o importar tu cronología de Google Maps.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rutas.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--paper)",
                  border: "1px solid var(--line-soft)",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Car size={13} style={{ color: "var(--sage)" }} />
                    <span>{r.origen} ➔ {r.destino}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3 }}>
                    Vehículo: <b>{r.activoNombre || "Vehículo"}</b> · Fecha: {r.fecha || "—"}
                    {r.duracionMinutos ? ` · ${Math.floor(r.duracionMinutos / 60)}h ${r.duracionMinutos % 60}m` : ""}
                    {r.costoEstimadoCombustible ? ` · RD$ ${r.costoEstimadoCombustible}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                    {r.distanciaKm} km
                  </div>

                  <button
                    onClick={async () => {
                      if (await confirm("¿Eliminar este recorrido del historial?")) {
                        deleteRutaVehiculo(r.id);
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--stamp)", cursor: "pointer", padding: 4 }}
                    title="Eliminar recorrido"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE GUARDADO MANUAL */}
      {mostrarModalGuardar && (
        <div
          onClick={() => setMostrarModalGuardar(false)}
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
              width: "min(460px, 100%)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Car size={16} style={{ color: "var(--sage)" }} />
                Registrar Recorrido en Vehículo
              </div>
              <button
                onClick={() => setMostrarModalGuardar(false)}
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
                <div style={{ background: "var(--paper)", padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Trayecto:</span>
                    <span style={{ fontWeight: 600 }}>{origen} ➔ {destino}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Distancia Google Maps:</span>
                    <span style={{ fontWeight: 700, color: "var(--sage)" }}>{resultadoRuta?.distanciaKm} km</span>
                  </div>
                  {consumoEstimado && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--ink-soft)" }}>Combustible Estimado:</span>
                      <span style={{ fontWeight: 600 }}>{consumoEstimado.galones} gal (RD$ {consumoEstimado.costoDOP})</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Vehículo al que pertenece este recorrido:
                  </label>
                  <select
                    value={vehiculoSeleccionadoId}
                    onChange={(e) => setVehiculoSeleccionadoId(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", fontSize: 13 }}
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚗 {v.nombre} {v.identificador ? `(${v.identificador})` : ""}
                      </option>
                    ))}
                    {vehiculos.length === 0 && <option value="">Sin vehículo específico</option>}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Fecha del Viaje:
                  </label>
                  <input
                    type="date"
                    value={fechaViaje}
                    onChange={(e) => setFechaViaje(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", fontSize: 13 }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Notas del Recorrido (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Viaje por Autopista Duarte, peajes incluidos"
                    value={notasViaje}
                    onChange={(e) => setNotasViaje(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={() => setMostrarModalGuardar(false)}
                    style={{ padding: "7px 14px", borderRadius: 7, background: "transparent", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer", fontSize: 12.5 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() =>
                      handleGuardarRecorrido({
                        origen,
                        destino,
                        distanciaKm: resultadoRuta?.distanciaKm || 0,
                        duracionMinutos: resultadoRuta?.duracionMinutos || 0,
                        fecha: fechaViaje,
                        notas: notasViaje,
                      })
                    }
                    disabled={guardandoRuta}
                    style={{ padding: "7px 16px", borderRadius: 7, background: "var(--sage)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
                  >
                    {guardandoRuta ? "Guardando..." : "Confirmar y Guardar"}
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
