import React, { useState } from "react";
import { Plus, Trash2, X, TrendingUp, TrendingDown, Landmark, PiggyBank, CreditCard, Ticket, Briefcase, Zap, Fuel, SquareParking, UtensilsCrossed, Coffee, ShoppingBag, Check, AlertTriangle } from "lucide-react";
import { addMovimiento, deleteMovimiento } from "../lib/db";
import SwipeableRow from "./SwipeableRow.jsx";
import { CUENTA_TIPOS } from "./Cuentas.jsx";
import { GASTO_CATS_FIJO, GASTO_CATS_VARIABLE } from "../lib/categorias";
import { quincenaDeFecha, consumoPresupuesto } from "../lib/presupuestoConsumo";
import { confirm } from "../lib/confirm";

const INGRESO_CATS = ["Salario", "Negocio propio", "Otro ingreso"];
const CUENTA_MOVIMIENTO_TIPOS = CUENTA_TIPOS.filter((t) => t !== "Otro");
const TIPOS = ["Ingreso", "Gasto", "Pago de préstamo", "Pago de tarjeta", "Pago de membresía", "Pago de servicio", ...CUENTA_MOVIMIENTO_TIPOS];
const METODOS_PAGO = ["Efectivo", "Tarjeta de crédito", "Transferencia", "Débito", "Otro"];

const PAGO_EXPRES = [
  { category: "Combustible", icon: Fuel },
  { category: "Estacionamiento", icon: SquareParking },
  { category: "Alimentación", icon: UtensilsCrossed },
  { category: "Otro variable", label: "Café/varios", icon: Coffee },
  { category: "Compras", icon: ShoppingBag },
];

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
  clasificacion: "Variable",
  category: INGRESO_CATS[0],
  amount: "",
  description: "",
  date: todayStr(),
  entidadId: "",
  prestamoId: "",
  cuentaId: "",
  tarjetaId: "",
  membresiaId: "",
  fuenteIngresoId: "",
  contratoId: "",
  metodoPago: "Efectivo",
});

