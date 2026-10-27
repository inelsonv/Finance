import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Calendar, Sparkles, Bell, AlertTriangle, Clock } from "lucide-react";
import { addMembresia, deleteMembresia, updateMembresiaEstado, updateMembresia } from "../lib/db";
import { confirm } from "../lib/confirm";

export const MEMBRESIA_TIPOS = ["Software / IA", "Streaming", "Gimnasio", "Club de compras", "Salud", "Otro"];
const FRECUENCIAS = ["Mensual", "Trimestral", "Semestral", "Anual"];
const ESTADOS = ["Activa", "Pausada", "Cancelada"];

const COLORES = {
  azul: { label: "Azul", bg: "linear-gradient(135deg, #2f5fa8 0%, #17325e 100%)", text: "#f2f6fc" },
  gold: { label: "Oro", bg: "linear-gradient(135deg, #ecd49a 0%, #c9a256 45%, #8a6a1f 100%)", text: "#3d2b05" },
  negro: { label: "Negro", bg: "linear-gradient(135deg, #3a3a3a 0%, #141414 100%)", text: "#f2f2f2" },
  verde: { label: "Verde", bg: "linear-gradient(135deg, #6f9a63 0%, #33501f 100%)", text: "#f2f7ee" },
  rojo: { label: "Rojo", bg: "linear-gradient(135deg, #c1594a 0%, #7a2418 100%)", text: "#fbf0ee" },
  morado: { label: "Morado", bg: "linear-gradient(135deg, #7a5ba0 0%, #402a5e 100%)", text: "#f5f0fa" },
};

export function MembershipCard({ membresia }) {
  const c = COLORES[membresia.color] || COLORES.azul;
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 300,
        aspectRatio: "1.586 / 1",
        borderRadius: 14,
        background: c.bg,
        color: c.text,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            border: "1px solid rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={13} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{membresia.nombre}</div>
          <div style={{ fontSize: 9.5, opacity: 0.85, letterSpacing: "0.06em", textTransform: "uppercase" }}>Membership / Plan</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          {membresia.nivel && (
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              {membresia.nivel}
            </div>
          )}
        </div>
        {membresia.fechaExpiracion && (
          <div style={{ fontSize: 10, opacity: 0.95, textAlign: "right", letterSpacing: "0.03em", fontWeight: 600 }}>
            EXP: {formatDateDisplay(membresia.fechaExpiracion)}
          </div>
        )}
      </div>
    </div>
  );
}

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

