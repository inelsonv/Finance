import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Palmtree, Calendar, Briefcase, AlertTriangle } from "lucide-react";
import { addVacacion, updateVacacion, deleteVacacion } from "../lib/db";
import { confirm } from "../lib/confirm";

const ESTADOS = ["Planificada", "Confirmada", "Completada", "Cancelada"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function diasEntre(inicio, fin) {
  if (!inicio || !fin) return 0;
  const a = new Date(inicio + "T00:00:00");
  const b = new Date(fin + "T00:00:00");
  const dias = Math.round((b - a) / 86400000) + 1; // inclusivo
  return dias > 0 ? dias : 0;
}

const emptyForm = (fuenteIngresoId) => ({
  destino: "",
  fuenteIngresoId: fuenteIngresoId || "",
  fechaInicio: "",
  fechaFin: "",
  presupuestoEstimado: "",
  categoriaGasto: "",
  estado: "Planificada",
  notas: "",
});

function toEditForm(v) {
  return {
    destino: v.destino || "",
    fuenteIngresoId: v.fuenteIngresoId || "",
    fechaInicio: v.fechaInicio || "",
    fechaFin: v.fechaFin || "",
    presupuestoEstimado: v.presupuestoEstimado != null ? String(v.presupuestoEstimado) : "",
    categoriaGasto: v.categoriaGasto || "",
    estado: v.estado || "Planificada",
    notas: v.notas || "",
  };
}

export default function Vacaciones({ vacaciones, fuentesIngreso, categoriasGasto }) {
  const empleos = useMemo(
    () => (fuentesIngreso || []).filter((f) => f.estado === "Activo" && f.diasVacacionesAnuales),
    [fuentesIngreso]
  );

  const [empleoSeleccionado, setEmpleoSeleccionado] = useState(empleos[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm(empleoSeleccionado));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const empleoActivo = empleos.find((e) => e.id === empleoSeleccionado) || empleos[0];

  const vacacionesDeEsteEmpleo = useMemo(
    () => (vacaciones || []).filter((v) => v.fuenteIngresoId === empleoActivo?.id && v.estado !== "Cancelada"),
    [vacaciones, empleoActivo]
  );

  const diasUtilizados = vacacionesDeEsteEmpleo.reduce((s, v) => s + diasEntre(v.fechaInicio, v.fechaFin), 0);
  const diasTotales = empleoActivo?.diasVacacionesAnuales || 0;
  const diasDisponibles = Math.max(diasTotales - diasUtilizados, 0);
  const seExcede = diasUtilizados > diasTotales;

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm(toEditForm(v));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleAdd = async () => {
    const destino = form.destino.trim();
    if (!destino) {
      setFormError("Ingresa un destino o nombre para este periodo de vacaciones");
      return;
    }
    if (!form.fechaInicio || !form.fechaFin) {
      setFormError("Ingresa la fecha de inicio y de fin");
      return;
    }
    if (form.fechaFin < form.fechaInicio) {
      setFormError("La fecha de fin no puede ser antes que la de inicio");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const fuente = fuentesIngreso.find((f) => f.id === form.fuenteIngresoId);
      await addVacacion({
        destino,
        fuenteIngresoId: form.fuenteIngresoId || null,
        fuenteIngresoName: fuente ? fuente.nombre : "",
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        diasUtilizados: diasEntre(form.fechaInicio, form.fechaFin),
        presupuestoEstimado: parseFloat(form.presupuestoEstimado) || null,
        categoriaGasto: form.categoriaGasto || null,
        estado: form.estado,
        notas: form.notas.trim(),
      });
      setForm(emptyForm(empleoSeleccionado));
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    const destino = editForm.destino.trim();
    if (!destino) {
      setEditError("Ingresa un destino o nombre para este periodo de vacaciones");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const fuente = fuentesIngreso.find((f) => f.id === editForm.fuenteIngresoId);
      await updateVacacion(editingId, {
        destino,
        fuenteIngresoId: editForm.fuenteIngresoId || null,
        fuenteIngresoName: fuente ? fuente.nombre : "",
        fechaInicio: editForm.fechaInicio,
        fechaFin: editForm.fechaFin,
        diasUtilizados: diasEntre(editForm.fechaInicio, editForm.fechaFin),
        presupuestoEstimado: parseFloat(editForm.presupuestoEstimado) || null,
        categoriaGasto: editForm.categoriaGasto || null,
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

  const renderForm = (f, setF, onSave, savingFlag, error, onCancel, isEdit) => {
    const dias = diasEntre(f.fechaInicio, f.fechaFin);
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <input
          autoFocus
          placeholder="Destino o nombre, ej. Playa Bávaro"
          value={f.destino}
          onChange={(e) => setF({ ...f, destino: e.target.value })}
          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
        />

        <div style={{ marginBottom: 8 }}>
          <select
            value={f.fuenteIngresoId}
            onChange={(e) => setF({ ...f, fuenteIngresoId: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            <option value="">Empleo (opcional)…</option>
            {empleos.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Desde</div>
            <input
              type="date"
              value={f.fechaInicio}
              onChange={(e) => setF({ ...f, fechaInicio: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Hasta</div>
            <input
              type="date"
              value={f.fechaFin}
              onChange={(e) => setF({ ...f, fechaFin: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
        </div>

        {f.fechaInicio && f.fechaFin && (
          <div style={{ fontSize: 11.5, color: "var(--sage)", marginBottom: 8 }}>
            {dias} día(s) de vacaciones
          </div>
        )}

        <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 8, marginBottom: 8 }}>
          <select
            value={f.categoriaGasto}
            onChange={(e) => setF({ ...f, categoriaGasto: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            <option value="">Categoría de gasto (opcional)…</option>
            {(categoriasGasto || []).map((c) => (
              <option key={c.id} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
          <input
            className="despensa-mono"
            type="number"
            step="0.01"
            min="0"
            placeholder="Presupuesto estimado"
            value={f.presupuestoEstimado}
            onChange={(e) => setF({ ...f, presupuestoEstimado: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
        {f.categoriaGasto && f.presupuestoEstimado && (
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: -4, marginBottom: 8 }}>
            Ese monto se sumará automáticamente al Presupuesto mensual, en la quincena de la fecha de inicio.
          </div>
        )}

        {isEdit && (
          <div style={{ marginBottom: 8 }}>
            <select
              value={f.estado}
              onChange={(e) => setF({ ...f, estado: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        )}

        <input
          placeholder="Notas (opcional)"
          value={f.notas}
          onChange={(e) => setF({ ...f, notas: e.target.value })}
          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onSave}
            disabled={savingFlag}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: savingFlag ? "not-allowed" : "pointer" }}
          >
            {isEdit ? <Check size={14} /> : <Plus size={14} />} {savingFlag ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
      </div>
    );
  };

  if (empleos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        <Palmtree size={26} style={{ marginBottom: 10, opacity: 0.6 }} />
        <div>Todavía no tienes ningún empleo con días de vacaciones configurados.</div>
        <div style={{ marginTop: 6, fontSize: 12 }}>
          Ve a Ingresos, edita tu fuente de ingreso (ej. Bellón), y llena "Días de vacaciones al año".
        </div>
      </div>
    );
  }

  return (
    <div>
      {empleos.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <select
            value={empleoSeleccionado}
            onChange={(e) => setEmpleoSeleccionado(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            {empleos.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
            <Briefcase size={11} /> {empleoActivo?.nombre}
          </div>
          <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>{diasTotales} días/año</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Días utilizados</div>
          <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: seExcede ? "var(--stamp)" : "var(--ink)" }}>{diasUtilizados}</div>
        </div>
        <div style={{ background: seExcede ? "var(--stamp-bg)" : "var(--sage-bg)", border: `1px solid ${seExcede ? "var(--stamp)" : "var(--sage)"}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: seExcede ? "var(--stamp)" : "var(--sage)" }}>Días disponibles</div>
          <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: seExcede ? "var(--stamp)" : "var(--sage)" }}>{diasDisponibles}</div>
        </div>
      </div>

      {seExcede && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--stamp-bg)", border: "1px solid var(--stamp)", borderRadius: 10, padding: "9px 12px", marginBottom: 16, fontSize: 12.5, color: "var(--stamp)" }}>
          <AlertTriangle size={15} /> Ya planificaste más días de los que tienes disponibles este año.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => {
            if (!showForm) setForm(emptyForm(empleoSeleccionado));
            setShowForm((s) => !s);
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Planificar vacaciones"}
        </button>
      </div>

      {showForm && renderForm(form, setForm, handleAdd, saving, formError, null, false)}

      {vacacionesDeEsteEmpleo.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no has planificado ningún periodo de vacaciones.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vacacionesDeEsteEmpleo.map((v) => {
            const isEditing = editingId === v.id;
            if (isEditing) {
              return <div key={v.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
            }
            const dias = diasEntre(v.fechaInicio, v.fechaFin);
            return (
              <div key={v.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Palmtree size={13} style={{ color: "var(--sage)" }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{v.destino}</span>
                      <span
                        className="despensa-tab-font"
                        style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--sage-bg)", color: "var(--sage)" }}
                      >
                        {v.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={11} /> {formatDateDisplay(v.fechaInicio)} - {formatDateDisplay(v.fechaFin)} · {dias} día(s)
                      {v.presupuestoEstimado != null && <> · {formatMoney(v.presupuestoEstimado)}</>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(v)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm(`¿Eliminar el periodo de vacaciones "${v.destino}"?`)) deleteVacacion(v.id);
                      }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {v.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>{v.notas}</div>}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
