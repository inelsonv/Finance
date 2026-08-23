import React, { useMemo } from "react";
import { Banknote, CreditCard, Briefcase, AlertTriangle } from "lucide-react";

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

export default function Inicio({ prestamos, tarjetas, fuentesIngreso }) {
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
