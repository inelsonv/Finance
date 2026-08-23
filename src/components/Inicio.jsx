import React, { useMemo } from "react";
import { Banknote, CreditCard, Briefcase, AlertTriangle, TrendingUp } from "lucide-react";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

function clasificarEndeudamiento(pct) {
  if (pct <= 20) return { label: "Saludable", color: "var(--sage)", bg: "var(--sage-bg)" };
  if (pct <= 35) return { label: "Moderado", color: "#b8892b", bg: "#fbf1de" };
  if (pct <= 50) return { label: "Alto", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  return { label: "Crítico", color: "#8a2a1d", bg: "var(--stamp-bg)" };
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

const ZONES = [
  { from: 0, to: 20, color: "var(--sage)" },
  { from: 20, to: 35, color: "#c99a3f" },
  { from: 35, to: 50, color: "var(--stamp)" },
  { from: 50, to: 100, color: "#8a2a1d" },
];

function GaugeChart({ pct }) {
  const cx = 110;
  const cy = 108;
  const r = 88;
  const needlePct = Math.max(0, Math.min(pct, 100));
  const needleAngle = -90 + needlePct * 1.8;
  const needleTip = polarToCartesian(cx, cy, r - 22, needleAngle);

  return (
    <svg viewBox="0 0 220 128" style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      {ZONES.map((z) => (
        <path
          key={z.from}
          d={arcPath(cx, cy, r, z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth={16}
          strokeLinecap="butt"
        />
      ))}
      {[0, 20, 35, 50, 100].map((mark) => {
        const p = polarToCartesian(cx, cy, r + 14, -90 + mark * 1.8);
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
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 480, display: "block" }}>
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

export default function Inicio({ prestamos, tarjetas, fuentesIngreso, movimientos }) {
  const cuotaPrestamos = useMemo(
    () => prestamos.filter((p) => p.estado === "Activo").reduce((s, p) => s + (Number(p.cuota) || 0), 0),
    [prestamos]
  );

  const pagoTarjetas = useMemo(
    () => tarjetas.filter((t) => t.estado === "Activa").reduce((s, t) => s + (Number(t.pagoMinimo) || 0), 0),
    [tarjetas]
  );

  const ingresoMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentesIngreso) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
    }
    return total;
  }, [fuentesIngreso]);

  const deudaMensual = cuotaPrestamos + pagoTarjetas;
  const pct = ingresoMensual > 0 ? (deudaMensual / ingresoMensual) * 100 : null;
  const clasificacion = pct != null ? clasificarEndeudamiento(pct) : null;

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", textAlign: "center" }}>
        <div className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nivel de endeudamiento</div>

        {ingresoMensual === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "24px 0" }}>
            <AlertTriangle size={15} />
            Configura al menos una fuente de ingreso activa (sección Ingresos) para calcular este KPI.
          </div>
        ) : (
          <>
            <GaugeChart pct={pct} />
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, borderTop: "1px solid var(--line-soft)", marginTop: 20, paddingTop: 16, textAlign: "left" }}>
              <MiniStat icon={Briefcase} label="Ingreso mensual" value={formatMoney(ingresoMensual)} color="var(--sage)" />
              <MiniStat icon={Banknote} label="Cuotas de préstamos" value={formatMoney(cuotaPrestamos)} color="var(--stamp)" />
              <MiniStat icon={CreditCard} label="Pago mín. tarjetas" value={formatMoney(pagoTarjetas)} color="var(--stamp)" />
            </div>

            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.5, textAlign: "left" }}>
              Se calcula como (cuotas de préstamos activos + pago mínimo de tarjetas activas) ÷ ingreso
              mensual estimado. Los expertos suelen considerar saludable un nivel por debajo del 35-40%.
              No incluye membresías ni gastos variables — solo compromisos de deuda.
            </div>
          </>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <TrendingUp size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Gastos por mes y categoría</span>
        </div>
        <GastosPorMesChart movimientos={movimientos} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 3 }}>
        <Icon size={11} />
        {label}
      </div>
      <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
