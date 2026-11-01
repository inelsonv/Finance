import React, { useState } from "react";
import {
  X,
  Search,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  PiggyBank,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Building2,
  ChevronRight,
  Clock,
  Landmark,
} from "lucide-react";
import { addMetaAhorro } from "../lib/db";
import CustomDatePicker from "./CustomDatePicker.jsx";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EJEMPLOS_BUSQUEDA = [
  "Lavadora Secadora Inverter Samsung WD11T704DBX/ED",
  "Nevera Inverter Samsung 14 pies",
  "Smart TV Samsung 55 Crystal UHD",
  "Inversor Onda Senoidal 2.5kW con Baterías",
  "Aire Acondicionado Inverter 12000 BTU",
];

const COLORES_TIENDA = {
  corripio: { bg: "rgba(30, 58, 138, 0.25)", border: "#1e3a8a", text: "#93c5fd" },
  plazalama: { bg: "rgba(185, 28, 28, 0.25)", border: "#b91c1c", text: "#fca5a5" },
  jumbo: { bg: "rgba(4, 120, 87, 0.25)", border: "#047857", text: "#6ee7b7" },
  sirena: { bg: "rgba(220, 38, 38, 0.25)", border: "#dc2626", text: "#fca5a5" },
  pricesmart: { bg: "rgba(29, 78, 216, 0.25)", border: "#1d4ed8", text: "#bfdbfe" },
  curacao: { bg: "rgba(217, 119, 6, 0.25)", border: "#d97706", text: "#fde68a" },
  samsung: { bg: "rgba(14, 165, 233, 0.25)", border: "#0ea5e9", text: "#7dd3fc" },
  otro: { bg: "rgba(100, 116, 139, 0.2)", border: "#64748b", text: "#cbd5e1" },
};

