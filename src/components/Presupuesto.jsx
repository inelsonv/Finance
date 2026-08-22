import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, TrendingUp, TrendingDown } from "lucide-react";
import { addMovimiento, deleteMovimiento } from "../lib/db";

const INGRESO_CATS = ["Salario", "Negocio propio", "Otro ingreso"];
const GASTO_CATS = ["Vivienda", "Alimentación", "Transporte", "Servicios", "Entretenimiento", "Salud", "Otro"];

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Presupuesto({ movimientos, entidades }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "Ingreso",
    category: INGRESO_CATS[0],
    amount: "",
    description: "",
    date: todayStr(),
    entidadId: "",
  });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const categories = form.type === "Ingreso" ? INGRESO_CATS : GASTO_CATS;

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

  const setType = (type) => {
    setForm({ ...form, type, category: type === "Ingreso" ? INGRESO_CATS[0] : GASTO_CATS[0] });
  };

  const handleAdd = async () => {
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Ingresa un monto válido, mayor a 0");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addMovimiento({
        type: form.type,
        category: form.category,
        amount,
        description: form.description.trim(),
        date: form.date,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
      });
      setForm({ type: "Ingreso", category: INGRESO_CATS[0], amount: "", description: "", date: todayStr(), entidadId: "" });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        <SummaryCard label="Ingresos" value={totals.ingresos} color="var(--sage)" />
        <SummaryCard label="Gastos" value={totals.gastos} color="var(--stamp)" />
        <SummaryCard
          label="Balance"
          value={totals.balance}
          color={totals.balance >= 0 ? "var(--sage)" : "var(--stamp)"}
        />
      </div>

      {(totals.ingresos > 0 || totals.gastos > 0) && (
        <FlowDiagram totals={totals} gastosPorCategoria={gastosPorCategoria} />
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", margin: "18px 0 12px" }}>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar movimiento"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => setType("Ingreso")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: form.type === "Ingreso" ? "var(--sage-bg)" : "#fff",
                color: form.type === "Ingreso" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <TrendingUp size={14} /> Ingreso
            </button>
            <button
              onClick={() => setType("Gasto")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: form.type === "Gasto" ? "var(--stamp-bg)" : "#fff",
                color: form.type === "Gasto" ? "var(--stamp)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <TrendingDown size={14} /> Gasto
            </button>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              <option value="">Entidad (opcional)</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Guardando…" : "Guardar movimiento"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {movimientos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ingresos ni gastos. Agrega el primero.
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {movimientos.map((m, i) => (
            <div
              key={m.id}
              className="despensa-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: m.type === "Ingreso" ? "var(--sage-bg)" : "var(--stamp-bg)",
                  color: m.type === "Ingreso" ? "var(--sage)" : "var(--stamp)",
                }}
              >
                {m.type === "Ingreso" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                  {m.category}
                  {m.description && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.description}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>
                  {formatDateDisplay(m.date)}
                  {m.entidadName && <> · {m.entidadName}</>}
                </div>
              </div>
              <span
                className="despensa-mono"
                style={{ fontSize: 13, fontWeight: 500, color: m.type === "Ingreso" ? "var(--sage)" : "var(--stamp)", flexShrink: 0 }}
              >
                {m.type === "Ingreso" ? "+" : "−"}{formatMoney(m.amount)}
              </span>
              <button
                onClick={() => deleteMovimiento(m.id)}
                title="Eliminar movimiento"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  background: "transparent",
                  color: "var(--ink-soft)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>{label}</div>
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
          return positioned.map((n, i) => {
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
