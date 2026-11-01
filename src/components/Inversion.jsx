import React, { useMemo } from "react";
import { LineChart, Landmark, TrendingUp } from "lucide-react";

const TIPOS_INVERSION = ["Inversión", "Corretaje"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Inversion({ cuentas, movimientos }) {
  const cuentasInversion = useMemo(
    () => cuentas.filter((c) => TIPOS_INVERSION.includes(c.tipo)),
    [cuentas]
  );

  const aportesPorCuenta = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (!TIPOS_INVERSION.includes(m.category) || !m.cuentaId) continue;
      if (!map[m.cuentaId]) map[m.cuentaId] = { total: 0, movimientos: [] };
      map[m.cuentaId].total += Number(m.amount) || 0;
      map[m.cuentaId].movimientos.push(m);
    }
    return map;
  }, [movimientos]);

  const totalGeneral = useMemo(() => {
    let total = 0;
    for (const c of cuentasInversion) {
      total += c.saldoInicial || 0;
      total += aportesPorCuenta[c.id]?.total || 0;
    }
    return total;
  }, [cuentasInversion, aportesPorCuenta]);

  if (cuentasInversion.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no tienes cuentas de tipo <strong style={{ color: "var(--ink)" }}>Inversión</strong> o{" "}
        <strong style={{ color: "var(--ink)" }}>Corretaje</strong>. Ve a{" "}
        <strong style={{ color: "var(--ink)" }}>Cuentas</strong> y registra una primero.
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 16, display: "inline-flex", gap: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total invertido (saldo inicial + aportes):</span>
        <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--sage)" }}>{formatMoney(totalGeneral)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cuentasInversion.map((c) => {
          const aportes = aportesPorCuenta[c.id];
          const totalAportes = aportes?.total || 0;
          const totalCuenta = (c.saldoInicial || 0) + totalAportes;
          return (
            <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LineChart size={14} style={{ color: "var(--sage)" }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{c.nombre}</span>
                    <span
                      className="despensa-mono"
                      style={{ fontSize: 10, padding: "1px 7px", borderRadius: 12, background: "var(--sage-bg)", color: "var(--sage)" }}
                    >
                      {c.tipo}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                    <Landmark size={11} />
                    {c.entidadName || "Entidad no especificada"}
                    {c.numeroCuenta && <span className="despensa-mono"> · {c.numeroCuenta}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--sage)" }}>{formatMoney(totalCuenta)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>total invertido</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Saldo inicial</div>
                  <div className="despensa-mono" style={{ fontSize: 13, marginTop: 2 }}>{c.saldoInicial != null ? formatMoney(c.saldoInicial) : "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Aportes registrados</div>
                  <div className="despensa-mono" style={{ fontSize: 13, marginTop: 2 }}>{formatMoney(totalAportes)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}># Movimientos</div>
                  <div className="despensa-mono" style={{ fontSize: 13, marginTop: 2 }}>{aportes?.movimientos.length || 0}</div>
                </div>
              </div>

              {aportes && aportes.movimientos.length > 0 && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                  {aportes.movimientos
                    .slice()
                    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                    .slice(0, 5)
                    .map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0" }}>
                        <span style={{ color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                          <TrendingUp size={11} /> {formatDateDisplay(m.date)}
                          {m.description && <> · {m.description}</>}
                        </span>
                        <span className="despensa-mono" style={{ color: "var(--sage)" }}>{formatMoney(m.amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
