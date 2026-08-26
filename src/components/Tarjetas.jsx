import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Pencil, Check } from "lucide-react";
import { addTarjeta, deleteTarjeta, updateTarjetaEstado, updateTarjeta } from "../lib/db";
import { confirm } from "../lib/confirm";

const ESTADOS = ["Activa", "Bloqueada", "Cancelada"];
const TIPOS_TARJETA = ["Crédito", "Débito"];
const MARCAS = ["Visa", "Mastercard", "Amex", "Otra"];

const COLORES = {
  gold: { label: "Oro", bg: "linear-gradient(135deg, #ecd49a 0%, #c9a256 45%, #8a6a1f 100%)", text: "#3d2b05" },
  platino: { label: "Platino", bg: "linear-gradient(135deg, #eef1f3 0%, #b7bec4 50%, #8b929a 100%)", text: "#2a2e33" },
  negro: { label: "Negro", bg: "linear-gradient(135deg, #3a3a3a 0%, #141414 100%)", text: "#f2f2f2" },
  azul: { label: "Azul", bg: "linear-gradient(135deg, #4a7fb5 0%, #1f3a5c 100%)", text: "#f2f6fa" },
  rojo: { label: "Rojo", bg: "linear-gradient(135deg, #c1594a 0%, #7a2418 100%)", text: "#fbf0ee" },
  verde: { label: "Verde", bg: "linear-gradient(135deg, #7a9d6f 0%, #3e5a35 100%)", text: "#f2f7ef" },
};

function CardVisual({ tarjeta }) {
  const c = COLORES[tarjeta.color] || COLORES.azul;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.85 }}>
          {tarjeta.entidadName || "Banco"}
        </span>
        <div style={{ width: 30, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.4)" }} />
      </div>
      <div>
        <div className="despensa-mono" style={{ fontSize: 14.5, letterSpacing: "0.1em", marginBottom: 6 }}>
          •••• •••• •••• {tarjeta.ultimos4 || "••••"}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {tarjeta.nombre}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <MarcaLogo marca={tarjeta.marca} />
      </div>
    </div>
  );
}

