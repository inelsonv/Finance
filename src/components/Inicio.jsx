import React, { useMemo } from "react";
import { Gauge, Banknote, CreditCard, Briefcase, AlertTriangle } from "lucide-react";

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
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Gauge size={16} style={{ color: "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 600 }}>Nivel de endeudamiento</span>
        </div>

        {ingresoMensual === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", padding: "8px 0" }}>
            <AlertTriangle size={15} />
            Configura al menos una fuente de ingreso activa (sección Ingresos) para calcular este KPI.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span className="despensa-mono" style={{ fontSize: 36, fontWeight: 700, color: clasificacion.color }}>
                {pct.toFixed(1)}%
              </span>
              <span
                className="despensa-tab-font"
                style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: clasificacion.bg, color: clasificacion.color }}
              >
                {clasificacion.label}
              </span>
            </div>

            <div style={{ height: 10, borderRadius: 6, background: "var(--line-soft)", overflow: "hidden", position: "relative", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: clasificacion.color, borderRadius: 6, transition: "width 0.3s ease" }} />
              {[20, 35, 50].map((mark) => (
                <div key={mark} style={{ position: "absolute", top: 0, left: `${mark}%`, width: 1, height: "100%", background: "rgba(255,255,255,0.6)" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-soft)", marginBottom: 16 }}>
              <span>0%</span>
              <span>20%</span>
              <span>35%</span>
              <span>50%+</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
              <MiniStat icon={Briefcase} label="Ingreso mensual" value={formatMoney(ingresoMensual)} color="var(--sage)" />
              <MiniStat icon={Banknote} label="Cuotas de préstamos" value={formatMoney(cuotaPrestamos)} color="var(--stamp)" />
              <MiniStat icon={CreditCard} label="Pago mín. tarjetas" value={formatMoney(pagoTarjetas)} color="var(--stamp)" />
            </div>

            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.5 }}>
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
