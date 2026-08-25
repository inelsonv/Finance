import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Calendar, Percent, Pencil, Check, MessageCircle, Car, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { addPrestamo, deletePrestamo, updatePrestamoEstado, updatePrestamo } from "../lib/db";

const PLAZO_UNIDADES = ["meses", "años"];
const TIPOS_PRESTAMO = ["Vehículo", "Hipotecario / Vivienda", "Personal", "Estudiantil", "Consolidación de deuda", "Negocio", "Otro"];
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
  tipo: TIPOS_PRESTAMO[0],
  entidadId: "",
  activoId: "",
  montoAprobado: "",
  plazo: "",
  plazoUnidad: "meses",
  tasaInteres: "",
  cuota: "",
  fechaInicio: todayStr(),
  estado: "Activo",
  notas: "",
  notificarWhatsapp: false,
  esRevolvente: false,
  saldoActual: "",
  montoMinimoRetiro: "",
});

export default function Prestamos({ prestamos, entidades, movimientos, activos }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(nextNumero(prestamos)));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [revolventeAbiertoId, setRevolventeAbiertoId] = useState(null);

  const openForm = () => {
    setForm(emptyForm(nextNumero(prestamos)));
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditError(null);
    setEditForm({
      tipo: p.tipo || TIPOS_PRESTAMO[0],
      entidadId: p.entidadId || "",
      activoId: p.activoId || "",
      esRevolvente: !!p.esRevolvente,
      saldoActual: p.saldoActual != null ? String(p.saldoActual) : "",
      montoMinimoRetiro: p.montoMinimoRetiro != null ? String(p.montoMinimoRetiro) : "",
      montoAprobado: p.montoAprobado != null ? String(p.montoAprobado) : "",
      plazo: p.plazo != null ? String(p.plazo) : "",
      plazoUnidad: p.plazoUnidad || "meses",
      tasaInteres: p.tasaInteres != null ? String(p.tasaInteres) : "",
      cuota: p.cuota != null ? String(p.cuota) : "",
      fechaInicio: p.fechaInicio || todayStr(),
      estado: p.estado || "Activo",
      notas: p.notas || "",
      notificarWhatsapp: !!p.notificarWhatsapp,
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
      const activoSel = activos.find((a) => a.id === editForm.activoId);
      const plazo = parseFloat(editForm.plazo);
      const tasa = parseFloat(editForm.tasaInteres);
      const cuota = parseFloat(editForm.cuota);
      await updatePrestamo(editingId, {
        tipo: editForm.tipo,
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        activoId: editForm.tipo === "Vehículo" ? editForm.activoId || null : null,
        activoNombre: editForm.tipo === "Vehículo" ? activoSel?.nombre || "" : "",
        esRevolvente: editForm.esRevolvente,
        saldoActual: editForm.esRevolvente ? parseFloat(editForm.saldoActual) || null : null,
        montoMinimoRetiro: editForm.esRevolvente ? parseFloat(editForm.montoMinimoRetiro) || null : null,
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: editForm.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        fechaInicio: editForm.fechaInicio,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        notificarWhatsapp: editForm.notificarWhatsapp,
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

  const totalesGenerales = useMemo(() => {
    let pagado = 0;
    for (const p of prestamos) {
      pagado += pagadoPorPrestamo[p.id] || 0;
    }
    return { pagado, pendiente: totals.aprobado - pagado };
  }, [prestamos, pagadoPorPrestamo, totals.aprobado]);

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
      const activoSel = activos.find((a) => a.id === form.activoId);
      const cuota = parseFloat(form.cuota);
      await addPrestamo({
        numero: form.numero,
        tipo: form.tipo,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        activoId: form.tipo === "Vehículo" ? form.activoId || null : null,
        activoNombre: form.tipo === "Vehículo" ? activoSel?.nombre || "" : "",
        esRevolvente: form.esRevolvente,
        saldoActual: form.esRevolvente ? parseFloat(form.saldoActual) || null : null,
        montoMinimoRetiro: form.esRevolvente ? parseFloat(form.montoMinimoRetiro) || null : null,
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: form.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        fechaInicio: form.fechaInicio,
        estado: form.estado,
        notas: form.notas.trim(),
        notificarWhatsapp: form.notificarWhatsapp,
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 18 }}>
        <SummaryCard label="Préstamos" value={totals.total} mono={false} />
        <SummaryCard label="Activos" value={totals.activos} mono={false} />
        <SummaryCard label="Monto aprobado total" value={formatMoney(totals.aprobado)} mono />
        <SummaryCard label="Total pagado" value={formatMoney(totalesGenerales.pagado)} mono color="var(--sage)" />
        <SummaryCard label="Falta por pagar" value={formatMoney(totalesGenerales.pendiente)} mono color={totalesGenerales.pendiente > 0 ? "var(--stamp)" : "var(--sage)"} />
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
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad prestamista…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {TIPOS_PRESTAMO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {form.tipo === "Vehículo" && (
            <div style={{ marginBottom: 8 }}>
              {activos.filter((a) => a.tipo === "Vehículo").length === 0 ? (
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
                  No tienes vehículos registrados en Activos todavía (opcional).
                </div>
              ) : (
                <select
                  value={form.activoId}
                  onChange={(e) => setForm({ ...form, activoId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                >
                  <option value="">Vincular a un vehículo de Activos (opcional)…</option>
                  {activos.filter((a) => a.tipo === "Vehículo").map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.esRevolvente}
              onChange={(e) => setForm({ ...form, esRevolvente: e.target.checked })}
            />
            Es un préstamo revolvente (al pagar, el monto queda disponible para volver a retirar)
          </label>
          {form.esRevolvente && (
            <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Saldo actual utilizado"
                value={form.saldoActual}
                onChange={(e) => setForm({ ...form, saldoActual: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Mínimo disponible para retirar"
                value={form.montoMinimoRetiro}
                onChange={(e) => setForm({ ...form, montoMinimoRetiro: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          )}

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
                style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
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
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
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

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.notificarWhatsapp}
              onChange={(e) => setForm({ ...form, notificarWhatsapp: e.target.checked })}
            />
            Notificar pagos de este préstamo por WhatsApp
          </label>
          {form.notificarWhatsapp && (
            <div style={{ fontSize: 11.5, color: entidades.find((e) => e.docId === form.entidadId)?.phone ? "var(--ink-soft)" : "var(--stamp)", marginBottom: 10 }}>
              {entidades.find((e) => e.docId === form.entidadId)?.phone
                ? `Se enviará al teléfono de la entidad: ${entidades.find((e) => e.docId === form.entidadId).phone}`
                : "La entidad seleccionada no tiene teléfono registrado — agrégalo en Entidades para que la notificación funcione."}
            </div>
          )}

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
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      <option value="">Entidad prestamista…</option>
                      {entidades.map((e) => (
                        <option key={e.docId} value={e.docId}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {TIPOS_PRESTAMO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {editForm.tipo === "Vehículo" && (
                    <div style={{ marginBottom: 8 }}>
                      {activos.filter((a) => a.tipo === "Vehículo").length === 0 ? (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
                          No tienes vehículos registrados en Activos todavía (opcional).
                        </div>
                      ) : (
                        <select
                          value={editForm.activoId}
                          onChange={(e) => setEditForm({ ...editForm, activoId: e.target.value })}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                        >
                          <option value="">Vincular a un vehículo de Activos (opcional)…</option>
                          {activos.filter((a) => a.tipo === "Vehículo").map((a) => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.esRevolvente}
                      onChange={(e) => setEditForm({ ...editForm, esRevolvente: e.target.checked })}
                    />
                    Es un préstamo revolvente (al pagar, el monto queda disponible para volver a retirar)
                  </label>
                  {editForm.esRevolvente && (
                    <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Saldo actual utilizado"
                        value={editForm.saldoActual}
                        onChange={(e) => setEditForm({ ...editForm, saldoActual: e.target.value })}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Mínimo disponible para retirar"
                        value={editForm.montoMinimoRetiro}
                        onChange={(e) => setEditForm({ ...editForm, montoMinimoRetiro: e.target.value })}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                    </div>
                  )}

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
                        style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
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
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
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

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.notificarWhatsapp}
                      onChange={(e) => setEditForm({ ...editForm, notificarWhatsapp: e.target.checked })}
                    />
                    Notificar pagos de este préstamo por WhatsApp
                  </label>
                  {editForm.notificarWhatsapp && (
                    <div style={{ fontSize: 11.5, color: entidades.find((e) => e.docId === editForm.entidadId)?.phone ? "var(--ink-soft)" : "var(--stamp)", marginBottom: 10 }}>
                      {entidades.find((e) => e.docId === editForm.entidadId)?.phone
                        ? `Se enviará al teléfono de la entidad: ${entidades.find((e) => e.docId === editForm.entidadId).phone}`
                        : "La entidad seleccionada no tiene teléfono registrado — agrégalo en Entidades para que la notificación funcione."}
                    </div>
                  )}

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
                        background: "var(--card)",
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
                        {p.tipo && (
                          <span
                            className="despensa-tab-font"
                            style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--sage-bg)", color: "var(--sage)" }}
                          >
                            {p.tipo}
                          </span>
                        )}
                        <EstadoBadge estado={p.estado} onChange={(estado) => updatePrestamoEstado(p.id, estado)} />
                        {p.notificarWhatsapp && (
                          <span
                            title={
                              entidades.find((e) => e.docId === p.entidadId)?.phone
                                ? `Notifica pagos a ${entidades.find((e) => e.docId === p.entidadId).phone}`
                                : "Notificación activa, pero la entidad no tiene teléfono registrado"
                            }
                            style={{ display: "flex", alignItems: "center", color: entidades.find((e) => e.docId === p.entidadId)?.phone ? "var(--sage)" : "var(--stamp)" }}
                          >
                            <MessageCircle size={13} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <Landmark size={13} style={{ color: "var(--ink-soft)" }} />
                        {p.entidadName || "Entidad no especificada"}
                      </div>
                      {p.activoNombre && (
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                          <Car size={12} />
                          {p.activoNombre}
                        </div>
                      )}
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

                  {p.esRevolvente && (() => {
                    const limite = Number(p.montoAprobado) || 0;
                    const usado = Number(p.saldoActual) || 0;
                    const disponible = Math.max(limite - usado, 0);
                    const pctUsado = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
                    const minimoRetiro = p.montoMinimoRetiro;
                    const puedeRetirar = minimoRetiro != null ? disponible >= minimoRetiro : disponible > 0;
                    const barColor = pctUsado >= 90 ? "var(--stamp)" : pctUsado >= 60 ? "var(--amber)" : "var(--sage)";
                    const abierto = revolventeAbiertoId === p.id;
                    return (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                        <button
                          onClick={() => setRevolventeAbiertoId(abierto ? null : p.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            color: "var(--ink-soft)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          <RotateCcw size={11} />
                          Línea revolvente
                          {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {abierto && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                              <Field label="Disponible para retirar" value={<span style={{ color: puedeRetirar ? "var(--sage)" : "var(--stamp)" }}>{formatMoney(disponible)}</span>} />
                              <Field label="Saldo utilizado" value={formatMoney(usado)} />
                            </div>
                            <div style={{ height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ height: "100%", width: `${pctUsado}%`, background: barColor, borderRadius: 4 }} />
                            </div>
                            <div
                              className="despensa-tab-font"
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 12,
                                background: puedeRetirar ? "var(--sage-bg)" : "var(--stamp-bg)",
                                color: puedeRetirar ? "var(--sage)" : "var(--stamp)",
                              }}
                            >
                              {puedeRetirar
                                ? "Puedes volver a retirar"
                                : minimoRetiro != null
                                ? `Necesitas pagar más (mínimo ${formatMoney(minimoRetiro)} disponible)`
                                : "Sin disponible para retirar"}
                            </div>
                          </div>
                        )}
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

function SummaryCard({ label, value, mono, color }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div
        className={mono ? "despensa-mono" : "despensa-tab-font"}
        style={{ fontSize: "clamp(11px, 2.2vw, 15px)", fontWeight: 600, color: color || "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
