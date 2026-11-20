import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Vault, Pencil, Check, GripVertical } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addCuenta, deleteCuenta, updateCuenta } from "../lib/db";
import { confirm } from "../lib/confirm";
import { calcularSaldosCuentas, prestamoApuntaACuenta, ordenarCuentas } from "../lib/cuentasSaldo";

export const CUENTA_TIPOS = ["Ahorro", "Corriente", "Inversión", "Corretaje", "Otro"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = () => ({
  nombre: "",
  tipo: CUENTA_TIPOS[0],
  entidadId: "",
  numeroCuenta: "",
  saldoInicial: "",
  notas: "",
});

function SortableCuentaRow({
  c,
  index,
  isFirst,
  showDragHandle,
  isEditing,
  editForm,
  setEditForm,
  entidades,
  saveEdit,
  cancelEdit,
  editSaving,
  editError,
  startEdit,
  desglose,
  prestamosVinculados,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: c.id, disabled: isEditing || !showDragHandle });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px 12px",
    borderTop: isFirst ? "none" : "1px solid var(--line-soft)",
    background: isDragging ? "var(--paper)" : "var(--card)",
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(0, 0, 0, 0.22)" : "none",
    position: "relative",
    zIndex: isDragging ? 20 : 1,
  };

  const huboMovs = desglose.creditos > 0 || desglose.debitos > 0;

  return (
    <div
      ref={setNodeRef}
      data-record-id={c.id}
      className="despensa-row"
      style={style}
    >
      {isEditing ? (
        <div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={editForm.tipo}
              onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {CUENTA_TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={editForm.entidadId}
              onChange={(e) => setEditForm({ ...editForm, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
            <input
              placeholder="No. de cuenta (opcional)"
              value={editForm.numeroCuenta}
              onChange={(e) => setEditForm({ ...editForm, numeroCuenta: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              placeholder="Saldo inicial (opcional)"
              value={editForm.saldoInicial}
              onChange={(e) => setEditForm({ ...editForm, saldoInicial: e.target.value })}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showDragHandle && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              title="Arrastrar para cambiar el orden (la primera se muestra en Inicio)"
              aria-label={`Arrastrar cuenta ${c.nombre}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 32,
                padding: 0,
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
                flexShrink: 0,
              }}
            >
              <GripVertical size={16} />
            </button>
          )}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--sage-bg)",
              color: "var(--sage)",
            }}
          >
            <Vault size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{c.nombre}</span>
              {index === 0 && (
                <span className="despensa-mono" style={{ fontSize: 11, color: "var(--sage)", fontWeight: 600 }}>
                  #1 · Principal en Inicio
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span>{c.tipo}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Landmark size={11} /> {c.entidadName}
              </span>
              {c.numeroCuenta && <span className="despensa-mono">{c.numeroCuenta}</span>}
              {prestamosVinculados.length > 0 && (
                <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  · Destino {prestamosVinculados.join(", ")}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Disponible
            </div>
            <div
              className="despensa-mono"
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: desglose.saldoDisponible > 0 ? "var(--sage)" : desglose.saldoDisponible < 0 ? "var(--stamp)" : "var(--ink-soft)",
              }}
            >
              {formatMoney(desglose.saldoDisponible)}
            </div>
            {huboMovs && (
              <div className="despensa-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                {desglose.creditos > 0 ? `+${formatMoney(desglose.creditos)}` : ""}
                {desglose.creditos > 0 && desglose.debitos > 0 ? " · " : ""}
                {desglose.debitos > 0 ? `-${formatMoney(desglose.debitos)}` : ""}
              </div>
            )}
          </div>
          <button
            onClick={() => startEdit(c)}
            title="Editar cuenta"
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
              flexShrink: 0,
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={async () => {
              if (await confirm("¿Eliminar esta cuenta?")) deleteCuenta(c.id);
            }}
            title="Eliminar cuenta"
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
              flexShrink: 0,
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Cuentas({ cuentas, entidades, movimientos = [], prestamos = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [ordenOptimistaIds, setOrdenOptimistaIds] = useState(null);

  const cuentasBaseOrdenadas = useMemo(() => ordenarCuentas(cuentas), [cuentas]);

  useEffect(() => {
    if (!ordenOptimistaIds) return;
    const actualIds = cuentasBaseOrdenadas.map((c) => c.id);
    if (
      actualIds.length === ordenOptimistaIds.length &&
      actualIds.every((id, idx) => id === ordenOptimistaIds[idx])
    ) {
      setOrdenOptimistaIds(null);
    }
  }, [cuentasBaseOrdenadas, ordenOptimistaIds]);

  const cuentasOrdenadas = useMemo(() => {
    if (!ordenOptimistaIds) return cuentasBaseOrdenadas;
    const porId = new Map(cuentasBaseOrdenadas.map((c) => [c.id, c]));
    const resultado = [];
    for (const id of ordenOptimistaIds) {
      const c = porId.get(id);
      if (c) {
        resultado.push(c);
        porId.delete(id);
      }
    }
    for (const rest of porId.values()) {
      resultado.push(rest);
    }
    return resultado;
  }, [cuentasBaseOrdenadas, ordenOptimistaIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cuentasOrdenadas.findIndex((c) => c.id === active.id);
    const newIndex = cuentasOrdenadas.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordenadas = arrayMove(cuentasOrdenadas, oldIndex, newIndex);
    setOrdenOptimistaIds(reordenadas.map((c) => c.id));
    try {
      await Promise.all(
        reordenadas.map((c, idx) => {
          const nuevoOrden = idx + 1;
          return Number(c.orden) === nuevoOrden
            ? Promise.resolve()
            : updateCuenta(c.id, { orden: nuevoOrden });
        })
      );
    } catch (err) {
      console.error("No se pudo guardar el orden de cuentas:", err);
      setOrdenOptimistaIds(null);
    }
  };

  const saldosPorCuenta = useMemo(
    () => calcularSaldosCuentas(cuentasOrdenadas, movimientos, prestamos),
    [cuentasOrdenadas, movimientos, prestamos]
  );

  const totalDisponible = useMemo(
    () => cuentasOrdenadas.reduce((s, c) => s + (saldosPorCuenta[c.id]?.saldoDisponible || 0), 0),
    [cuentasOrdenadas, saldosPorCuenta]
  );

  const prestamosPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentasOrdenadas) {
      const vinculados = [];
      for (const p of prestamos || []) {
        if (!p || p.estado === "Pagado") continue;
        if (p.cuentaDestinoId === c.id || prestamoApuntaACuenta(p, c)) {
          vinculados.push(p.numero || "Préstamo");
        }
      }
      if (vinculados.length > 0) {
        map[c.id] = vinculados;
      }
    }
    return map;
  }, [cuentasOrdenadas, prestamos]);

  const porTipo = useMemo(() => {
    const map = {};
    for (const c of cuentasOrdenadas) {
      map[c.tipo] = (map[c.tipo] || 0) + 1;
    }
    return map;
  }, [cuentasOrdenadas]);

  const handleAdd = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      setFormError("Ingresa un nombre para la cuenta");
      return;
    }
    if (!form.entidadId) {
      setFormError("Selecciona la entidad de la cuenta");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const saldo = parseFloat(form.saldoInicial);
      const maxOrden = cuentasOrdenadas.reduce((max, c, idx) => {
        const val = Number.isFinite(Number(c.orden)) && Number(c.orden) > 0 ? Number(c.orden) : idx + 1;
        return Math.max(max, val);
      }, 0);
      await addCuenta({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        numeroCuenta: form.numeroCuenta.trim(),
        saldoInicial: Number.isFinite(saldo) ? saldo : null,
        orden: maxOrden + 1,
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

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      nombre: c.nombre || "",
      tipo: c.tipo || CUENTA_TIPOS[0],
      entidadId: c.entidadId || "",
      numeroCuenta: c.numeroCuenta || "",
      saldoInicial: c.saldoInicial != null ? String(c.saldoInicial) : "",
      notas: c.notas || "",
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    const nombre = editForm.nombre.trim();
    if (!nombre) {
      setEditError("Ingresa un nombre para la cuenta");
      return;
    }
    if (!editForm.entidadId) {
      setEditError("Selecciona la entidad de la cuenta");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      const saldo = parseFloat(editForm.saldoInicial);
      await updateCuenta(editingId, {
        nombre,
        tipo: editForm.tipo,
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        numeroCuenta: editForm.numeroCuenta.trim(),
        saldoInicial: Number.isFinite(saldo) ? saldo : null,
        notas: editForm.notas.trim(),
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
      {cuentas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>
            <span style={{ color: "var(--ink-soft)" }}>Disponible total: </span>
            <span className="despensa-mono" style={{ fontWeight: 700, color: totalDisponible >= 0 ? "var(--sage)" : "var(--stamp)" }}>
              {formatMoney(totalDisponible)}
            </span>
          </div>
          {CUENTA_TIPOS.filter((t) => porTipo[t]).map((t) => (
            <div key={t} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>
              <span style={{ color: "var(--ink-soft)" }}>{t}: </span>
              <span className="despensa-mono" style={{ fontWeight: 500 }}>{porTipo[t]}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {cuentasOrdenadas.length > 1 ? (
          <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}>
            <GripVertical size={13} />
            <span>Arrastra las cuentas para ordenar — la primera (#1) se muestra al frente en Inicio</span>
          </div>
        ) : (
          <div />
        )}
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
          {showForm ? "Cancelar" : "Agregar cuenta"}
        </button>
      </div>

      {entidades.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Primero registra al menos una entidad (banco, correduría, etc.) en la sección Entidades.
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Cuenta de ahorro"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {CUENTA_TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
            <input
              placeholder="No. de cuenta (opcional)"
              value={form.numeroCuenta}
              onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              placeholder="Saldo inicial (opcional)"
              value={form.saldoInicial}
              onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <input
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
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
            {saving ? "Guardando…" : "Guardar cuenta"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {cuentasOrdenadas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ninguna cuenta.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cuentasOrdenadas.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
              {cuentasOrdenadas.map((c, i) => (
                <SortableCuentaRow
                  key={c.id}
                  c={c}
                  index={i}
                  isFirst={i === 0}
                  showDragHandle={cuentasOrdenadas.length > 1}
                  isEditing={editingId === c.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  entidades={entidades}
                  saveEdit={saveEdit}
                  cancelEdit={cancelEdit}
                  editSaving={editSaving}
                  editError={editError}
                  startEdit={startEdit}
                  desglose={saldosPorCuenta[c.id] || {
                    saldoInicial: Number(c.saldoInicial) || 0,
                    creditos: 0,
                    debitos: 0,
                    saldoDisponible: Number(c.saldoInicial) || 0,
                  }}
                  prestamosVinculados={prestamosPorCuenta[c.id] || []}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

