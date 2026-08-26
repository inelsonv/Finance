import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Target, PiggyBank, Percent, Landmark, Calendar } from "lucide-react";
import { addMetaAhorro, deleteMetaAhorro, updateMetaAhorroEstado, updateMetaAhorro } from "../lib/db";
import { confirm } from "../lib/confirm";

const TIPOS_META = ["Meta específica", "Porcentaje de ingreso"];
const ESTADOS = ["Activa", "Completada", "Pausada"];
const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };
const TIPOS_CUENTA_AHORRO = ["Ahorro", "Inversión", "Corretaje"];

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

const emptyForm = () => ({
  nombre: "",
  tipoMeta: TIPOS_META[0],
  cuentaId: "",
  montoObjetivo: "",
  porcentaje: "",
  fechaObjetivo: "",
  estado: "Activa",
  notas: "",
});

function toEditForm(m) {
  return {
    nombre: m.nombre || "",
    tipoMeta: m.tipoMeta || TIPOS_META[0],
    cuentaId: m.cuentaId || "",
    montoObjetivo: m.montoObjetivo != null ? String(m.montoObjetivo) : "",
    porcentaje: m.porcentaje != null ? String(m.porcentaje) : "",
    fechaObjetivo: m.fechaObjetivo || "",
    estado: m.estado || "Activa",
    notas: m.notas || "",
  };
}

