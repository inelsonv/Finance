import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Briefcase, Pencil, Check, Landmark } from "lucide-react";
import { addFuenteIngreso, deleteFuenteIngreso, updateFuenteIngresoEstado, updateFuenteIngreso } from "../lib/db";

export const FUENTE_TIPOS = ["Salario", "Freelance", "Negocio propio", "Renta", "Otro"];
export const FRECUENCIAS_INGRESO = ["Semanal", "Quincenal", "Mensual", "Anual", "Único"];
const ESTADOS = ["Activo", "Inactivo"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = () => ({
  nombre: "",
  tipo: FUENTE_TIPOS[0],
  entidadId: "",
  montoEsperado: "",
  frecuencia: FRECUENCIAS_INGRESO[1],
  diaPago: "",
  estado: "Activo",
  notas: "",
  codigoEmpleado: "",
});

function toEditForm(f) {
  return {
    nombre: f.nombre || "",
    tipo: f.tipo || FUENTE_TIPOS[0],
    entidadId: f.entidadId || "",
    montoEsperado: f.montoEsperado != null ? String(f.montoEsperado) : "",
    frecuencia: f.frecuencia || FRECUENCIAS_INGRESO[1],
    diaPago: f.diaPago || "",
    estado: f.estado || "Activo",
    notas: f.notas || "",
    codigoEmpleado: f.codigoEmpleado || "",
  };
}

export default function FuentesIngreso({ fuentes, entidades, movimientos }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const recibidoPorFuente = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.type !== "Ingreso" || !m.fuenteIngresoId) continue;
      map[m.fuenteIngresoId] = (map[m.fuenteIngresoId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const totalMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentes) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      const factor = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 }[f.frecuencia] ?? 1;
      total += f.montoEsperado * factor;
    }
    return total;
  }, [fuentes]);

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditForm(toEditForm(f));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleAdd = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      setFormError("Ingresa un nombre para la fuente de ingreso");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addFuenteIngreso({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        montoEsperado: parseFloat(form.montoEsperado) || null,
        frecuencia: form.frecuencia,
        diaPago: form.diaPago.trim(),
        estado: form.estado,
        notas: form.notas.trim(),
        codigoEmpleado: form.codigoEmpleado.trim(),
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      await updateFuenteIngreso(editingId, {
        tipo: editForm.tipo,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        montoEsperado: parseFloat(editForm.montoEsperado) || null,
        frecuencia: editForm.frecuencia,
        diaPago: editForm.diaPago.trim(),
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        codigoEmpleado: editForm.codigoEmpleado.trim(),
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      {fuentes.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 16, display: "inline-flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ingreso mensual estimado (activas):</span>
          <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--sage)" }}>{formatMoney(totalMensual)}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
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
          {showForm ? "Cancelar" : "Agregar fuente de ingreso"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Bellon S.A.S"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {FUENTE_TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad (opcional)</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
            <select
              value={form.frecuencia}
              onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {FRECUENCIAS_INGRESO.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto por pago"
              value={form.montoEsperado}
              onChange={(e) => setForm({ ...form, montoEsperado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Día(s) de pago, ej. 15 y 30"
              value={form.diaPago}
              onChange={(e) => setForm({ ...form, diaPago: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <input
            placeholder="Código de empleado (opcional)"
            value={form.codigoEmpleado}
            onChange={(e) => setForm({ ...form, codigoEmpleado: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />

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
            {saving ? "Guardando…" : "Guardar fuente de ingreso"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {fuentes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ninguna fuente de ingreso.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {fuentes.map((f) => (
            <div key={f.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              {editingId === f.id ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <select
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {FUENTE_TIPOS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={editForm.entidadId}
                      onChange={(e) => setEditForm({ ...editForm, entidadId: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      <option value="">Entidad (opcional)</option>
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
                      placeholder="Monto por pago"
                      value={editForm.montoEsperado}
                      onChange={(e) => setEditForm({ ...editForm, montoEsperado: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.frecuencia}
                      onChange={(e) => setEditForm({ ...editForm, frecuencia: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {FRECUENCIAS_INGRESO.map((fr) => (
                        <option key={fr} value={fr}>{fr}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Día(s) de pago"
                      value={editForm.diaPago}
                      onChange={(e) => setEditForm({ ...editForm, diaPago: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    placeholder="Código de empleado (opcional)"
                    value={editForm.codigoEmpleado}
                    onChange={(e) => setEditForm({ ...editForm, codigoEmpleado: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                  />
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
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: editSaving ? "not-allowed" : "pointer" }}
                    >
                      <Check size={14} /> {editSaving ? "Guardando…" : "Guardar cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Briefcase size={14} style={{ color: "var(--ink-soft)" }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{f.nombre}</span>
                        <EstadoBadge estado={f.estado} onChange={(estado) => updateFuenteIngresoEstado(f.id, estado)} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        {f.tipo}
                        {f.entidadName && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            · <Landmark size={11} /> {f.entidadName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(f)}
                        title="Editar fuente de ingreso"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("¿Eliminar esta fuente de ingreso?")) deleteFuenteIngreso(f.id);
                        }}
                        title="Eliminar fuente de ingreso"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                    <Field label="Monto por pago" value={f.montoEsperado != null ? formatMoney(f.montoEsperado) : "—"} />
                    <Field label="Frecuencia" value={f.frecuencia || "—"} />
                    <Field label="Día(s) de pago" value={f.diaPago || "—"} />
                    {f.codigoEmpleado && <Field label="Código de empleado" value={f.codigoEmpleado} />}
                  </div>

                  {recibidoPorFuente[f.id] > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                      <Field label="Total recibido (histórico)" value={<span style={{ color: "var(--sage)" }}>{formatMoney(recibidoPorFuente[f.id])}</span>} />
                    </div>
                  )}

                  {f.notas && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                      {f.notas}
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
    Inactivo: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  };
  const c = colors[estado] || colors.Activo;
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 11, fontWeight: 500, padding: "2px 6px", borderRadius: 20, border: "none", background: c.bg, color: c.color, cursor: "pointer" }}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}