export default function Movimientos({ movimientos, entidades, prestamos, cuentas, tarjetas, membresias, fuentesIngreso, categoriasGasto, contratos, presupuesto, presupuestoYear }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expresCategory, setExpresCategory] = useState(null);
  const [expresAmount, setExpresAmount] = useState("");
  const [expresSaving, setExpresSaving] = useState(false);
  const [alertaPresupuesto, setAlertaPresupuesto] = useState(null);

  const openExpres = (category) => {
    setExpresCategory(category);
    setExpresAmount("");
  };

  const checkPresupuesto = (category, dateStr, amount) => {
    if (!presupuesto || !presupuestoYear) return;
    const q = quincenaDeFecha(dateStr);
    if (!q || q.year !== presupuestoYear) return;
    const resultado = consumoPresupuesto({ presupuesto, movimientos, categoria: category, year: q.year, month: q.month, quincena: q.quincena });
    if (!resultado) return;
    const gastadoConNuevo = resultado.gastado + amount;
    const pct = (gastadoConNuevo / resultado.presupuestado) * 100;
    if (pct >= 50) {
      setAlertaPresupuesto({ categoria: category, pct, critico: pct >= 90 });
    } else {
      setAlertaPresupuesto(null);
    }
  };

  const cancelExpres = () => {
    setExpresCategory(null);
    setExpresAmount("");
  };

  const saveExpres = async () => {
    const amount = parseFloat(expresAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setExpresSaving(true);
    try {
      await addMovimiento({
        type: "Gasto",
        category: expresCategory,
        amount,
        description: "",
        date: todayStr(),
        clasificacion: "Variable",
        metodoPago: "Efectivo",
      });
      checkPresupuesto(expresCategory, todayStr(), amount);
      cancelExpres();
    } finally {
      setExpresSaving(false);
    }
  };

  const prestamosActivos = prestamos.filter((p) => p.estado === "Activo");
  const tarjetasActivas = tarjetas.filter((t) => t.estado === "Activa");
  const membresiasActivas = membresias.filter((m) => m.estado === "Activa");
  const fuentesIngresoActivas = fuentesIngreso.filter((f) => f.estado === "Activo");
  const contratosActivos = contratos.filter((c) => c.estado === "Activo");
  const isCuentaTipo = CUENTA_MOVIMIENTO_TIPOS.includes(form.tipo);
  const cuentasDelTipo = cuentas.filter((c) => c.tipo === form.tipo);
  const selectedCuenta = cuentas.find((c) => c.id === form.cuentaId);
  const selectedTarjeta = tarjetas.find((t) => t.id === form.tarjetaId);
  const selectedMembresia = membresias.find((m) => m.id === form.membresiaId);
  const selectedFuente = fuentesIngreso.find((f) => f.id === form.fuenteIngresoId);
  const selectedContrato = contratos.find((c) => c.id === form.contratoId);

  const setTipo = (tipo) => {
    setForm({
      ...emptyForm(),
      tipo,
      category: tipo === "Ingreso" ? INGRESO_CATS[0] : tipo === "Gasto" ? GASTO_CATS_VARIABLE[0] : tipo,
    });
  };

  const setClasificacion = (clasificacion) => {
    setForm({
      ...form,
      clasificacion,
      category: clasificacion === "Fijo" ? GASTO_CATS_FIJO[0] : GASTO_CATS_VARIABLE[0],
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

  const handleSelectMembresia = (membresiaId) => {
    const m = membresias.find((x) => x.id === membresiaId);
    setForm({
      ...form,
      membresiaId,
      amount: m && m.costo != null ? String(m.costo) : form.amount,
    });
  };

  const handleSelectFuente = (fuenteIngresoId) => {
    const f = fuentesIngreso.find((x) => x.id === fuenteIngresoId);
    setForm({
      ...form,
      fuenteIngresoId,
      category: f ? f.tipo : form.category,
      entidadId: f && f.entidadId ? f.entidadId : form.entidadId,
      amount: f && f.montoEsperado != null ? String(f.montoEsperado) : form.amount,
    });
  };

  const handleSelectContrato = (contratoId) => {
    const c = contratos.find((x) => x.id === contratoId);
    setForm({
      ...form,
      contratoId,
      amount: c && c.montoEstimado != null ? String(c.montoEstimado) : form.amount,
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
    if (form.tipo === "Gasto" && form.metodoPago === "Tarjeta de crédito" && !form.tarjetaId) {
      setFormError("Selecciona la tarjeta con la que pagaste");
      return;
    }
    if (form.tipo === "Pago de membresía" && !form.membresiaId) {
      setFormError("Selecciona la membresía que estás pagando");
      return;
    }
    if (form.tipo === "Pago de servicio" && !form.contratoId) {
      setFormError("Selecciona el contrato que estás pagando");
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
      const membresia = membresias.find((m) => m.id === form.membresiaId);
      const fuente = fuentesIngreso.find((f) => f.id === form.fuenteIngresoId);
      const contrato = contratos.find((c) => c.id === form.contratoId);
      const cuenta = cuentas.find((c) => c.id === form.cuentaId);
      await addMovimiento({
        type: form.tipo === "Ingreso" ? "Ingreso" : "Gasto",
        category:
          form.tipo === "Pago de préstamo" ||
          form.tipo === "Pago de tarjeta" ||
          form.tipo === "Pago de membresía" ||
          form.tipo === "Pago de servicio" ||
          isCuentaTipo
            ? form.tipo
            : form.category,
        amount,
        description: form.description.trim(),
        date: form.date,
        clasificacion: form.tipo === "Gasto" ? form.clasificacion : null,
        metodoPago: form.tipo === "Gasto" ? form.metodoPago : null,
        entidadId:
          form.tipo === "Pago de préstamo"
            ? prestamo?.entidadId || ""
            : form.tipo === "Pago de tarjeta"
            ? tarjeta?.entidadId || ""
            : form.tipo === "Pago de membresía"
            ? membresia?.entidadId || ""
            : form.tipo === "Pago de servicio"
            ? contrato?.entidadId || ""
            : isCuentaTipo
            ? cuenta?.entidadId || ""
            : form.entidadId || null,
        entidadName:
          form.tipo === "Pago de préstamo"
            ? prestamo?.entidadName || ""
            : form.tipo === "Pago de tarjeta"
            ? tarjeta?.entidadName || ""
            : form.tipo === "Pago de membresía"
            ? membresia?.entidadName || ""
            : form.tipo === "Pago de servicio"
            ? contrato?.entidadName || ""
            : isCuentaTipo
            ? cuenta?.entidadName || ""
            : entidad
            ? entidad.name
            : "",
        prestamoId: form.tipo === "Pago de préstamo" ? form.prestamoId : null,
        prestamoNumero: form.tipo === "Pago de préstamo" ? prestamo?.numero || "" : "",
        cuentaId: isCuentaTipo ? form.cuentaId : null,
        cuentaNombre: isCuentaTipo ? cuenta?.nombre || "" : "",
        tarjetaId: form.tipo === "Pago de tarjeta" || (form.tipo === "Gasto" && form.metodoPago === "Tarjeta de crédito") ? form.tarjetaId : null,
        tarjetaNombre: form.tipo === "Pago de tarjeta" || (form.tipo === "Gasto" && form.metodoPago === "Tarjeta de crédito") ? tarjeta?.nombre || "" : "",
        membresiaId: form.tipo === "Pago de membresía" ? form.membresiaId : null,
        membresiaNombre: form.tipo === "Pago de membresía" ? membresia?.nombre || "" : "",
        fuenteIngresoId: form.tipo === "Ingreso" ? form.fuenteIngresoId || null : null,
        fuenteIngresoNombre: form.tipo === "Ingreso" ? fuente?.nombre || "" : "",
        contratoId: form.tipo === "Pago de servicio" ? form.contratoId : null,
        contratoNombre: form.tipo === "Pago de servicio" ? contrato?.nombre || "" : "",
      });

      if (form.tipo === "Pago de préstamo" && prestamo?.notificarWhatsapp) {
        const entidadPrestamo = entidades.find((e) => e.docId === prestamo.entidadId);
        const telefono = entidadPrestamo?.phone?.replace(/\D/g, "");
        if (telefono) {
          const mensaje = `Pago registrado: préstamo ${prestamo.numero} (${prestamo.entidadName || "sin entidad"}), monto ${formatMoney(amount)}, fecha ${form.date}.`;
          window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
        }
      }

      if (form.tipo === "Gasto") {
        checkPresupuesto(form.category, form.date, amount);
      }

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
      {alertaPresupuesto && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: alertaPresupuesto.critico ? "var(--stamp-bg)" : "var(--amber-bg)",
            border: `1px solid ${alertaPresupuesto.critico ? "var(--stamp)" : "var(--amber)"}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={16} style={{ color: alertaPresupuesto.critico ? "var(--stamp)" : "var(--amber)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12.5, color: alertaPresupuesto.critico ? "var(--stamp)" : "var(--amber)" }}>
            {alertaPresupuesto.critico ? "¡Presupuesto casi agotado! " : "Vas por la mitad del presupuesto: "}
            <strong>{alertaPresupuesto.categoria}</strong> ya lleva{" "}
            <strong>{Math.round(alertaPresupuesto.pct)}%</strong> de lo presupuestado para esta quincena.
          </div>
          <button
            onClick={() => setAlertaPresupuesto(null)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: alertaPresupuesto.critico ? "var(--stamp)" : "var(--amber)", border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
          Pago exprés
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PAGO_EXPRES.map((p) => {
            const Icon = p.icon;
            const active = expresCategory === p.category;
            return (
              <button
                key={p.category}
                onClick={() => (active ? cancelExpres() : openExpres(p.category))}
                title={p.category}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 14px",
                  minWidth: 76,
                  border: `1px solid ${active ? "var(--stamp)" : "var(--line)"}`,
                  borderRadius: 10,
                  background: active ? "var(--stamp-bg)" : "var(--card)",
                  color: active ? "var(--stamp)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                <Icon size={18} />
                <span style={{ fontSize: 10.5, fontWeight: 500, textAlign: "center" }}>{p.label || p.category}</span>
              </button>
            );
          })}
        </div>

        {expresCategory && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap" }}>{expresCategory}:</span>
            <input
              autoFocus
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto"
              value={expresAmount}
              onChange={(e) => setExpresAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveExpres()}
              style={{ flex: 1, minWidth: 80, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13 }}
            />
            <button
              onClick={saveExpres}
              disabled={expresSaving || !expresAmount}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                cursor: expresSaving || !expresAmount ? "not-allowed" : "pointer",
                opacity: expresSaving || !expresAmount ? 0.6 : 1,
              }}
            >
              <Check size={13} /> {expresSaving ? "…" : "Guardar"}
            </button>
            <button
              onClick={cancelExpres}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

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
          ) : form.tipo === "Pago de membresía" ? (
            <div style={{ marginBottom: 8 }}>
              {membresiasActivas.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                  No tienes membresías activas. Registra una en la sección Membresías primero.
                </div>
              ) : (
                <>
                  <select
                    value={form.membresiaId}
                    onChange={(e) => handleSelectMembresia(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Selecciona la membresía…</option>
                    {membresiasActivas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} · {m.tipo}
                      </option>
                    ))}
                  </select>
                  {selectedMembresia && selectedMembresia.costo != null && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Costo: <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 500 }}>{formatMoney(selectedMembresia.costo)}</span> (ya lo pre-llenamos en el monto, puedes ajustarlo)
                    </div>
                  )}
                </>
              )}
            </div>
          ) : form.tipo === "Pago de servicio" ? (
            <div style={{ marginBottom: 8 }}>
              {contratosActivos.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                  No tienes contratos activos. Registra uno en la sección Contratos primero.
                </div>
              ) : (
                <>
                  <select
                    value={form.contratoId}
                    onChange={(e) => handleSelectContrato(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Selecciona el contrato…</option>
                    {contratosActivos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} · {c.tipo}
                      </option>
                    ))}
                  </select>
                  {selectedContrato && selectedContrato.montoEstimado != null && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Monto estimado: <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 500 }}>{formatMoney(selectedContrato.montoEstimado)}</span> (ya lo pre-llenamos en el monto, puedes ajustarlo)
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
            <div style={{ marginBottom: 8 }}>
              {form.tipo === "Gasto" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {["Variable", "Fijo"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setClasificacion(c)}
                        style={{
                          flex: 1,
                          padding: "6px 4px",
                          fontSize: 12,
                          fontWeight: 500,
                          borderRadius: 7,
                          border: "1px solid var(--line)",
                          background: form.clasificacion === c ? "var(--stamp-bg)" : "var(--card)",
                          color: form.clasificacion === c ? "var(--stamp)" : "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        {c === "Fijo" ? "Gasto fijo" : "Gasto variable"}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={form.metodoPago}
                      onChange={(e) => setForm({ ...form, metodoPago: e.target.value, tarjetaId: e.target.value === "Tarjeta de crédito" ? form.tarjetaId : "" })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {METODOS_PAGO.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {form.metodoPago === "Tarjeta de crédito" && (
                    <div style={{ marginBottom: 8 }}>
                      {tarjetasActivas.filter((t) => (t.tipoTarjeta || "Crédito") === "Crédito").length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--stamp)", padding: "8px 0" }}>
                          No tienes tarjetas de crédito activas. Registra una en la sección Tarjetas primero.
                        </div>
                      ) : (
                        <select
                          value={form.tarjetaId}
                          onChange={(e) => setForm({ ...form, tarjetaId: e.target.value })}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                        >
                          <option value="">Selecciona la tarjeta…</option>
                          {tarjetasActivas
                            .filter((t) => (t.tipoTarjeta || "Crédito") === "Crédito")
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nombre}{t.ultimos4 ? ` ····${t.ultimos4}` : ""} · {t.entidadName}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  )}
                </>
              )}
              {form.tipo === "Ingreso" && fuentesIngresoActivas.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <select
                    value={form.fuenteIngresoId}
                    onChange={(e) => handleSelectFuente(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                  >
                    <option value="">Fuente de ingreso (opcional)…</option>
                    {fuentesIngresoActivas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} · {f.frecuencia}
                      </option>
                    ))}
                  </select>
                  {selectedFuente && selectedFuente.montoEsperado != null && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      Monto habitual: <span className="despensa-mono" style={{ color: "var(--sage)", fontWeight: 500 }}>{formatMoney(selectedFuente.montoEsperado)}</span> (ya lo pre-llenamos en el monto, puedes ajustarlo)
                    </div>
                  )}
                </div>
              )}
              <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                >
                  {(form.tipo === "Ingreso"
                    ? INGRESO_CATS
                    : [
                        ...(form.clasificacion === "Fijo" ? GASTO_CATS_FIJO : GASTO_CATS_VARIABLE),
                        ...categoriasGasto.filter((c) => c.clasificacion === form.clasificacion).map((c) => c.nombre),
                      ]
                  ).map((c) => (
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
            <SwipeableRow key={m.id} onDelete={async () => { if (await confirm("¿Eliminar este movimiento?")) deleteMovimiento(m.id); }}>
            <div
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
                ) : m.metodoPago === "Tarjeta de crédito" ? (
                  <CreditCard size={12} />
                ) : m.category === "Pago de membresía" ? (
                  <Ticket size={12} />
                ) : m.category === "Pago de servicio" ? (
                  <Zap size={12} />
                ) : m.fuenteIngresoNombre ? (
                  <Briefcase size={12} />
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
                  {m.membresiaNombre && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.membresiaNombre}</span>}
                  {m.fuenteIngresoNombre && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.fuenteIngresoNombre}</span>}
                  {m.contratoNombre && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.contratoNombre}</span>}
                  {m.metodoPago === "Tarjeta de crédito" && m.tarjetaNombre && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.tarjetaNombre}</span>}
                  {m.description && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}> · {m.description}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>
                  {formatDateDisplay(m.date)}
                  {m.entidadName && <> · {m.entidadName}</>}
                  {m.clasificacion && (
                    <span
                      className="despensa-mono"
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 10,
                        background: m.clasificacion === "Fijo" ? "var(--stamp-bg)" : "var(--sage-bg)",
                        color: m.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)",
                      }}
                    >
                      {m.clasificacion}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="despensa-mono"
                style={{ fontSize: 13, fontWeight: 500, color: m.type === "Ingreso" ? "var(--sage)" : "var(--stamp)", flexShrink: 0 }}
              >
                {m.type === "Ingreso" ? "+" : "−"}{formatMoney(m.amount)}
              </span>
              <button
                onClick={async () => {
                  if (await confirm("¿Eliminar este movimiento?")) deleteMovimiento(m.id);
                }}
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
            </SwipeableRow>
          ))}
        </div>
      )}
    </div>
  );
}
