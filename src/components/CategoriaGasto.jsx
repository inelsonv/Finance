import React, { useMemo } from "react";

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CategoriaGasto({ movimientos }) {
  const { gastosPorCategoria, totalGastos } = useMemo(() => {
    const map = {};
    let total = 0;
    for (const m of movimientos) {
      if (m.type !== "Gasto") continue;
      const amt = Number(m.amount) || 0;
      map[m.category] = (map[m.category] || 0) + amt;
      total += amt;
    }
    const list = Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    return { gastosPorCategoria: list, totalGastos: total };
  }, [movimientos]);

  if (gastosPorCategoria.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no hay gastos registrados. Ve a Movimientos para agregar el primero.
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 16, display: "inline-flex", gap: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total en gastos:</span>
        <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--stamp)" }}>{formatMoney(totalGastos)}</span>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
        {gastosPorCategoria.map((g, i) => {
          const pct = totalGastos ? Math.round((g.amount / totalGastos) * 100) : 0;
          const color = FLOW_COLORS[i % FLOW_COLORS.length];
          return (
            <div
              key={g.category}
              className="despensa-row"
              style={{
                padding: "12px 14px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  {g.category}
                </span>
                <span className="despensa-mono" style={{ fontSize: 13 }}>
                  {formatMoney(g.amount)} <span style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