function calcularFechaFutura(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

export default function BuscadorOfertasMetasModal({
  isOpen,
  onClose,
  cuentas = [],
  onMetaCreada,
}) {
  const [query, setQuery] = useState("Lavadora Secadora Inverter Samsung WD11T704DBX/ED");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Oferta seleccionada para planificar en presupuesto
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);
  const [plazoMeses, setPlazoMeses] = useState(6);
  const [fechaObjetivoCustom, setFechaObjetivoCustom] = useState(calcularFechaFutura(6));
  const [cuentaId, setCuentaId] = useState("");
  const [guardandoMeta, setGuardandoMeta] = useState(false);
  const [metaGuardadaExito, setMetaGuardadaExito] = useState(false);

  if (!isOpen) return null;

  const cuentasAhorro = cuentas.filter((c) =>
    ["Ahorro", "Inversión", "Corretaje"].includes(c.tipo)
  );

  const handleBuscar = async (busquedaCustom) => {
    const q = (busquedaCustom || query).trim();
    if (!q) return;
    setCargando(true);
    setError(null);
    setOfertaSeleccionada(null);
    setMetaGuardadaExito(false);

    try {
      const res = await fetch("/api/ofertas/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "No se pudieron obtener las ofertas");
      }
      setResultado(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarOferta = (oferta) => {
    setOfertaSeleccionada(oferta);
    setPlazoMeses(6);
    setFechaObjetivoCustom(calcularFechaFutura(6));
    setMetaGuardadaExito(false);
  };

  const handleCambiarPlazo = (meses) => {
    setPlazoMeses(meses);
    setFechaObjetivoCustom(calcularFechaFutura(meses));
  };

  const handleConfirmarMeta = async () => {
    if (!ofertaSeleccionada) return;
    setGuardandoMeta(true);
    setError(null);

    const precio = Number(ofertaSeleccionada.precioDOP) || 0;
    const nombreMeta = `${ofertaSeleccionada.titulo} (${ofertaSeleccionada.tienda})`;
    const hoy = new Date().toISOString().slice(0, 10);
    const cuenta = cuentas.find((c) => c.id === cuentaId);

    const nuevaMeta = {
      nombre: nombreMeta,
      tipoMeta: "Meta específica",
      cuentaId: cuentaId || null,
      cuentaNombre: cuenta ? cuenta.nombre : "",
      montoObjetivo: precio,
      porcentaje: null,
      fechaInicio: hoy,
      fechaObjetivo: fechaObjetivoCustom,
      estado: "Activa",
      categoria: "Hogar y electrodomésticos",
      activoId: null,
      notas: `Cotizado con Buscador de Ofertas locales. Tienda: ${ofertaSeleccionada.tienda}. Modelo: ${ofertaSeleccionada.modelo || "N/A"}.${ofertaSeleccionada.enlace ? ` Enlace: ${ofertaSeleccionada.enlace}` : ""}`,
    };

    try {
      await addMetaAhorro(nuevaMeta);
      setMetaGuardadaExito(true);
      if (onMetaCreada) onMetaCreada(nuevaMeta);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError("Error guardando la meta: " + (err.message || String(err)));
    } finally {
      setGuardandoMeta(false);
    }
  };

  // Cuota quincenal estimada para la oferta seleccionada
  const precioSeleccionado = ofertaSeleccionada ? Number(ofertaSeleccionada.precioDOP) || 0 : 0;
  const quincenasTotales = Math.max(plazoMeses * 2, 1);
  const cuotaQuincenal = Math.round(precioSeleccionado / quincenasTotales);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 860,
          maxHeight: "92vh",
          background: "var(--card, #0f172a)",
          border: "1px solid var(--line, #334155)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line, #334155)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0284c7 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink, #fff)", display: "flex", alignItems: "center", gap: 8 }}>
                Buscador de Ofertas & Metas de Ahorro
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: "rgba(5, 150, 105, 0.2)",
                    color: "var(--sage, #10b981)",
                    border: "1px solid rgba(5, 150, 105, 0.4)",
                  }}
                >
                  Mercado Local RD 🇩🇴
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)", marginTop: 2 }}>
                Cotiza artículos en tiendas locales y distribuye su costo en cuotas quincenales en tu presupuesto
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--line, #334155)",
              color: "var(--ink-soft, #94a3b8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
          {/* Barra de Búsqueda */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "var(--paper, #1e293b)",
                border: "1.5px solid var(--line, #334155)",
                borderRadius: 10,
                padding: "6px 8px 6px 12px",
                alignItems: "center",
              }}
            >
              <Search size={18} style={{ color: "var(--ink-soft, #94a3b8)", flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                placeholder="Escribe el artículo o modelo (ej. Lavadora Secadora Inverter Samsung WD11T704DBX/ED)..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13.5,
                  color: "var(--ink, #fff)",
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-soft, #94a3b8)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleBuscar()}
                disabled={cargando || !query.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "var(--sage, #059669)",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: cargando ? "wait" : "pointer",
                  opacity: cargando || !query.trim() ? 0.6 : 1,
                }}
              >
                {cargando ? (
                  <>
                    <Clock size={14} className="animate-spin" /> Buscando...
                  </>
                ) : (
                  <>
                    <Search size={14} /> Cotizar
                  </>
                )}
              </button>
            </div>

            {/* Sugerencias rápidas */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)", marginRight: 2 }}>
                Prueba con:
              </span>
              {EJEMPLOS_BUSQUEDA.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    handleBuscar(item);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    borderRadius: 14,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--line-soft, #334155)",
                    color: "var(--ink, #cbd5e1)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(5, 150, 105, 0.15)";
                    e.currentTarget.style.borderColor = "var(--sage, #059669)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "var(--line-soft, #334155)";
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Cargando */}
          {cargando && (
            <div style={{ textAlign: "center", padding: "40px 16px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  border: "3px solid rgba(5, 150, 105, 0.2)",
                  borderTopColor: "var(--sage, #059669)",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink, #fff)", marginBottom: 4 }}>
                Consultando tiendas y distribuidores en República Dominicana...
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)" }}>
                Revisando Tiendas Corripio, Plaza Lama, Jumbo, Sirena, PriceSmart y Samsung Store RD
              </div>
            </div>
          )}

          {/* Si se seleccionó una oferta para configurar la meta */}
          {ofertaSeleccionada && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                background: "linear-gradient(180deg, rgba(5, 150, 105, 0.12) 0%, rgba(2, 132, 199, 0.08) 100%)",
                border: "1.5px solid rgba(5, 150, 105, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PiggyBank size={18} style={{ color: "var(--sage, #10b981)" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink, #fff)" }}>
                    Paso 2: Planificar Meta y Distribuir en el Presupuesto Anual
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOfertaSeleccionada(null)}
                  style={{
                    fontSize: 11,
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-soft, #94a3b8)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Cambiar oferta
                </button>
              </div>

              {/* Resumen de la oferta elegida */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--card, #0f172a)",
                  border: "1px solid var(--line-soft, #334155)",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-soft, #94a3b8)", textTransform: "uppercase" }}>
                    {ofertaSeleccionada.tienda} · {ofertaSeleccionada.modelo || "Artículo"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #fff)" }}>
                    {ofertaSeleccionada.titulo}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft, #94a3b8)" }}>Precio de compra</div>
                  <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--sage, #10b981)" }}>
                    {formatMoney(ofertaSeleccionada.precioDOP)}
                  </div>
                </div>
              </div>

              {/* Selector de Plazo de Ahorro */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink, #fff)", marginBottom: 8 }}>
                  ¿En cuánto tiempo quieres alcanzar esta meta?
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                  {[
                    { meses: 3, label: "⚡ Rápido (3 meses)", quincenas: 6 },
                    { meses: 6, label: "🎯 Equilibrado (6 meses)", quincenas: 12 },
                    { meses: 12, label: "🛡️ Cómodo (1 año)", quincenas: 24 },
                  ].map((op) => {
                    const seleccionado = plazoMeses === op.meses;
                    const cuotaOp = Math.round(precioSeleccionado / op.quincenas);
                    return (
                      <button
                        key={op.meses}
                        type="button"
                        onClick={() => handleCambiarPlazo(op.meses)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `1.5px solid ${seleccionado ? "var(--sage, #10b981)" : "var(--line, #334155)"}`,
                          background: seleccionado ? "rgba(5, 150, 105, 0.15)" : "var(--card, #0f172a)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: seleccionado ? "var(--sage, #10b981)" : "var(--ink, #fff)" }}>
                          {op.label}
                        </div>
                        <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 800, color: "var(--ink, #fff)", marginTop: 4 }}>
                          {formatMoney(cuotaOp)}
                          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-soft, #94a3b8)" }}> /quincena</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-soft, #94a3b8)", marginTop: 2 }}>
                          {op.quincenas} quincenas de aporte
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vinculación de Cuenta y Fecha */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft, #94a3b8)", display: "block", marginBottom: 4 }}>
                    Cuenta de ahorro destino (opcional)
                  </label>
                  <select
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--line, #334155)",
                      background: "var(--paper, #1e293b)",
                      color: "var(--ink, #fff)",
                      fontSize: 12.5,
                    }}
                  >
                    <option value="">Ninguna (solo registrar en presupuesto)</option>
                    {cuentasAhorro.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.entidadName || "Banco"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft, #94a3b8)", display: "block", marginBottom: 4 }}>
                    Fecha meta objetivo
                  </label>
                  <CustomDatePicker
                    value={fechaObjetivoCustom}
                    onChange={(val) => setFechaObjetivoCustom(val)}
                    placeholder="Seleccionar fecha meta..."
                  />
                </div>
              </div>

              {/* Explicación de impacto en presupuesto */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(2, 132, 199, 0.12)",
                  border: "1px solid rgba(2, 132, 199, 0.25)",
                  marginBottom: 14,
                }}
              >
                <Landmark size={18} style={{ color: "#38bdf8", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 11.5, color: "#e0f2fe", lineHeight: 1.45 }}>
                  <strong>Impacto directo en Presupuesto Anual:</strong> Al guardar, el presupuesto distribuirá automáticamente{" "}
                  <strong style={{ color: "#38bdf8" }}>{formatMoney(cuotaQuincenal)}</strong> en cada quincena desde este mes hasta{" "}
                  {fechaObjetivoCustom}. Así acumularás los {formatMoney(precioSeleccionado)} de forma disciplinada sin recurrir a deudas con intereses.
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                {metaGuardadaExito ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--sage, #10b981)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <CheckCircle2 size={16} /> ¡Meta guardada y reflejada en el Presupuesto!
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmarMeta}
                    disabled={guardandoMeta}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 20px",
                      borderRadius: 8,
                      background: "var(--sage, #059669)",
                      color: "#fff",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: guardandoMeta ? "wait" : "pointer",
                      boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    <PiggyBank size={16} />
                    {guardandoMeta ? "Guardando en Presupuesto..." : "Guardar Meta y Distribuir en Presupuesto"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resultados de la búsqueda */}
          {resultado && !cargando && (
            <div>
              {/* Barra Resumen */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line-soft, #334155)",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Rango de precios en República Dominicana
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                    <span className="despensa-mono" style={{ fontSize: 17, fontWeight: 800, color: "var(--sage, #10b981)" }}>
                      {formatMoney(resultado.precioMinimoDOP)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ink-soft, #94a3b8)" }}>a</span>
                    <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink, #fff)" }}>
                      {formatMoney(resultado.precioMaximoDOP)}
                    </span>
                  </div>
                </div>

                {resultado.resumenMercado && (
                  <div style={{ maxWidth: 460, fontSize: 11.5, color: "var(--ink-soft, #cbd5e1)", lineHeight: 1.4 }}>
                    {resultado.resumenMercado}
                  </div>
                )}
              </div>

              {/* Lista de Ofertas Encontradas */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #fff)", marginBottom: 10 }}>
                Ofertas Encontradas ({resultado.ofertas?.length || 0})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(resultado.ofertas || []).map((of) => {
                  const logoKey = (of.logoTipo || "otro").toLowerCase();
                  const estiloTienda = COLORES_TIENDA[logoKey] || COLORES_TIENDA.otro;
                  const esSeleccionada = ofertaSeleccionada?.id === of.id;

                  return (
                    <div
                      key={of.id || of.tienda + of.titulo}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: esSeleccionada
                          ? "rgba(5, 150, 105, 0.12)"
                          : "var(--paper, #1e293b)",
                        border: `1.5px solid ${esSeleccionada ? "var(--sage, #10b981)" : "var(--line, #334155)"}`,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        {/* Información del artículo y tienda */}
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: estiloTienda.bg,
                                border: `1px solid ${estiloTienda.border}`,
                                color: estiloTienda.text,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Building2 size={11} /> {of.tienda}
                            </span>
                            {of.esMejorOferta && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: "rgba(5, 150, 105, 0.2)",
                                  border: "1px solid rgba(5, 150, 105, 0.4)",
                                  color: "var(--sage, #10b981)",
                                }}
                              >
                                ★ Mejor Oferta
                              </span>
                            )}
                            {of.disponibilidad && (
                              <span style={{ fontSize: 10.5, color: "var(--ink-soft, #94a3b8)" }}>
                                • {of.disponibilidad}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink, #fff)", marginBottom: 4 }}>
                            {of.titulo}
                          </div>

                          {/* Características */}
                          {Array.isArray(of.caracteristicas) && of.caracteristicas.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, marginBottom: 6 }}>
                              {of.caracteristicas.map((car, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "var(--ink-soft, #94a3b8)",
                                  }}
                                >
                                  {car}
                                </span>
                              ))}
                            </div>
                          )}

                          {of.garantia && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-soft, #94a3b8)", marginTop: 2 }}>
                              <ShieldCheck size={12} style={{ color: "var(--sage, #10b981)" }} />
                              <span>Garantía: {of.garantia}</span>
                            </div>
                          )}
                        </div>

                        {/* Precios y Acción */}
                        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                          <div>
                            <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--sage, #10b981)" }}>
                              {formatMoney(of.precioDOP)}
                            </div>
                            {of.precioAnteriorDOP && (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginTop: 1 }}>
                                <span className="despensa-mono" style={{ fontSize: 11.5, color: "var(--ink-soft, #94a3b8)", textDecoration: "line-through" }}>
                                  {formatMoney(of.precioAnteriorDOP)}
                                </span>
                                {of.descuentoPct && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171" }}>
                                    -{of.descuentoPct}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {of.enlace && (
                              <a
                                href={of.enlace}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 11,
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line-soft, #334155)",
                                  background: "rgba(255, 255, 255, 0.04)",
                                  color: "var(--ink-soft, #94a3b8)",
                                  textDecoration: "none",
                                }}
                                title="Ver página o catálogo de la tienda"
                              >
                                Ver tienda <ExternalLink size={10} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSeleccionarOferta(of)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 12px",
                                borderRadius: 7,
                                background: esSeleccionada ? "var(--ink, #fff)" : "var(--sage, #059669)",
                                color: esSeleccionada ? "var(--paper, #0f172a)" : "#fff",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <PiggyBank size={13} />
                              {esSeleccionada ? "Oferta seleccionada" : "Crear meta de ahorro"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fuentes de búsqueda */}
              {Array.isArray(resultado.enlacesFuentes) && resultado.enlacesFuentes.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--line-soft, #334155)", fontSize: 11, color: "var(--ink-soft, #94a3b8)" }}>
                  <span>Fuentes verificadas en línea: </span>
                  {resultado.enlacesFuentes.slice(0, 3).map((f, i) => (
                    <a
                      key={i}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#38bdf8", marginRight: 10, textDecoration: "none" }}
                    >
                      {f.title || new URL(f.url).hostname} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
