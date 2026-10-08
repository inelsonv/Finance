import React, { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Banknote, CreditCard, Briefcase, AlertTriangle, TrendingUp, TrendingDown, DollarSign, RefreshCw, LineChart, Settings, Plus, Trash2, X, PiggyBank, GripVertical, PieChart as PieChartIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Sun, Cloud, CloudRain, CloudLightning, CloudFog, CloudSnow, Fuel, Pencil, Receipt, SquareParking, UtensilsCrossed, Sparkles, Clock, ChefHat, CheckCircle2, Coffee, Dumbbell, Church, Wrench, Car, Scissors, HeartPulse, Stethoscope, Pill, Repeat, Wifi, Home, ShoppingBag, Shirt, GraduationCap, Baby, Dog, Gift, Plane, Bus, Music, Film, Gamepad2, BookOpen, Calendar, Target, SlidersHorizontal, Eye, EyeOff, LayoutGrid, Check, Shield } from "lucide-react";
import { watchAcciones, addAccion, deleteAccion, watchAccionesConfig, saveAccionesConfig, watchAccionesPrecios, saveAccionesPrecios, watchCombustibleConfig, saveCombustibleConfig, watchInicioOrden, saveInicioOrden, watchTipoCambioCache, saveTipoCambioCache } from "../lib/db";
import { periodoActualConfigurado } from "../lib/quincenaConfig";
import { fetchInflacionRD } from "../lib/inflacionRD";
import { confirm } from "../lib/confirm";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { iconoParaCategoria } from "../lib/categoriaIconos";
import { obtenerIconoYDetalleMeta } from "../lib/metaIconos";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function diasHastaFecha(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

function clasificarEndeudamiento(pct) {
  if (pct <= 20) return { label: "Saludable", color: "var(--sage)", bg: "var(--sage-bg)" };
  if (pct <= 35) return { label: "Moderado", color: "var(--amber)", bg: "var(--amber-bg)" };
  if (pct <= 50) return { label: "Alto", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  return { label: "Crítico", color: "#8a2a1d", bg: "var(--stamp-bg)" };
}

const ZONES_FONDO = [
  { from: 0, to: 3, color: "#8a2a1d" },
  { from: 3, to: 6, color: "#c99a3f" },
  { from: 6, to: 12, color: "var(--sage)" },
];

function clasificarFondoEmergencia(meses) {
  if (meses < 3) return { label: "Bajo", color: "#8a2a1d", bg: "var(--stamp-bg)" };
  if (meses < 6) return { label: "Moderado", color: "var(--amber)", bg: "var(--amber-bg)" };
  return { label: "Saludable", color: "var(--sage)", bg: "var(--sage-bg)" };
}

const ZONES_AHORRO = [
  { from: 0, to: 10, color: "#8a2a1d" },
  { from: 10, to: 20, color: "#c99a3f" },
  { from: 20, to: 35, color: "var(--sage)" },
  { from: 35, to: 100, color: "#2e7d32" },
];

function clasificarCapacidadAhorro(pct) {
  if (pct < 0) return { label: "Déficit", color: "#8a2a1d", bg: "var(--stamp-bg)" };
  if (pct < 10) return { label: "Baja", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  if (pct < 20) return { label: "Moderada", color: "var(--amber)", bg: "var(--amber-bg)" };
  if (pct < 35) return { label: "Saludable", color: "var(--sage)", bg: "var(--sage-bg)" };
  return { label: "Excelente", color: "#2e7d32", bg: "var(--sage-bg)" };
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, pct1, pct2) {
  const a1 = -90 + pct1 * 1.8;
  const a2 = -90 + pct2 * 1.8;
  const start = polarToCartesian(cx, cy, r, a1);
  const end = polarToCartesian(cx, cy, r, a2);
  const largeArc = a2 - a1 > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const ZONES_DEUDA = [
  { from: 0, to: 20, color: "var(--sage)" },
  { from: 20, to: 35, color: "#c99a3f" },
  { from: 35, to: 50, color: "var(--stamp)" },
  { from: 50, to: 100, color: "#8a2a1d" },
];

function GaugeChart({ value, maxValue, zones, marks }) {
  const cx = 110;
  const cy = 108;
  const r = 88;
  const numValue = Number.isFinite(value) ? value : 0;
  const toPct = (v) => Math.max(0, Math.min((v / maxValue) * 100, 100));
  const needleAngle = -90 + toPct(numValue) * 1.8;
  const needleTargetRotation = needleAngle - 90;

  return (
    <svg viewBox="0 0 220 128" style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
      {zones.map((z) => (
        <path
          key={z.from}
          d={arcPath(cx, cy, r, toPct(z.from), toPct(z.to))}
          fill="none"
          stroke={z.color}
          strokeWidth={16}
          strokeLinecap="butt"
        />
      ))}
      {marks.map((mark) => {
        const p = polarToCartesian(cx, cy, r + 14, -90 + toPct(mark) * 1.8);
        return (
          <text key={mark} x={p.x} y={p.y} fontSize="8.5" textAnchor="middle" fill="var(--ink-soft)" fontFamily="IBM Plex Mono, monospace">
            {mark}
          </text>
        );
      })}
      <line
        key={`needle-${Math.round(needleTargetRotation)}`}
        className="despensa-gauge-needle"
        x1={cx}
        y1={cy}
        x2={cx + r - 22}
        y2={cy}
        style={{ "--despensa-gauge-needle-target": `${needleTargetRotation}deg` }}
        stroke="var(--ink)"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={7} fill="var(--ink)" />
      <circle cx={cx} cy={cy} r={3} fill="var(--card)" />
    </svg>
  );
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LINE_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a", "#4a8a8a",
];
const ICONOS_CATEGORIA_GASTO = {
  fuel: Fuel, parking: SquareParking, utensils: UtensilsCrossed, coffee: Coffee, dumbbell: Dumbbell,
  church: Church, wrench: Wrench, car: Car, landmark: Banknote, scissors: Scissors, heartpulse: HeartPulse,
  stethoscope: Stethoscope, pill: Pill, repeat: Repeat, creditcard: CreditCard, wifi: Wifi, home: Home,
  shoppingbag: ShoppingBag, shirt: Shirt, graduationcap: GraduationCap, baby: Baby, dog: Dog, gift: Gift,
  plane: Plane, bus: Bus, music: Music, film: Film, gamepad: Gamepad2, book: BookOpen, receipt: Receipt,
};

function SelectorAnio({ year, setYear, anioActual }) {
  const esAnioActual = year === anioActual;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => setYear((y) => y - 1)}
        title="Año anterior"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
      >
        <ChevronLeftIcon size={12} />
      </button>
      <span className="despensa-mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: "center" }}>{year}</span>
      <button
        onClick={() => setYear((y) => Math.min(anioActual, y + 1))}
        disabled={esAnioActual}
        title="Año siguiente"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "var(--card)",
          color: esAnioActual ? "var(--line)" : "var(--ink-soft)",
          cursor: esAnioActual ? "default" : "pointer",
        }}
      >
        <ChevronRightIcon size={12} />
      </button>
    </div>
  );
}

