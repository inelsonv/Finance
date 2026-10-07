import React, { useState, useMemo } from "react";
import {
  PieChart,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Save,
  Check,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  METODOLOGIAS,
  clasificarPilarCategoria,
  calcularTotalesPorPilar,
  generarDistribucionMetodologia,
} from "../lib/metodologiaPresupuesto";
import { saveMetodologiaPresupuestoConfig, setPresupuestoBatch } from "../lib/db";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + Math.round(v).toLocaleString("es");
}

export default function MetodologiaPresupuestoModal({
  isOpen,
  onClose,
  configActual = {},
  categorias = [],
  presupuesto = {},
  year = new Date().getFullYear(),
  ingresoMensual = 0,
  prestamosActivos = [],
  contratosActivos = [],
  metasActivas = [],
  movimientos = [],
  diezmoMensual = 0,
  ahorroMensual = 0,
  mesSeleccionado = new Date().getMonth() + 1,
  onAplicado,
}) {
  const [tabInterno, setTabInterno] = useState("metodologia"); // "metodologia" | "clasificacion" | "aplicar"
  const [metodologiaId, setMetodologiaId] = useState(() => configActual.metodologia || "50-30-20");
  const [pilares, setPilares] = useState(() => configActual.pilares || {});
  const [customPct, setCustomPct] = useState(() => configActual.customPct || { necesidad: 50, deseo: 30, ahorro: 20, donacion: 0 });
  const [mesParaAnalisis, setMesParaAnalisis] = useState(mesSeleccionado);
  const [modoReparto, setModoReparto] = useState("proporcional"); // "proporcional" | "equitativo"
  const [alcanceAplicacion, setAlcanceAplicacion] = useState("mes"); // "mes" | "adelante" | "ano"
  const [soloVacios, setSoloVacios] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Totales de compromisos para el mes
  const fijosMes = useMemo(() => {
    let prestamosTotal = 0;
    for (const p of prestamosActivos) {
      if (p.cuota) prestamosTotal += Number(p.cuota) || 0;
    }
    let contratosTotal = 0;
    for (const c of contratosActivos) {
      if (c.montoEstimado) contratosTotal += Number(c.montoEstimado) || 0;
    }
    let metasTotal = 0;
    for (const m of metasActivas) {
      if (m.montoObjetivo) metasTotal += (Number(m.montoObjetivo) || 0) / 12;
      else if (m.porcentaje && ingresoMensual > 0) metasTotal += (ingresoMensual * (m.porcentaje / 100));
    }
    return {
      prestamosTotal,
      contratosTotal,
      metasTotal,
      diezmoTotal: Number(diezmoMensual) || 0,
      ahorroAutoTotal: Number(ahorroMensual) || 0,
    };
  }, [prestamosActivos, contratosActivos, metasActivas, ingresoMensual, diezmoMensual, ahorroMensual]);

  // Totales por pilar en el mes seleccionado
  const { totales, totalPresupuestado } = useMemo(() => {
    return calcularTotalesPorPilar({
      categorias,
      presupuesto,
      mes: mesParaAnalisis,
      pilaresGuardados: pilares,
      prestamosTotalMes: fijosMes.prestamosTotal,
      contratosTotalMes: fijosMes.contratosTotal,
      metasTotalMes: fijosMes.metasTotal,
      diezmoTotalMes: fijosMes.diezmoTotal,
      ahorroAutoTotalMes: fijosMes.ahorroAutoTotal,
    });
  }, [categorias, presupuesto, mesParaAnalisis, pilares, fijosMes]);

  const metodoActual = METODOLOGIAS[metodologiaId] || METODOLOGIAS["50-30-20"];

  // Balance Base Cero
  const balanceBaseCero = ingresoMensual - totalPresupuestado;

  // Distribución simulada para previsualización
  const distribucionSimulada = useMemo(() => {
    return generarDistribucionMetodologia({
      metodologiaId,
      customPct,
      ingresoMensual,
      categorias,
      pilaresGuardados: pilares,
      prestamosTotalMes: fijosMes.prestamosTotal,
      contratosTotalMes: fijosMes.contratosTotal,
      metasTotalMes: fijosMes.metasTotal,
      diezmoTotalMes: fijosMes.diezmoTotal,
      modoReparto,
      movimientos,
      presupuestoActual: presupuesto,
      mes: mesParaAnalisis,
    });
  }, [
    metodologiaId,
    customPct,
    ingresoMensual,
    categorias,
    pilares,
    fijosMes,
    modoReparto,
    movimientos,
    presupuesto,
    mesParaAnalisis,
  ]);

  const totalSimulado = useMemo(() => {
    let sum = fijosMes.prestamosTotal + fijosMes.contratosTotal + fijosMes.metasTotal + fijosMes.diezmoTotal;
    for (const montos of Object.values(distribucionSimulada)) {
      sum += (montos.totalMes || 0);
    }
    return sum;
  }, [distribucionSimulada, fijosMes]);

  const handleCambiarPilarCategoria = (catNombre, nuevoPilar) => {
    setPilares((prev) => ({
      ...prev,
      [catNombre]: nuevoPilar,
    }));
  };

  const handleGuardarConfig = async () => {
    setGuardando(true);
    setMensajeExito(null);
    try {
      await saveMetodologiaPresupuestoConfig({
        metodologia: metodologiaId,
        pilares,
        customPct,
      });
      setMensajeExito("¡Preferencias de presupuesto guardadas!");
      setTimeout(() => setMensajeExito(null), 2500);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleAplicarAlPresupuesto = async () => {
    let mesesTexto = "";
    if (alcanceAplicacion === "mes") mesesTexto = `el mes de ${MESES[mesParaAnalisis - 1]} ${year}`;
    else if (alcanceAplicacion === "adelante") mesesTexto = `desde ${MESES[mesParaAnalisis - 1]} hasta Diciembre de ${year}`;
    else mesesTexto = `TODO el año ${year} (12 meses)`;

    const confirmMsg = `¿Deseas aplicar la configuración de "${metodoActual.nombre}" para ${mesesTexto}?\n\n` +
      `• Modo de cálculo: ${modoReparto === "proporcional" ? "Proporcional a hábitos/gastos reales" : "Equitativo en partes iguales"}\n` +
      `• Regla de sobrescritura: ${soloVacios ? "Solo celdas vacías o en $0" : "Reemplazar valores actuales"}`;

    if (!confirm(confirmMsg)) return;

    setAplicando(true);
    try {
      // Determinar meses a aplicar
      let meses = [];
      if (alcanceAplicacion === "mes") {
        meses = [mesParaAnalisis];
      } else if (alcanceAplicacion === "adelante") {
        for (let m = mesParaAnalisis; m <= 12; m++) meses.push(m);
      } else {
        meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      }

      // Preparar estructura de actualización por lotes
      const updateData = {};

      for (const m of meses) {
        for (const [catNombre, montos] of Object.entries(distribucionSimulada)) {
          if (soloVacios) {
            const actualQ1 = Number(presupuesto?.[catNombre]?.[String(m)]?.Q1) || 0;
            const actualQ2 = Number(presupuesto?.[catNombre]?.[String(m)]?.Q2) || 0;
            if (actualQ1 > 0 || actualQ2 > 0) continue; // Respetar lo existente
          }

          if (!updateData[catNombre]) updateData[catNombre] = {};
          updateData[catNombre][String(m)] = {
            Q1: montos.Q1 || 0,
            Q2: montos.Q2 || 0,
          };
        }
      }

      if (Object.keys(updateData).length > 0) {
        await setPresupuestoBatch(year, updateData);
      }

      // Guardar también la configuración activa
      await saveMetodologiaPresupuestoConfig({
        metodologia: metodologiaId,
        pilares,
        customPct,
      });

      setMensajeExito(`¡Configuración de ${metodoActual.nombre} aplicada exitosamente a ${meses.length} mes(es)!`);
      if (onAplicado) onAplicado();
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err) {
      alert("Error al aplicar la configuración: " + err.message);
    } finally {
      setAplicando(false);
    }
  };

  const categoriasFiltradas = useMemo(() => {
    if (!filtroCategoria.trim()) return categorias;
    const f = filtroCategoria.toLowerCase();
    return categorias.filter((c) => (c.nombre || "").toLowerCase().includes(f));
  }, [categorias, filtroCategoria]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          width: "min(840px, 98vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 75px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* ENCABEZADO */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid var(--line)",
            background: "var(--paper)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              <PieChart size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Configuración y Tipos de Presupuesto
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {year}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "2px 0 0 0" }}>
                Elige y aplica un modelo financiero comprobado (50/30/20, Base Cero, etc.) a tus categorías
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVEGACIÓN INTERNA DE PESTAÑAS */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 22px",
            background: "var(--card)",
            borderBottom: "1px solid var(--line)",
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => setTabInterno("metodologia")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: tabInterno === "metodologia" ? "1px solid var(--sage)" : "1px solid transparent",
              background: tabInterno === "metodologia" ? "var(--sage-bg)" : "transparent",
              color: tabInterno === "metodologia" ? "var(--sage)" : "var(--ink-soft)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Sliders size={14} />
            1. Tipos de Presupuesto
          </button>

          <button
            onClick={() => setTabInterno("aplicar")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: tabInterno === "aplicar" ? "1px solid var(--sage)" : "1px solid transparent",
              background: tabInterno === "aplicar" ? "var(--sage-bg)" : "transparent",
              color: tabInterno === "aplicar" ? "var(--sage)" : "var(--ink-soft)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Zap size={14} />
            2. Aplicar al Presupuesto
          </button>

          <button
            onClick={() => setTabInterno("clasificacion")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: tabInterno === "clasificacion" ? "1px solid var(--sage)" : "1px solid transparent",
              background: tabInterno === "clasificacion" ? "var(--sage-bg)" : "transparent",
              color: tabInterno === "clasificacion" ? "var(--sage)" : "var(--ink-soft)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Layers size={14} />
            3. Clasificación de Categorías ({categorias.length})
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div style={{ padding: 22, flex: 1, overflowY: "auto" }}>
          {mensajeExito && (
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "var(--sage-bg)",
                color: "var(--sage)",
                border: "1px solid var(--sage)",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: "fadeIn 0.2s ease",
              }}
            >
              <CheckCircle2 size={18} /> {mensajeExito}
            </div>
          )}

          {/* TAB 1: SELECCIÓN Y CONFIGURACIÓN DE METODOLOGÍA */}
          {tabInterno === "metodologia" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                  Elige el modelo financiero a aplicar:
                </span>
                <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "2px 0 12px 0" }}>
                  Selecciona la estrategia que mejor se adapte a tu meta actual (balancear gastos, eliminar deudas o maximizar ahorro).
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {Object.values(METODOLOGIAS).map((m) => {
                    const activo = m.id === metodologiaId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMetodologiaId(m.id)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: activo ? "2px solid var(--sage)" : "1px solid var(--line)",
                          background: activo ? "var(--sage-bg)" : "var(--paper)",
                          color: "var(--ink)",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.nombre}</span>
                          {activo && (
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "var(--sage)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--sage)", marginBottom: 4 }}>
                          {m.badge}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.35 }}>
                          {m.resumenCorto || m.descripcion.slice(0, 75) + "..."}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* TARJETA DETALLE DE LA METODOLOGÍA ACTIVA */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <ShieldCheck size={16} style={{ color: "var(--sage)" }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                      {metodoActual.nombre} {metodoActual.autor ? `· ${metodoActual.autor}` : ""}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px 0", lineHeight: 1.5 }}>
                    {metodoActual.descripcion}
                  </p>

                  {/* SLIDERS EN CASO PERSONALIZADO */}
                  {metodoActual.esPersonalizado && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "var(--card)", border: "1px solid var(--line-soft)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 10 }}>
                        Ajusta tus porcentajes objetivos (deben sumar 100%):
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                            <span>🏠 Necesidades</span>
                            <b>{customPct.necesidad}%</b>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={customPct.necesidad}
                            onChange={(e) => setCustomPct((p) => ({ ...p, necesidad: Number(e.target.value) }))}
                            style={{ width: "100%" }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                            <span>☕ Deseos</span>
                            <b>{customPct.deseo}%</b>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={customPct.deseo}
                            onChange={(e) => setCustomPct((p) => ({ ...p, deseo: Number(e.target.value) }))}
                            style={{ width: "100%" }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                            <span>📈 Ahorro / Deuda</span>
                            <b>{customPct.ahorro}%</b>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={customPct.ahorro}
                            onChange={(e) => setCustomPct((p) => ({ ...p, ahorro: Number(e.target.value) }))}
                            style={{ width: "100%" }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                            <span>🤝 Donación / Diezmo</span>
                            <b>{customPct.donacion || 0}%</b>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={customPct.donacion || 0}
                            onChange={(e) => setCustomPct((p) => ({ ...p, donacion: Number(e.target.value) }))}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 11, color: (customPct.necesidad + customPct.deseo + customPct.ahorro + (customPct.donacion || 0)) === 100 ? "var(--sage)" : "var(--stamp)" }}>
                        Suma total: <b>{customPct.necesidad + customPct.deseo + customPct.ahorro + (customPct.donacion || 0)}%</b>
                        {(customPct.necesidad + customPct.deseo + customPct.ahorro + (customPct.donacion || 0)) !== 100 && " (Ajusta los deslizadores para llegar a 100%)"}
                      </div>
                    </div>
                  )}
                </div>

                {/* DIAGNÓSTICO EN TIEMPO REAL */}
                <div
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        Diagnóstico Actual: {MESES[mesParaAnalisis - 1]} {year}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                        Ingreso neto estimado: <b style={{ color: "var(--sage)" }}>{formatMoney(ingresoMensual)}</b> · Presupuestado: <b>{formatMoney(totalPresupuestado)}</b>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Mes a examinar:</span>
                      <select
                        value={mesParaAnalisis}
                        onChange={(e) => setMesParaAnalisis(Number(e.target.value))}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: "var(--card)",
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        {MESES.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CASO: BASE CERO */}
                  {metodoActual.esBaseCero ? (
                    <div style={{ padding: 14, borderRadius: 10, background: "var(--card)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          Balance a Cero (Ingresos - Todo lo Presupuestado):
                        </span>
                        <span
                          className="despensa-mono"
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: balanceBaseCero === 0 ? "var(--sage)" : balanceBaseCero > 0 ? "#3b82f6" : "var(--stamp)",
                          }}
                        >
                          {formatMoney(balanceBaseCero)}
                        </span>
                      </div>

                      {balanceBaseCero === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--sage)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                          <CheckCircle2 size={16} /> ¡Perfecto! Cumplimiento exacto de Base Cero: cada peso tiene su asignación ($0 remanente).
                        </div>
                      ) : balanceBaseCero > 0 ? (
                        <div style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.4 }}>
                          ℹ️ Tienes <b>{formatMoney(balanceBaseCero)}</b> sin asignar. En Base Cero, debes distribuirlos a Metas de Ahorro, Inversión o deudas para llegar a $0.
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--stamp)", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.4 }}>
                          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                          Presupuesto sobregirado por <b>{formatMoney(Math.abs(balanceBaseCero))}</b>. Debes recortar gastos o deseos para cuadrar a $0.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* CASO POR PILARES (%): 50/30/20, 70/20/10, etc. */
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {Object.entries(
                        metodoActual.esPersonalizado
                          ? {
                              necesidad: { pct: customPct.necesidad, label: "Necesidades", color: "#3b82f6" },
                              deseo: { pct: customPct.deseo, label: "Deseos", color: "#f59e0b" },
                              ahorro: { pct: customPct.ahorro, label: "Ahorro/Inversión", color: "#10b981" },
                            }
                          : metodoActual.pilares || {}
                      ).map(([pilarKey, config]) => {
                        const montoReal = totales[pilarKey] || 0;
                        const pctReal = ingresoMensual > 0 ? Math.round((montoReal / ingresoMensual) * 100) : 0;
                        const pctMeta = config.pct || 0;
                        const excedido = pctReal > pctMeta + 3;

                        return (
                          <div
                            key={pilarKey}
                            style={{
                              background: "var(--card)",
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid var(--line-soft)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 12 }}>
                              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 9, height: 9, borderRadius: "50%", background: config.color }} />
                                {config.label} (Objetivo: {pctMeta}%)
                              </span>
                              <span className="despensa-mono">
                                <b>{formatMoney(montoReal)}</b> ({pctReal}%)
                              </span>
                            </div>

                            <div style={{ height: 7, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(pctReal, 100)}%`,
                                  background: excedido ? "var(--stamp)" : config.color,
                                  borderRadius: 4,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setTabInterno("aplicar")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 18px",
                      borderRadius: 10,
                      background: "var(--sage)",
                      color: "#fff",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                    }}
                  >
                    Continuar a Aplicar Distribución <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APLICAR DISTRIBUCIÓN AL PRESUPUESTO */}
          {tabInterno === "aplicar" && (
            <div>
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%)",
                  border: "1px solid var(--sage)",
                  marginBottom: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Sparkles size={17} style={{ color: "var(--sage)" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                    Aplicar {metodoActual.nombre} a tus celdas de Presupuesto
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.4 }}>
                  Genera automáticamente los montos de cada quincena (Q1 y Q2) para todas tus categorías según las reglas de este modelo.
                </p>
              </div>

              {/* OPCIONES DE APLICACIÓN */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {/* 1. MODO DE REPARTO */}
                <div style={{ background: "var(--paper)", padding: 14, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Forma de repartir el cupo del pilar:
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="modoReparto"
                        value="proporcional"
                        checked={modoReparto === "proporcional"}
                        onChange={() => setModoReparto("proporcional")}
                      />
                      <span>
                        <b>Proporcional (Recomendado):</b> Respeta tus gastos históricos reales de cada categoría.
                      </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="modoReparto"
                        value="equitativo"
                        checked={modoReparto === "equitativo"}
                        onChange={() => setModoReparto("equitativo")}
                      />
                      <span>
                        <b>Equitativo:</b> Divide el cupo del pilar en partes exactamente iguales entre sus categorías.
                      </span>
                    </label>
                  </div>
                </div>

                {/* 2. ALCANCE TEMPORAL */}
                <div style={{ background: "var(--paper)", padding: 14, borderRadius: 12, border: "1px solid var(--line)" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Meses a los que se aplicará:
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="alcance"
                        value="mes"
                        checked={alcanceAplicacion === "mes"}
                        onChange={() => setAlcanceAplicacion("mes")}
                      />
                      <span>Solo en <b>{MESES[mesParaAnalisis - 1]} {year}</b></span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="alcance"
                        value="adelante"
                        checked={alcanceAplicacion === "adelante"}
                        onChange={() => setAlcanceAplicacion("adelante")}
                      />
                      <span>Desde <b>{MESES[mesParaAnalisis - 1]} hasta Diciembre</b> de {year}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="alcance"
                        value="ano"
                        checked={alcanceAplicacion === "ano"}
                        onChange={() => setAlcanceAplicacion("ano")}
                      />
                      <span>En <b>todo el año {year}</b> (los 12 meses)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* CHECKBOX PROTEGER LO EXISTENTE */}
              <div style={{ marginBottom: 18, background: "var(--card)", padding: 12, borderRadius: 10, border: "1px solid var(--line)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={soloVacios}
                    onChange={(e) => setSoloVacios(e.target.checked)}
                  />
                  <span>
                    <b>Solo rellenar categorías vacías o en $0</b> (proteger montos que ya ingresaste manualmente)
                  </span>
                </label>
              </div>

              {/* VISTA PREVIA INTERACTIVA */}
              <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--line)", marginBottom: 18, overflow: "hidden" }}>
                <div
                  onClick={() => setMostrarPreview((s) => !s)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: "var(--card)",
                    borderBottom: mostrarPreview ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Eye size={15} style={{ color: "var(--sage)" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                      Vista Previa de la Asignación Calculada ({Object.keys(distribucionSimulada).length} categorías)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                      Total Mensual Estimado: <b>{formatMoney(totalSimulado)}</b>
                    </span>
                    {mostrarPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {mostrarPreview && (
                  <div style={{ maxHeight: 250, overflowY: "auto", padding: "6px 12px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-soft)", textAlign: "left" }}>
                          <th style={{ padding: "6px 8px" }}>Categoría</th>
                          <th style={{ padding: "6px 8px" }}>Pilar</th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>Quincena 1 (Q1)</th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>Quincena 2 (Q2)</th>
                          <th style={{ padding: "6px 8px", textAlign: "right" }}>Total Mes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(distribucionSimulada).map(([catNombre, montos]) => {
                          const pilar = montos.pilar || clasificarPilarCategoria(catNombre, pilares);
                          return (
                            <tr key={catNombre} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                              <td style={{ padding: "6px 8px", fontWeight: 600 }}>{catNombre}</td>
                              <td style={{ padding: "6px 8px" }}>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    background:
                                      pilar === "necesidad"
                                        ? "rgba(59, 130, 246, 0.12)"
                                        : pilar === "deseo"
                                        ? "rgba(245, 158, 11, 0.12)"
                                        : pilar === "ahorro"
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : "rgba(139, 92, 246, 0.12)",
                                    color:
                                      pilar === "necesidad"
                                        ? "#2563eb"
                                        : pilar === "deseo"
                                        ? "#d97706"
                                        : pilar === "ahorro"
                                        ? "#059669"
                                        : "#7c3aed",
                                    fontWeight: 600,
                                  }}
                                >
                                  {pilar === "necesidad" ? "🏠 Necesidad" : pilar === "deseo" ? "☕ Deseo" : pilar === "ahorro" ? "📈 Ahorro" : "🤝 Donación"}
                                </span>
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                                {formatMoney(montos.Q1)}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                                {formatMoney(montos.Q2)}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>
                                {formatMoney(montos.totalMes)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* BOTÓN DE ACCIÓN PRINCIPAL */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setTabInterno("metodologia")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--line)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Volver a Modelos
                </button>

                <button
                  onClick={handleAplicarAlPresupuesto}
                  disabled={aplicando}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                  }}
                >
                  {aplicando ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                  {aplicando ? "Aplicando al Presupuesto..." : `⚡ Aplicar Configuración de ${metodoActual.nombre}`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CLASIFICACIÓN DE CATEGORÍAS */}
          {tabInterno === "clasificacion" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Clasifica tus Categorías en Pilares</span>
                  <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "2px 0 0 0" }}>
                    Indica si cada categoría corresponde a una Necesidad Básica, un Deseo, o Ahorro/Inversión.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    fontSize: 12,
                    width: 180,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
                {categoriasFiltradas.map((c) => {
                  const pilarActual = clasificarPilarCategoria(c.nombre, pilares);
                  return (
                    <div
                      key={c.nombre}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 14px",
                        borderRadius: 10,
                        background: "var(--paper)",
                        border: "1px solid var(--line-soft)",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nombre}</span>

                      <select
                        value={pilarActual}
                        onChange={(e) => handleCambiarPilarCategoria(c.nombre, e.target.value)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--line)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          background:
                            pilarActual === "necesidad"
                              ? "rgba(59, 130, 246, 0.12)"
                              : pilarActual === "deseo"
                              ? "rgba(245, 158, 11, 0.12)"
                              : pilarActual === "ahorro"
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(139, 92, 246, 0.12)",
                          color:
                            pilarActual === "necesidad"
                              ? "#2563eb"
                              : pilarActual === "deseo"
                              ? "#d97706"
                              : pilarActual === "ahorro"
                              ? "#059669"
                              : "#7c3aed",
                        }}
                      >
                        <option value="necesidad">🏠 Necesidad Básica</option>
                        <option value="deseo">☕ Deseo / Estilo de Vida</option>
                        <option value="ahorro">📈 Ahorro / Inversión</option>
                        <option value="donacion">🤝 Donación / Diezmo</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div
          style={{
            padding: "12px 22px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--paper)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--line)",
              fontSize: 12.5,
              cursor: "pointer",
              color: "var(--ink-soft)",
            }}
          >
            Cerrar
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleGuardarConfig}
              disabled={guardando}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                background: "var(--card)",
                border: "1px solid var(--line)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--ink)",
              }}
            >
              <Save size={14} />
              {guardando ? "Guardando..." : "Guardar Preferencias"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
