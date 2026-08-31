import React, { useMemo, useState } from "react";
import { ArrowRight, TrendingUp, Landmark, CreditCard, Ticket, Zap, PiggyBank, Tag, Workflow, CalendarClock } from "lucide-react";

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
];

const CUENTA_TIPOS_SET = new Set(["Ahorro", "Corriente", "Inversión", "Corretaje"]);
const FIJO_IMPLICITO = new Set(["Pago de préstamo", "Pago de tarjeta", "Pago de membresía", "Pago de servicio"]);

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Presupuesto({ movimientos, onOpenMovimientos, presupuesto, categoriasGasto, prestamos }) {
  const [showGastoDesglose, setShowGastoDesglose] = useState(false);

  // Quincena actual: rango de fechas y cuánto se presupuestó vs. cuánto se ha
  // gastado realmente en ese rango, para ver el cumplimiento en vivo.
  const quincenaActual = useMemo(() => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth() + 1;
    const esQ1 = hoy.getDate() <= 15;
    const quincena = esQ1 ? "Q1" : "Q2";
    const diasEnMes = new Date(year, month, 0).getDate();
    const diaInicio = esQ1 ? 1 : 16;
    const diaFin = esQ1 ? 15 : diasEnMes;
    const pad = (n) => String(n).padStart(2, "0");
    const fechaInicio = `${year}-${pad(month)}-${pad(diaInicio)}`;
    const fechaFin = `${year}-${pad(month)}-${pad(diaFin)}`;

    let presupuestado = 0;
    for (const c of categoriasGasto || []) {
      const val = presupuesto?.[c.nombre]?.[String(month)]?.[quincena];
      if (typeof val === "number") presupuestado += val;
    }
    for (const p of prestamos || []) {
      if (p.estado !== "Activo") continue;
      if (p.frecuenciaCuota === "Personalizado") {
        for (const c of p.cuotasPersonalizadas || []) {
          if (!c.fecha || !c.monto) continue;
          if (c.fecha >= fechaInicio && c.fecha <= fechaFin) presupuestado += Number(c.monto) || 0;
        }
        continue;
      }
      if (!p.fechaInicio || !p.cuota) continue;
      const [sy, sm, sd] = p.fechaInicio.split("-").map(Number);
      if (!sy || !sm) continue;
      const mesesTotales = p.plazoUnidad === "años" ? (p.plazo || 0) * 12 : p.plazo || 0;
      const offset = (year - sy) * 12 + (month - sm);
      const activo = offset >= 0 && offset < mesesTotales;
      const quincenaCuota = sd && sd > 15 ? "Q2" : "Q1";
      if (activo && quincenaCuota === quincena) presupuestado += Number(p.cuota) || 0;
    }

    let gastado = 0;
    for (const m of movimientos || []) {
      if (m.type !== "Gasto") continue;
      if (!m.date || m.date < fechaInicio || m.date > fechaFin) continue;
      gastado += Number(m.amount) || 0;
    }

    return { fechaInicio, fechaFin, quincena, month, year, presupuestado, gastado };
  }, [movimientos, presupuesto, categoriasGasto, prestamos]);

  const totals = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    let ingresosCount = 0;
    for (const m of movimientos) {
      const amt = Number(m.amount) || 0;
      if (m.type === "Ingreso") {
        ingresos += amt;
        ingresosCount += 1;
      } else gastos += amt;
    }
    return { ingresos, gastos, balance: ingresos - gastos, ingresosCount };
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
      {quincenaActual.presupuestado > 0 && (
        <QuincenaActualCard {...quincenaActual} />
      )}

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

      {(totals.ingresos > 0 || totals.gastos > 0) && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 14px", marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Workflow size={15} style={{ color: "var(--ink-soft)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 600 }}>Flujo de actividades</span>
          </div>
          <NodeFlow totals={totals} gastosPorCategoria={gastosPorCategoria} />
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

