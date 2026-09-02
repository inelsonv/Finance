import React, { useMemo, useState } from "react";
import { Plus, X, Trash2, Landmark } from "lucide-react";
import { addCategoriaGasto, deleteCategoriaGasto, updateCategoriaGasto } from "../lib/db";
import { confirm } from "../lib/confirm";

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
];
const METODOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CategoriaGasto({ movimientos, categoriasPersonalizadas }) {
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clasificacion, setClasificacion] = useState("Variable");
  const [metodoPagoDefault, setMetodoPagoDefault] = useState("Efectivo");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const handleAdd = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setError("Escribe un nombre para la categoría");
      return;
    }
    const yaExiste = categoriasPersonalizadas.some((c) => c.nombre.toLowerCase() === nombreTrim.toLowerCase());
    if (yaExiste) {
      setError("Ya existe una categoría con ese nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addCategoriaGasto({ nombre: nombreTrim, clasificacion, metodoPagoDefault });
      setNombre("");
      setClasificacion("Variable");
      setMetodoPagoDefault("Efectivo");
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        {totalGastos > 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total en gastos:</span>
            <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--stamp)" }}>{formatMoney(totalGastos)}</span>
          </div>
        ) : <div />}
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
          {showForm ? "Cancelar" : "Nueva categoría"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 10 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Combustible"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              {["Variable", "Fijo"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClasificacion(c)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: clasificacion === c ? "var(--stamp-bg)" : "#fff",
                    color: clasificacion === c ? "var(--stamp)" : "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <select
              value={metodoPagoDefault}
              onChange={(e) => setMetodoPagoDefault(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>Método de pago habitual: {m}</option>
              ))}
            </select>
          </div>
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
            {saving ? "Guardando…" : "Guardar categoría"}
          </button>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
        </div>
      )}

      {categoriasPersonalizadas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
            Tus categorías personalizadas
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {categoriasPersonalizadas.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  padding: "5px 6px 5px 10px",
                  borderRadius: 20,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                }}
              >
                <span style={{ color: c.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)" }}>{c.nombre}</span>
                <button
                  onClick={() => updateCategoriaGasto(c.id, { clasificacion: c.clasificacion === "Fijo" ? "Variable" : "Fijo" })}
                  title="Clic para cambiar entre Fijo y Variable"
                  style={{
                    fontSize: 10.5,
                    padding: "2px 8px",
                    borderRadius: 20,
                    border: `1px solid ${c.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)"}`,
                    background: "transparent",
                    color: c.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {c.clasificacion}
                </button>
                <button
                  onClick={() => updateCategoriaGasto(c.id, { agruparConCompromisos: !c.agruparConCompromisos })}
                  title={c.agruparConCompromisos ? "Mostrándose junto a Compromisos financieros — clic para quitar" : "Mostrar junto a Compromisos financieros"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    background: c.agruparConCompromisos ? "var(--stamp-bg)" : "transparent",
                    color: c.agruparConCompromisos ? "var(--stamp)" : "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                >
                  <Landmark size={10} />
                </button>
                <select
                  value={c.metodoPagoDefault || "Efectivo"}
                  onChange={(e) => updateCategoriaGasto(c.id, { metodoPagoDefault: e.target.value })}
                  title="Método de pago habitual de esta categoría"
                  style={{ fontSize: 10.5, padding: "1px 4px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (await confirm("¿Eliminar esta categoría?")) deleteCategoriaGasto(c.id);
                  }}
                  title="Eliminar categoría"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer" }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {gastosPorCategoria.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no hay gastos registrados. Ve a Movimientos para agregar el primero.
        </div>
      ) : (
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
      )}
    </div>
  );
}