function MarcaLogo({ marca }) {
  if (marca === "Mastercard") {
    return (
      <div style={{ display: "flex" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#eb5b2d", opacity: 0.92 }} />
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#f2a900", opacity: 0.92, marginLeft: -9 }} />
      </div>
    );
  }
  if (marca === "Visa") {
    return <span style={{ fontStyle: "italic", fontWeight: 700, fontSize: 17 }}>VISA</span>;
  }
  if (marca === "Amex") {
    return <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.03em" }}>AMEX</span>;
  }
  return null;
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = () => ({
  nombre: "",
  tipoTarjeta: "Crédito",
  entidadId: "",
  ultimos4: "",
  limiteCredito: "",
  tasaInteres: "",
  pagoMinimo: "",
  fechaCorte: "",
  fechaPago: "",
  estado: "Activa",
  notas: "",
  color: "azul",
  marca: "Visa",
  saldoActual: "",
});

function toEditForm(t) {
  return {
    nombre: t.nombre || "",
    tipoTarjeta: t.tipoTarjeta || "Crédito",
    entidadId: t.entidadId || "",
    ultimos4: t.ultimos4 || "",
    limiteCredito: t.limiteCredito != null ? String(t.limiteCredito) : "",
    tasaInteres: t.tasaInteres != null ? String(t.tasaInteres) : "",
    pagoMinimo: t.pagoMinimo != null ? String(t.pagoMinimo) : "",
    fechaCorte: t.fechaCorte != null ? String(t.fechaCorte) : "",
    fechaPago: t.fechaPago != null ? String(t.fechaPago) : "",
    estado: t.estado || "Activa",
    notas: t.notas || "",
    color: t.color || "azul",
    marca: t.marca || "Visa",
    saldoActual: t.saldoActual != null ? String(t.saldoActual) : "",
  };
}

export default function Tarjetas({ tarjetas, entidades, movimientos }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const pagadoPorTarjeta = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.category !== "Pago de tarjeta" || !m.tarjetaId) continue;
      map[m.tarjetaId] = (map[m.tarjetaId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const compradoPorTarjeta = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.metodoPago !== "Tarjeta de crédito" || !m.tarjetaId) continue;
      map[m.tarjetaId] = (map[m.tarjetaId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm(toEditForm(t));
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
      setFormError("Ingresa un nombre para la tarjeta");
      return;
    }
    if (!form.entidadId) {
      setFormError("Selecciona la entidad emisora");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addTarjeta({
        nombre,
        tipoTarjeta: form.tipoTarjeta,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        ultimos4: form.ultimos4.trim(),
        limiteCredito: parseFloat(form.limiteCredito) || null,
        tasaInteres: parseFloat(form.tasaInteres) || null,
        pagoMinimo: parseFloat(form.pagoMinimo) || null,
        fechaCorte: parseInt(form.fechaCorte, 10) || null,
        fechaPago: parseInt(form.fechaPago, 10) || null,
        estado: form.estado,
        notas: form.notas.trim(),
        color: form.color,
        marca: form.marca,
        saldoActual: parseFloat(form.saldoActual) || null,
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
    if (!editForm.entidadId) {
      setEditError("Selecciona la entidad emisora");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      await updateTarjeta(editingId, {
        tipoTarjeta: editForm.tipoTarjeta,
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        ultimos4: editForm.ultimos4.trim(),
        limiteCredito: parseFloat(editForm.limiteCredito) || null,
        tasaInteres: parseFloat(editForm.tasaInteres) || null,
        pagoMinimo: parseFloat(editForm.pagoMinimo) || null,
        fechaCorte: parseInt(editForm.fechaCorte, 10) || null,
        fechaPago: parseInt(editForm.fechaPago, 10) || null,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        color: editForm.color,
        marca: editForm.marca,
        saldoActual: parseFloat(editForm.saldoActual) || null,
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => setShowForm((s) => !s)}
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
          {showForm ? "Cancelar" : "Agregar tarjeta"}
        </button>
      </div>

      {entidades.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Primero registra al menos una entidad (banco emisor) en la sección Entidades.
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.7fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Visa Platinum"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad emisora…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
            <input
              className="despensa-mono"
              placeholder="****1234"
              maxLength={4}
              value={form.ultimos4}
              onChange={(e) => setForm({ ...form, ultimos4: e.target.value.replace(/\D/g, "") })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.tipoTarjeta}
              onChange={(e) => setForm({ ...form, tipoTarjeta: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {TIPOS_TARJETA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
            <select
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {MARCAS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {form.tipoTarjeta === "Crédito" && (
            <>
              <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input
                  className="despensa-mono"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Límite de crédito"
                  value={form.limiteCredito}
                  onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
                <input
                  className="despensa-mono"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Tasa interés %"
                  value={form.tasaInteres}
                  onChange={(e) => setForm({ ...form, tasaInteres: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
                <input
                  className="despensa-mono"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Pago mínimo"
                  value={form.pagoMinimo}
                  onChange={(e) => setForm({ ...form, pagoMinimo: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <input
                  className="despensa-mono"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Saldo actual (lo que debes hoy, opcional)"
                  value={form.saldoActual}
                  onChange={(e) => setForm({ ...form, saldoActual: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input
                  className="despensa-mono"
                  type="number"
                  step="1"
                  min="1"
                  max="31"
                  placeholder="Día de corte"
                  value={form.fechaCorte}
                  onChange={(e) => setForm({ ...form, fechaCorte: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
                <input
                  className="despensa-mono"
                  type="number"
                  step="1"
                  min="1"
                  max="31"
                  placeholder="Día de pago"
                  value={form.fechaPago}
                  onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </>
          )}

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
            {saving ? "Guardando…" : "Guardar tarjeta"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {tarjetas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ninguna tarjeta de crédito.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tarjetas.map((t) => (
            <div key={t.id} data-record-id={t.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              {editingId === t.id ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr", gap: 8, marginBottom: 8 }}>
                    <select
                      value={editForm.entidadId}
                      onChange={(e) => setEditForm({ ...editForm, entidadId: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      <option value="">Entidad emisora…</option>
                      {entidades.map((e) => (
                        <option key={e.docId} value={e.docId}>{e.name}</option>
                      ))}
                    </select>
                    <input
                      className="despensa-mono"
                      placeholder="****1234"
                      maxLength={4}
                      value={editForm.ultimos4}
                      onChange={(e) => setEditForm({ ...editForm, ultimos4: e.target.value.replace(/\D/g, "") })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <select
                      value={editForm.tipoTarjeta}
                      onChange={(e) => setEditForm({ ...editForm, tipoTarjeta: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {TIPOS_TARJETA.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
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
                    <select
                      value={editForm.marca}
                      onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {MARCAS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  {editForm.tipoTarjeta === "Crédito" && (
                    <>
                      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <input
                          className="despensa-mono"
                          type="number"
                          step="0.01"
                          placeholder="Límite de crédito"
                          value={editForm.limiteCredito}
                          onChange={(e) => setEditForm({ ...editForm, limiteCredito: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          className="despensa-mono"
                          type="number"
                          step="0.01"
                          placeholder="Tasa interés %"
                          value={editForm.tasaInteres}
                          onChange={(e) => setEditForm({ ...editForm, tasaInteres: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          className="despensa-mono"
                          type="number"
                          step="0.01"
                          placeholder="Pago mínimo"
                          value={editForm.pagoMinimo}
                          onChange={(e) => setEditForm({ ...editForm, pagoMinimo: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <input
                          className="despensa-mono"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Saldo actual (lo que debes hoy, opcional)"
                          value={editForm.saldoActual}
                          onChange={(e) => setEditForm({ ...editForm, saldoActual: e.target.value })}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                      </div>
                      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <input
                          className="despensa-mono"
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Día de corte"
                          value={editForm.fechaCorte}
                          onChange={(e) => setEditForm({ ...editForm, fechaCorte: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          className="despensa-mono"
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Día de pago"
                          value={editForm.fechaPago}
                          onChange={(e) => setEditForm({ ...editForm, fechaPago: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                        />
                      </div>
                    </>
                  )}
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
                    <CardVisual tarjeta={t} />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{t.nombre}</span>
                        <span
                          className="despensa-tab-font"
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: "1px 8px",
                            borderRadius: 20,
                            background: (t.tipoTarjeta || "Crédito") === "Crédito" ? "var(--sage-bg)" : "var(--line-soft)",
                            color: (t.tipoTarjeta || "Crédito") === "Crédito" ? "var(--sage)" : "var(--ink-soft)",
                          }}
                        >
                          {t.tipoTarjeta || "Crédito"}
                        </span>
                        <EstadoBadge estado={t.estado} onChange={(estado) => updateTarjetaEstado(t.id, estado)} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <Landmark size={11} />
                        {t.entidadName || "Entidad no especificada"}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => startEdit(t)}
                          title="Editar tarjeta"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--paper)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm("¿Eliminar esta tarjeta?")) deleteTarjeta(t.id);
                          }}
                          title="Eliminar tarjeta"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--paper)", color: "var(--stamp)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {(t.tipoTarjeta || "Crédito") === "Crédito" ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
                        <Field label="Límite de crédito" value={t.limiteCredito != null ? formatMoney(t.limiteCredito) : "—"} />
                        <Field label="Saldo actual" value={t.saldoActual != null ? <span style={{ color: "var(--stamp)" }}>{formatMoney(t.saldoActual)}</span> : "—"} />
                        <Field label="Pago mínimo" value={t.pagoMinimo != null ? formatMoney(t.pagoMinimo) : "—"} />
                        <Field label="Tasa interés" value={t.tasaInteres != null ? `${t.tasaInteres}%` : "—"} />
                        <Field label="Corte / Pago" value={t.fechaCorte || t.fechaPago ? `${t.fechaCorte || "—"} / ${t.fechaPago || "—"}` : "—"} />
                      </div>

                      {t.limiteCredito != null && t.limiteCredito > 0 && (() => {
                        const consumido = Math.max((compradoPorTarjeta[t.id] || 0) - (pagadoPorTarjeta[t.id] || 0), 0);
                        const disponible = Math.max(t.limiteCredito - consumido, 0);
                        const pct = Math.min(100, Math.round((consumido / t.limiteCredito) * 100));
                        const barColor = pct >= 90 ? "var(--stamp)" : pct >= 60 ? "var(--amber)" : "var(--sage)";
                        return (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                              <span style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                Nivel de consumo
                              </span>
                              <span className="despensa-mono" style={{ fontSize: 12.5, fontWeight: 600, color: barColor }}>
                                {pct}% · {formatMoney(consumido)}
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 4 }}>
                              Disponible: {formatMoney(disponible)}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Tarjeta de débito · no acumula deuda ni intereses.</div>
                  )}

                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                    <Field label="Total pagado (histórico)" value={<span style={{ color: "var(--sage)" }}>{formatMoney(pagadoPorTarjeta[t.id] || 0)}</span>} />
                  </div>

                  {t.notas && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
                      {t.notas}
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
    Bloqueada: { bg: "var(--stamp-bg)", color: "var(--stamp)" },
    Cancelada: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
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
