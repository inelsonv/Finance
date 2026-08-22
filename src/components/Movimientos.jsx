import React, { useState } from "react";
import { Plus, Trash2, X, TrendingUp, TrendingDown, Landmark, PiggyBank, CreditCard } from "lucide-react";
import { addMovimiento, deleteMovimiento } from "../lib/db";
import { CUENTA_TIPOS } from "./Cuentas.jsx";

const INGRESO_CATS = ["Salario", "Negocio propio", "Otro ingreso"];
const GASTO_CATS = ["Vivienda", "Alimentación", "Transporte", "Servicios", "Entretenimiento", "Salud", "Otro"];
const CUENTA_MOVIMIENTO_TIPOS = CUENTA_TIPOS.filter((t) => t !== "Otro");
const TIPOS = ["Ingreso", "Gasto", "Pago de préstamo", "Pago de tarjeta", ...CUENTA_MOVIMIENTO_TIPOS];

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

const emptyForm = () => ({
  tipo: "Ingreso",
  category: INGRESO_CATS[0],
  amount: "",
  description: "",
  date: todayStr(),
  entidadId: "",
  prestamoId: "",
  cuentaId: "",
  tarjetaId: "",
});

export default function Movimientos({ movimientos, entidades, prestamos, cuentas, tarjetas }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const prestamosActivos = prestamos.filter((p) => p.estado === "Activo");
  const tarjetasActivas = tarjetas.filter((t) => t.estado === "Activa");
  const isCuentaTipo = CUENTA_MOVIMIENTO_TIPOS.includes(form.tipo);
  const cuentasDelTipo = cuentas.filter((c) => c.tipo === form.tipo);
  const selectedCuenta = cuentas.find((c) => c.id === form.cuentaId);
  const selectedTarjeta = tarjetas.find((t) => t.id === form.tarjetaId);

  const setTipo = (tipo) => {
    setForm({
      ...emptyForm(),
      tipo,
      category: tipo === "Ingreso" ? INGRESO_CATS[0] : tipo === "Gasto" ? GASTO_CATS[0] : tipo,
    });
  };

  const selectedPrestamo = prestamos.find((p) => p.id === form.prestamoId);

  const handleSelectPrestamo = (prestamoId) => {
    const p = prestamos.find((x) => x.id === prestamoId);
    setForm({
      ...form,
      prestamoId,
      amount: p && p.cuota != null ? String(p.cuota) : form.amount,
    });
  };

  const handleSelectTarjeta = (tarjetaId) => {
    const t = tarjetas.find((x) => x.id === tarjetaId);
    setForm({
      ...form,
      tarjetaId,
      amount: t && t.pagoMinimo != null ? String(t.pagoMinimo) : form.amount,
    });
  };

  const handleAdd = async () => {
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Ingresa un monto válido, mayor a 0");
      return;
    }
    if (form.tipo === "Pago de préstamo" && !form.prestamoId) {
      setFormError("Selecciona el préstamo que estás pagando");
      return;
    }
    if (form.tipo === "Pago de tarjeta" && !form.tarjetaId) {
      setFormError("Selecciona la tarjeta que estás pagando");
      return;
    }
    if (isCuentaTipo && !form.cuentaId) {
      setFormError(`Selecciona la cuenta de ${form.tipo.toLowerCase()}`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const prestamo = prestamos.find((p) => p.id === form.prestamoId);
      const tarjeta = tarjetas.find((t) => t.id === form.tarjetaId);
      const cuenta = cuentas.find((c) => c.id === form.cuentaId);
      await addMovimiento({
        type: form.tipo === "Ingreso" ? "Ingreso" : "Gasto",
        category: form.tipo === "Pago de préstamo" || form.tipo === "Pago de tarjeta" || isCuentaTipo ? form.tipo : form.category,
        amount,
        description: form.description.trim(),
        date: form.date,
        entidadId:
          form.tipo === "Pago de préstamo"
            ? prestamo?.entidadId || ""
            : form.tipo === "Pago de tarjeta"
            ? tarjeta?.entidadId || ""
            : isCuentaTipo
            ? cuenta?.entidadId || ""
            : form.entidadId || null,
        entidadName:
          form.tipo === "Pago de préstamo"
            ? prestamo?.entidadName || ""
            : form.tipo === "Pago de tarjeta"
            ? tarjeta?.entidadName || ""
            : isCuentaTipo
            ? cuenta?.entidadName || ""
            : entidad
            ? entidad.name
            : "",
        prestamoId: form.tipo === "Pago de préstamo" ? form.prestamoId : null,
        prestamoNumero: form.tipo === "Pago de préstamo" ? prestamo?.numero || "" : "",
        cuentaId: isCuentaTipo ? form.cuentaId : null,
        cuentaNombre: isCuentaTipo ? cuenta?.nombre || "" : "",
        tarjetaId: form.tipo === "Pago de tarjeta" ? form.tarjetaId : null,
        tarjetaNombre: form.tipo === "Pago de tarjeta" ? tarjeta?.nombre || "" : "",
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
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
          {showForm ? "Cancelar" : "Agregar movimiento"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                style={{
                  flex: "1 1 auto",
                  minWidth: 90,
                  padding: "8px 6px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: form.tipo === t ? "var(--sage-bg)" : "var(--card)",
                  color: form.tipo === t ? "var(--sage)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {form.tipo === "Pago de préstamo" ? (
            <div style={{ marginBottom: 8 }}>
              {prestamosActivos.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                  No tienes préstamos activos. Registra uno en la sección Préstamos primero.
                </div>
              ) : (
                <>
                  <select
                    value={form.prestamoId}
                    onChange={(e) => handleSelectPrestamo(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Selecciona el préstamo…</option>
                    {prestamosActivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero} · {p.entidadName} · {formatMoney(p.montoAprobado)}
                      </option>
                    ))}
                  </select>
                  {selectedPrestamo && selectedPrestamo.cuota != null && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Cuota registrada: <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 500 }}>{formatMoney(selectedPrestamo.cuota)}</span> (ya la pre-llenamos en el monto, puedes ajustarla)
                    </div>
                  )}
                </>
              )}
            </div>
          ) : form.tipo === "Pago de tarjeta" ? (
            <div style={{ marginBottom: 8 }}>
              {tarjetasActivas.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                  No tienes tarjetas activas. Registra una en la sección Tarjetas primero.
                </div>
              ) : (
                <>
                  <select
                    value={form.tarjetaId}
                    onChange={(e) => handleSelectTarjeta(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Selecciona la tarjeta…</option>
                    {tarjetasActivas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}{t.ultimos4 ? ` ····${t.ultimos4}` : ""} · {t.entidadName}
                      </option>
                    ))}
                  </select>
                  {selectedTarjeta && selectedTarjeta.pagoMinimo != null && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Pago mínimo: <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 500 }}>{formatMoney(selectedTarjeta.pagoMinimo)}</span> (ya lo pre-llenamos en el monto, puedes ajustarlo)
                    </div>
                  )}
                </>
              )}
            </div>
          ) : isCuentaTipo ? (
            <div style={{ marginBottom: 8 }}>
              {cuentasDelTipo.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                  No tienes cuentas de tipo "{form.tipo}". Registra una en la sección Cuentas primero.
                </div>
              ) : (
                <>
                  <select
                    value={form.cuentaId}
                    onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Selecciona la cuenta de {form.tipo.toLowerCase()}…</option>
                    {cuentasDelTipo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} · {c.entidadName}
                      </option>
                    ))}
                  </select>
                  {selectedCuenta && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      {selectedCuenta.numeroCuenta && <>Cuenta {selectedCuenta.numeroCuenta} · </>}
                      {selectedCuenta.entidadName}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {(form.tipo === "Ingreso" ? INGRESO_CATS : GASTO_CATS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
            </div>
          )}

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            {saving ? "Guardando…" : "Guardar movimiento"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {movimientos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no registraste ningún movimiento.
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {movimientos.map((m, i) => (
            <div
              key={m.id}
              className="despensa-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: m.type === "Ingreso" ? "var(--sage-bg)" : "var(--stamp-bg)",
                  color: m.type === "Ingreso" ? "var(--sage)" : "var(--stamp)",
                }}
              >
                {m.category === "Pago de préstamo" ? (
                  <Landmark size={12} />
                ) : m.category === "Pago de tarjeta" ? (
                  <CreditCard size={12} />
                ) : CUENTA_MOVIMIENTO_TIPOS.includes(m.category) ? (
                  <PiggyBank size={12} />
                ) : m.type === "Ingreso" ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                  {m.category}
                  {m.prestamoNumero && <span className="despensa-mono" style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.prestamoNumero}</span>}
                  {m.tarjetaNombre && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.tarjetaNombre}</span>}
                  {m.description && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.description}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>
                  {formatDateDisplay(m.date)}
                  {m.entidadName && <> · {m.entidadName}</>}
                </div>
              </div>
              <span
                className="despensa-mono"
                style={{ fontSize: 13, fontWeight: 500, color: m.type === "Ingreso" ? "var(--sage)" : "var(--stamp)", flexShrink: 0 }}
              >
                {m.type === "Ingreso" ? "+" : "−"}{formatMoney(m.amount)}
              </span>
              <button
                onClick={() => deleteMovimiento(m.id)}
                title="Eliminar movimiento"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  background: "transparent",
                  color: "var(--ink-soft)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
