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
  Sparkles
} from "lucide-react";
import { addRutaVehiculo, deleteRutaVehiculo } from "../lib/db";
import { confirm } from "../lib/confirm";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyC9ViJpHkdrsXDtcOxxKuMYoQPLZAitmy0";

// Lugares frecuentes y ciudades principales en República Dominicana y el Caribe
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

// Componente interno que interactúa con el mapa y la librería de rutas
function RouteCalculatorMap({
  origen,
  destino,
  onRouteCalculated,
  onError,
  triggerCalculation,
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!routesLib || !map || !origen || !destino) return;

    // Limpiar polilíneas previas
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Intento con la moderna Routes API de Google Maps
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
        .catch(() => {
          fallbackDirectionsService();
        });
    } else {
      fallbackDirectionsService();
    }

    function fallbackDirectionsService() {
      // Fallback robusto usando google.maps.DirectionsService
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

            // Dibujar ruta en mapa
            const poly = new window.google.maps.Polyline({
              path: route.overview_path,
              strokeColor: "#2563eb",
              strokeWeight: 6,
              strokeOpacity: 0.85,
              map: map,
            });
            polylinesRef.current = [poly];

            if (route.bounds) {
              map.fitBounds(route.bounds);
            }

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
  const [origen, setOrigen] = useState("Santo Domingo, República Dominicana");
  const [destino, setDestino] = useState("Santiago de los Caballeros, República Dominicana");
  const [calculando, setCalculando] = useState(false);
  const [errorRuta, setErrorRuta] = useState(null);
  const [resultadoRuta, setResultadoRuta] = useState(null);
  const [triggerCount, setTriggerCount] = useState(0);

  // Parámetros de consumo de combustible
  const [rendimientoKmGal, setRendimientoKmGal] = useState("28"); // ~28 km/galón promedio Honda CR-V 2014
  const [precioGalonDOP, setPrecioGalonDOP] = useState("290"); // RD$ ~290 por galón regular/premium

  // Modal para guardar en el vehículo
  const [mostrarModalGuardar, setMostrarModalGuardar] = useState(false);
  const vehiculos = useMemo(() => (activos || []).filter((a) => a.tipo === "Vehículo"), [activos]);
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(() => vehiculos[0]?.id || "");
  const [fechaViaje, setFechaViaje] = useState(() => new Date().toISOString().slice(0, 10));
  const [notasViaje, setNotasViaje] = useState("");
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  const vehiculoActual = vehiculos.find((v) => v.id === vehiculoSeleccionadoId) || vehiculos[0];

  // Cálculo de combustible y costo
  const consumoEstimado = useMemo(() => {
    if (!resultadoRuta) return null;
    const km = resultadoRuta.distanciaKm;
    const rend = parseFloat(rendimientoKmGal) || 28;
    const precio = parseFloat(precioGalonDOP) || 290;

    const galones = km / rend;
    const costoDOP = galones * precio;
    return {
      galones: galones.toFixed(2),
      litros: (galones * 3.78541).toFixed(1),
      costoDOP: Math.round(costoDOP),
    };
  }, [resultadoRuta, rendimientoKmGal, precioGalonDOP]);

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

  const handleRouteCalculated = (res) => {
    setResultadoRuta(res);
    setCalculando(false);
  };

  const handleError = (msg) => {
    setErrorRuta(msg);
    setCalculando(false);
  };

  const handleGuardarEnVehiculo = async () => {
    if (!resultadoRuta) return;
    setGuardandoRuta(true);
    try {
      await addRutaVehiculo({
        activoId: vehiculoActual?.id || null,
        activoNombre: vehiculoActual?.nombre || "Mi Vehículo",
        origen,
        destino,
        distanciaKm: resultadoRuta.distanciaKm,
        duracionMinutos: resultadoRuta.duracionMinutos,
        fecha: fechaViaje,
        combustibleEstimadoGal: consumoEstimado ? parseFloat(consumoEstimado.galones) : null,
        costoEstimadoCombustible: consumoEstimado ? consumoEstimado.costoDOP : null,
        notas: notasViaje.trim() || `Recorrido de ${resultadoRuta.distanciaKm} km con Google Maps.`,
      });
      setMensajeExito("¡Recorrido registrado exitosamente en el historial del vehículo!");
      setTimeout(() => {
        setMensajeExito(null);
        setMostrarModalGuardar(false);
        setNotasViaje("");
      }, 1800);
    } catch (err) {
      alert("Error al guardar: " + (err.message || String(err)));
    } finally {
      setGuardandoRuta(false);
    }
  };

  // Calcular la ruta inicial automáticamente
  useEffect(() => {
    handleCalcular();
  }, []);

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* 1. ENCABEZADO */}
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
              Conexión de Rutas & Odómetro con Google Maps
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Calcula los Kilómetros Recorridos y Consumo de tu Vehículo
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "6px 0 0", maxWidth: 640 }}>
              Traza tus recorridos en tiempo real sobre Google Maps, obtén la distancia exacta en kilómetros, el tiempo de viaje con tráfico y el gasto estimado en combustible.
            </p>
          </div>

          {resultadoRuta && (
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
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Distancia Total</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono, monospace)" }}>
                {resultadoRuta.distanciaKm} km
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                ⏱️ {Math.floor(resultadoRuta.duracionMinutos / 60)}h {resultadoRuta.duracionMinutos % 60}m estimadas
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. FORMULARIO DE ORIGEN, DESTINO Y PARÁMETROS */}
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
            {/* Origen */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                📍 Punto de Salida / Origen:
              </label>
              <input
                type="text"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                placeholder="ej. Santo Domingo, Av. Winston Churchill"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              />
            </div>

            {/* Intercambiar */}
            <div style={{ display: "flex", alignItems: "flex-end", height: "100%", paddingBottom: 2 }}>
              <button
                type="button"
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
                }}
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>

            {/* Destino */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                🏁 Punto de Llegada / Destino:
              </label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="ej. Santiago de los Caballeros, Autopista Duarte"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>

          {/* Rutas rápidas predeterminadas de RD */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6, fontWeight: 600 }}>
              Destinos sugeridos en República Dominicana:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DESTINOS_FRECUENTES_RD.slice(0, 6).map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDestino(d);
                    setTimeout(() => handleCalcular(), 100);
                  }}
                  style={{
                    background: "var(--paper)",
                    color: "var(--ink)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "4px 9px",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {d.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Parámetros de Combustible y Botones de Acción */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 2 }}>
                  Rendimiento del Auto (km/galón):
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--ink)",
                  color: "var(--paper)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Navigation size={14} />
                {calculando ? "Calculando Ruta..." : "Trazar en Google Maps"}
              </button>

              {resultadoRuta && (
                <button
                  type="button"
                  onClick={() => setMostrarModalGuardar(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "var(--sage)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
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
            <AlertCircle size={14} />
            {errorRuta}
          </div>
        )}
      </div>

      {/* 3. TARJETAS DE RESULTADO DE KILÓMETROS Y CONSUMO */}
      {resultadoRuta && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Distancia */}
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
              <Gauge size={13} style={{ color: "var(--sage)" }} />
              Distancia Recorrida
            </div>
            <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--ink)" }}>
              {resultadoRuta.distanciaKm} km
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
              Equivalente a {(resultadoRuta.distanciaKm * 0.621371).toFixed(1)} millas
            </div>
          </div>

          {/* Tiempo */}
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} style={{ color: "var(--sage)" }} />
              Tiempo Estimado
            </div>
            <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--ink)" }}>
              {Math.floor(resultadoRuta.duracionMinutos / 60)}h {resultadoRuta.duracionMinutos % 60}m
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
              Tráfico regular en carretera
            </div>
          </div>

          {/* Combustible */}
          {consumoEstimado && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <Fuel size={13} style={{ color: "var(--sage)" }} />
                Consumo de Gasolina
              </div>
              <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--ink)" }}>
                {consumoEstimado.galones} gal
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                Aprox. {consumoEstimado.litros} litros
              </div>
            </div>
          )}

          {/* Costo en Combustible */}
          {consumoEstimado && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
                <DollarSign size={13} style={{ color: "var(--sage)" }} />
                Costo Estimado
              </div>
              <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--sage)" }}>
                RD$ {consumoEstimado.costoDOP.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                ~ USD ${(consumoEstimado.costoDOP / 60).toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. VISUALIZADOR DE MAPA GOOGLE MAPS INTERACTIVO */}
      <div
        style={{
          width: "100%",
          height: 440,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--line)",
          marginBottom: 16,
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
      >
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
              onRouteCalculated={handleRouteCalculated}
              onError={handleError}
              triggerCalculation={triggerCount}
            />
          </Map>
        </APIProvider>
      </div>

      {/* 5. HISTORIAL DE RECORRIDOS Y KILÓMETROS GUARDADOS */}
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
              Bitácora de Rutas y Kilómetros Recorridos ({rutas.length})
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
              Historial de trayectos guardados para control de kilometraje y consumo
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
            Aún no has guardado ningún recorrido. Traza una ruta arriba y pulsa <b>"+ Guardar Recorrido"</b> para registrarla en tu vehículo.
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

      {/* 6. MODAL PARA GUARDAR RECORRIDO EN EL VEHÍCULO */}
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
                    placeholder="ej. Viaje de trabajo a Santiago, 1 peaje incluido"
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
                    onClick={handleGuardarEnVehiculo}
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