function diasHastaFecha(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

const emptyForm = () => ({
  nombre: "",
  tipo: MEMBRESIA_TIPOS[0],
  entidadId: "",
  costo: "",
  frecuencia: FRECUENCIAS[0],
  diaPago: "",
  fechaInicio: todayStr(),
  fechaExpiracion: "",
  alertarExpiracion: true,
  diasAvisoExpiracion: "5",
  diasAvisoPago: "3",
  estado: "Activa",
  notas: "",
  color: "azul",
  nivel: "",
});

function toEditForm(m) {
  return {
    nombre: m.nombre || "",
    tipo: m.tipo || MEMBRESIA_TIPOS[0],
    entidadId: m.entidadId || "",
    costo: m.costo != null ? String(m.costo) : "",
    frecuencia: m.frecuencia || FRECUENCIAS[0],
    diaPago: m.diaPago != null ? String(m.diaPago) : "",
    fechaInicio: m.fechaInicio || todayStr(),
    fechaExpiracion: m.fechaExpiracion || "",
    alertarExpiracion: m.alertarExpiracion !== false,
    diasAvisoExpiracion: m.diasAvisoExpiracion != null ? String(m.diasAvisoExpiracion) : "5",
    diasAvisoPago: m.diasAvisoPago != null ? String(m.diasAvisoPago) : "3",
    estado: m.estado || "Activa",
    notas: m.notas || "",
    color: m.color || "azul",
    nivel: m.nivel || "",
  };
}

export default function Membresias({ membresias, entidades, movimientos }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const pagadoPorMembresia = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.category !== "Pago de membresía" || !m.membresiaId) continue;
      map[m.membresiaId] = (map[m.membresiaId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const totalMensual = useMemo(() => {
    let total = 0;
    for (const m of membresias) {
      if (m.estado !== "Activa" || m.costo == null) continue;
      const factor = { Mensual: 1, Trimestral: 1 / 3, Semestral: 1 / 6, Anual: 1 / 12 }[m.frecuencia] || 1;
      total += m.costo * factor;
    }
    return total;
  }, [membresias]);

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm(toEditForm(m));
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
      setFormError("Ingresa un nombre para la membresía o suscripción");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addMembresia({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        costo: parseFloat(form.costo) || null,
        frecuencia: form.frecuencia,
        diaPago: parseInt(form.diaPago, 10) || null,
        fechaInicio: form.fechaInicio,
        fechaExpiracion: form.fechaExpiracion || null,
        alertarExpiracion: form.alertarExpiracion !== false,
        diasAvisoExpiracion: parseInt(form.diasAvisoExpiracion, 10) || 5,
        diasAvisoPago: parseInt(form.diasAvisoPago, 10) || null,
        estado: form.estado,
        notas: form.notas.trim(),
        color: form.color,
        nivel: form.nivel.trim(),
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
    const nombre = editForm.nombre ? editForm.nombre.trim() : "";
    if (!nombre) {
      setEditError("Ingresa un nombre para la membresía o suscripción");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      await updateMembresia(editingId, {
        nombre,
        tipo: editForm.tipo,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        costo: parseFloat(editForm.costo) || null,
        frecuencia: editForm.frecuencia,
        diaPago: parseInt(editForm.diaPago, 10) || null,
        fechaInicio: editForm.fechaInicio,
        fechaExpiracion: editForm.fechaExpiracion || null,
        alertarExpiracion: editForm.alertarExpiracion !== false,
        diasAvisoExpiracion: parseInt(editForm.diasAvisoExpiracion, 10) || 5,
        diasAvisoPago: parseInt(editForm.diasAvisoPago, 10) || null,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        color: editForm.color,
        nivel: editForm.nivel.trim(),
      });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const porExpirar = useMemo(() => {
    return membresias.filter((m) => {
      if (m.estado !== "Activa" || !m.fechaExpiracion) return false;
      const dias = diasHastaFecha(m.fechaExpiracion);
      const umbral = m.diasAvisoExpiracion != null ? Number(m.diasAvisoExpiracion) : 5;
      return dias != null && dias <= umbral;
    });
  }, [membresias]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {membresias.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Costo mensual estimado (activas):</span>
              <span className="despensa-mono" style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(totalMensual)}</span>
            </div>
          )}
          {porExpirar.length > 0 && (
            <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)", color: "var(--amber)", borderRadius: 10, padding: "8px 12px", display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 600 }}>
              <Bell size={13} />
              <span>{porExpirar.length} suscripción{porExpirar.length === 1 ? "" : "es"} por vencer pronto</span>
            </div>
          )}
        </div>

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
          {showForm ? "Cancelar" : "Agregar membresía / suscripción"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Google Gemini, Netflix, Gym"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {MEMBRESIA_TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {Object.entries(COLORES).map(([key, c]) => (
                <option key={key} value={key}>{c.label}</option>
              ))}
            </select>
            <input
              placeholder="Nivel, ej. Pro, Advanced, Diamond"
              value={form.nivel}
              onChange={(e) => setForm({ ...form, nivel: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad / Proveedor (opcional)</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
            <select
              value={form.frecuencia}
              onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {FRECUENCIAS.map((f) => (
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
              placeholder="Costo"
              value={form.costo}
              onChange={(e) => setForm({ ...form, costo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              className="despensa-mono"
              type="number"
              min="1"
              max="31"
              placeholder="Día de pago (1-31)"
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

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Fecha de inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Configuración de expiración del plan y alertas */}
          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Bell size={12} /> Expiración del plan y alertas
            </div>
            <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, marginBottom: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Fecha de expiración / fin (opcional)</label>
                <input
                  type="date"
                  value={form.fechaExpiracion}
                  onChange={(e) => setForm({ ...form, fechaExpiracion: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Avisar con anticipación</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    max="60"
                    placeholder="5"
                    value={form.diasAvisoExpiracion}
                    onChange={(e) => setForm({ ...form, diasAvisoExpiracion: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>días antes</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.4 }}>
              {form.fechaExpiracion ? (
                <>🔔 Recibirás una alerta en la campana de notificaciones <strong>{form.diasAvisoExpiracion || 5} días antes</strong> del {formatDateDisplay(form.fechaExpiracion)}.</>
              ) : (
                <>Ej. Si tienes un plan de Google Gemini activo hasta enero, indica aquí la fecha y recibirás una notificación <strong>5 días antes</strong> para renovar o cancelar.</>
              )}
            </div>
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
            {saving ? "Guardando…" : "Guardar membresía"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {membresias.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ninguna membresía o suscripción.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {membresias.map((m) => (
            <div key={m.id} data-record-id={m.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              {editingId === m.id ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Nombre, ej. Google Gemini, Netflix"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {MEMBRESIA_TIPOS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <select
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {Object.entries(COLORES).map(([key, c]) => (
                        <option key={key} value={key}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Nivel, ej. Diamond, Gold, Pro"
                      value={editForm.nivel}
                      onChange={(e) => setEditForm({ ...editForm, nivel: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
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
                    <select
                      value={editForm.frecuencia}
                      onChange={(e) => setEditForm({ ...editForm, frecuencia: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {FRECUENCIAS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      placeholder="Costo"
                      value={editForm.costo}
                      onChange={(e) => setEditForm({ ...editForm, costo: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      className="despensa-mono"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Día de pago"
                      value={editForm.diaPago}
                      onChange={(e) => setEditForm({ ...editForm, diaPago: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Fecha de inicio</label>
                      <input
                        type="date"
                        value={editForm.fechaInicio}
                        onChange={(e) => setEditForm({ ...editForm, fechaInicio: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* Edición de fecha de expiración y alertas */}
                  <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, marginTop: 6, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <Bell size={12} /> Expiración del plan y alertas
                    </div>
                    <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, marginBottom: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Fecha de expiración / fin</label>
                        <input
                          type="date"
                          value={editForm.fechaExpiracion}
                          onChange={(e) => setEditForm({ ...editForm, fechaExpiracion: e.target.value })}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 3 }}>Avisar con anticipación</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            className="despensa-mono"
                            type="number"
                            min="1"
                            max="60"
                            placeholder="5"
                            value={editForm.diasAvisoExpiracion}
                            onChange={(e) => setEditForm({ ...editForm, diasAvisoExpiracion: e.target.value })}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                          />
                          <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>días antes</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                      {editForm.fechaExpiracion ? (
                        <>🔔 Recibirás una alerta en la campana de notificaciones <strong>{editForm.diasAvisoExpiracion || 5} días antes</strong> del {formatDateDisplay(editForm.fechaExpiracion)}.</>
                      ) : (
                        <>Sin fecha de expiración fijada. Puedes asignarle una para recibir recordatorios antes de que venza.</>
                      )}
                    </div>
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
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
                    <MembershipCard membresia={m} />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{m.nombre}</span>
                        <EstadoBadge estado={m.estado} onChange={(estado) => updateMembresiaEstado(m.id, estado)} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 3 }}>
                        {m.tipo}{m.entidadName && <> · {m.entidadName}</>}
                      </div>

                      {/* Pill de expiración y alerta */}
                      {m.fechaExpiracion && (() => {
                        const dias = diasHastaFecha(m.fechaExpiracion);
                        const umbral = m.diasAvisoExpiracion != null ? Number(m.diasAvisoExpiracion) : 5;
                        const vencido = dias != null && dias < 0;
                        const hoy = dias === 0;
                        const porVencer = dias != null && dias > 0 && dias <= umbral;
                        let bg = "var(--line-soft)";
                        let color = "var(--ink-soft)";
                        let texto = `Plan activo hasta el ${formatDateDisplay(m.fechaExpiracion)} (${dias}d restantes)`;
                        if (vencido) {
                          bg = "var(--stamp-bg)";
                          color = "var(--stamp)";
                          texto = `Expiró el ${formatDateDisplay(m.fechaExpiracion)} (hace ${Math.abs(dias)}d)`;
                        } else if (hoy) {
                          bg = "var(--stamp-bg)";
                          color = "var(--stamp)";
                          texto = `¡Expira HOY (${formatDateDisplay(m.fechaExpiracion)})!`;
                        } else if (porVencer) {
                          bg = "var(--amber-bg)";
                          color = "var(--amber)";
                          texto = `⚠️ Expira en ${dias} día${dias === 1 ? "" : "s"} (${formatDateDisplay(m.fechaExpiracion)}) · Alerta activa (${umbral}d)`;
                        }
                        return (
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                background: bg,
                                color: color,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              <Bell size={11} /> {texto}
                            </span>
                          </div>
                        );
                      })()}

                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => startEdit(m)}
                          title="Editar membresía o suscripción"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--paper)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm("¿Eliminar esta membresía o suscripción?")) deleteMembresia(m.id);
                          }}
                          title="Eliminar membresía o suscripción"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--paper)", color: "var(--stamp)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                    <Field label="Costo" value={m.costo != null ? formatMoney(m.costo) : "—"} />
                    <Field label="Frecuencia" value={m.frecuencia || "—"} />
                    <Field label="Día de pago" value={m.diaPago ? `Día ${m.diaPago}` : "—"} />
                    <Field
                      label="Inicio"
                      value={
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} /> {formatDateDisplay(m.fechaInicio)}
                        </span>
                      }
                    />
                    {m.fechaExpiracion && (
                      <Field
                        label="Expira el"
                        value={
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} /> {formatDateDisplay(m.fechaExpiracion)}
                          </span>
                        }
                      />
                    )}
                    {m.fechaExpiracion && (
                      <Field
                        label="Alerta anticipada"
                        value={
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Bell size={11} /> {m.diasAvisoExpiracion || 5} días antes
                          </span>
                        }
                      />
                    )}
                  </div>

                  {pagadoPorMembresia[m.id] > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                      <Field label="Total pagado (histórico)" value={<span style={{ color: "var(--sage)" }}>{formatMoney(pagadoPorMembresia[m.id])}</span>} />
                    </div>
                  )}

                  {m.notas && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                      {m.notas}
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
    Activa: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Pausada: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
    Cancelada: { bg: "var(--stamp-bg)", color: "var(--stamp)" },
  };
  const c = colors[estado] || colors.Activa;
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
