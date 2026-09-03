import React, { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Banknote, CreditCard, Briefcase, AlertTriangle, TrendingUp, TrendingDown, DollarSign, RefreshCw, LineChart, Settings, Plus, Trash2, X, PiggyBank, GripVertical, PieChart as PieChartIcon } from "lucide-react";
import { watchAcciones, addAccion, deleteAccion, watchAccionesConfig, saveAccionesConfig, watchAccionesPrecios, saveAccionesPrecios, watchCombustibleConfig, saveCombustibleConfig, watchInicioOrden, saveInicioOrden, watchTipoCambioCache, saveTipoCambioCache } from "../lib/db";
import { confirm } from "../lib/confirm";
import { ingresoMensualNeto } from "../lib/deduccionesLey";

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
  const toPct = (v) => Math.max(0, Math.min((v / maxValue) * 100, 100));
  const needleAngle = -90 + toPct(value) * 1.8;
  const needleTip = polarToCartesian(cx, cy, r - 22, needleAngle);

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
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
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

function GastosPorMesChart({ movimientos }) {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

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
        Todavía no hay gastos registrados este año. Ve a Movimientos para agregar el primero.
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

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 300, display: "block" }}>
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
              {s.values.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={2.5} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, justifyContent: "center" }}>
        {series.map((s, si) => (
          <span key={s.category} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-soft)" }}>
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={16} style={{ color: "var(--ink-soft)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Dólar (USD)</span>
          </div>
          <button
            onClick={fetchRates}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
            <AlertTriangle size={15} />
            No se pudo obtener el tipo de cambio ahora.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>1 USD =</span>
            <span className="despensa-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--sage)" }}>
              {rates.USD != null ? rates.USD.toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>DOP</span>
          </div>
        )}

        {updatedAt && (
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Actualizado {updatedAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={16} style={{ color: "var(--ink-soft)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Euro (EUR)</span>
          </div>
          <button
            onClick={fetchRates}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
            <AlertTriangle size={15} />
            No se pudo obtener el tipo de cambio ahora.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>1 EUR =</span>
            <span className="despensa-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--sage)" }}>
              {rates.EUR != null ? rates.EUR.toFixed(2) : "—"}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>DOP</span>
          </div>
        )}

        {updatedAt && (
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10 }}>
            Actualizado {updatedAt.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
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

const SECTION_IDS_DEFAULT = ["kpis", "acciones", "gastos", "dolar"];

function SortableSection({ id, isFirst, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginTop: isFirst ? 0 : 16,
    position: "relative",
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        title="Arrastrar para reordenar esta sección"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 16,
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--ink-soft)",
          touchAction: "none",
        }}
      >
        <GripVertical size={13} style={{ transform: "rotate(90deg)" }} />
      </div>
      {children}
    </div>
  );
}

export default function Inicio({ prestamos, tarjetas, fuentesIngreso, movimientos, cuentas }) {
  const [orden, setOrden] = useState(SECTION_IDS_DEFAULT);

  useEffect(() => {
    const unsub = watchInicioOrden((o) => {
      if (o && Array.isArray(o) && o.length > 0) {
        const completo = [...o.filter((id) => SECTION_IDS_DEFAULT.includes(id)), ...SECTION_IDS_DEFAULT.filter((id) => !o.includes(id))];
        setOrden(completo);
      }
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

  const cuotaPrestamos = useMemo(
    () => prestamos.filter((p) => p.estado === "Activo").reduce((s, p) => s + (Number(p.cuota) || 0), 0),
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

  const kpisContent = (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center", position: "relative" }}>
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
                <MiniStat icon={Briefcase} label="Ingreso mensual" value={formatMoney(ingresoMensual)} color="var(--sage)" compact />
                <MiniStat icon={Banknote} label="Cuotas préstamos" value={formatMoney(cuotaPrestamos)} color="var(--stamp)" compact />
                <MiniStat icon={CreditCard} label="Pago mín. tarjetas" value={formatMoney(pagoTarjetas)} color="var(--stamp)" compact />
                <MiniStat icon={CreditCard} label="Deuda total tarjetas" value={formatMoney(deudaTotalTarjetas)} color="var(--stamp)" compact />
              </div>
            </>
          )}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center", position: "relative" }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, borderTop: "1px solid var(--line-soft)", marginTop: 20, paddingTop: 16, textAlign: "left" }}>
                <MiniStat icon={PiggyBank} label="En cuentas de ahorro" value={formatMoney(ahorroTotal)} color="var(--sage)" compact />
                <MiniStat icon={Banknote} label="Gasto mensual prom." value={formatMoney(gastoMensualPromedio)} color="var(--stamp)" compact />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const accionesContent = <StocksCard />;

  const gastosContent = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      <div style={{ flex: "2 1 340px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <TrendingUp size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Gastos por mes y categoría</span>
        </div>
        <GastosPorMesChart movimientos={movimientos} />
      </div>
      <div style={{ flex: "1 1 200px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <PieChartIcon size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Gastos por categoría</span>
        </div>
        <GastosPorCategoriaMesActual movimientos={movimientos} compact />
      </div>
    </div>
  );

  const dolarContent = <DolarCard />;

  const SECTION_CONTENT = { kpis: kpisContent, acciones: accionesContent, gastos: gastosContent, dolar: dolarContent };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orden} strategy={verticalListSortingStrategy}>
          {orden.map((id, i) => (
            <SortableSection key={id} id={id} isFirst={i === 0}>
              {SECTION_CONTENT[id]}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>
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
