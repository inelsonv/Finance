import React, { useMemo, useState } from "react";
import { Layers, Plus, X, Check, Trash2 } from "lucide-react";
import { addCompraProrateada, deleteCompraProrateada } from "../lib/db";
import { confirm } from "../lib/confirm";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Considera "pagada" una cuota cuya quincena ya pasó (mismo criterio simple
// usado en el resto de la app: comparar contra la quincena actual).
function periodoIndice(year, month, quincena) {
  return year * 24 + (month - 1) * 2 + (quincena === "Q2" ? 1 : 0);
}
function cuotaYaPaso(c) {
  const hoy = new Date();
  const idxHoy = periodoIndice(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() > 15 ? "Q2" : "Q1");
  const idxCuota = periodoIndice(c.year, c.month, c.quincena);
  return idxCuota < idxHoy;
}

export default function ComprasProrateadas({ compras, categoriasGasto }) {
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [cuotas, setCuotas] = useState("2");
  const [categoria, setCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cuotaPreview = useMemo(() => {
    const total = parseFloat(montoTotal);
    const n = parseInt(cuotas, 10);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(n) || n <= 0) return null;
    return Math.round((total / n) * 100) / 100;
  }, [montoTotal, cuotas]);

  const resetForm = () => {
    setNombre("");
    setMontoTotal("");
    setCuotas("2");
    setCategoria("");
    setFechaInicio(todayStr());
    setError(null);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("Ponle un nombre a la compra");
      return;
    }
    const total = parseFloat(montoTotal);
    if (!Number.isFinite(total) || total <= 0) {
      setError("Ingresa un monto total válido");
      return;
    }
    const n = parseInt(cuotas, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresa una cantidad de cuotas válida");
      return;
    }
    if (!categoria) {
      setError("Elige una categoría de gasto");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addCompraProrateada({ nombre: nombre.trim(), montoTotal: total, cuotas: n, categoria, fechaInicio });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (compra) => {
    if (!(await confirm(`¿Eliminar "${compra.nombre}"? Esto revierte los montos ya sumados al presupuesto de cada quincena.`))) return;
    await deleteCompraProrateada(compra.id, compra);
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={15} /> Compras prorateadas
        </span>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: showForm ? "var(--card)" : "var(--sage)", color: showForm ? "var(--ink-soft)" : "#fff", border: showForm ? "1px solid var(--line)" : "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancelar" : "Prorratear compra"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <input
            placeholder="Nombre del artículo o compra (ej. Farmacia Los Hidalgos)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto total"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              className="despensa-mono"
              type="number"
              step="1"
              min="1"
              placeholder="Cantidad de cuotas"
              value={cuotas}
              onChange={(e) => setCuotas(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Categoría de gasto…</option>
              {(categoriasGasto || []).map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          {cuotaPreview != null && (
            <div style={{ fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>
              Cada cuota será de aproximadamente <strong>{formatMoney(cuotaPreview)}</strong>, asignada a quincenas consecutivas empezando en la fecha elegida.
            </div>
          )}

          <button
            onClick={handleGuardar}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
          >
            <Check size={13} /> {saving ? "Guardando…" : "Prorratear y asignar al presupuesto"}
          </button>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
        </div>
      )}

      {(compras || []).length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--ink-soft)" }}>Compra</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Valor original</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--ink-soft)" }}>Cuotas</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Valor cuota</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const cuotasPendientes = (c.cuotasDetalle || []).filter((d) => !cuotaYaPaso(d));
                const balance = cuotasPendientes.reduce((s, d) => s + d.monto, 0);
                const cuotasPagadas = (c.cuotasDetalle || []).length - cuotasPendientes.length;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "8px" }}>
                      <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{c.categoria}</div>
                    </td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px" }}>{formatMoney(c.montoTotal)}</td>
                    <td className="despensa-mono" style={{ textAlign: "center", padding: "8px" }}>{cuotasPagadas} / {c.cuotas}</td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px" }}>{formatMoney(c.montoCuota)}</td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px", fontWeight: 600, color: balance > 0 ? "var(--stamp)" : "var(--sage)" }}>
                      {formatMoney(balance)}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => handleEliminar(c)}
                        title="Eliminar (revierte el presupuesto)"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 5, cursor: "pointer" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
