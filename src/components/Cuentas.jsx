import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Vault, Pencil, Check, ArrowUp, ArrowDown } from "lucide-react";
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
  orden: "",
  notas: "",
});

export default function Cuentas({ cuentas, entidades, movimientos = [], prestamos = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const cuentasOrdenadas = useMemo(() => ordenarCuentas(cuentas), [cuentas]);

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

  const reordenarDespuesDe = async (targetId, desiredOrden) => {
    if (!Number.isFinite(desiredOrden) || desiredOrden <= 0) return;
    const otros = cuentasOrdenadas.filter((c) => c.id !== targetId);
    const pos = Math.max(0, Math.min(desiredOrden - 1, otros.length));
    const reordenada = [...otros.slice(0, pos), { id: targetId }, ...otros.slice(pos)];
    const updates = [];
    reordenada.forEach((item, idx) => {
      if (item.id === targetId) return;
      const nuevoOrden = idx + 1;
      const tieneOrden = Number.isFinite(Number(item.orden)) && Number(item.orden) > 0;
      if ((idx < pos || tieneOrden) && Number(item.orden) !== nuevoOrden) {
        updates.push(updateCuenta(item.id, { orden: nuevoOrden }));
      }
    });
    if (updates.length > 0) await Promise.all(updates);
  };

  const moverCuenta = async (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= cuentasOrdenadas.length) return;
    const lista = [...cuentasOrdenadas];
    const [movida] = lista.splice(idx, 1);
    lista.splice(targetIdx, 0, movida);
    await Promise.all(
      lista.map((c, i) => {
        const nuevoOrden = i + 1;
        return Number(c.orden) === nuevoOrden ? Promise.resolve() : updateCuenta(c.id, { orden: nuevoOrden });
      })
    );
  };

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
      const ordenRaw = parseInt(form.orden, 10);
      const ordenVal = Number.isFinite(ordenRaw) && ordenRaw > 0 ? ordenRaw : null;
      if (ordenVal != null) {
        await Promise.all(
          cuentasOrdenadas
            .filter((c) => Number.isFinite(Number(c.orden)) && Number(c.orden) >= ordenVal)
            .map((c) => updateCuenta(c.id, { orden: Number(c.orden) + 1 }))
        );
      }
      await addCuenta({
        nombre,
        tipo: form.tipo,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        numeroCuenta: form.numeroCuenta.trim(),
        saldoInicial: Number.isFinite(saldo) ? saldo : null,
        orden: ordenVal,
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
      orden: c.orden != null && Number(c.orden) > 0 ? String(c.orden) : "",
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
      const ordenRaw = parseInt(editForm.orden, 10);
      const ordenVal = Number.isFinite(ordenRaw) && ordenRaw > 0 ? ordenRaw : null;
      await updateCuenta(editingId, {
        nombre,
        tipo: editForm.tipo,
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        numeroCuenta: editForm.numeroCuenta.trim(),
        saldoInicial: Number.isFinite(saldo) ? saldo : null,
        orden: ordenVal,
        notas: editForm.notas.trim(),
      });
      if (ordenVal != null) {
        await reordenarDespuesDe(editingId, ordenVal);
      }
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

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              placeholder="Saldo inicial (opcional)"
              value={form.saldoInicial}
              onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              className="despensa-mono"
              type="number"
              min="1"
              step="1"
              placeholder="Orden en Inicio (ej. 1)"
              title="Número de orden para mostrarse en Inicio (1 aparece primero)"
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: e.target.value })}
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
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {cuentasOrdenadas.map((c, i) => (
            <div
              key={c.id}
              data-record-id={c.id}
              className="despensa-row"
              style={{
                padding: "10px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              {editingId === c.id ? (
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
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      placeholder="Saldo inicial (opcional)"
                      value={editForm.saldoInicial}
                      onChange={(e) => setEditForm({ ...editForm, saldoInicial: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      className="despensa-mono"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Orden en Inicio (ej. 1)"
                      title="Número de orden para mostrarse en Inicio (1 aparece primero)"
                      value={editForm.orden}
                      onChange={(e) => setEditForm({ ...editForm, orden: e.target.value })}
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
                      {(c.orden != null && Number(c.orden) > 0) || i === 0 ? (
                        <span className="despensa-mono" style={{ fontSize: 11, color: i === 0 ? "var(--sage)" : "var(--ink-soft)", fontWeight: 600 }}>
                          #{c.orden != null && Number(c.orden) > 0 ? c.orden : i + 1}{i === 0 ? " · Principal en Inicio" : ""}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{c.tipo}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Landmark size={11} /> {c.entidadName}
                      </span>
                      {c.numeroCuenta && <span className="despensa-mono">{c.numeroCuenta}</span>}
                      {prestamosPorCuenta[c.id]?.length > 0 && (
                        <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 600 }}>
                          · Destino {prestamosPorCuenta[c.id].join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const desglose = saldosPorCuenta[c.id] || {
                      saldoInicial: Number(c.saldoInicial) || 0,
                      creditos: 0,
                      debitos: 0,
                      saldoDisponible: Number(c.saldoInicial) || 0,
                    };
                    const huboMovs = desglose.creditos > 0 || desglose.debitos > 0;
                    return (
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
                    );
                  })()}
                  {cuentasOrdenadas.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => moverCuenta(i, -1)}
                        disabled={i === 0}
                        title="Subir orden (mostrar antes en Inicio)"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 24,
                          height: 28,
                          background: "transparent",
                          color: i === 0 ? "var(--line)" : "var(--ink-soft)",
                          border: "none",
                          borderRadius: 6,
                          cursor: i === 0 ? "default" : "pointer",
                        }}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverCuenta(i, 1)}
                        disabled={i === cuentasOrdenadas.length - 1}
                        title="Bajar orden"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 24,
                          height: 28,
                          background: "transparent",
                          color: i === cuentasOrdenadas.length - 1 ? "var(--line)" : "var(--ink-soft)",
                          border: "none",
                          borderRadius: 6,
                          cursor: i === cuentasOrdenadas.length - 1 ? "default" : "pointer",
                        }}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  )}
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
          ))}
        </div>
      )}
    </div>
  );
}