export default function Ahorro({ metas, cuentas, movimientos, fuentesIngreso, onNavigate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const cuentasAhorro = useMemo(() => cuentas.filter((c) => TIPOS_CUENTA_AHORRO.includes(c.tipo)), [cuentas]);

  const ingresoMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentesIngreso || []) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
    }
    return total;
  }, [fuentesIngreso]);

  const aportadoPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentas) {
      let total = c.saldoInicial || 0;
      for (const mv of movimientos) {
        if (mv.cuentaId === c.id && mv.category === c.tipo) total += Number(mv.amount) || 0;
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const aportadoEsteMesPorCuenta = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const map = {};
    for (const c of cuentas) {
      let total = 0;
      for (const mv of movimientos) {
        if (mv.cuentaId === c.id && mv.category === c.tipo && (mv.date || "").startsWith(prefix)) {
          total += Number(mv.amount) || 0;
        }
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

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
      setFormError("Ingresa un nombre para la meta, ej. Fondo de emergencia");
      return;
    }
    if (form.tipoMeta === "Meta específica" && (!form.montoObjetivo || parseFloat(form.montoObjetivo) <= 0)) {
      setFormError("Ingresa el monto objetivo");
      return;
    }
    if (form.tipoMeta === "Porcentaje de ingreso" && (!form.porcentaje || parseFloat(form.porcentaje) <= 0)) {
      setFormError("Ingresa el porcentaje de tu ingreso");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const cuenta = cuentas.find((c) => c.id === form.cuentaId);
      await addMetaAhorro({
        nombre,
        tipoMeta: form.tipoMeta,
        cuentaId: form.cuentaId || null,
        cuentaNombre: cuenta ? cuenta.nombre : "",
        montoObjetivo: form.tipoMeta === "Meta específica" ? parseFloat(form.montoObjetivo) || null : null,
        porcentaje: form.tipoMeta === "Porcentaje de ingreso" ? parseFloat(form.porcentaje) || null : null,
        fechaObjetivo: form.fechaObjetivo || null,
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
      setEditError("Ingresa un nombre para la meta");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const cuenta = cuentas.find((c) => c.id === editForm.cuentaId);
      await updateMetaAhorro(editingId, {
        nombre,
        tipoMeta: editForm.tipoMeta,
        cuentaId: editForm.cuentaId || null,
        cuentaNombre: cuenta ? cuenta.nombre : "",
        montoObjetivo: editForm.tipoMeta === "Meta específica" ? parseFloat(editForm.montoObjetivo) || null : null,
        porcentaje: editForm.tipoMeta === "Porcentaje de ingreso" ? parseFloat(editForm.porcentaje) || null : null,
        fechaObjetivo: editForm.fechaObjetivo || null,
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
          placeholder="Nombre, ej. Fondo de emergencia"
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={f.tipoMeta}
          onChange={(e) => setF({ ...f, tipoMeta: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {TIPOS_META.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        {cuentasAhorro.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--stamp)", padding: "4px 0" }}>
            No tienes cuentas de Ahorro, Inversión o Corretaje registradas. Ve a la sección Cuentas para crear una
            y vincularla a esta meta.
          </div>
        ) : (
          <select
            value={f.cuentaId}
            onChange={(e) => setF({ ...f, cuentaId: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            <option value="">Vincular a una cuenta (opcional)…</option>
            {cuentasAhorro.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} · {c.tipo} · {c.entidadName}</option>
            ))}
          </select>
        )}
      </div>

      {f.tipoMeta === "Meta específica" ? (
        <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input
            className="despensa-mono"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto objetivo"
            value={f.montoObjetivo}
            onChange={(e) => setF({ ...f, montoObjetivo: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
          <input
            type="date"
            value={f.fechaObjetivo}
            onChange={(e) => setF({ ...f, fechaObjetivo: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            title="Fecha objetivo (opcional)"
          />
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <input
            className="despensa-mono"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Porcentaje de tu ingreso, ej. 10"
            value={f.porcentaje}
            onChange={(e) => setF({ ...f, porcentaje: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
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
          {isEdit ? <Check size={14} /> : <Plus size={14} />} {savingFlag ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar meta"}
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

  const cuentasSoloAhorro = useMemo(() => cuentas.filter((c) => c.tipo === "Ahorro"), [cuentas]);
  const totalAhorrado = useMemo(
    () => cuentasSoloAhorro.reduce((s, c) => s + (aportadoPorCuenta[c.id] || 0), 0),
    [cuentasSoloAhorro, aportadoPorCuenta]
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total en cuentas de ahorro</div>
          <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--sage)" }}>{formatMoney(totalAhorrado)}</div>
        </div>
        {ingresoMensual > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ingreso mensual configurado</div>
            <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(ingresoMensual)}</div>
          </div>
        )}
      </div>

      {cuentasSoloAhorro.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
            Tus cuentas de ahorro
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cuentasSoloAhorro.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
                <Landmark size={13} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>{c.nombre} <span style={{ color: "var(--ink-soft)" }}>· {c.entidadName}</span></span>
                <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--sage)", flexShrink: 0 }}>{formatMoney(aportadoPorCuenta[c.id] || 0)}</span>
              </div>
            ))}
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("cuentas")}
              style={{ fontSize: 11.5, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 0 0" }}
            >
              + Agregar o editar cuentas de ahorro
            </button>
          )}
        </div>
      )}

      <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
        Metas y planes de ahorro
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => {
            if (!showForm) setForm(emptyForm());
            setShowForm((s) => !s);
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nueva meta de ahorro"}
        </button>
      </div>

      {showForm && renderForm(form, setForm, handleAdd, saving, formError, null, false)}

      {metas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no tienes metas de ahorro. Crea una meta específica (ej. Fondo de emergencia) o un plan de
          ahorro por porcentaje de tu ingreso.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metas.map((m) => {
            const isEditing = editingId === m.id;
            if (isEditing) {
              return <div key={m.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
            }

            const cuenta = cuentas.find((c) => c.id === m.cuentaId);
            const esPorcentaje = m.tipoMeta === "Porcentaje de ingreso";
            const Icon = esPorcentaje ? Percent : Target;

            let contenido;
            if (esPorcentaje) {
              const sugerido = ingresoMensual * ((m.porcentaje || 0) / 100);
              const aportadoEsteMes = cuenta ? aportadoEsteMesPorCuenta[cuenta.id] || 0 : 0;
              const pct = sugerido > 0 ? Math.min(100, Math.round((aportadoEsteMes / sugerido) * 100)) : 0;
              const alDia = sugerido > 0 && aportadoEsteMes >= sugerido;
              contenido = (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                    <Field label={`${m.porcentaje}% de tu ingreso`} value={sugerido > 0 ? formatMoney(sugerido) + "/mes" : "Configura tu ingreso"} />
                    <Field label="Aportado este mes" value={<span style={{ color: alDia ? "var(--sage)" : "var(--stamp)" }}>{formatMoney(aportadoEsteMes)}</span>} />
                  </div>
                  {sugerido > 0 && (
                    <>
                      <div style={{ height: 6, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: alDia ? "var(--sage)" : "var(--amber)", borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 11, color: alDia ? "var(--sage)" : "var(--ink-soft)" }}>
                        {alDia ? "Vas al día este mes" : `Te falta ${formatMoney(Math.max(sugerido - aportadoEsteMes, 0))} este mes`}
                      </div>
                    </>
                  )}
                </>
              );
            } else {
              const aportado = cuenta ? aportadoPorCuenta[cuenta.id] || 0 : 0;
              const objetivo = m.montoObjetivo || 0;
              const pct = objetivo > 0 ? Math.min(100, Math.round((aportado / objetivo) * 100)) : 0;
              const completada = objetivo > 0 && aportado >= objetivo;
              contenido = (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                    <Field label="Aportado" value={<span style={{ color: "var(--sage)" }}>{formatMoney(aportado)}</span>} />
                    <Field label="Objetivo" value={formatMoney(objetivo)} />
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: completada ? "var(--sage)" : "var(--sage)", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {pct}% completado
                    {m.fechaObjetivo && <> · meta para {formatDateDisplay(m.fechaObjetivo)}</>}
                  </div>
                </>
              );
            }

            return (
              <div key={m.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{m.nombre}</span>
                        <EstadoBadge estado={m.estado} onChange={(estado) => updateMetaAhorroEstado(m.id, estado)} />
                      </div>
                      {cuenta && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <Landmark size={11} /> {cuenta.nombre} · {cuenta.entidadName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(m)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await confirm("¿Eliminar esta meta de ahorro?")) deleteMetaAhorro(m.id);
                      }}
                      title="Eliminar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {contenido}

                {m.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>{m.notas}</div>}
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
    Activa: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Completada: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Pausada: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  };
  const c = colors[estado] || colors.Activa;
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
