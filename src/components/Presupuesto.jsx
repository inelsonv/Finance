import React, { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
];

const CUENTA_TIPOS_SET = new Set(["Ahorro", "Corriente", "Inversión", "Corretaje"]);
const FIJO_IMPLICITO = new Set(["Pago de préstamo", "Pago de tarjeta", "Pago de membresía"]);

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Presupuesto({ movimientos, onOpenMovimientos }) {
  const [showGastoDesglose, setShowGastoDesglose] = useState(false);
  const totals = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    for (const m of movimientos) {
      const amt = Number(m.amount) || 0;
      if (m.type === "Ingreso") ingresos += amt;
      else gastos += amt;
    }
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [movimientos]);

  const fijoVsVariable = useMemo(() => {
    let fijo = 0;
    let variable = 0;
    for (const m of movimientos) {
      if (m.type !== "Gasto" || CUENTA_TIPOS_SET.has(m.category)) continue;
      const amt = Number(m.amount) || 0;
      if (m.clasificacion === "Fijo" || FIJO_IMPLICITO.has(m.category)) fijo += amt;
      else if (m.clasificacion === "Variable") variable += amt;
    }
    return { fijo, variable, total: fijo + variable };
  }, [movimientos]);

  const gastosPorCategoria = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.type !== "Gasto") continue;
      const amt = Number(m.amount) || 0;
      map[m.category] = (map[m.category] || 0) + amt;
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [movimientos]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 6 }}>
        <SummaryCard label="Ingresos" value={totals.ingresos} color="var(--sage)" />
        <SummaryCard
          label="Gastos"
          value={totals.gastos}
          color="var(--stamp)"
          onDoubleClick={() => setShowGastoDesglose((s) => !s)}
          expandable
          expanded={showGastoDesglose}
        />
        <SummaryCard
          label="Balance"
          value={totals.balance}
          color={totals.balance >= 0 ? "var(--sage)" : "var(--stamp)"}
        />
      </div>

      {showGastoDesglose && gastosPorCategoria.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
            Categoría gasto
          </div>
          {gastosPorCategoria.map((g, i) => (
            <div
              key={g.category}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                fontSize: 12.5,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: FLOW_COLORS[i % FLOW_COLORS.length], flexShrink: 0 }} />
                {g.category}
              </span>
              <span className="despensa-mono" style={{ color: "var(--ink-soft)" }}>
                {formatMoney(g.amount)} ({Math.round((g.amount / totals.gastos) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 12 }} />

      {totals.ingresos > 0 || totals.gastos > 0 ? (
        <FlowDiagram totals={totals} gastosPorCategoria={gastosPorCategoria} />
      ) : (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no hay movimientos registrados. Ve a Movimientos para agregar tu primer ingreso o gasto.
        </div>
      )}

      {fijoVsVariable.total > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
            <span>
              <span style={{ color: "var(--stamp)", fontWeight: 500 }}>Fijo</span>{" "}
              <span className="despensa-mono" style={{ color: "var(--ink-soft)" }}>
                {formatMoney(fijoVsVariable.fijo)} ({Math.round((fijoVsVariable.fijo / fijoVsVariable.total) * 100)}%)
              </span>
            </span>
            <span>
              <span style={{ color: "var(--sage)", fontWeight: 500 }}>Variable</span>{" "}
              <span className="despensa-mono" style={{ color: "var(--ink-soft)" }}>
                {formatMoney(fijoVsVariable.variable)} ({Math.round((fijoVsVariable.variable / fijoVsVariable.total) * 100)}%)
              </span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--sage-bg)", overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${(fijoVsVariable.fijo / fijoVsVariable.total) * 100}%`, background: "var(--stamp)" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
            Mientras más bajo el % fijo, más flexibilidad tienes ante un imprevisto.
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <button
          onClick={onOpenMovimientos}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Registrar movimiento <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, onDoubleClick, expandable, expanded }) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      title={expandable ? "Doble clic para ver el desglose por categoría" : undefined}
      style={{
        background: "var(--card)",
        border: expandable && expanded ? "1px solid var(--stamp)" : "1px solid var(--line)",
        borderRadius: 10,
        padding: "10px 12px",
        cursor: expandable ? "pointer" : "default",
        userSelect: expandable ? "none" : "auto",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {expandable && (
          <span style={{ fontSize: 9, opacity: 0.6 }}>{expanded ? "▲" : "▼"}</span>
        )}
      </div>
      <div className="despensa-mono" style={{ fontSize: 16, fontWeight: 600, color }}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

function FlowDiagram({ totals, gastosPorCategoria }) {
  const width = 640;
  const height = Math.max(220, 56 + gastosPorCategoria.length * 34 + (totals.balance > 0 ? 34 : 0));
  const nodeW = 10;
  const leftX = 70;
  const rightX = width - 150;
  const total = totals.ingresos || 1;

  const rightNodes = [
    ...gastosPorCategoria.map((g, i) => ({
      label: g.category,
      value: g.amount,
      color: FLOW_COLORS[i % FLOW_COLORS.length],
    })),
    ...(totals.balance > 0 ? [{ label: "Disponible", value: totals.balance, color: "var(--sage)" }] : []),
  ];

  let cursorY = 30;
  const positioned = rightNodes.map((n) => {
    const h = Math.max(18, (n.value / total) * (height - 40));
    const y = cursorY;
    cursorY += h + 10;
    return { ...n, y, h };
  });

  const leftH = height - 40;
  const leftY = 20;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 10px", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ minWidth: 480, display: "block" }}>
        <rect x={leftX} y={leftY} width={nodeW} height={leftH} fill="var(--sage)" rx="2" />
        <text x={leftX - 8} y={leftY + leftH / 2} textAnchor="end" dominantBaseline="middle" fontSize="12.5" fontWeight="500" fill="var(--ink)">
          Ingreso
        </text>
        <text x={leftX - 8} y={leftY + leftH / 2 + 15} textAnchor="end" dominantBaseline="middle" fontSize="10.5" fill="var(--ink-soft)" fontFamily="IBM Plex Mono, monospace">
          {formatMoney(totals.ingresos)}
        </text>

        {(() => {
          let acc = leftY;
          return positioned.map((n) => {
            const srcY0 = acc;
            const srcY1 = acc + n.h;
            acc = srcY1;
            const midX = (leftX + nodeW + rightX) / 2;
            const path = `M ${leftX + nodeW} ${srcY0}
              C ${midX} ${srcY0}, ${midX} ${n.y}, ${rightX} ${n.y}
              L ${rightX} ${n.y + n.h}
              C ${midX} ${n.y + n.h}, ${midX} ${srcY1}, ${leftX + nodeW} ${srcY1}
              Z`;
            return <path key={n.label} d={path} fill={n.color} opacity="0.35" />;
          });
        })()}

        {positioned.map((n) => (
          <g key={n.label}>
            <rect x={rightX} y={n.y} width={nodeW} height={n.h} fill={n.color} rx="2" />
            <text x={rightX + nodeW + 8} y={n.y + n.h / 2 - 6} fontSize="12" fontWeight="500" fill="var(--ink)">
              {n.label}
            </text>
            <text x={rightX + nodeW + 8} y={n.y + n.h / 2 + 9} fontSize="10.5" fill="var(--ink-soft)" fontFamily="IBM Plex Mono, monospace">
              {formatMoney(n.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