function GastosPorMesChart({ movimientos, year, setYear }) {
  const [activeMonth, setActiveMonth] = useState(null);
  const [tooltipMonth, setTooltipMonth] = useState(null);
  const hoverTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);
  const anioActual = new Date().getFullYear();
  const esAnioActual = year === anioActual;
  const currentMonth = esAnioActual ? new Date().getMonth() + 1 : 12; // 1-12

  const { series, maxVal } = useMemo(() => {
    const byCategory = {};
    for (const m of movimientos) {
      if (m.type !== "Gasto" || !m.date) continue;
      const [y, mo] = m.date.split("-").map(Number);
      if (y !== year || mo > currentMonth) continue;
      const cat = m.category || "Otro";
      if (!byCategory[cat]) byCategory[cat] = Array(currentMonth).fill(0);
      byCategory[cat][mo - 1] += Number(m.amount) || 0;
    }
    const list = Object.entries(byCategory)
      .map(([category, values]) => ({ category, values, total: values.reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total);
    let max = 0;
    for (const s of list) for (const v of s.values) max = Math.max(max, v);
    return { series: list, maxVal: max || 1 };
  }, [movimientos, year, currentMonth]);

  if (series.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no hay gastos registrados en {year}.
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padL = 50;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xFor = (i) => padL + (i / Math.max(currentMonth - 1, 1)) * plotW;
  const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
  const puntosDeMayorGasto = new Set(
    series
      .flatMap((s) => s.values.map((value, monthIndex) => ({ category: s.category, monthIndex, value })))
      .filter((point) => point.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((point) => `${point.category}:${point.monthIndex}`),
  );
  const gastosPorMes = tooltipMonth == null
    ? []
    : series
      .map((s, si) => ({ category: s.category, amount: s.values[tooltipMonth] || 0, color: LINE_COLORS[si % LINE_COLORS.length] }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  const totalMesHover = gastosPorMes.reduce((sum, item) => sum + item.amount, 0);

  const cancelarTooltipMes = () => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };
  const programarTooltipMes = (monthIndex) => {
    cancelarTooltipMes();
    setActiveMonth(monthIndex);
    setTooltipMonth(null);
    hoverTimerRef.current = setTimeout(() => {
      setTooltipMonth(monthIndex);
      hoverTimerRef.current = null;
    }, 1200);
  };
  const limpiarTooltipMes = () => {
    cancelarTooltipMes();
    setActiveMonth(null);
    setTooltipMonth(null);
  };


  return (
    <div className="despensa-chart-hover-area" onMouseLeave={limpiarTooltipMes}>
      <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", minWidth: 300, display: "block" }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={width - padR}
            y1={padT + plotH * (1 - f)}
            y2={padT + plotH * (1 - f)}
            stroke="var(--line-soft)"
            strokeWidth={1}
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={padL - 6}
            y={padT + plotH * (1 - f) + 3}
            textAnchor="end"
            fontSize="9"
            fill="var(--ink-soft)"
            fontFamily="IBM Plex Mono, monospace"
          >
            {Math.round(maxVal * f)}
          </text>
        ))}
        {Array.from({ length: currentMonth }).map((_, i) => (
          <text
            key={i}
            x={xFor(i)}
            y={height - padB + 14}
            textAnchor="middle"
            fontSize="9.5"
            fill="var(--ink-soft)"
          >
            {MESES[i]}
          </text>
        ))}
        {series.map((s, si) => {
          const color = LINE_COLORS[si % LINE_COLORS.length];
          const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
          return (
            <g key={s.category}>
              <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => {
                const esPico = puntosDeMayorGasto.has(`${s.category}:${i}`);
                return (
                  <circle
                    key={i}
                    className={esPico ? "despensa-gasto-punto-pico" : undefined}
                    cx={xFor(i)}
                    cy={yFor(v)}
                    r={esPico ? 4 : 2.5}
                    fill={esPico ? "#ffd166" : color}
                    stroke={esPico ? "#6d4b0b" : "none"}
                    strokeWidth={esPico ? 1.2 : 0}
                  >
                    <title>{`${s.category} · ${MESES[i]}: ${formatMoney(v)}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
        {activeMonth != null && (
          <line
            x1={xFor(activeMonth)}
            x2={xFor(activeMonth)}
            y1={padT}
            y2={padT + plotH}
            stroke="var(--amber)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.9}
            pointerEvents="none"
          />
        )}
        {Array.from({ length: currentMonth }).map((_, monthIndex) => {
          const left = monthIndex === 0 ? padL : (xFor(monthIndex - 1) + xFor(monthIndex)) / 2;
          const right = monthIndex === currentMonth - 1 ? width - padR : (xFor(monthIndex) + xFor(monthIndex + 1)) / 2;
          return (
            <rect
              key={`detalle-${monthIndex}`}
              x={left}
              y={padT}
              width={Math.max(1, right - left)}
              height={plotH}
              fill="transparent"
              pointerEvents="all"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => programarTooltipMes(monthIndex)}
              onMouseLeave={cancelarTooltipMes}
            />
          );
        })}
      </svg>
      </div>
      {tooltipMonth != null && (
        <div
          className="despensa-chart-tooltip"
          role="tooltip"
        >
          <div className="despensa-chart-tooltip__header">
            <span>{MESES[tooltipMonth]} {year}</span>
            <strong className="despensa-mono">{formatMoney(totalMesHover)}</strong>
          </div>
          <div className="despensa-chart-tooltip__list">
            {gastosPorMes.length ? gastosPorMes.map((item) => {
              const IconoCategoria = ICONOS_CATEGORIA_GASTO[iconoParaCategoria(item.category)] || Receipt;
              return (
                <div className="despensa-chart-tooltip__row" key={item.category}>
                  <IconoCategoria size={14} style={{ color: item.color, flexShrink: 0 }} />
                  <span className="despensa-chart-tooltip__category">{item.category}</span>
                  <strong className="despensa-mono">{formatMoney(item.amount)}</strong>
                </div>
              );
            }) : (
              <div className="despensa-chart-tooltip__empty">Sin gastos registrados este mes.</div>
            )}
          </div>
        </div>
      )}
      <div className="despensa-scroll-x" style={{ display: "flex", flexWrap: "nowrap", gap: "6px 14px", marginTop: 10, justifyContent: "flex-start", overflowX: "auto", overflowY: "hidden", paddingBottom: 7, whiteSpace: "nowrap" }}>
        {series.map((s, si) => (
          <span key={s.category} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-soft)", flex: "0 0 auto" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: LINE_COLORS[si % LINE_COLORS.length], flexShrink: 0 }} />
            {s.category}
          </span>
        ))}
      </div>
    </div>
  );
}

function GastosPorCategoriaMesActual({ movimientos, compact }) {
  const [activo, setActivo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const wrapperRef = useRef(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const { slices, total } = useMemo(() => {
    const byCategory = {};
    for (const m of movimientos) {
      if (m.type !== "Gasto" || !(m.date || "").startsWith(prefix)) continue;
      const cat = m.category || "Otro";
      byCategory[cat] = (byCategory[cat] || 0) + (Number(m.amount) || 0);
    }
    const list = Object.entries(byCategory)
      .map(([category, value], i) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
    const sum = list.reduce((s, d) => s + d.value, 0);
    return { slices: list, total: sum };
  }, [movimientos, prefix]);

  if (slices.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--ink-soft)", fontSize: 12.5 }}>
        Todavía no hay gastos registrados este mes.
      </div>
    );
  }

  const cx = 90;
  const cy = 90;
  const r = 78;
  let cumulative = 0;
  const arcs = slices.map((s, i) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += s.value;
    const endAngle = (cumulative / total) * 360;
    const color = LINE_COLORS[i % LINE_COLORS.length];
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return { d, color, ...s };
  });

  const activoData = arcs.find((a) => a.category === activo);

  const handleMouseMove = (e) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: compact ? 0 : 20 }}>
      <svg
        viewBox="0 0 180 180"
        style={{ width: compact ? "100%" : 160, maxWidth: compact ? 220 : 160, height: "auto", flexShrink: 0, display: "block", margin: compact ? "0 auto" : undefined }}
        onMouseLeave={() => {
          setActivo(null);
          setTooltipPos(null);
        }}
      >
        {arcs.map((a) => (
          <path
            key={a.category}
            d={a.d}
            fill={a.color}
            opacity={activo && activo !== a.category ? 0.45 : 1}
            style={{ cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={() => setActivo(a.category)}
            onMouseMove={handleMouseMove}
            onClick={() => setActivo((prev) => (prev === a.category ? null : a.category))}
          />
        ))}
        <circle cx={cx} cy={cy} r={44} fill="var(--card)" style={{ pointerEvents: "none" }} />
        {activoData ? (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8.5" fill={activoData.color} fontFamily="Inter, sans-serif" fontWeight="600">
              {activoData.category.length > 16 ? activoData.category.slice(0, 15) + "…" : activoData.category}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)" fontFamily="IBM Plex Mono, monospace">
              {Math.round((activoData.value / total) * 100)}%
            </text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="var(--ink-soft)" fontFamily="Inter, sans-serif">
              Este mes
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)" fontFamily="IBM Plex Mono, monospace">
              ${Math.round(total).toLocaleString("es")}
            </text>
          </>
        )}
      </svg>
      {activoData && tooltipPos && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x + 14,
            top: tooltipPos.y + 14,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11.5,
            color: "var(--ink)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activoData.color, flexShrink: 0 }} />
            {activoData.category}
          </div>
          <span className="despensa-mono">{formatMoney(activoData.value)}</span>
          <span style={{ color: "var(--ink-soft)" }}> · {Math.round((activoData.value / total) * 100)}%</span>
        </div>
      )}
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
          {arcs.map((a) => (
            <div
              key={a.category}
              onMouseEnter={() => setActivo(a.category)}
              onMouseLeave={() => setActivo(null)}
              style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, cursor: "pointer", opacity: activo && activo !== a.category ? 0.5 : 1 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
              <span style={{ color: "var(--ink-soft)", flex: 1 }}>{a.category}</span>
              <span className="despensa-mono" style={{ fontWeight: 600 }}>{Math.round((a.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Coordenadas de Santiago de los Caballeros, República Dominicana.
const LAT_CLIMA = 19.4517;
const LON_CLIMA = -70.697;

// Códigos de clima estándar (WMO) que usa Open-Meteo, agrupados a un
// ícono y descripción en español.
function interpretarCodigoClima(codigo) {
  if (codigo === 0) return { icon: Sun, texto: "Despejado" };
  if ([1, 2].includes(codigo)) return { icon: Sun, texto: "Parcialmente nublado" };
  if (codigo === 3) return { icon: Cloud, texto: "Nublado" };
  if ([45, 48].includes(codigo)) return { icon: CloudFog, texto: "Neblina" };
  if ([51, 53, 55, 56, 57].includes(codigo)) return { icon: CloudRain, texto: "Llovizna" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return { icon: CloudRain, texto: "Lluvia" };
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return { icon: CloudSnow, texto: "Nieve" };
  if ([95, 96, 99].includes(codigo)) return { icon: CloudLightning, texto: "Tormenta eléctrica" };
  return { icon: Cloud, texto: "—" };
}

function InflacionCard() {
  const [inflacion, setInflacion] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  const fetchInflacion = async () => {
    setStatus("loading");
    try {
      const resultado = await fetchInflacionRD();
      setInflacion(resultado);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchInflacion();
  }, []);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "1.25rem",
        height: "100%",
        minHeight: 165,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Inflación en RD</span>
        </div>
        <button
          onClick={fetchInflacion}
          title="Actualizar"
          disabled={status === "loading"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            color: "var(--ink-soft)",
            cursor: status === "loading" ? "default" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: status === "loading" ? "spin 0.9s linear infinite" : "none" }} />
        </button>
      </div>

      {status === "error" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "10px 0" }}>
          <AlertTriangle size={15} />
          No se pudo obtener la inflación ahora.
        </div>
      ) : (
        <div style={{ background: "var(--paper)", borderRadius: 8, padding: "8px 12px", border: "1px solid var(--line-soft)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>
            {inflacion ? `Tasa interanual · Año ${inflacion.anio}` : "Variación anual"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="despensa-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--sage)" }}>
              {inflacion?.valor != null ? inflacion.valor.toFixed(2) : "—"}%
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>anual</span>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10 }}>
        Variación anual del IPC · Fuente: Banco Mundial / BCRD
      </div>
    </div>
  );
}

function CombustibleCard({ presupuesto, diasCobro }) {
  const [combustibleConfig, setCombustibleConfig] = useState(undefined);
  const [editando, setEditando] = useState(false);
  const [premiumInput, setPremiumInput] = useState("");
  const [regularInput, setRegularInput] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = watchCombustibleConfig(setCombustibleConfig, () => setCombustibleConfig(null));
    return () => unsub && unsub();
  }, []);

  const iniciarEdicion = () => {
    setPremiumInput(combustibleConfig?.precios?.premium != null ? String(combustibleConfig.precios.premium) : "");
    setRegularInput(combustibleConfig?.precios?.regular != null ? String(combustibleConfig.precios.regular) : "");
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await saveCombustibleConfig({
        premium: premiumInput ? parseFloat(premiumInput) : null,
        regular: regularInput ? parseFloat(regularInput) : null,
      });
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  };

  const updatedAt = combustibleConfig?.updatedAt?.toDate ? combustibleConfig.updatedAt.toDate() : null;

  // Cuánto hay presupuestado para "Combustible" en la quincena ACTUAL
  // (ambas quincenas del mes, sumadas), para calcular cuántos galones
  // equivalen a ese monto al precio de esta semana.
  const montoPresupuestadoCombustible = useMemo(() => {
    if (!presupuesto) return 0;
    const hoy = periodoActualConfigurado(diasCobro);
    const porCategoria = presupuesto?.["Combustible"];
    if (!porCategoria) return 0;
    const q1 = Number(porCategoria[String(hoy.month)]?.Q1) || 0;
    const q2 = Number(porCategoria[String(hoy.month)]?.Q2) || 0;
    return q1 + q2;
  }, [presupuesto, diasCobro]);

  const precioPremium = combustibleConfig?.precios?.premium;
  const precioRegular = combustibleConfig?.precios?.regular;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "1.25rem",
        height: "100%",
        minHeight: 165,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Fuel size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Combustible (RD)</span>
        </div>
        {!editando && (
          <button
            onClick={iniciarEdicion}
            title="Actualizar precios (semanal, MICM)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--paper)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editando ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Premium (RD$/galón)</label>
              <input
                type="number"
                step="0.01"
                value={premiumInput}
                onChange={(e) => setPremiumInput(e.target.value)}
                style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Regular (RD$/galón)</label>
              <input
                type="number"
                step="0.01"
                value={regularInput}
                onChange={(e) => setRegularInput(e.target.value)}
                style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={guardar}
              disabled={guardando}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: guardando ? "wait" : "pointer" }}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setEditando(false)}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 7, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : combustibleConfig?.precios?.premium == null && combustibleConfig?.precios?.regular == null ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Toca el lápiz para registrar el precio de esta semana (según el aviso del MICM).
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Premium</div>
              <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                {combustibleConfig?.precios?.premium != null ? `RD$${combustibleConfig.precios.premium.toFixed(2)}` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Regular</div>
              <div className="despensa-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                {combustibleConfig?.precios?.regular != null ? `RD$${combustibleConfig.precios.regular.toFixed(2)}` : "—"}
              </div>
            </div>
          </div>

          {montoPresupuestadoCombustible > 0 && (precioPremium || precioRegular) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>
                Con lo presupuestado este mes ({formatMoney(montoPresupuestadoCombustible)}):
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {precioPremium > 0 && (
                  <div>
                    <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--sage)" }}>
                      {(montoPresupuestadoCombustible / precioPremium).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}> gal Premium</span>
                  </div>
                )}
                {precioRegular > 0 && (
                  <div>
                    <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--sage)" }}>
                      {(montoPresupuestadoCombustible / precioRegular).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}> gal Regular</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Por galón · Fuente: aviso semanal del MICM
            {combustibleConfig?.semana && ` (${combustibleConfig.semana})`}
            {updatedAt && ` · Actualizado ${updatedAt.toLocaleDateString("es")}`}
            {combustibleConfig?.actualizadoAutomaticamente && " · automático"}
          </div>
        </>
      )}
    </div>
  );
}

function ClimaCardInner() {
  const [clima, setClima] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  const fetchClima = async () => {
    setStatus("loading");
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT_CLIMA}&longitude=${LON_CLIMA}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      if (!res.ok) throw new Error("Respuesta no válida");
      const data = await res.json();
      if (data?.current?.temperature_2m == null) throw new Error("Sin datos de clima");
      setClima({
        temp: data.current.temperature_2m,
        humedad: data.current.relative_humidity_2m,
        codigo: data.current.weather_code,
        max: data.daily?.temperature_2m_max?.[0],
        min: data.daily?.temperature_2m_min?.[0],
      });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchClima();
  }, []);

  const info = clima ? interpretarCodigoClima(clima.codigo) : null;
  const Icon = info?.icon || Cloud;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "1.25rem",
        textAlign: "center",
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <button
          onClick={fetchClima}
          title="Actualizar pronóstico"
          disabled={status === "loading"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            color: "var(--ink-soft)",
            cursor: status === "loading" ? "default" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: status === "loading" ? "spin 0.9s linear infinite" : "none" }} />
        </button>
      </div>

      <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
        Clima en Santiago
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        Pronóstico en tiempo real · República Dominicana
      </div>

      {status === "error" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "40px 0" }}>
          <AlertTriangle size={15} />
          No se pudo obtener el clima ahora.
        </div>
      ) : (
        <>
          <div style={{ position: "relative", width: 175, height: 175, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={175} height={175} viewBox="0 0 180 180" style={{ position: "absolute", inset: 0 }}>
              <circle cx="90" cy="90" r="74" fill="none" stroke="var(--line-soft)" strokeWidth="14" />
              <circle
                cx="90"
                cy="90"
                r="74"
                fill="none"
                stroke="var(--sage)"
                strokeWidth="14"
                strokeDasharray="465"
                strokeDashoffset="120"
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "90px 90px" }}
              />
            </svg>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: "50%",
                background: "var(--sage-bg)",
                border: "1.5px solid var(--line-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sage)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              <Icon size={42} />
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 6 }}>
            <span className="despensa-mono" style={{ fontSize: 32, fontWeight: 700, color: "var(--sage)" }}>
              {clima?.temp != null ? Math.round(clima.temp) : "—"}°
            </span>
          </div>

          <span
            className="despensa-tab-font"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              background: "var(--sage-bg)",
              color: "var(--sage)",
            }}
          >
            {info?.texto || "Cargando…"}
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              borderTop: "1px solid var(--line-soft)",
              marginTop: 20,
              paddingTop: 16,
              textAlign: "left",
            }}
          >
            <MiniStat icon={Sun} label="Máxima" value={clima?.max != null ? `${Math.round(clima.max)}°` : "—"} color="var(--sage)" compact />
            <MiniStat icon={CloudRain} label="Mínima" value={clima?.min != null ? `${Math.round(clima.min)}°` : "—"} color="var(--stamp)" compact />
            <MiniStat icon={Cloud} label="Humedad" value={clima?.humedad != null ? `${Math.round(clima.humedad)}%` : "—"} color="var(--ink-soft)" compact />
          </div>
        </>
      )}
    </div>
  );
}

function ClimaCard() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
      <ClimaCardInner />
    </div>
  );
}

function CircularMetaProgress({ pct, Icon, color, bg, size = 175 }) {
  const numVal = Number.isFinite(pct) ? Math.max(0, Math.min(pct, 100)) : 0;
  const cx = 90;
  const cy = 90;
  const r = 74;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - numVal / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 180"
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--line-soft)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      {/* Ícono temático en el centro rodeado por el gráfico circular */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: "50%",
            background: bg || "var(--paper)",
            border: "1.5px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || "var(--ink)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <Icon size={42} />
        </div>
      </div>
    </div>
  );
}

function clasificarProgresoMeta(pct) {
  if (pct >= 100) return { label: "Completada 🎉", color: "#10b981", bg: "rgba(16, 185, 129, 0.14)" };
  if (pct >= 75) return { label: "Casi alcanzada", color: "var(--sage)", bg: "var(--sage-bg)" };
  if (pct >= 40) return { label: "En buen camino", color: "var(--sage)", bg: "var(--sage-bg)" };
  if (pct >= 15) return { label: "En progreso", color: "var(--amber)", bg: "var(--amber-bg)" };
  return { label: "Iniciando", color: "var(--amber)", bg: "var(--amber-bg)" };
}

function MetasSlideCard({
  metasAhorro = [],
  activos = [],
  cuentas = [],
  movimientos = [],
  fuentesIngreso = [],
  onNavigate,
}) {
  const [slideIndex, setSlideIndex] = useState(0);

  const metasActivas = useMemo(
    () => (metasAhorro || []).filter((m) => m.estado === "Activa"),
    [metasAhorro]
  );

  const safeIndex = metasActivas.length > 0 ? Math.min(slideIndex, metasActivas.length - 1) : 0;
  const currentMeta = metasActivas[safeIndex];

  const aportadoPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentas || []) {
      let total = c.saldoInicial || 0;
      for (const mv of movimientos || []) {
        if (mv.cuentaId === c.id && mv.category === c.tipo) total += Number(mv.amount) || 0;
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const aportadoEsteMesPorCuenta = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const map = {};
    for (const c of cuentas || []) {
      let total = 0;
      for (const mv of movimientos || []) {
        if (mv.cuentaId === c.id && mv.category === c.tipo && (mv.date || "").startsWith(prefix)) {
          total += Number(mv.amount) || 0;
        }
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const ingresoMensual = useMemo(() => ingresoMensualNeto(fuentesIngreso), [fuentesIngreso]);

  const prevSlide = () => {
    if (metasActivas.length <= 1) return;
    setSlideIndex((prev) => (prev > 0 ? prev - 1 : metasActivas.length - 1));
  };

  const nextSlide = () => {
    if (metasActivas.length <= 1) return;
    setSlideIndex((prev) => (prev < metasActivas.length - 1 ? prev + 1 : 0));
  };

  if (metasActivas.length === 0) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "1.25rem",
          textAlign: "center",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 330,
        }}
      >
        <div>
          <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Metas activas</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 16 }}>
            Ahorro y objetivos personales
          </div>
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: "50%",
              background: "var(--sage-bg)",
              border: "1.5px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sage)",
              margin: "16px auto",
            }}
          >
            <PiggyBank size={42} />
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
            No tienes metas de ahorro activas. Define una meta para un motor, vehículo, viaje o tu fondo de reserva.
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => onNavigate && onNavigate("ahorro")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Crear meta de ahorro
          </button>
        </div>
      </div>
    );
  }

  const cuenta = (cuentas || []).find((c) => c.id === currentMeta.cuentaId);
  const detalleIcono = obtenerIconoYDetalleMeta(currentMeta, activos);
  const MetaIcon = detalleIcono.Icon;
  const esPorcentaje = currentMeta.tipoMeta === "Porcentaje de ingreso";

  let aportado = 0;
  let objetivo = 0;
  let pct = 0;
  let faltan = 0;

  if (esPorcentaje) {
    const sugerido = ingresoMensual * ((currentMeta.porcentaje || 0) / 100);
    const aportadoEsteMes = cuenta ? aportadoEsteMesPorCuenta[cuenta.id] || 0 : 0;
    pct = sugerido > 0 ? (aportadoEsteMes / sugerido) * 100 : 0;
    aportado = aportadoEsteMes;
    objetivo = sugerido;
    faltan = Math.max(0, sugerido - aportadoEsteMes);
  } else {
    objetivo = Number(currentMeta.montoObjetivo) || 0;
    aportado = cuenta ? aportadoPorCuenta[cuenta.id] || 0 : 0;
    pct = objetivo > 0 ? (aportado / objetivo) * 100 : 0;
    faltan = Math.max(0, objetivo - aportado);
  }

  const clasificacion = clasificarProgresoMeta(pct);

  let badgeFecha = null;
  if (currentMeta.fechaObjetivo) {
    const d = diasHastaFecha(currentMeta.fechaObjetivo);
    if (d != null) {
      if (d < 0) badgeFecha = { texto: `Venció hace ${Math.abs(d)} d`, color: "var(--stamp)" };
      else if (d === 0) badgeFecha = { texto: "Vence hoy", color: "var(--amber)" };
      else if (d === 1) badgeFecha = { texto: "Vence mañana", color: "var(--amber)" };
      else badgeFecha = { texto: `${d} días restantes`, color: "var(--sage)" };
    }
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "1.25rem",
        textAlign: "center",
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Botones de navegación de slide (arriba a la izquierda) */}
      {metasActivas.length > 1 && (
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 3 }}>
          <button
            onClick={prevSlide}
            title="Meta anterior"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--paper)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <ChevronLeftIcon size={12} />
          </button>
          <span className="despensa-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", minWidth: 26, textAlign: "center" }}>
            {safeIndex + 1}/{metasActivas.length}
          </span>
          <button
            onClick={nextSlide}
            title="Siguiente meta"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--paper)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <ChevronRightIcon size={12} />
          </button>
        </div>
      )}

      {/* Botón "Ver todas" (arriba a la derecha) */}
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <button
          onClick={() => onNavigate && onNavigate("ahorro")}
          title="Gestionar metas en Ahorro"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            fontSize: 11,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          Ver todas
        </button>
      </div>

      {/* Título de la tarjeta, nombre de la meta y categoría */}
      <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
        {currentMeta.nombre}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 10,
            background: detalleIcono.bg,
            color: detalleIcono.color,
            fontWeight: 600,
            fontSize: 10.5,
          }}
        >
          {detalleIcono.emoji} {detalleIcono.label}
        </span>
        {cuenta && <span>· {cuenta.nombre}</span>}
        {esPorcentaje && <span>· {currentMeta.porcentaje}% ingreso</span>}
      </div>

      {/* Gráfico circular con el ícono temático en el centro */}
      <CircularMetaProgress
        pct={pct}
        Icon={MetaIcon}
        color={clasificacion.color}
        bg={detalleIcono.bg}
        size={175}
      />

      {/* Porcentaje en tamaño grande idéntico a Nivel de endeudamiento */}
      <div style={{ marginTop: 8, marginBottom: 6 }}>
        <span className="despensa-mono" style={{ fontSize: 32, fontWeight: 700, color: clasificacion.color }}>
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Badge de estado del progreso */}
      <span
        className="despensa-tab-font"
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 20,
          background: clasificacion.bg,
          color: clasificacion.color,
        }}
      >
        {clasificacion.label}
      </span>

      {/* Paginación de puntos si hay más de 1 meta */}
      {metasActivas.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {metasActivas.map((m, idx) => (
            <button
              key={m.id || idx}
              onClick={() => setSlideIndex(idx)}
              title={`Ir a ${m.nombre}`}
              style={{
                width: idx === safeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: idx === safeIndex ? "var(--ink)" : "var(--line)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Fila de MiniStats en cuadrícula inferior idéntica a Nivel de endeudamiento */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: currentMeta.fechaObjetivo ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
          gap: 6,
          borderTop: "1px solid var(--line-soft)",
          marginTop: 20,
          paddingTop: 16,
          textAlign: "left",
        }}
      >
        <MiniStat
          icon={PiggyBank}
          label="Aportado"
          value={formatMoney(aportado)}
          color="var(--sage)"
          compact
        />
        <MiniStat
          icon={Target}
          label="Objetivo"
          value={formatMoney(objetivo)}
          color="var(--ink)"
          compact
        />
        <MiniStat
          icon={TrendingUp}
          label={pct >= 100 ? "Completado" : "Faltante"}
          value={pct >= 100 ? "$0.00" : formatMoney(faltan)}
          color={pct >= 100 ? "var(--sage)" : "var(--stamp)"}
          compact
        />
        {currentMeta.fechaObjetivo && (
          <MiniStat
            icon={Calendar}
            label="Meta fecha"
            value={badgeFecha ? badgeFecha.texto : formatDateDisplay(currentMeta.fechaObjetivo)}
            color={badgeFecha?.color || "var(--ink-soft)"}
            compact
          />
        )}
      </div>
    </div>
  );
}

function DolarCard() {
  const [rates, setRates] = useState({ USD: null, EUR: null });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [cache, setCache] = useState(undefined);

  const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    const unsub = watchTipoCambioCache(setCache, () => {});
    return () => unsub();
  }, []);

  const fetchRates = async () => {
    setStatus("loading");
    try {
      const [resUsd, resEur] = await Promise.all([
        fetch("https://open.er-api.com/v6/latest/USD"),
        fetch("https://open.er-api.com/v6/latest/EUR"),
      ]);
      if (!resUsd.ok || !resEur.ok) throw new Error("Respuesta no válida");
      const [dataUsd, dataEur] = await Promise.all([resUsd.json(), resEur.json()]);
      const dopUsd = dataUsd?.rates?.DOP;
      const dopEur = dataEur?.rates?.DOP;
      if (!Number.isFinite(dopUsd) || !Number.isFinite(dopEur)) throw new Error("No se encontró la tasa DOP");
      const nuevasTasas = { USD: dopUsd, EUR: dopEur };
      setRates(nuevasTasas);
      setUpdatedAt(new Date());
      setStatus("ok");
      saveTipoCambioCache(nuevasTasas);
    } catch (err) {
      setStatus(rates.USD != null ? "ok" : "error");
    }
  };

  // Usa la caché de Firestore al entrar; solo consulta la API de nuevo si no hay
  // caché o si tiene más de 12 horas. El botón de refrescar siempre fuerza la consulta.
  useEffect(() => {
    if (cache === undefined) return; // aún cargando
    if (cache && cache.rates) {
      setRates(cache.rates);
      setStatus("ok");
      const fechaCache = cache.fetchedAt?.toDate ? cache.fetchedAt.toDate() : null;
      if (fechaCache) setUpdatedAt(fechaCache);
      const desactualizada = fechaCache ? Date.now() - fechaCache.getTime() > DOCE_HORAS_MS : true;
      if (desactualizada) fetchRates();
    } else {
      fetchRates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache]);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "1.25rem",
        height: "100%",
        minHeight: 165,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DollarSign size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Dólar y Euro (RD$)</span>
        </div>
        <button
          onClick={fetchRates}
          title="Actualizar tipo de cambio"
          disabled={status === "loading"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            color: "var(--ink-soft)",
            cursor: status === "loading" ? "default" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: status === "loading" ? "spin 0.9s linear infinite" : "none" }} />
        </button>
      </div>

      {status === "error" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "10px 0" }}>
          <AlertTriangle size={15} />
          No se pudo obtener el tipo de cambio ahora.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>Dólar (USD)</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="despensa-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--sage)" }}>
                {rates.USD != null ? rates.USD.toFixed(2) : "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>DOP</span>
            </div>
          </div>
          <div style={{ background: "var(--paper)", borderRadius: 8, padding: "8px 10px", border: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>Euro (EUR)</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="despensa-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--sage)" }}>
                {rates.EUR != null ? rates.EUR.toFixed(2) : "—"}
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>DOP</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10 }}>
        {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · Mercado de divisas` : "Cargando tasas de cambio…"}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StocksCard() {
  const [acciones, setAcciones] = useState([]);
  const [config, setConfig] = useState(undefined);
  const [cache, setCache] = useState(undefined);
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [addError, setAddError] = useState(null);
  // Tipo de cambio USD→RD$ ya cacheado por el widget de Dólar — se
  // reutiliza aquí para mostrar el valor de cada acción también en pesos,
  // sin disparar una consulta nueva.
  const [tipoCambioUSD, setTipoCambioUSD] = useState(null);
  useEffect(() => {
    const unsub = watchTipoCambioCache((c) => {
      if (c?.rates?.USD) setTipoCambioUSD(c.rates.USD);
    }, () => {});
    return () => unsub();
  }, []);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const unsubA = watchAcciones(setAcciones, () => {});
    const unsubC = watchAccionesConfig(setConfig, () => {});
    const unsubP = watchAccionesPrecios(setCache, () => {});
    return () => {
      unsubA();
      unsubC();
      unsubP();
    };
  }, []);

  const apiKey = config?.apiKey;

  const fetchPrices = async () => {
    if (!apiKey || acciones.length === 0) return;
    setLoadingPrices(true);
    setFetchError(null);
    try {
      const results = await Promise.all(
        acciones.map(async (a) => {
          try {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(a.symbol)}&token=${apiKey}`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) {
              return [a.symbol, null, data.error || `HTTP ${res.status}`];
            }
            if (data.c == null || data.c === 0) {
              return [a.symbol, null, "sin datos"];
            }
            return [a.symbol, { price: data.c, change: data.dp }, null];
          } catch (err) {
            return [a.symbol, null, err.message || String(err)];
          }
        })
      );
      const nuevosPrecios = Object.fromEntries(results.map(([sym, val]) => [sym, val]));
      const algunExito = results.some(([, val]) => val != null);
      const errores = results.filter(([, val]) => val == null).map(([sym, , err]) => `${sym}: ${err}`);

      if (algunExito) {
        setPrices(nuevosPrecios);
        setUpdatedAt(new Date());
        const symbolsOrdenados = acciones.map((a) => a.symbol).sort();
        saveAccionesPrecios(nuevosPrecios, symbolsOrdenados);
      }
      if (errores.length > 0) {
        setFetchError(algunExito ? `Algunas acciones no se pudieron actualizar (${errores.join(", ")})` : `No se pudo obtener ningún precio (${errores[0]}). Revisa tu clave API o el límite de uso en finnhub.io.`);
        console.error("Acciones: error al obtener precios", errores);
      }
    } finally {
      setLoadingPrices(false);
    }
  };

  // Al cargar la caché de Firestore, la usamos directo sin volver a llamar la API.
  // Solo se consulta la API de nuevo si la lista de símbolos cambió (agregaste/quitaste
  // una empresa) o si el usuario le da clic manual a "Actualizar".
  const symbolsKey = acciones.map((a) => a.symbol).sort().join(",");
  const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;

  useEffect(() => {
    if (cache === undefined) return; // aún cargando
    const symbolsActuales = acciones.map((a) => a.symbol).sort();
    if (cache && cache.prices) {
      const symbolsCacheados = cache.symbols || [];
      const mismosSimbolos =
        symbolsActuales.length === symbolsCacheados.length &&
        symbolsActuales.every((s, i) => s === symbolsCacheados[i]);
      setPrices(cache.prices);
      const fechaCache = cache.fetchedAt?.toDate ? cache.fetchedAt.toDate() : null;
      if (fechaCache) setUpdatedAt(fechaCache);
      const desactualizada = fechaCache ? Date.now() - fechaCache.getTime() > DOCE_HORAS_MS : true;
      if ((!mismosSimbolos || desactualizada) && apiKey && acciones.length > 0) {
        fetchPrices();
      }
    } else if (apiKey && acciones.length > 0) {
      fetchPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, apiKey, symbolsKey]);


  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    await saveAccionesConfig(apiKeyInput.trim());
    setShowConfig(false);
  };

  const handleAddAccion = async () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) {
      setAddError("Escribe un símbolo, ej. AAPL");
      return;
    }
    setAddError(null);
    await addAccion({ symbol, nombre: newNombre.trim() });
    setNewSymbol("");
    setNewNombre("");
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LineChart size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Acciones</span>
          {updatedAt && (
            <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>
              · actualizado {updatedAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {apiKey && acciones.length > 0 && (
            <button
              onClick={fetchPrices}
              title="Actualizar"
              disabled={loadingPrices}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)", color: "var(--ink-soft)", cursor: loadingPrices ? "default" : "pointer" }}
            >
              <RefreshCw size={13} style={{ animation: loadingPrices ? "spin 0.9s linear infinite" : "none" }} />
            </button>
          )}
          <button
            onClick={() => {
              setApiKeyInput(apiKey || "");
              setShowConfig((s) => !s);
            }}
            title="Configurar clave de API"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {showConfig && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12.5 }}>
          <div style={{ marginBottom: 8, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Necesitas una clave gratuita de{" "}
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" style={{ color: "var(--sage)" }}>
              finnhub.io/register
            </a>{" "}
            (plan gratis, sin tarjeta). Cópiala desde tu dashboard y pégala aquí.
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: apiKey ? 14 : 0 }}>
            <input
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Tu API key de Finnhub"
              style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
            />
            <button onClick={handleSaveKey} style={{ padding: "7px 14px", fontSize: 12.5, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}>
              Guardar
            </button>
          </div>

          {apiKey && (
            <>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", gap: 6 }}>
                <input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="Símbolo, ej. AAPL"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAccion()}
                  style={{ width: 100, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                />
                <input
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Nombre (opcional), ej. Apple"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAccion()}
                  style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                />
                <button onClick={handleAddAccion} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 7, cursor: "pointer" }}>
                  <Plus size={13} /> Agregar
                </button>
              </div>
              {addError && <div style={{ fontSize: 11.5, color: "var(--stamp)", marginTop: 8 }}>{addError}</div>}
            </>
          )}
        </div>
      )}

      {!apiKey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "8px 0" }}>
          <AlertTriangle size={15} />
          Configura tu clave de Finnhub (ícono de engranaje arriba) para ver precios de acciones.
        </div>
      ) : acciones.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", padding: "8px 0" }}>
          Todavía no agregaste ninguna empresa. Haz clic en el engranaje arriba para agregar una por su símbolo
          bursátil, ej. <span className="despensa-mono">AAPL</span> para Apple.
        </div>
      ) : (
        <>
          {fetchError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: "var(--stamp)", background: "var(--stamp-bg)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {fetchError}
            </div>
          )}
          <div className="despensa-acciones-row despensa-scroll-x" style={{ paddingBottom: 4 }}>
            {acciones.map((a) => {
            const p = prices[a.symbol];
            const up = p && p.change >= 0;
            return (
              <div key={a.id} className="despensa-acciones-card" style={{ position: "relative", padding: "10px 10px 8px", background: "var(--paper)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
                <button
                  onClick={async () => {
                    if (await confirm("¿Quitar esta acción de tu lista de seguimiento?")) deleteAccion(a.id);
                  }}
                  title="Quitar"
                  style={{ position: "absolute", top: 4, right: 4, display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer" }}
                >
                  <X size={11} />
                </button>
                <div className="despensa-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{a.symbol}</div>
                {a.nombre && (
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.nombre}
                  </div>
                )}
                {p && p.price != null ? (
                  <>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>${p.price.toFixed(2)}</div>
                    {tipoCambioUSD && (
                      <div className="despensa-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                        RD${(p.price * tipoCambioUSD).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: up ? "var(--sage)" : "var(--stamp)", marginTop: 1 }}>
                      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {p.change != null ? `${p.change.toFixed(2)}%` : ""}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>{loadingPrices ? "…" : "—"}</div>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const SECTION_IDS_DEFAULT = [
  "endeudamiento",
  "fondoEmergencia",
  "capacidadAhorro",
  "metas",
  "clima",
  "dolar",
  "gastoMes",
  "gastoCategoria",
  "inflacion",
  "combustible",
  "platoSugerido",
  "acciones",
];

export const MODULOS_INFO = {
  endeudamiento: {
    nombre: "Nivel de endeudamiento",
    descripcion: "Cuotas de préstamos y tarjetas frente a tus ingresos.",
    icon: AlertTriangle,
    categoria: "KPIs",
  },
  fondoEmergencia: {
    nombre: "Fondo de emergencia",
    descripcion: "Meses de cobertura de gastos cubiertos por ahorro.",
    icon: Shield,
    categoria: "KPIs",
  },
  capacidadAhorro: {
    nombre: "Capacidad de ahorro",
    descripcion: "Porcentaje y remanente mensual disponible para ahorrar.",
    icon: PiggyBank,
    categoria: "KPIs",
  },
  metas: {
    nombre: "Metas activas",
    descripcion: "Carrusel de metas con progreso circular e ícono temático.",
    icon: Target,
    categoria: "Ahorro",
  },
  clima: {
    nombre: "Clima en Santiago",
    descripcion: "Pronóstico y temperatura en tiempo real en RD.",
    icon: Cloud,
    categoria: "Servicios",
  },
  dolar: {
    nombre: "Dólar y Euro (RD$)",
    descripcion: "Tasas oficiales de cambio actualizadas frente al DOP.",
    icon: DollarSign,
    categoria: "Mercado",
  },
  gastoMes: {
    nombre: "Gasto por Mes",
    descripcion: "Histórico y evolución mensual con selector de año.",
    icon: TrendingUp,
    categoria: "Gráficos",
  },
  gastoCategoria: {
    nombre: "Gastos por categoría",
    descripcion: "Distribución de gastos del mes actual por categoría.",
    icon: PieChartIcon,
    categoria: "Gráficos",
  },
  inflacion: {
    nombre: "Inflación en RD",
    descripcion: "Variación interanual del IPC (Banco Mundial / BCRD).",
    icon: TrendingUp,
    categoria: "Mercado",
  },
  combustible: {
    nombre: "Combustible (RD)",
    descripcion: "Precios oficiales semanales de gasolina MICM y galones.",
    icon: Fuel,
    categoria: "Mercado",
  },
  platoSugerido: {
    nombre: "Plato sugerido según despensa",
    descripcion: "Receta recomendada según los ingredientes que tienes.",
    icon: UtensilsCrossed,
    categoria: "Cocina",
  },
  acciones: {
    nombre: "Acciones e Inversiones",
    descripcion: "Panel horizontal a lo largo con cotizaciones bursátiles.",
    icon: LineChart,
    categoria: "Mercado",
  },
};

function normalizarOrden(savedOrder) {
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) {
    return SECTION_IDS_DEFAULT;
  }
  if (savedOrder.includes("kpis") || savedOrder.includes("gastos")) {
    const result = [];
    for (const id of savedOrder) {
      if (id === "kpis") {
        if (!result.includes("endeudamiento")) result.push("endeudamiento");
        if (!result.includes("fondoEmergencia")) result.push("fondoEmergencia");
        if (!result.includes("capacidadAhorro")) result.push("capacidadAhorro");
      } else if (id === "gastos") {
        if (!result.includes("gastoMes")) result.push("gastoMes");
        if (!result.includes("gastoCategoria")) result.push("gastoCategoria");
      } else if (SECTION_IDS_DEFAULT.includes(id)) {
        if (!result.includes(id)) result.push(id);
      }
    }
    for (const id of SECTION_IDS_DEFAULT) {
      if (!result.includes(id)) result.push(id);
    }
    return result;
  }
  return savedOrder.filter((id) => SECTION_IDS_DEFAULT.includes(id));
}

const RECETAS_DESTACADAS = [
  {
    id: "tortilla-patatas",
    titulo: "Tortilla de Patatas Tradicional",
    descripcion: "Esponjosa y dorada. Un clásico súper económico que aprovecha ingredientes básicos de tu despensa.",
    tiempo: "25 min",
    dificultad: "Fácil",
    tipoComida: "Almuerzo o Cena",
    terminoBusqueda: "Tortilla de patatas",
    fallbackImg: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Huevos", "Papas", "Cebolla", "Aceite"],
    pasos: [
      "Pela las papas y córtalas en rodajas finas.",
      "Sofríe las papas y la cebolla en sartén con aceite a fuego medio hasta que estén tiernas.",
      "Bate los huevos con un toque de sal e integra las papas escurridas.",
      "Cuaja en la sartén durante 3-4 minutos por cada lado.",
    ],
  },
  {
    id: "arroz-salteado",
    titulo: "Arroz Salteado con Huevos y Vegetales",
    descripcion: "Salteado express estilo wok, ideal para aprovechar arroz cocido y vegetales frescos.",
    tiempo: "15 min",
    dificultad: "Muy fácil",
    tipoComida: "Almuerzo",
    terminoBusqueda: "Arroz frito",
    fallbackImg: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Arroz", "Huevos", "Ajo", "Aceite", "Vegetales"],
    pasos: [
      "Calienta aceite en una sartén o wok a fuego vivo.",
      "Saltea ajo y vegetales picados durante 3 minutos.",
      "Agrega el arroz cocido y remueve enérgicamente.",
      "Haz espacio en el centro, casca los huevos, revuelve hasta que cuajen e integra todo.",
    ],
  },
  {
    id: "pasta-ajillo",
    titulo: "Pasta al Ajillo con Aceite de Oliva",
    descripcion: "Auténtica delicia de pocos ingredientes: ajo dorado, aceite de oliva virgen y pasta al dente.",
    tiempo: "15 min",
    dificultad: "Fácil",
    tipoComida: "Cena",
    terminoBusqueda: "Spaghetti aglio e olio",
    fallbackImg: "https://images.unsplash.com/photo-1621996346565-e3d5d62816da?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Pasta", "Ajo", "Aceite", "Sal"],
    pasos: [
      "Hierve la pasta en agua con sal hasta que quede al dente.",
      "En una sartén dora láminas de ajo en abundante aceite a fuego bajo.",
      "Añade un par de cucharadas de agua de cocción de la pasta para ligar la salsa.",
      "Integra la pasta escurrida en el aceite aromatizado y sirve de inmediato.",
    ],
  },
  {
    id: "shakshuka-tomate",
    titulo: "Shakshuka de Tomate y Huevos Pochados",
    descripcion: "Salsa espesa y aromática de tomates maduros con huevos tiernos listos para mojar pan.",
    tiempo: "20 min",
    dificultad: "Fácil",
    tipoComida: "Desayuno o Cena",
    terminoBusqueda: "Shakshuka",
    fallbackImg: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Huevos", "Tomates", "Cebolla", "Aceite", "Ajo"],
    pasos: [
      "Sofríe cebolla y ajo picado en aceite.",
      "Agrega tomates picados con una pizca de sal y cocina hasta lograr una salsa espesa.",
      "Haz huecos en la salsa y rompe los huevos dentro.",
      "Tapa la sartén a fuego bajo por 4 minutos hasta que la clara cuaje y la yema quede cremosa.",
    ],
  },
  {
    id: "mangu-dominicano",
    titulo: "Mangú con Cebollitas Salteadas",
    descripcion: "Clásico dominicano: plátano verde majado suave con mantequilla y cebollitas al vinagre.",
    tiempo: "20 min",
    dificultad: "Fácil",
    tipoComida: "Desayuno o Cena",
    terminoBusqueda: "Mangu",
    fallbackImg: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Plátanos", "Mantequilla", "Cebolla", "Huevos", "Aceite"],
    pasos: [
      "Pela los plátanos y hiérvelos en agua con sal hasta que estén tiernos.",
      "Maja los plátanos calientes con mantequilla y agua tibia de la cocción hasta que queden suaves.",
      "Saltea rodajas de cebolla en aceite con un chorrito de vinagre.",
      "Sirve el mangú cubierto con las cebollitas y acompáñalo con huevos o queso.",
    ],
  },
  {
    id: "pollo-salteado-verduras",
    titulo: "Pechuga de Pollo Salteada con Vegetales",
    descripcion: "Nutritivo y alto en proteínas. Trozos jugosos de pollo dorados con vegetales crujientes.",
    tiempo: "20 min",
    dificultad: "Media",
    tipoComida: "Almuerzo",
    terminoBusqueda: "Chicken stir fry",
    fallbackImg: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80",
    ingredientes: ["Pollo", "Cebolla", "Vegetales", "Ajo", "Aceite"],
    pasos: [
      "Corta la pechuga en tiras medianas y salpimienta.",
      "Sella el pollo a fuego vivo en sartén con aceite hasta que dore.",
      "Agrega cebolla y vegetales y saltea durante 4 minutos para mantener textura crocante.",
      "Ajusta sal y pimienta y sirve caliente.",
    ],
  },
];

async function obtenerFotoWikipedia(termino) {
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(termino)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const first = Object.values(pages)[0];
      if (first?.thumbnail?.source) return first.thumbnail.source;
    }
  } catch {}
  return null;
}

function PlatoSugeridoCard({ products = [], onNavigate }) {
  const [indice, setIndice] = useState(0);
  const [imagenUrl, setImagenUrl] = useState(null);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const listaDespensaNombres = useMemo(() => {
    return (products || []).map((p) => (p.name || p.nombre || "").toLowerCase());
  }, [products]);

  const recetasOrdenadas = useMemo(() => {
    return RECETAS_DESTACADAS.map((receta) => {
      const matchCount = receta.ingredientes.filter((ing) =>
        listaDespensaNombres.some((pName) => pName.includes(ing.toLowerCase()) || ing.toLowerCase().includes(pName))
      ).length;
      return { ...receta, matchCount, total: receta.ingredientes.length };
    }).sort((a, b) => b.matchCount - a.matchCount);
  }, [listaDespensaNombres]);

  const recetaActual = recetasOrdenadas[indice % recetasOrdenadas.length] || RECETAS_DESTACADAS[0];

  useEffect(() => {
    let cancelado = false;
    setCargandoImagen(true);
    setImagenUrl(null);

    obtenerFotoWikipedia(recetaActual.terminoBusqueda || recetaActual.titulo).then((url) => {
      if (!cancelado) {
        setImagenUrl(url || recetaActual.fallbackImg);
        setCargandoImagen(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [recetaActual]);

  const handleSiguiente = (e) => {
    e.stopPropagation();
    setIndice((prev) => (prev + 1) % recetasOrdenadas.length);
  };

  const tieneTodos = recetaActual.matchCount === recetaActual.total;

  return (
    <>
      <div
        onClick={() => setModalAbierto(true)}
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "transform 0.15s ease, border-color 0.15s ease",
          height: "100%",
          minHeight: 250,
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--sage)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--line)";
        }}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UtensilsCrossed size={16} style={{ color: "var(--sage)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Plato sugerido</span>
          </div>
          <button
            onClick={handleSiguiente}
            title="Sugerir otro plato"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--paper)",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Imagen del plato adaptada al diseño */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 125,
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--paper)",
            border: "1px solid var(--line-soft)",
            marginBottom: 10,
          }}
        >
          {cargandoImagen && !imagenUrl ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--paper)",
                color: "var(--ink-soft)",
              }}
            >
              <RefreshCw size={18} style={{ animation: "spin 0.9s linear infinite" }} />
            </div>
          ) : (
            <img
              src={imagenUrl || recetaActual.fallbackImg}
              alt={recetaActual.titulo}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                e.target.src = recetaActual.fallbackImg;
              }}
            />
          )}

          {/* Gradiente sutil y etiquetas sobre la foto */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "6px 8px",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                padding: "2px 6px",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={10} /> {recetaActual.tiempo}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {recetaActual.dificultad}
            </span>
          </div>
        </div>

        {/* Título y descripción */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25, marginBottom: 4 }}>
              {recetaActual.titulo}
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--ink-soft)",
                lineHeight: 1.4,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {recetaActual.descripcion}
            </p>
          </div>

          {/* Estado de ingredientes de despensa y botón */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: tieneTodos ? "var(--sage)" : "var(--amber)",
                background: tieneTodos ? "var(--sage-bg)" : "var(--amber-bg)",
                border: tieneTodos ? "1px solid rgba(86,171,95,0.25)" : "1px solid rgba(201,154,63,0.25)",
                padding: "3px 7px",
                borderRadius: 5,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {tieneTodos ? <CheckCircle2 size={11} /> : <Sparkles size={11} />}
              {tieneTodos ? "Ingredientes listos en despensa" : `${recetaActual.matchCount}/${recetaActual.total} en despensa`}
            </span>

            <span
              style={{
                fontSize: 11,
                color: "var(--ink-soft)",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                fontWeight: 500,
              }}
            >
              Ver receta →
            </span>
          </div>
        </div>
      </div>

      {/* Modal interactivo con receta completa */}
      {modalAbierto && (
        <div
          onClick={() => setModalAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Cabecera del modal con foto */}
            <div style={{ position: "relative", height: 180, width: "100%", background: "var(--paper)" }}>
              <img
                src={imagenUrl || recetaActual.fallbackImg}
                alt={recetaActual.titulo}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                onClick={() => setModalAbierto(false)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  insetInline: 0,
                  padding: "10px 14px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                }}
              >
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{recetaActual.titulo}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#fff", opacity: 0.9 }}>⏱ {recetaActual.tiempo}</span>
                  <span style={{ fontSize: 11, color: "#fff", opacity: 0.9 }}>· {recetaActual.dificultad}</span>
                  <span style={{ fontSize: 11, color: "#fff", opacity: 0.9 }}>· {recetaActual.tipoComida}</span>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                {recetaActual.descripcion}
              </p>

              {/* Ingredientes */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <ChefHat size={15} style={{ color: "var(--sage)" }} /> Ingredientes necesarios
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {recetaActual.ingredientes.map((ing) => {
                    const enDespensa = listaDespensaNombres.some((pName) => pName.includes(ing.toLowerCase()) || ing.toLowerCase().includes(pName));
                    return (
                      <div
                        key={ing}
                        style={{
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: enDespensa ? "var(--sage-bg)" : "var(--paper)",
                          border: enDespensa ? "1px solid rgba(86,171,95,0.25)" : "1px solid var(--line)",
                          color: enDespensa ? "var(--sage)" : "var(--ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{ing}</span>
                        {enDespensa && <span style={{ fontSize: 10, fontWeight: 600 }}>En despensa ✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pasos de preparación */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  Pasos de preparación
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recetaActual.pasos.map((paso, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.4, color: "var(--ink)" }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "var(--sage)",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>{paso}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón de acción */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {onNavigate && (
                  <button
                    onClick={() => {
                      setModalAbierto(false);
                      onNavigate("compras");
                    }}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--sage)",
                      color: "#fff",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <UtensilsCrossed size={14} /> Ver en Despensa y Recetas
                  </button>
                )}
                <button
                  onClick={() => setModalAbierto(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    background: "var(--paper)",
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SortableCard({ id, onRemove, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const isFullWidth = id === "acciones";
  const isTwoCols = id === "gastoMes";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    zIndex: isDragging ? 99 : 1,
    minWidth: 0,
    height: "100%",
    gridColumn: isFullWidth ? "1 / -1" : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className={isTwoCols ? "inicio-col-span-2" : ""}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 2px",
          marginBottom: 4,
          color: "var(--ink-soft)",
          userSelect: "none",
        }}
      >
        <div style={{ width: 22 }} />
        <div
          {...attributes}
          {...listeners}
          title="Arrastrar para mover este componente"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 14px",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            borderRadius: 6,
            opacity: 0.65,
            transition: "opacity 0.2s ease, background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background = "var(--line-soft)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.65";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: "var(--line)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove && onRemove(id);
          }}
          title={`Quitar ${MODULOS_INFO[id]?.nombre || "este módulo"} del inicio`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "none",
            background: "transparent",
            color: "var(--ink-soft)",
            cursor: "pointer",
            opacity: 0.45,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background = "var(--stamp-bg)";
            e.currentTarget.style.color = "var(--stamp)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.45";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--ink-soft)";
          }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

export default function Inicio({ prestamos, tarjetas, fuentesIngreso, movimientos, cuentas, presupuesto, diasCobro, products = [], metasAhorro = [], activos = [], onNavigate }) {
  const [orden, setOrden] = useState(SECTION_IDS_DEFAULT);
  const [gastosPorMesYear, setGastosPorMesYear] = useState(new Date().getFullYear());
  const [modalModulosAbierto, setModalModulosAbierto] = useState(false);

  useEffect(() => {
    const unsub = watchInicioOrden((o) => {
      setOrden(normalizarOrden(o));
    }, () => {});
    return () => unsub();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrden((items) => {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const nuevo = arrayMove(items, oldIndex, newIndex);
      saveInicioOrden(nuevo);
      return nuevo;
    });
  };

  const handleQuitarModulo = (id) => {
    const nuevo = orden.filter((item) => item !== id);
    setOrden(nuevo);
    saveInicioOrden(nuevo);
  };

  const handleToggleModulo = (id) => {
    let nuevo;
    if (orden.includes(id)) {
      nuevo = orden.filter((item) => item !== id);
    } else {
      nuevo = [...orden, id];
    }
    setOrden(nuevo);
    saveInicioOrden(nuevo);
  };

  const handleMostrarTodos = () => {
    setOrden(SECTION_IDS_DEFAULT);
    saveInicioOrden(SECTION_IDS_DEFAULT);
  };

  const cuotaPrestamos = useMemo(
    () =>
      prestamos
        .filter((p) => {
          if (p.estado !== "Activo") return false;
          const cuotasTotales = p.frecuenciaCuota === "Personalizado" ? (p.cuotasPersonalizadas || []).length : p.plazoUnidad === "años" ? (p.plazo || 0) * 12 : p.plazo || 0;
          return cuotasTotales > 1;
        })
        .reduce((s, p) => s + (Number(p.cuota) || 0), 0),
    [prestamos]
  );

  const pagoTarjetas = useMemo(
    () => tarjetas.filter((t) => t.estado === "Activa").reduce((s, t) => s + (Number(t.pagoMinimo) || 0), 0),
    [tarjetas]
  );

  // Tasa de cambio (de la misma caché que usa la tarjeta de Dólar), solo para
  // convertir saldos en USD a pesos en el KPI de deuda total. No dispara una
  // consulta nueva a la API — usa lo que ya haya en caché.
  const [tipoCambioUSD, setTipoCambioUSD] = useState(null);
  useEffect(() => {
    const unsub = watchTipoCambioCache((cache) => {
      if (cache?.rates?.USD) setTipoCambioUSD(cache.rates.USD);
    }, () => {});
    return () => unsub();
  }, []);

  const deudaTotalTarjetas = useMemo(() => {
    return tarjetas
      .filter((t) => t.estado === "Activa")
      .reduce((s, t) => {
        let deuda = Number(t.saldoActual) || 0;
        if (t.tieneMonedaSecundaria && t.saldoActualUSD && tipoCambioUSD) {
          deuda += Number(t.saldoActualUSD) * tipoCambioUSD;
        }
        return s + deuda;
      }, 0);
  }, [tarjetas, tipoCambioUSD]);

  const ingresoMensual = useMemo(() => ingresoMensualNeto(fuentesIngreso), [fuentesIngreso]);

  const deudaMensual = cuotaPrestamos + pagoTarjetas;
  const pct = ingresoMensual > 0 ? (deudaMensual / ingresoMensual) * 100 : null;
  const clasificacion = pct != null ? clasificarEndeudamiento(pct) : null;

  const ahorroTotal = useMemo(() => {
    if (!cuentas) return 0;
    const cuentasAhorro = cuentas.filter((c) => c.tipo === "Ahorro");
    let total = 0;
    for (const c of cuentasAhorro) {
      total += c.saldoInicial || 0;
      for (const m of movimientos) {
        if (m.category === "Ahorro" && m.cuentaId === c.id) total += Number(m.amount) || 0;
      }
    }
    return total;
  }, [cuentas, movimientos]);

  const gastoMensualPromedio = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let total = 0;
    for (const m of movimientos) {
      if (m.type !== "Gasto" || !m.date) continue;
      const [y] = m.date.split("-").map(Number);
      if (y !== year) continue;
      total += Number(m.amount) || 0;
    }
    return total / Math.max(currentMonth, 1);
  }, [movimientos]);

  const mesesCobertura = gastoMensualPromedio > 0 ? ahorroTotal / gastoMensualPromedio : null;
  const clasificacionFondo = mesesCobertura != null ? clasificarFondoEmergencia(mesesCobertura) : null;

  const gastoPresupuestadoMesActual = useMemo(() => {
    if (!presupuesto) return 0;
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1);
    let total = 0;
    for (const catData of Object.values(presupuesto)) {
      if (!catData || typeof catData !== "object") continue;
      const mData = catData[currentMonth];
      if (mData) {
        total += (Number(mData.Q1) || 0) + (Number(mData.Q2) || 0);
      }
    }
    return total;
  }, [presupuesto]);

  const gastoMensualReferencia = gastoMensualPromedio > 0 ? gastoMensualPromedio : gastoPresupuestadoMesActual;
  const ahorroPotencialMensual = ingresoMensual > 0 ? ingresoMensual - gastoMensualReferencia : 0;
  const pctCapacidadAhorro = ingresoMensual > 0 ? (ahorroPotencialMensual / ingresoMensual) * 100 : 0;
  const clasificacionAhorro = clasificarCapacidadAhorro(pctCapacidadAhorro);

  const endeudamientoContent = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center", position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <InfoTooltip>
          (Cuotas de préstamos activos + pago mínimo de tarjetas activas) ÷ ingreso mensual estimado.
          Saludable por debajo del 35-40%. No incluye membresías ni gastos variables.
        </InfoTooltip>
        <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nivel de endeudamiento</div>

        {ingresoMensual === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "24px 0" }}>
            <AlertTriangle size={15} />
            Configura al menos una fuente de ingreso activa (sección Ingresos) para calcular este KPI.
          </div>
        ) : (
          <>
            <GaugeChart value={pct} maxValue={100} zones={ZONES_DEUDA} marks={[0, 20, 35, 50, 100]} />
            <div style={{ marginTop: -18, marginBottom: 6 }}>
              <span className="despensa-mono" style={{ fontSize: 32, fontWeight: 700, color: clasificacion.color }}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <span
              className="despensa-tab-font"
              style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: clasificacion.bg, color: clasificacion.color }}
            >
              {clasificacion.label}
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, borderTop: "1px solid var(--line-soft)", marginTop: 20, paddingTop: 16, textAlign: "left" }}>
              <MiniStat icon={Briefcase} label="Ingreso" value={formatMoney(ingresoMensual)} color="var(--sage)" compact />
              <MiniStat icon={Banknote} label="Cuotas" value={formatMoney(cuotaPrestamos)} color="var(--stamp)" compact />
              <MiniStat icon={CreditCard} label="Pago mín." value={formatMoney(pagoTarjetas)} color="var(--stamp)" compact />
              <MiniStat icon={CreditCard} label="Deuda total" value={formatMoney(deudaTotalTarjetas)} color="var(--stamp)" compact />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const fondoEmergenciaContent = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center", position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <InfoTooltip>
          Saldo en cuentas de Ahorro ÷ gasto mensual promedio de este año. Los expertos recomiendan tener
          entre 3 y 6 meses de gastos cubiertos.
        </InfoTooltip>
        <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Fondo de emergencia</div>

        {mesesCobertura == null ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "24px 0", textAlign: "left" }}>
            <AlertTriangle size={15} />
            Registra gastos en Movimientos para calcular tu gasto mensual promedio y activar este KPI.
          </div>
        ) : (
          <>
            <GaugeChart value={mesesCobertura} maxValue={12} zones={ZONES_FONDO} marks={[0, 3, 6, 9, 12]} />
            <div style={{ marginTop: -18, marginBottom: 6 }}>
              <span className="despensa-mono" style={{ fontSize: 32, fontWeight: 700, color: clasificacionFondo.color }}>
                {mesesCobertura.toFixed(1)}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}> meses</span>
            </div>
            <span
              className="despensa-tab-font"
              style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: clasificacionFondo.bg, color: clasificacionFondo.color }}
            >
              {clasificacionFondo.label}
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, borderTop: "1px solid var(--line-soft)", marginTop: 20, paddingTop: 16, textAlign: "left" }}>
              <MiniStat icon={PiggyBank} label="En ahorro" value={formatMoney(ahorroTotal)} color="var(--sage)" compact />
              <MiniStat icon={Banknote} label="Gasto mensual" value={formatMoney(gastoMensualPromedio)} color="var(--stamp)" compact />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const capacidadAhorroContent = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center", position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <InfoTooltip>
          (Ingreso mensual estimado - Gasto mensual promedio) ÷ ingreso mensual estimado. Representa el
          porcentaje de tus ingresos disponible para ahorrar o invertir después de cubrir tus gastos reales. Los expertos
          recomiendan ahorrar al menos un 20%.
        </InfoTooltip>
        <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Capacidad de ahorro</div>

        {ingresoMensual === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "24px 0" }}>
            <AlertTriangle size={15} />
            Configura al menos una fuente de ingreso activa (sección Ingresos) para calcular este KPI.
          </div>
        ) : (
          <>
            <GaugeChart value={Math.max(0, Math.min(pctCapacidadAhorro, 100))} maxValue={100} zones={ZONES_AHORRO} marks={[0, 10, 20, 35, 50, 100]} />
            <div style={{ marginTop: -18, marginBottom: 6 }}>
              <span className="despensa-mono" style={{ fontSize: 32, fontWeight: 700, color: clasificacionAhorro.color }}>
                {pctCapacidadAhorro.toFixed(1)}%
              </span>
            </div>
            <span
              className="despensa-tab-font"
              style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: clasificacionAhorro.bg, color: clasificacionAhorro.color }}
            >
              {clasificacionAhorro.label}
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, borderTop: "1px solid var(--line-soft)", marginTop: 20, paddingTop: 16, textAlign: "left" }}>
              <MiniStat icon={PiggyBank} label="Remanente" value={formatMoney(ahorroPotencialMensual)} color={ahorroPotencialMensual >= 0 ? "var(--sage)" : "var(--stamp)"} compact />
              <MiniStat icon={Briefcase} label="Ingreso" value={formatMoney(ingresoMensual)} color="var(--sage)" compact />
              <MiniStat icon={TrendingUp} label="Meta (20%)" value={formatMoney(ingresoMensual * 0.2)} color="var(--ink-soft)" compact />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const metasContent = (
    <MetasSlideCard
      metasAhorro={metasAhorro}
      activos={activos}
      cuentas={cuentas}
      movimientos={movimientos}
      fuentesIngreso={fuentesIngreso}
      onNavigate={onNavigate}
    />
  );

  const climaContent = <ClimaCardInner />;

  const dolarContent = <DolarCard />;

  const gastoMesContent = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 13.5, fontWeight: 600 }}>Gasto x Mes</span>
        </div>
        <SelectorAnio year={gastosPorMesYear} setYear={setGastosPorMesYear} anioActual={new Date().getFullYear()} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GastosPorMesChart movimientos={movimientos} year={gastosPorMesYear} setYear={setGastosPorMesYear} />
      </div>
    </div>
  );

  const gastoCategoriaContent = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <PieChartIcon size={16} style={{ color: "var(--ink-soft)" }} />
        <span className="despensa-tab-font" style={{ fontSize: 13.5, fontWeight: 600 }}>Gastos por categoría</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GastosPorCategoriaMesActual movimientos={movimientos} compact />
      </div>
    </div>
  );

  const inflacionContent = <InflacionCard />;
  const combustibleContent = <CombustibleCard presupuesto={presupuesto} diasCobro={diasCobro} />;
  const platoSugeridoContent = <PlatoSugeridoCard products={products} onNavigate={onNavigate} />;
  const accionesContent = <StocksCard />;

  const SECTION_CONTENT = {
    endeudamiento: endeudamientoContent,
    fondoEmergencia: fondoEmergenciaContent,
    capacidadAhorro: capacidadAhorroContent,
    metas: metasContent,
    clima: climaContent,
    dolar: dolarContent,
    gastoMes: gastoMesContent,
    gastoCategoria: gastoCategoriaContent,
    inflacion: inflacionContent,
    combustible: combustibleContent,
    platoSugerido: platoSugeridoContent,
    acciones: accionesContent,
  };

  const hayCambiosOrden = useMemo(() => {
    return JSON.stringify(orden) !== JSON.stringify(SECTION_IDS_DEFAULT);
  }, [orden]);

  const restablecerOrden = () => {
    setOrden(SECTION_IDS_DEFAULT);
    saveInicioOrden(SECTION_IDS_DEFAULT);
  };

  const modulosOcultosCount = SECTION_IDS_DEFAULT.length - orden.length;

  return (
    <div>
      <style>{`
        @media (min-width: 900px) {
          .inicio-col-span-2 {
            grid-column: span 2 !important;
          }
        }
      `}</style>

      {/* Barra superior de personalización y control de módulos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>
          <LayoutGrid size={15} style={{ color: "var(--sage)" }} />
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{orden.length} de {SECTION_IDS_DEFAULT.length} módulos</span>
          <span>· Arrastra para ordenar o personaliza tu panel</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setModalModulosAbierto(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
            title="Agregar o quitar módulos de la pantalla principal"
          >
            <SlidersHorizontal size={13} style={{ color: "var(--sage)" }} />
            Gestionar módulos
            {modulosOcultosCount > 0 && (
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 10.5,
                  background: "var(--amber-bg)",
                  color: "var(--amber)",
                  fontWeight: 700,
                }}
              >
                +{modulosOcultosCount} ocultos
              </span>
            )}
          </button>

          {hayCambiosOrden && (
            <button
              onClick={restablecerOrden}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                background: "var(--paper)",
                border: "1px solid var(--line)",
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
              title="Restablecer el orden y visibilidad predeterminados"
            >
              <RefreshCw size={11} /> Restablecer
            </button>
          )}
        </div>
      </div>

      {orden.length === 0 ? (
        <div
          style={{
            background: "var(--card)",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            padding: "3rem 1.5rem",
            textAlign: "center",
            maxWidth: 480,
            margin: "2rem auto",
          }}
        >
          <SlidersHorizontal size={36} style={{ color: "var(--ink-soft)", margin: "0 auto 12px" }} />
          <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            No hay módulos visibles en Inicio
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 18 }}>
            Has ocultado todos los módulos de tu pantalla principal. Puedes elegir cuáles activar desde el panel de gestión.
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button
              onClick={() => setModalModulosAbierto(true)}
              style={{
                padding: "8px 16px",
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SlidersHorizontal size={14} /> Seleccionar módulos
            </button>
            <button
              onClick={handleMostrarTodos}
              style={{
                padding: "8px 16px",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Mostrar todos
            </button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orden} strategy={rectSortingStrategy}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              {orden.map((id) => (
                <SortableCard key={id} id={id} onRemove={handleQuitarModulo}>
                  {SECTION_CONTENT[id]}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal para agregar y quitar módulos */}
      {modalModulosAbierto && (
        <div
          onClick={() => setModalModulosAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 580,
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
          >
            {/* Cabecera */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SlidersHorizontal size={17} style={{ color: "var(--sage)" }} />
                <div>
                  <div className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                    Gestionar módulos de Inicio
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                    Elige qué tarjetas mostrar u ocultar en tu pantalla principal
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalModulosAbierto(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Lista de módulos con toggles */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {SECTION_IDS_DEFAULT.map((modId) => {
                const info = MODULOS_INFO[modId] || { nombre: modId, descripcion: "", icon: Target };
                const Icon = info.icon;
                const estaActivo = orden.includes(modId);

                return (
                  <div
                    key={modId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: estaActivo ? "var(--paper)" : "rgba(0,0,0,0.02)",
                      border: estaActivo ? "1px solid var(--line)" : "1px dashed var(--line-soft)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: estaActivo ? "var(--sage-bg)" : "var(--paper)",
                          color: estaActivo ? "var(--sage)" : "var(--ink-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          border: "1px solid var(--line-soft)",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: estaActivo ? "var(--ink)" : "var(--ink-soft)", lineHeight: 1.3 }}>
                          {info.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.3, marginTop: 1 }}>
                          {info.descripcion}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleModulo(modId)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        background: estaActivo ? "var(--sage)" : "var(--paper)",
                        color: estaActivo ? "#fff" : "var(--ink-soft)",
                        boxShadow: estaActivo ? "0 2px 6px rgba(86, 171, 95, 0.25)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {estaActivo ? (
                        <>
                          <Check size={12} /> Visible
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Agregar
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--line)",
                background: "var(--paper)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleMostrarTodos}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  Mostrar todos
                </button>
                <button
                  onClick={restablecerOrden}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  Restablecer
                </button>
              </div>

              <button
                onClick={() => setModalModulosAbierto(false)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--ink)",
                  color: "var(--paper)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ children }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!show) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [show]);

  return (
    <div ref={ref} style={{ position: "absolute", top: 12, right: 12 }}>
      <button
        onClick={() => setShow((s) => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        title="¿Cómo se calcula?"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid var(--line)",
          background: "var(--paper)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        i
      </button>
      {show && (
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 220,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "9px 11px",
            fontSize: 11,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
            textAlign: "left",
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            zIndex: 20,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color, compact }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: compact ? 9 : 10.5,
          color: "var(--ink-soft)",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          marginBottom: 3,
          whiteSpace: compact ? "nowrap" : "normal",
          overflow: compact ? "hidden" : "visible",
          textOverflow: compact ? "ellipsis" : "clip",
        }}
        title={compact ? label : undefined}
      >
        <Icon size={compact ? 10 : 11} style={{ flexShrink: 0 }} />
        {label}
      </div>
      <div
        className="despensa-mono"
        style={{ fontSize: compact ? 12 : 14, fontWeight: 600, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        title={compact ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
