import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Car, Home, Laptop, Package2, Wrench, Calendar, DollarSign, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { addActivo, deleteActivo, updateActivoEstado, updateActivo, addMantenimiento, deleteMantenimiento } from "../lib/db";
import { confirm } from "../lib/confirm";

const TIPOS = ["Vehículo", "Propiedad", "Electrodoméstico", "Equipo electrónico", "Otro"];
const ESTADOS = ["Activo", "Vendido", "Dado de baja"];
const TIPOS_MANTENIMIENTO = ["Cambio de aceite", "Frenos", "Llantas/Neumáticos", "Revisión general", "Reparación", "Otro"];

const TIPO_ICONS = {
  Vehículo: Car,
  Propiedad: Home,
  Electrodoméstico: Laptop,
  "Equipo electrónico": Laptop,
  Otro: Package2,
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

// Barra de vigencia de un seguro: 100% justo cuando empieza la póliza, baja
// linealmente hasta 0% en la fecha de vencimiento. El color cambia según
// cuánto quede: verde con tranquilidad, ámbar cerca del vencimiento, rojo
// si ya venció.
function SeguroVigenciaBar({ seguro }) {
  if (!seguro?.fechaVencimiento) return null;

  const inicio = seguro.fechaInicio ? new Date(seguro.fechaInicio + "T00:00:00") : null;
  const fin = new Date(seguro.fechaVencimiento + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diasRestantes = diasHasta(seguro.fechaVencimiento);
  let pct;
  if (!inicio || inicio >= fin) {
    // Sin fecha de inicio válida: solo se sabe cuánto falta, no el total
    // de la vigencia — se muestra 100% si falta más de un año, escalando
    // desde ahí hasta 0%.
    pct = Math.max(0, Math.min(100, (diasRestantes / 365) * 100));
  } else {
    const totalDias = (fin - inicio) / 86400000;
    const transcurridos = (hoy - inicio) / 86400000;
    pct = Math.max(0, Math.min(100, 100 - (transcurridos / totalDias) * 100));
  }

  const color = diasRestantes < 0 ? "var(--stamp)" : diasRestantes <= 30 ? "#d9a441" : "var(--sage)";
  const etiqueta =
    diasRestantes < 0
      ? `Vencido hace ${Math.abs(diasRestantes)}d`
      : diasRestantes === 0
      ? "Vence hoy"
      : `${diasRestantes}d de cobertura restante`;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
          <ShieldCheck size={11} /> {seguro.entidadName || seguro.tipo || "Seguro"}
        </span>
        <span className="despensa-mono" style={{ fontSize: 10.5, fontWeight: 600, color }}>
          {etiqueta}
        </span>
      </div>
      <div style={{ width: "100%", height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

const emptyForm = () => ({
  nombre: "",
  tipo: TIPOS[0],
  marca: "",
  modelo: "",
  anio: "",
  identificador: "",
  fechaCompra: "",
  valorCompra: "",
  proximoMantenimiento: "",
  estado: "Activo",
  notas: "",
});

function toEditForm(a) {
  return {
    nombre: a.nombre || "",
    tipo: a.tipo || TIPOS[0],
    marca: a.marca || "",
    modelo: a.modelo || "",
    anio: a.anio != null ? String(a.anio) : "",
    identificador: a.identificador || "",
    fechaCompra: a.fechaCompra || "",
    valorCompra: a.valorCompra != null ? String(a.valorCompra) : "",
    proximoMantenimiento: a.proximoMantenimiento || "",
    estado: a.estado || "Activo",
    notas: a.notas || "",
  };
}

const emptyMantForm = () => ({
  fecha: todayStr(),
  tipo: TIPOS_MANTENIMIENTO[0],
  costo: "",
  kilometraje: "",
  notas: "",
});

export default function Activos({ activos, mantenimientos, seguros }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);
  const [mantForm, setMantForm] = useState(emptyMantForm);
  const [mantSaving, setMantSaving] = useState(false);
  const [mantError, setMantError] = useState(null);

  const mantenimientosPorActivo = useMemo(() => {
    const map = {};
    for (const m of mantenimientos) {
      if (!m.activoId) continue;
      if (!map[m.activoId]) map[m.activoId] = [];
      map[m.activoId].push(m);
    }
    return map;
  }, [mantenimientos]);

  // Para cada activo, el seguro vigente más relevante (el que vence más
  // adelante, si tiene varios registrados) — para mostrar su vigencia con
  // una barra de progreso decreciente.
  const seguroPorActivo = useMemo(() => {
    const map = {};
    for (const s of seguros || []) {
      if (!s.activoId || !s.fechaVencimiento) continue;
      const actual = map[s.activoId];
      if (!actual || s.fechaVencimiento > actual.fechaVencimiento) map[s.activoId] = s;
    }
    return map;
  }, [seguros]);

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm(toEditForm(a));
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
      setFormError("Ingresa un nombre, ej. Honda CR-V 2014");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await addActivo({
        nombre,
        tipo: form.tipo,
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: parseInt(form.anio, 10) || null,
        identificador: form.identificador.trim(),
        fechaCompra: form.fechaCompra || null,
        valorCompra: parseFloat(form.valorCompra) || null,
        proximoMantenimiento: form.proximoMantenimiento || null,
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
    const nombre = editForm.nombre.trim();
    if (!nombre) {
      setEditError("Ingresa un nombre para el activo");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateActivo(editingId, {
        nombre,
        tipo: editForm.tipo,
        marca: editForm.marca.trim(),
        modelo: editForm.modelo.trim(),
        anio: parseInt(editForm.anio, 10) || null,
        identificador: editForm.identificador.trim(),
        fechaCompra: editForm.fechaCompra || null,
        valorCompra: parseFloat(editForm.valorCompra) || null,
        proximoMantenimiento: editForm.proximoMantenimiento || null,
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

  const abrirMantenimiento = (activoId) => {
    setExpandidoId(expandidoId === activoId ? null : activoId);
    setMantForm(emptyMantForm());
    setMantError(null);
  };

  const guardarMantenimiento = async (activo) => {
    setMantSaving(true);
    setMantError(null);
    try {
      await addMantenimiento({
        activoId: activo.id,
        activoNombre: activo.nombre,
        fecha: mantForm.fecha,
        tipo: mantForm.tipo,
        costo: parseFloat(mantForm.costo) || null,
        kilometraje: parseInt(mantForm.kilometraje, 10) || null,
        notas: mantForm.notas.trim(),
      });
      setMantForm(emptyMantForm());
    } catch (err) {
      setMantError(err.message || String(err));
    } finally {
      setMantSaving(false);
    }
  };

  return (
    <div>
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
          {showForm ? "Cancelar" : "Agregar activo"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Honda CR-V 2014"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Marca (opcional)"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Modelo (opcional)"
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              className="despensa-mono"
              type="number"
              placeholder="Año"
              value={form.anio}
              onChange={(e) => setForm({ ...form, anio: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Placa / No. de serie (opcional)"
              value={form.identificador}
              onChange={(e) => setForm({ ...form, identificador: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              placeholder="Valor de compra (opcional)"
              value={form.valorCompra}
              onChange={(e) => setForm({ ...form, valorCompra: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={form.fechaCompra}
              onChange={(e) => setForm({ ...form, fechaCompra: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              title="Fecha de compra"
            />
            <input
              type="date"
              value={form.proximoMantenimiento}
              onChange={(e) => setForm({ ...form, proximoMantenimiento: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              title="Próximo mantenimiento"
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
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />

          <button
            onClick={handleAdd}
            disabled={saving}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Guardando…" : "Guardar activo"}
          </button>
          {formError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>}
        </div>
      )}

      {activos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ningún activo. Agrega tu vehículo, propiedad, o cualquier pertenencia que
          quieras llevar seguimiento de mantenimiento.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activos.map((a) => {
            const Icon = TIPO_ICONS[a.tipo] || Package2;
            const isEditing = editingId === a.id;
            const historial = mantenimientosPorActivo[a.id] || [];
            const seguroActivo = seguroPorActivo[a.id];
            const totalMantenimiento = historial.reduce((s, m) => s + (Number(m.costo) || 0), 0);
            const diasProximo = diasHasta(a.proximoMantenimiento);
            const expandido = expandidoId === a.id;

            if (isEditing) {
              return (
                <div key={a.id} style={{ background: "var(--card)", border: "1px solid var(--stamp)", borderRadius: 10, padding: 14 }}>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Marca"
                      value={editForm.marca}
                      onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      placeholder="Modelo"
                      value={editForm.modelo}
                      onChange={(e) => setEditForm({ ...editForm, modelo: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      className="despensa-mono"
                      type="number"
                      placeholder="Año"
                      value={editForm.anio}
                      onChange={(e) => setEditForm({ ...editForm, anio: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Placa / No. de serie"
                      value={editForm.identificador}
                      onChange={(e) => setEditForm({ ...editForm, identificador: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      placeholder="Valor de compra"
                      value={editForm.valorCompra}
                      onChange={(e) => setEditForm({ ...editForm, valorCompra: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      type="date"
                      value={editForm.fechaCompra}
                      onChange={(e) => setEditForm({ ...editForm, fechaCompra: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      title="Fecha de compra"
                    />
                    <input
                      type="date"
                      value={editForm.proximoMantenimiento}
                      onChange={(e) => setEditForm({ ...editForm, proximoMantenimiento: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      title="Próximo mantenimiento"
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
              );
            }

            return (
              <div key={a.id} data-record-id={a.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{a.nombre}</span>
                        <EstadoBadge estado={a.estado} onChange={(estado) => updateActivoEstado(a.id, estado)} />
                        {diasProximo != null && a.estado === "Activo" && (
                          <span
                            className="despensa-mono"
                            style={{
                              fontSize: 9.5,
                              fontWeight: 600,
                              padding: "1px 7px",
                              borderRadius: 12,
                              background: diasProximo <= 7 ? "var(--stamp-bg)" : "var(--line-soft)",
                              color: diasProximo <= 7 ? "var(--stamp)" : "var(--ink-soft)",
                            }}
                          >
                            {diasProximo < 0 ? "Mantenimiento vencido" : diasProximo === 0 ? "Mantenimiento hoy" : `Mantenimiento en ${diasProximo}d`}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                        {a.tipo}
                        {a.marca && <> · {a.marca}</>}
                        {a.modelo && <> {a.modelo}</>}
                        {a.anio && <> · {a.anio}</>}
                        {a.identificador && <> · {a.identificador}</>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(a)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm("¿Eliminar este activo? Se perderá su información y su historial de mantenimiento seguirá guardado por separado.")) deleteActivo(a.id);
                      }}
                      title="Eliminar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                  <Field label="Valor de compra" value={a.valorCompra != null ? formatMoney(a.valorCompra) : "—"} />
                  <Field label="Fecha de compra" value={a.fechaCompra ? formatDateDisplay(a.fechaCompra) : "—"} />
                  <Field label="Próx. mantenimiento" value={a.proximoMantenimiento ? formatDateDisplay(a.proximoMantenimiento) : "—"} />
                  <Field label="Gastado en mantenimiento" value={<span style={{ color: totalMantenimiento > 0 ? "var(--stamp)" : "var(--ink)" }}>{formatMoney(totalMantenimiento)}</span>} />
                </div>

                {seguroActivo && <SeguroVigenciaBar seguro={seguroActivo} />}

                {a.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8 }}>{a.notas}</div>}

                <button
                  onClick={() => abrirMantenimiento(a.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                    fontSize: 12,
                    color: "var(--sage)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Wrench size={12} />
                  Mantenimiento ({historial.length})
                  {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {expandido && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
                    <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 6, marginBottom: 6 }}>
                      <input
                        type="date"
                        value={mantForm.fecha}
                        onChange={(e) => setMantForm({ ...mantForm, fecha: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                      />
                      <select
                        value={mantForm.tipo}
                        onChange={(e) => setMantForm({ ...mantForm, tipo: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--card)" }}
                      >
                        {TIPOS_MANTENIMIENTO.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        placeholder="Costo (opcional)"
                        value={mantForm.costo}
                        onChange={(e) => setMantForm({ ...mantForm, costo: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                      />
                      <input
                        className="despensa-mono"
                        type="number"
                        placeholder="Kilometraje (opcional)"
                        value={mantForm.kilometraje}
                        onChange={(e) => setMantForm({ ...mantForm, kilometraje: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                      />
                    </div>
                    <input
                      placeholder="Notas (opcional)"
                      value={mantForm.notas}
                      onChange={(e) => setMantForm({ ...mantForm, notas: e.target.value })}
                      style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, marginBottom: 8 }}
                    />
                    <button
                      onClick={() => guardarMantenimiento(a)}
                      disabled={mantSaving}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: mantSaving ? "not-allowed" : "pointer", marginBottom: 10 }}
                    >
                      <Plus size={12} /> {mantSaving ? "Guardando…" : "Registrar mantenimiento"}
                    </button>
                    {mantError && <div style={{ fontSize: 11.5, color: "var(--stamp)", marginBottom: 8 }}>{mantError}</div>}

                    {historial.length === 0 ? (
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Sin registros de mantenimiento todavía.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {historial.map((m) => (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", borderRadius: 7, padding: "6px 9px" }}>
                            <Calendar size={11} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: "var(--ink-soft)", flexShrink: 0 }}>{formatDateDisplay(m.fecha)}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, flex: 1, minWidth: 0 }}>{m.tipo}</span>
                            {m.kilometraje != null && (
                              <span className="despensa-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", flexShrink: 0 }}>{m.kilometraje} km</span>
                            )}
                            {m.costo != null && (
                              <span className="despensa-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--stamp)", flexShrink: 0 }}>{formatMoney(m.costo)}</span>
                            )}
                            <button
                              onClick={async () => {
                                if (await confirm("¿Eliminar este registro de mantenimiento?")) deleteMantenimiento(m.id);
                              }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer", flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
    Vendido: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
    "Dado de baja": { bg: "var(--stamp-bg)", color: "var(--stamp)" },
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
