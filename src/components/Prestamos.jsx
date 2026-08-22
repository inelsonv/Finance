import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Calendar, Percent, Pencil, Check } from "lucide-react";
import { addPrestamo, deletePrestamo, updatePrestamoEstado, updatePrestamo } from "../lib/db";

const PLAZO_UNIDADES = ["meses", "años"];
const ESTADOS = ["Activo", "Pagado", "En mora"];

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

function nextNumero(prestamos) {
  let max = 0;
  for (const p of prestamos) {
    const match = /^PT(\d+)$/.exec(p.numero || "");
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return "PT" + String(max + 1).padStart(2, "0");
}

const emptyForm = (numero) => ({
  numero,
  entidadId: "",
  montoAprobado: "",
  plazo: "",
  plazoUnidad: "meses",
  tasaInteres: "",
  cuota: "",
  fechaInicio: todayStr(),
  estado: "Activo",
  notas: "",
});

export default function Prestamos({ prestamos, entidades, movimientos }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(nextNumero(prestamos)));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const openForm = () => {
    setForm(emptyForm(nextNumero(prestamos)));
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditError(null);
    setEditForm({
      entidadId: p.entidadId || "",
      montoAprobado: p.montoAprobado != null ? String(p.montoAprobado) : "",
      plazo: p.plazo != null ? String(p.plazo) : "",
      plazoUnidad: p.plazoUnidad || "meses",
      tasaInteres: p.tasaInteres != null ? String(p.tasaInteres) : "",
      cuota: p.cuota != null ? String(p.cuota) : "",
      fechaInicio: p.fechaInicio || todayStr(),
      estado: p.estado || "Activo",
      notas: p.notas || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    const monto = parseFloat(editForm.montoAprobado);
    if (!editForm.entidadId) {
      setEditError("Selecciona la entidad prestamista");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setEditError("Ingresa un monto aprobado válido");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      const plazo = parseFloat(editForm.plazo);
      const tasa = parseFloat(editForm.tasaInteres);
      const cuota = parseFloat(editForm.cuota);
      await updatePrestamo(editingId, {
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: editForm.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        fechaInicio: editForm.fechaInicio,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const totals = useMemo(() => {
    let aprobado = 0;
    let activos = 0;
    for (const p of prestamos) {
      aprobado += Number(p.montoAprobado) || 0;
      if (p.estado === "Activo") activos += 1;
    }
    return { aprobado, activos, total: prestamos.length };
  }, [prestamos]);

  const pagadoPorPrestamo = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      map[m.prestamoId] = (map[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const handleAdd = async () => {
    const monto = parseFloat(form.montoAprobado);
    const plazo = parseFloat(form.plazo);
    const tasa = parseFloat(form.tasaInteres);
    if (!form.entidadId) {
      setFormError("Selecciona la entidad prestamista");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setFormError("Ingresa un monto aprobado válido");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const cuota = parseFloat(form.cuota);
      await addPrestamo({
        numero: form.numero,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: form.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        fechaInicio: form.fechaInicio,
        estado: form.estado,
        notas: form.notas.trim(),
      });
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
        <SummaryCard label="Préstamos" value={totals.total} mono={false} />
        <SummaryCard label="Activos" value={totals.activos} mono={false} />
        <SummaryCard label="Monto aprobado total" value={formatMoney(totals.aprobado)} mono />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => (showForm ? setShowForm(false) : openForm())}
          disabled={!showForm && entidades.length === 0}
          title={entidades.length === 0 ? "Primero registra una entidad en la sección Entidades" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: !showForm && entidades.length === 0 ? "var(--line)" : "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: !showForm && entidades.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar préstamo"}
        </button>
      </div>

      {entidades.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Primero registra al menos una entidad (banco, financiera, etc.) en la sección Entidades.
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: 8, marginBottom: 8 }}>
            <input
              value={form.numero}
              readOnly
              className="despensa-mono"
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink-soft)" }}
            />
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              <option value="">Entidad prestamista…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto aprobado"
              value={form.montoAprobado}
              onChange={(e) => setForm({ ...form, montoAprobado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <input
                className="despensa-mono"
                type="number"
                step="1"
                min="0"
                placeholder="Plazo"
                value={form.plazo}
                onChange={(e) => setForm({ ...form, plazo: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <select
                value={form.plazoUnidad}
                onChange={(e) => setForm({ ...form, plazoUnidad: e.target.value })}
                style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "#fff" }}
              >
                {PLAZO_UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div style={{ position: "relative" }}>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Tasa interés"
                value={form.tasaInteres}
                onChange={(e) => setForm({ ...form, tasaInteres: e.target.value })}
                style={{ width: "100%", padding: "8px 22px 8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <Percent size={12} style={{ position: "absolute", right: 8, top: 11, color: "var(--ink-soft)" }} />
            </div>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Cuota mensual"
              value={form.cuota}
              onChange={(e) => setForm({ ...form, cuota: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <input
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
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
            {saving ? "Guardando…" : "Guardar préstamo"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {prestamos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ningún préstamo.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {prestamos.map((p) => (
            <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              {editingId === p.id ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: 8, marginBottom: 8 }}>
                    <div className="despensa-mono" style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink-soft)" }}>
                      {p.numero}
                    </div>
                    <select
                      value={editForm.entidadId}
                      onChange={(e) => setEditForm({ ...editForm, entidadId: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
                    >
                      <option value="">Entidad prestamista…</option>
                      {entidades.map((e) => (
                        <option key={e.docId} value={e.docId}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monto aprobado"
                      value={editForm.montoAprobado}
                      onChange={(e) => setEditForm({ ...editForm, montoAprobado: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Plazo"
                        value={editForm.plazo}
                        onChange={(e) => setEditForm({ ...editForm, plazo: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <select
                        value={editForm.plazoUnidad}
                        onChange={(e) => setEditForm({ ...editForm, plazoUnidad: e.target.value })}
                        style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "#fff" }}
                      >
                        {PLAZO_UNIDADES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Tasa interés"
                        value={editForm.tasaInteres}
                        onChange={(e) => setEditForm({ ...editForm, tasaInteres: e.target.value })}
                        style={{ width: "100%", padding: "8px 22px 8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <Percent size={12} style={{ position: "absolute", right: 8, top: 11, color: "var(--ink-soft)" }} />
                    </div>
                  </div>

                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      type="date"
                      value={editForm.fechaInicio}
                      onChange={(e) => setEditForm({ ...editForm, fechaInicio: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cuota mensual"
                      value={editForm.cuota}
                      onChange={(e) => setEditForm({ ...editForm, cuota: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>

                  <input
                    placeholder="Notas (opcional)"
                    value={editForm.notas}
                    onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={editSaving}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 500,
                        background: "var(--sage)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: editSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      <Check size={14} /> {editSaving ? "Guardando…" : "Guardar cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 500,
                        background: "#fff",
                        color: "var(--ink-soft)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="despensa-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--stamp)" }}>
                          {p.numero}
                        </span>
                        <EstadoBadge estado={p.estado} onChange={(estado) => updatePrestamoEstado(p.id, estado)} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <Landmark size={13} style={{ color: "var(--ink-soft)" }} />
                        {p.entidadName || "Entidad no especificada"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(p)}
                        title="Editar préstamo"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          background: "transparent",
                          color: "var(--ink-soft)",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deletePrestamo(p.id)}
                        title="Eliminar préstamo"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          background: "transparent",
                          color: "var(--stamp)",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                    <Field label="Monto aprobado" value={formatMoney(p.montoAprobado)} />
                    <Field label="Cuota mensual" value={p.cuota != null ? formatMoney(p.cuota) : "—"} />
                    <Field label="Plazo" value={p.plazo ? `${p.plazo} ${p.plazoUnidad || "meses"}` : "—"} />
                    <Field label="Tasa interés" value={p.tasaInteres != null ? `${p.tasaInteres}%` : "—"} />
                    <Field
                      label="Inicio"
                      value={
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} /> {formatDateDisplay(p.fechaInicio)}
                        </span>
                      }
                    />
                  </div>

                  {(() => {
                    const pagado = pagadoPorPrestamo[p.id] || 0;
                    const pendiente = Math.max((Number(p.montoAprobado) || 0) - pagado, 0);
                    const pct = p.montoAprobado ? Math.min(100, Math.round((pagado / p.montoAprobado) * 100)) : 0;
                    return (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                          <Field label="Pagado" value={<span style={{ color: "var(--sage)" }}>{formatMoney(pagado)}</span>} />
                          <Field label="Falta por pagar" value={<span style={{ color: pendiente > 0 ? "var(--stamp)" : "var(--sage)" }}>{formatMoney(pendiente)}</span>} />
                        </div>
                        <div style={{ height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--sage)", borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })()}
                  {p.notas && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                      {p.notas}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div className="despensa-mono" style={{ fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EstadoBadge({ estado, onChange }) {
  const colors = {
    Activo: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Pagado: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
    "En mora": { bg: "var(--stamp-bg)", color: "var(--stamp)" },
  };
  const c = colors[estado] || colors.Activo;
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 6px",
        borderRadius: 20,
        border: "none",
        background: c.bg,
        color: c.color,
        cursor: "pointer",
      }}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}

function SummaryCard({ label, value, mono }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>{label}</div>
      <div className={mono ? "despensa-mono" : "despensa-tab-font"} style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
