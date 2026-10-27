import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Briefcase, Pencil, Check, Landmark, Gift } from "lucide-react";
import { addFuenteIngreso, deleteFuenteIngreso, updateFuenteIngresoEstado, updateFuenteIngreso, addIngresoPuntual, deleteIngresoPuntual, marcarIngresoPuntualRecibido } from "../lib/db";
import { calcularDeduccionesLey } from "../lib/deduccionesLey";
import { confirm } from "../lib/confirm";

export const FUENTE_TIPOS = ["Salario", "Freelance", "Negocio propio", "Renta", "Otro"];
const TIPOS_INGRESO_PUNTUAL = ["Bonificación", "Regalía Pascual", "Bono Vacacional", "Comisión", "Otro"];
export const FRECUENCIAS_INGRESO = ["Semanal", "Quincenal", "Mensual", "Anual", "Único"];
const ESTADOS = ["Activo", "Inactivo"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
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
  diasVacacionesAnuales: "",
  aplicaDeduccionesLey: false,
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
    diasVacacionesAnuales: f.diasVacacionesAnuales != null ? String(f.diasVacacionesAnuales) : "",
    aplicaDeduccionesLey: !!f.aplicaDeduccionesLey,
  };
}

export default function FuentesIngreso({ fuentes, entidades, movimientos, ingresosPuntuales }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [agregandoPuntualId, setAgregandoPuntualId] = useState(null);
  const [puntualTipo, setPuntualTipo] = useState(TIPOS_INGRESO_PUNTUAL[0]);
  const [puntualMonto, setPuntualMonto] = useState("");
  const [puntualFecha, setPuntualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [puntualNotas, setPuntualNotas] = useState("");
  const [puntualError, setPuntualError] = useState(null);
  const [puntualSaving, setPuntualSaving] = useState(false);
  const [recibiendoId, setRecibiendoId] = useState(null);

  const puntualesPorFuente = useMemo(() => {
    const map = {};
    for (const ip of ingresosPuntuales || []) {
      if (!map[ip.fuenteIngresoId]) map[ip.fuenteIngresoId] = [];
      map[ip.fuenteIngresoId].push(ip);
    }
    return map;
  }, [ingresosPuntuales]);

  const abrirAgregarPuntual = (fuenteId) => {
    setAgregandoPuntualId(fuenteId);
    setPuntualTipo(TIPOS_INGRESO_PUNTUAL[0]);
    setPuntualMonto("");
    setPuntualFecha(new Date().toISOString().slice(0, 10));
    setPuntualNotas("");
    setPuntualError(null);
  };

  const guardarPuntual = async (fuente) => {
    const montoNum = parseFloat(puntualMonto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setPuntualError("Ingresa un monto válido");
      return;
    }
    setPuntualSaving(true);
    setPuntualError(null);
    try {
      await addIngresoPuntual({
        fuenteIngresoId: fuente.id,
        fuenteIngresoNombre: fuente.nombre,
        tipo: puntualTipo,
        monto: montoNum,
        fecha: puntualFecha,
        notas: puntualNotas.trim(),
      });
      setAgregandoPuntualId(null);
    } catch (err) {
      setPuntualError(err.message || String(err));
    } finally {
      setPuntualSaving(false);
    }
  };

  const recibirPuntual = async (ip) => {
    if (!(await confirm(`¿Confirmar que recibiste ${ip.tipo} por ${formatMoney(ip.monto)}? Se registrará como ingreso y no se podrá revertir.`))) return;
    setRecibiendoId(ip.id);
    try {
      await marcarIngresoPuntualRecibido(ip.id, ip);
    } finally {
      setRecibiendoId(null);
    }
  };

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
        diasVacacionesAnuales: parseInt(form.diasVacacionesAnuales, 10) || null,
        aplicaDeduccionesLey: form.aplicaDeduccionesLey,
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
        diasVacacionesAnuales: parseInt(editForm.diasVacacionesAnuales, 10) || null,
        aplicaDeduccionesLey: editForm.aplicaDeduccionesLey,
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

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.aplicaDeduccionesLey}
                onChange={(e) => setForm({ ...form, aplicaDeduccionesLey: e.target.checked })}
              />
              Este ingreso tiene deducciones de ley (AFP, SFS, ISR) — el monto de arriba es bruto
            </label>
            {form.aplicaDeduccionesLey &&
              (() => {
                const monto = parseFloat(form.montoEsperado);
                if (!Number.isFinite(monto) || monto <= 0) return null;
                const factor = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 }[form.frecuencia] ?? 1;
                const bruto = monto * factor;
                const { afp, sfs, isr, neto } = calcularDeduccionesLey(bruto);
                const netoPorPago = factor > 0 ? neto / factor : neto;
                return (
                  <div style={{ fontSize: 11, color: "var(--sage)", marginTop: 6, lineHeight: 1.5 }}>
                    AFP: {formatMoney(afp / (factor || 1))} · SFS: {formatMoney(sfs / (factor || 1))} · ISR: {formatMoney(isr / (factor || 1))}
                    <br />
                    Neto estimado por pago: <strong>{formatMoney(netoPorPago)}</strong>
                  </div>
                );
              })()}
          </div>

          <input
            placeholder="Código de empleado (opcional)"
            value={form.codigoEmpleado}
            onChange={(e) => setForm({ ...form, codigoEmpleado: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />

          <input
            className="despensa-mono"
            type="number"
            min="0"
            placeholder="Días de vacaciones al año (opcional)"
            value={form.diasVacacionesAnuales}
            onChange={(e) => setForm({ ...form, diasVacacionesAnuales: e.target.value })}
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
            <div key={f.id} data-record-id={f.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
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
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editForm.aplicaDeduccionesLey}
                        onChange={(e) => setEditForm({ ...editForm, aplicaDeduccionesLey: e.target.checked })}
                      />
                      Este ingreso tiene deducciones de ley (AFP, SFS, ISR) — el monto de arriba es bruto
                    </label>
                    {editForm.aplicaDeduccionesLey &&
                      (() => {
                        const monto = parseFloat(editForm.montoEsperado);
                        if (!Number.isFinite(monto) || monto <= 0) return null;
                        const factor = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 }[editForm.frecuencia] ?? 1;
                        const bruto = monto * factor;
                        const { afp, sfs, isr, neto } = calcularDeduccionesLey(bruto);
                        const netoPorPago = factor > 0 ? neto / factor : neto;
                        return (
                          <div style={{ fontSize: 11, color: "var(--sage)", marginTop: 6, lineHeight: 1.5 }}>
                            AFP: {formatMoney(afp / (factor || 1))} · SFS: {formatMoney(sfs / (factor || 1))} · ISR: {formatMoney(isr / (factor || 1))}
                            <br />
                            Neto estimado por pago: <strong>{formatMoney(netoPorPago)}</strong>
                          </div>
                        );
                      })()}
                  </div>
                  <input
                    placeholder="Código de empleado (opcional)"
                    value={editForm.codigoEmpleado}
                    onChange={(e) => setEditForm({ ...editForm, codigoEmpleado: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                  />
                  <input
                    className="despensa-mono"
                    type="number"
                    min="0"
                    placeholder="Días de vacaciones al año (opcional)"
                    value={editForm.diasVacacionesAnuales}
                    onChange={(e) => setEditForm({ ...editForm, diasVacacionesAnuales: e.target.value })}
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
                        onClick={async () => {
                          if (await confirm("¿Eliminar esta fuente de ingreso?")) deleteFuenteIngreso(f.id);
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

                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 4 }}>
                        <Gift size={11} /> Ingresos puntuales
                      </span>
                      <button
                        onClick={() => (agregandoPuntualId === f.id ? setAgregandoPuntualId(null) : abrirAgregarPuntual(f.id))}
                        style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {agregandoPuntualId === f.id ? <X size={11} /> : <Plus size={11} />}
                        {agregandoPuntualId === f.id ? "Cancelar" : "Agregar"}
                      </button>
                    </div>

                    {agregandoPuntualId === f.id && (
                      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                        <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 6, marginBottom: 6 }}>
                          <select
                            value={puntualTipo}
                            onChange={(e) => setPuntualTipo(e.target.value)}
                            style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--card)" }}
                          >
                            {TIPOS_INGRESO_PUNTUAL.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <input
                            className="despensa-mono"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Monto"
                            value={puntualMonto}
                            onChange={(e) => setPuntualMonto(e.target.value)}
                            style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12 }}
                          />
                        </div>
                        <input
                          type="date"
                          value={puntualFecha}
                          onChange={(e) => setPuntualFecha(e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, marginBottom: 6 }}
                        />
                        <input
                          placeholder="Notas (opcional)"
                          value={puntualNotas}
                          onChange={(e) => setPuntualNotas(e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, marginBottom: 8 }}
                        />
                        <button
                          onClick={() => guardarPuntual(f)}
                          disabled={puntualSaving}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: puntualSaving ? "not-allowed" : "pointer" }}
                        >
                          <Check size={12} /> {puntualSaving ? "Guardando…" : "Guardar"}
                        </button>
                        {puntualError && <div style={{ marginTop: 6, fontSize: 11, color: "var(--stamp)" }}>{puntualError}</div>}
                      </div>
                    )}

                    {(puntualesPorFuente[f.id] || []).length === 0 ? (
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Sin ingresos puntuales registrados.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {puntualesPorFuente[f.id].map((ip) => (
                          <div
                            key={ip.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "6px 8px",
                              background: "var(--paper)",
                              borderRadius: 7,
                              opacity: ip.recibido ? 0.7 : 1,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>
                                {ip.tipo}
                                {ip.recibido && (
                                  <span className="despensa-mono" style={{ marginLeft: 5, fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 8, background: "var(--sage-bg)", color: "var(--sage)" }}>
                                    Recibido
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{formatDateDisplay(ip.fecha)}{ip.notas && ` · ${ip.notas}`}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <span className="despensa-mono" style={{ fontSize: 12.5, fontWeight: 600, color: ip.recibido ? "var(--sage)" : "var(--ink)" }}>
                                {formatMoney(ip.monto)}
                              </span>
                              {!ip.recibido && (
                                <>
                                  <button
                                    onClick={() => recibirPuntual(ip)}
                                    disabled={recibiendoId === ip.id}
                                    title="Marcar como recibido y registrar el ingreso"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--sage)", border: "none", borderRadius: 5, cursor: "pointer" }}
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (await confirm(`¿Eliminar este ingreso puntual (${ip.tipo})?`)) deleteIngresoPuntual(ip.id);
                                    }}
                                    title="Eliminar"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 5, cursor: "pointer" }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
