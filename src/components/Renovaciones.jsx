import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Pencil,
  Check,
  ScrollText,
  CarFront,
  Contact,
  PlaneTakeoff,
  BookUser,
  GraduationCap,
  Building,
  FileText,
  Calendar,
  Landmark,
} from "lucide-react";
import { addRenovacion, deleteRenovacion, updateRenovacionEstado, updateRenovacion } from "../lib/db";
import { confirm } from "../lib/confirm";

const TIPOS = [
  "Marbete",
  "Inspección técnica",
  "Licencia de conducir",
  "Pasaporte",
  "Visa",
  "Cédula",
  "Certificación profesional",
  "Registro mercantil",
  "Otro",
];
const ESTADOS = ["Activo", "Vencido", "Cancelado"];

const TIPO_ICONS = {
  Marbete: CarFront,
  "Inspección técnica": CarFront,
  "Licencia de conducir": Contact,
  Pasaporte: PlaneTakeoff,
  Visa: PlaneTakeoff,
  Cédula: BookUser,
  "Certificación profesional": GraduationCap,
  "Registro mercantil": Building,
  Otro: FileText,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

const emptyForm = () => ({
  nombre: "",
  tipo: TIPOS[0],
  entidadId: "",
  activoId: "",
  numeroReferencia: "",
  fechaInicio: todayStr(),
  fechaVencimiento: "",
  monto: "",
  diasAviso: "15",
  estado: "Activo",
  categoriaGasto: "",
  notas: "",
});

function toEditForm(r) {
  return {
    nombre: r.nombre || "",
    tipo: r.tipo || TIPOS[0],
    entidadId: r.entidadId || "",
    activoId: r.activoId || "",
    numeroReferencia: r.numeroReferencia || "",
    fechaInicio: r.fechaInicio || todayStr(),
    fechaVencimiento: r.fechaVencimiento || "",
    monto: r.monto != null ? String(r.monto) : "",
    diasAviso: r.diasAviso != null ? String(r.diasAviso) : "15",
    estado: r.estado || "Activo",
    categoriaGasto: r.categoriaGasto || "",
    notas: r.notas || "",
  };
}

export default function Renovaciones({ renovaciones, entidades, activos, categoriasGasto }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const vehiculos = useMemo(() => (activos || []).filter((a) => a.tipo === "Vehículo"), [activos]);
  const requiereVehiculo = (tipo) => tipo === "Marbete" || tipo === "Inspección técnica";

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm(toEditForm(r));
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
      setFormError("Ingresa un nombre, ej. Marbete - Honda CR-V");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const activo = vehiculos.find((a) => a.id === form.activoId);
      await addRenovacion({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        activoId: requiereVehiculo(form.tipo) ? form.activoId || null : null,
        activoNombre: requiereVehiculo(form.tipo) ? activo?.nombre || "" : "",
        numeroReferencia: form.numeroReferencia.trim(),
        fechaInicio: form.fechaInicio || null,
        fechaVencimiento: form.fechaVencimiento || null,
        monto: parseFloat(form.monto) || null,
        diasAviso: parseInt(form.diasAviso, 10) || 15,
        estado: form.estado,
        categoriaGasto: form.categoriaGasto || null,
        notas: form.notas.trim(),
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
    const nombre = editForm.nombre.trim();
    if (!nombre) {
      setEditError("Ingresa un nombre para este trámite");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      const activo = vehiculos.find((a) => a.id === editForm.activoId);
      await updateRenovacion(editingId, {
        nombre,
        tipo: editForm.tipo,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        activoId: requiereVehiculo(editForm.tipo) ? editForm.activoId || null : null,
        activoNombre: requiereVehiculo(editForm.tipo) ? activo?.nombre || "" : "",
        numeroReferencia: editForm.numeroReferencia.trim(),
        fechaInicio: editForm.fechaInicio || null,
        fechaVencimiento: editForm.fechaVencimiento || null,
        monto: parseFloat(editForm.monto) || null,
        diasAviso: parseInt(editForm.diasAviso, 10) || 15,
        estado: editForm.estado,
        categoriaGasto: editForm.categoriaGasto || null,
        notas: editForm.notas.trim(),
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const renderForm = (f, setF, onSave, savingFlag, error, onCancel, isEdit) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Nombre, ej. Marbete - Honda CR-V"
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={f.tipo}
          onChange={(e) => setF({ ...f, tipo: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {requiereVehiculo(f.tipo) && (
        <div style={{ marginBottom: 8 }}>
          {vehiculos.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
              No tienes vehículos registrados en Activos todavía (opcional).
            </div>
          ) : (
            <select
              value={f.activoId}
              onChange={(e) => setF({ ...f, activoId: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Vincular a un vehículo de Activos (opcional)…</option>
              {vehiculos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
        <select
          value={f.entidadId}
          onChange={(e) => setF({ ...f, entidadId: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          <option value="">Institución/entidad (opcional)</option>
          {entidades.map((e) => (
            <option key={e.docId} value={e.docId}>{e.name}</option>
          ))}
        </select>
        <input
          placeholder="No. de referencia"
          value={f.numeroReferencia}
          onChange={(e) => setF({ ...f, numeroReferencia: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Fecha de inicio</div>
          <input
            type="date"
            value={f.fechaInicio}
            onChange={(e) => setF({ ...f, fechaInicio: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Vence</div>
          <input
            type="date"
            value={f.fechaVencimiento}
            onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
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
          placeholder="Monto"
          value={f.monto}
          onChange={(e) => setF({ ...f, monto: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          className="despensa-mono"
          type="number"
          min="0"
          placeholder="Avisar (días antes)"
          value={f.diasAviso}
          onChange={(e) => setF({ ...f, diasAviso: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>
      {f.categoriaGasto && f.monto && (
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => {
            if (!showForm) setForm(emptyForm());
            setShowForm((s) => !s);
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar trámite/renovación"}
        </button>
      </div>

      {showForm && renderForm(form, setForm, handleAdd, saving, formError, null, false)}

      {renovaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          <ScrollText size={26} style={{ marginBottom: 10, opacity: 0.6 }} />
          <div>Todavía no tienes ningún trámite o renovación registrada.</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Marbete, inspección técnica, licencia de conducir, pasaporte, visa, y más.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {renovaciones.map((r) => {
            const isEditing = editingId === r.id;
            if (isEditing) {
              return <div key={r.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
            }

            const Icon = TIPO_ICONS[r.tipo] || ScrollText;
            const dias = diasHasta(r.fechaVencimiento);
            let etiqueta = null;
            if (r.estado === "Activo" && dias != null) {
              if (dias < 0) etiqueta = { text: "Vencido", color: "var(--stamp)", bg: "var(--stamp-bg)" };
              else if (dias <= (r.diasAviso ?? 15)) etiqueta = { text: `Vence en ${dias}d`, color: "var(--stamp)", bg: "var(--stamp-bg)" };
              else etiqueta = { text: `Vence en ${dias}d`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
            }

            return (
              <div key={r.id} data-record-id={r.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{r.nombre}</span>
                        <EstadoBadge estado={r.estado} onChange={(estado) => updateRenovacionEstado(r.id, estado)} />
                        {etiqueta && (
                          <span className="despensa-mono" style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: etiqueta.bg, color: etiqueta.color }}>
                            {etiqueta.text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>{r.tipo}</span>
                        {r.entidadName && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Landmark size={11} /> {r.entidadName}
                          </span>
                        )}
                        {r.activoNombre && <span>· {r.activoNombre}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(r)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm(`¿Eliminar "${r.nombre}"?`)) deleteRenovacion(r.id);
                      }}
                      title="Eliminar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                  <Field label="No. de referencia" value={r.numeroReferencia || "—"} />
                  <Field label="Monto" value={r.monto != null ? formatMoney(r.monto) : "—"} />
                  <Field
                    label="Vigencia"
                    value={
                      r.fechaInicio || r.fechaVencimiento ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} /> {formatDateDisplay(r.fechaInicio) || "—"} - {formatDateDisplay(r.fechaVencimiento) || "—"}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>

                {r.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>{r.notas}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div className="despensa-mono" style={{ fontSize: 12.5, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EstadoBadge({ estado, onChange }) {
  const colors = {
    Activo: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Vencido: { bg: "var(--stamp-bg)", color: "var(--stamp)" },
    Cancelado: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  };
  const c = colors[estado] || colors.Activo;
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 6px", borderRadius: 20, border: "none", background: c.bg, color: c.color, cursor: "pointer" }}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}