function formatDateDisplayCorto(dateStr) {
  if (!dateStr) return "";
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function QuincenaActualCard({ fechaInicio, fechaFin, presupuestado, gastado }) {
  const pct = presupuestado > 0 ? Math.min(100, Math.round((gastado / presupuestado) * 100)) : 0;
  const excedido = gastado > presupuestado;
  const color = excedido ? "var(--stamp)" : pct >= 85 ? "var(--amber)" : "var(--sage)";
  const restante = presupuestado - gastado;

  return (
    <div style={{ background: "var(--card)", border: `1px solid ${color}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CalendarClock size={15} style={{ color }} />
        <span className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 700 }}>
          Quincena actual ({formatDateDisplayCorto(fechaInicio)} - {formatDateDisplayCorto(fechaFin)})
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <span>Presupuestado: <strong className="despensa-mono">{formatMoney(presupuestado)}</strong></span>
        <span>Gastado: <strong className="despensa-mono" style={{ color }}>{formatMoney(gastado)}</strong></span>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s ease" }} />
      </div>

      <div style={{ fontSize: 11.5, color, marginTop: 6 }}>
        {excedido
          ? `Te excediste por ${formatMoney(Math.abs(restante))} (${pct}% de lo presupuestado).`
          : `${pct}% ejecutado — te quedan ${formatMoney(restante)} disponibles esta quincena.`}
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

const ACTIVITY_ICONS = {
  "Pago de préstamo": Landmark,
  "Pago de tarjeta": CreditCard,
  "Pago de membresía": Ticket,
  "Pago de servicio": Zap,
  Ahorro: PiggyBank,
  Inversión: PiggyBank,
  Corretaje: PiggyBank,
  Corriente: PiggyBank,
  Disponible: TrendingUp,
};

function iconForActivity(label) {
  return ACTIVITY_ICONS[label] || Tag;
}

function NodeFlow({ totals, gastosPorCategoria }) {
  const nodes = useMemo(() => {
    const list = [
      ...gastosPorCategoria.map((g, i) => ({ label: g.category, amount: g.amount, color: FLOW_COLORS[i % FLOW_COLORS.length] })),
    ];
    if (totals.balance > 0) list.push({ label: "Disponible", amount: totals.balance, color: "var(--sage)" });
    return list;
  }, [gastosPorCategoria, totals.balance]);

  const H = 58;
  const G = 12;
  const cardW = 168;
  const midGap = 64;
  const totalHeight = Math.max(H, nodes.length * H + (nodes.length - 1) * G);
  const srcY = totalHeight / 2;
  const svgW = cardW * 2 + midGap;

  if (nodes.length === 0) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", width: svgW, height: totalHeight, minWidth: svgW }}>
        <svg width={svgW} height={totalHeight} style={{ position: "absolute", top: 0, left: 0 }}>
          {nodes.map((n, i) => {
            const destY = i * (H + G) + H / 2;
            const midX = cardW + midGap / 2;
            const path = `M ${cardW} ${srcY} L ${midX} ${srcY} L ${midX} ${destY} L ${svgW - cardW} ${destY}`;
            return <path key={n.label} d={path} fill="none" stroke={n.color} strokeWidth={1.75} opacity={0.55} />;
          })}
        </svg>

        <div style={{ position: "absolute", left: 0, top: srcY - H / 2, width: cardW, height: H }}>
          <ActivityNode
            icon={TrendingUp}
            title="Ingreso"
            subtitle={`${totals.ingresosCount} movimiento${totals.ingresosCount !== 1 ? "s" : ""}`}
            amount={formatMoney(totals.ingresos)}
            color="var(--sage)"
          />
        </div>

        {nodes.map((n, i) => (
          <div key={n.label} style={{ position: "absolute", left: svgW - cardW, top: i * (H + G), width: cardW, height: H }}>
            <ActivityNode icon={iconForActivity(n.label)} title={n.label} subtitle="Actividad" amount={formatMoney(n.amount)} color={n.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityNode({ icon: Icon, title, subtitle, amount, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        height: "100%",
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ width: 4, background: color, flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            flexShrink: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: color, opacity: 0.15, borderRadius: 6 }} />
          <Icon size={13} style={{ color, position: "relative" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 9.5, color: "var(--ink-soft)", marginTop: 1 }}>{subtitle}</div>
          <div className="despensa-mono" style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>
            {amount}
          </div>
        </div>
      </div>
    </div>
  );
}
