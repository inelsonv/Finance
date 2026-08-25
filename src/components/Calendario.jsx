import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Calendar, Stethoscope, Plane, Cake, Briefcase, User, MapPin, Clock } from "lucide-react";
import { addEvento, deleteEvento, updateEventoEstado, updateEvento } from "../lib/db";

const TIPOS = ["Cita médica", "Vacaciones", "Cumpleaños", "Trabajo", "Personal", "Otro"];
const ESTADOS = ["Pendiente", "Completado", "Cancelado"];

const TIPO_ICONS = {
  "Cita médica": Stethoscope,
  Vacaciones: Plane,
  Cumpleaños: Cake,
  Trabajo: Briefcase,
  Personal: User,
  Otro: Calendar,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
  titulo: "",
  tipo: TIPOS[0],
  fecha: todayStr(),
  hora: "",
  entidadId: "",
  diasAviso: "1",
  estado: "Pendiente",
  notas: "",
});

function toEditForm(e) {
  return {
    titulo: e.titulo || "",
    tipo: e.tipo || TIPOS[0],
    fecha: e.fecha || todayStr(),
    hora: e.hora || "",
    entidadId: e.entidadId || "",
    diasAviso: e.diasAviso != null ? String(e.diasAviso) : "1",
    estado: e.estado || "Pendiente",
    notas: e.notas || "",
  };
}

export default function Calendario({ eventos, entidades }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [mostrarPasados, setMostrarPasados] = useState(false);

  const { proximos, pasados } = useMemo(() => {
    const prox = [];
    const past = [];
    for (const e of eventos) {
      const dias = diasHasta(e.fecha);
      if (dias != null && dias < 0) past.push(e);
      else prox.push(e);
    }
    return { proximos: prox, pasados: past };
  }, [eventos]);

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm(toEditForm(e));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleAdd = async () => {
    const titulo = form.titulo.trim();
    if (!titulo) {
      setFormError("Ingresa un título para el evento");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addEvento({
        titulo,
        tipo: form.tipo,
        fecha: form.fecha,
        hora: form.hora,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        diasAviso: parseInt(form.diasAviso, 10) || 0,
        estado: form.estado,
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
    const titulo = editForm.titulo.trim();
    if (!titulo) {
      setEditError("Ingresa un título para el evento");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      await updateEvento(editingId, {
        titulo,
        tipo: editForm.tipo,
        fecha: editForm.fecha,
        hora: editForm.hora,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        diasAviso: parseInt(editForm.diasAviso, 10) || 0,
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

  const renderForm = (f, setF, onSave, savingFlag, error, onCancel, isEdit) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Título, ej. Cita odontológica"
          value={f.titulo}
          onChange={(e) => setF({ ...f, titulo: e.target.value })}
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

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          type="date"
          value={f.fecha}
          onChange={(e) => setF({ ...f, fecha: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          type="time"
          value={f.hora}
          onChange={(e) => setF({ ...f, hora: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
        <select
          value={f.entidadId}
          onChange={(e) => setF({ ...f, entidadId: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          <option value="">Lugar / entidad (opcional)</option>
          {entidades.map((e) => (
            <option key={e.docId} value={e.docId}>{e.name}</option>
          ))}
        </select>
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
          {isEdit ? <Check size={14} /> : <Plus size={14} />} {savingFlag ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar evento"}
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

  const renderEvento = (e) => {
    const Icon = TIPO_ICONS[e.tipo] || Calendar;
    const dias = diasHasta(e.fecha);
    const isEditing = editingId === e.id;

    if (isEditing) {
      return <div key={e.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
    }

    let etiqueta = null;
    if (e.estado === "Pendiente" && dias != null) {
      if (dias < 0) etiqueta = { text: "Pasado", color: "var(--ink-soft)", bg: "var(--line-soft)" };
      else if (dias === 0) etiqueta = { text: "Hoy", color: "var(--stamp)", bg: "var(--stamp-bg)" };
      else if (dias === 1) etiqueta = { text: "Mañana", color: "var(--stamp)", bg: "var(--stamp-bg)" };
      else if (dias <= 7) etiqueta = { text: `En ${dias} días`, color: "var(--amber)", bg: "var(--amber-bg)" };
      else etiqueta = { text: `En ${dias} días`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
    } else if (e.estado === "Completado") {
      etiqueta = { text: "Completado", color: "var(--sage)", bg: "var(--sage-bg)" };
    } else if (e.estado === "Cancelado") {
      etiqueta = { text: "Cancelado", color: "var(--ink-soft)", bg: "var(--line-soft)" };
    }

    return (
      <div key={e.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--sage-bg)",
                color: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{e.titulo}</span>
                {etiqueta && (
                  <span
                    className="despensa-mono"
                    style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: etiqueta.bg, color: etiqueta.color }}
                  >
                    {etiqueta.text}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Calendar size={11} /> {formatDateDisplay(e.fecha)}
                </span>
                {e.hora && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} /> {e.hora}
                  </span>
                )}
                {e.entidadName && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <MapPin size={11} /> {e.entidadName}
                  </span>
                )}
                <span>{e.tipo}</span>
              </div>
              {e.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>{e.notas}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {e.estado === "Pendiente" && (
              <button
                onClick={() => updateEventoEstado(e.id, "Completado")}
                title="Marcar como completado"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--sage)", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                <Check size={15} />
              </button>
            )}
            <button
              onClick={() => startEdit(e)}
              title="Editar"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => deleteEvento(e.id)}
              title="Eliminar"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          {showForm ? "Cancelar" : "Agregar evento"}
        </button>
      </div>

      {showForm && renderForm(form, setForm, handleAdd, saving, formError, null, false)}

      {proximos.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no tienes eventos próximos. Agrega una cita, vacaciones o cualquier otro evento.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proximos.map(renderEvento)}
        </div>
      )}

      {pasados.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setMostrarPasados((s) => !s)}
            style={{ fontSize: 12, color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            {mostrarPasados ? "Ocultar" : "Ver"} eventos pasados ({pasados.length})
          </button>
          {mostrarPasados && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, opacity: 0.7 }}>
              {pasados.map(renderEvento)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
