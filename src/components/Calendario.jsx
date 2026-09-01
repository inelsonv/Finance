import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Calendar, Stethoscope, Plane, Cake, Briefcase, User, MapPin, Clock, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { addEvento, deleteEvento, updateEventoEstado, updateEvento, addMovimiento } from "../lib/db";
import { confirm } from "../lib/confirm";

const TIPOS = ["Cita médica", "Vacaciones", "Cumpleaños", "Trabajo", "Personal", "Otro"];
const ESTADOS = ["Pendiente", "Completado", "Cancelado"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TIPO_ICONS = {
  "Cita médica": Stethoscope,
  Vacaciones: Plane,
  Tarjeta: CreditCard,
  Cumpleaños: Cake,
  Trabajo: Briefcase,
  Personal: User,
  Otro: Calendar,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
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

function construirGrilla(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, dateStr: toDateStr(y, m, day), currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(year, month, d), currentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: nextDay, dateStr: toDateStr(y, m, nextDay), currentMonth: false });
    nextDay++;
  }
  return cells;
}

const emptyForm = (fecha) => ({
  titulo: "",
  tipo: TIPOS[0],
  fecha: fecha || todayStr(),
  hora: "",
  entidadId: "",
  diasAviso: "1",
  estado: "Pendiente",
  notas: "",
  categoriaGasto: "",
  montoEstimado: "",
});

function toEditForm(e) {
  return {
    titulo: e.titulo || "",
    tipo: e.tipo || TIPOS[0],
    fecha: e.fecha || todayStr(),
    hora: e.hora || "",
    entidadId: e.entidadId || "",
    diasAviso: e.diasAviso != null ? String(e.diasAviso) : "1",
    estado: e.estado || "Pendiente",
    notas: e.notas || "",
    categoriaGasto: e.categoriaGasto || "",
    montoEstimado: e.montoEstimado != null ? String(e.montoEstimado) : "",
  };
}

export default function Calendario({ eventos, entidades, categoriasGasto, vacaciones, tarjetas }) {
  const hoy = todayStr();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(hoy);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(hoy));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [mostrarPasados, setMostrarPasados] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  // Convierte cada periodo de vacaciones en un "evento" por cada día del
  // rango, para que aparezcan en el calendario general (icono, día
  // seleccionado), sin duplicar datos: siguen viviendo solo en Vacaciones.
  const eventosVacaciones = useMemo(() => {
    const sinteticos = [];
    for (const v of vacaciones || []) {
      if (v.estado === "Cancelada" || !v.fechaInicio || !v.fechaFin) continue;
      let cursor = new Date(v.fechaInicio + "T00:00:00");
      const fin = new Date(v.fechaFin + "T00:00:00");
      while (cursor <= fin) {
        const dateStr = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
        sinteticos.push({
          id: `vac-${v.id}-${dateStr}`,
          titulo: v.destino,
          tipo: "Vacaciones",
          fecha: dateStr,
          estado: v.estado === "Completada" ? "Completado" : "Pendiente",
          notas: v.notas || "",
          esVacacionSintetica: true,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return sinteticos;
  }, [vacaciones]);

  // Convierte las fechas de pago recurrentes y el vencimiento del plástico de
  // cada tarjeta activa en "eventos" sintéticos, sin duplicar datos (siguen
  // viviendo solo en Tarjetas). La fecha de pago se proyecta 12 meses hacia
  // adelante desde hoy.
  const eventosTarjetas = useMemo(() => {
    const sinteticos = [];
    const hoy = new Date();
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;

      const diaPago = t.fechaPago || t.fechaCorte;
      if (diaPago) {
        for (let i = 0; i < 12; i++) {
          const year = hoy.getFullYear();
          const month = hoy.getMonth() + 1 + i;
          const yearAjustado = year + Math.floor((month - 1) / 12);
          const mesAjustado = ((month - 1) % 12) + 1;
          const diasEnMes = new Date(yearAjustado, mesAjustado, 0).getDate();
          const dia = Math.min(diaPago, diasEnMes);
          const dateStr = `${yearAjustado}-${pad2(mesAjustado)}-${pad2(dia)}`;
          sinteticos.push({
            id: `tarjeta-pago-${t.id}-${dateStr}`,
            titulo: `Pago tarjeta ${t.nombre || ""}${t.ultimos4 ? ` ····${t.ultimos4}` : ""}`,
            tipo: "Tarjeta",
            fecha: dateStr,
            estado: "Pendiente",
            notas: "Fecha de pago — gestiónalo en Tarjetas",
            esTarjetaSintetica: true,
          });
        }
      }

      if (t.fechaVencimientoPlastico) {
        sinteticos.push({
          id: `tarjeta-venc-${t.id}`,
          titulo: `Vence plástico ${t.nombre || ""}${t.ultimos4 ? ` ····${t.ultimos4}` : ""}`,
          tipo: "Tarjeta",
          fecha: `${t.fechaVencimientoPlastico}-01`,
          estado: "Pendiente",
          notas: "Vencimiento del plástico — gestiónalo en Tarjetas",
          esTarjetaSintetica: true,
        });
      }
    }
    return sinteticos;
  }, [tarjetas]);

  const eventosPorFecha = useMemo(() => {
    const map = {};
    for (const e of [...eventos, ...eventosVacaciones, ...eventosTarjetas]) {
      if (!e.fecha) continue;
      if (!map[e.fecha]) map[e.fecha] = [];
      map[e.fecha].push(e);
    }
    return map;
  }, [eventos, eventosVacaciones, eventosTarjetas]);

  const grilla = useMemo(() => construirGrilla(viewDate), [viewDate]);

  const { proximos, pasados } = useMemo(() => {
    const prox = [];
    const past = [];
    for (const e of eventos) {
      const dias = diasHasta(e.fecha);
      if (dias != null && dias < 0) past.push(e);
      else prox.push(e);
    }
    return { proximos: prox, pasados: past };
  }, [eventos]);

  const irMesAnterior = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const irMesSiguiente = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const irHoy = () => {
    setViewDate(new Date());
    setSelectedDate(hoy);
  };

  const seleccionarDia = (dateStr) => {
    setSelectedDate(dateStr);
    setShowForm(false);
  };

  const abrirFormularioParaSeleccion = () => {
    setForm(emptyForm(selectedDate));
    setFormError(null);
    setShowForm(true);
    setEditingId(null);
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm(toEditForm(e));
    setEditError(null);
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const marcarCompletado = async (e) => {
    await updateEventoEstado(e.id, "Completado");
    if (e.categoriaGasto && e.montoEstimado) {
      const registrar = await confirm(
        `¿Deseas registrar un gasto de ${formatMoney(e.montoEstimado)} en "${e.categoriaGasto}" por esta cita completada?`,
        { confirmLabel: "Registrar gasto", cancelLabel: "No, gracias", danger: false }
      );
      if (registrar) {
        await addMovimiento({
          type: "Gasto",
          category: e.categoriaGasto,
          amount: e.montoEstimado,
          description: e.titulo,
          date: todayStr(),
          clasificacion: "Variable",
          metodoPago: "Efectivo",
        });
      }
    }
  };

  const handleAdd = async () => {
    const titulo = form.titulo.trim();
    if (!titulo) {
      setFormError("Ingresa un título para el evento");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      await addEvento({
        titulo,
        tipo: form.tipo,
        fecha: form.fecha,
        hora: form.hora,
        entidadId: form.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        diasAviso: parseInt(form.diasAviso, 10) || 0,
        estado: form.estado,
        notas: form.notas.trim(),
        categoriaGasto: form.categoriaGasto || null,
        montoEstimado: parseFloat(form.montoEstimado) || null,
      });
      setSelectedDate(form.fecha);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    const titulo = editForm.titulo.trim();
    if (!titulo) {
      setEditError("Ingresa un título para el evento");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      await updateEvento(editingId, {
        titulo,
        tipo: editForm.tipo,
        fecha: editForm.fecha,
        hora: editForm.hora,
        entidadId: editForm.entidadId || null,
        entidadName: entidad ? entidad.name : "",
        diasAviso: parseInt(editForm.diasAviso, 10) || 0,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        categoriaGasto: editForm.categoriaGasto || null,
        montoEstimado: parseFloat(editForm.montoEstimado) || null,
      });
      setSelectedDate(editForm.fecha);
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
          placeholder="Título, ej. Cita odontológica"
          value={f.titulo}
          onChange={(e) => setF({ ...f, titulo: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={f.tipo}
          onChange={(e) => setF({ ...f, tipo: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          type="date"
          value={f.fecha}
          onChange={(e) => setF({ ...f, fecha: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <input
          type="time"
          value={f.hora}
          onChange={(e) => setF({ ...f, hora: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
        <select
          value={f.entidadId}
          onChange={(e) => setF({ ...f, entidadId: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          <option value="">Lugar / entidad (opcional)</option>
          {entidades.map((e) => (
            <option key={e.docId} value={e.docId}>{e.name}</option>
          ))}
        </select>
        <input
          className="despensa-mono"
          type="number"
          min="0"
          placeholder="Avisar (días antes)"
          value={f.diasAviso}
          onChange={(e) => setF({ ...f, diasAviso: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
        <select
          value={f.categoriaGasto}
          onChange={(e) => setF({ ...f, categoriaGasto: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
        >
          <option value="">Vincular a categoría de gasto (opcional)…</option>
          {(categoriasGasto || []).map((c) => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
        <input
          className="despensa-mono"
          type="number"
          step="0.01"
          min="0"
          placeholder="Monto estimado"
          value={f.montoEstimado}
          onChange={(e) => setF({ ...f, montoEstimado: e.target.value })}
          style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
      </div>
      {f.categoriaGasto && (
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: -4, marginBottom: 8 }}>
          Este monto se sumará automáticamente al Presupuesto mensual, en la quincena que corresponda a la fecha.
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
          {isEdit ? <Check size={14} /> : <Plus size={14} />} {savingFlag ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar evento"}
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

  const renderEvento = (e) => {
    const Icon = TIPO_ICONS[e.tipo] || Calendar;
    const dias = diasHasta(e.fecha);
    const isEditing = editingId === e.id;

    if (isEditing) {
      return <div key={e.id}>{renderForm(editForm, setEditForm, saveEdit, editSaving, editError, cancelEdit, true)}</div>;
    }

    if (e.esVacacionSintetica) {
      return (
        <div
          key={e.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={14} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{e.titulo}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Vacaciones · gestiónalo en Presupuesto → Vacaciones</div>
          </div>
        </div>
      );
    }

    let etiqueta = null;
    if (e.estado === "Pendiente" && dias != null) {
      if (dias < 0) etiqueta = { text: "Pasado", color: "var(--ink-soft)", bg: "var(--line-soft)" };
      else if (dias === 0) etiqueta = { text: "Hoy", color: "var(--stamp)", bg: "var(--stamp-bg)" };
      else if (dias === 1) etiqueta = { text: "Mañana", color: "var(--stamp)", bg: "var(--stamp-bg)" };
      else if (dias <= 7) etiqueta = { text: `En ${dias} días`, color: "var(--amber)", bg: "var(--amber-bg)" };
      else etiqueta = { text: `En ${dias} días`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
    } else if (e.estado === "Completado") {
      etiqueta = { text: "Completado", color: "var(--sage)", bg: "var(--sage-bg)" };
    } else if (e.estado === "Cancelado") {
      etiqueta = { text: "Cancelado", color: "var(--ink-soft)", bg: "var(--line-soft)" };
    }

    return (
      <div key={e.id} data-record-id={e.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--sage-bg)",
                color: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{e.titulo}</span>
                {etiqueta && (
                  <span
                    className="despensa-mono"
                    style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: etiqueta.bg, color: etiqueta.color }}
                  >
                    {etiqueta.text}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Calendar size={11} /> {formatDateDisplay(e.fecha)}
                </span>
                {e.hora && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} /> {e.hora}
                  </span>
                )}
                {e.entidadName && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <MapPin size={11} /> {e.entidadName}
                  </span>
                )}
                <span>{e.tipo}</span>
              </div>
              {e.categoriaGasto && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <span
                    className="despensa-mono"
                    style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: "var(--sage-bg)", color: "var(--sage)" }}
                  >
                    {e.categoriaGasto}{e.montoEstimado != null ? ` · $${e.montoEstimado.toLocaleString("es")}` : ""}
                  </span>
                </div>
              )}
              {e.notas && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>{e.notas}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {e.estado === "Pendiente" && (
              <button
                onClick={() => marcarCompletado(e)}
                title="Marcar como completado"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--sage)", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                <Check size={15} />
              </button>
            )}
            <button
              onClick={() => startEdit(e)}
              title="Editar"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={async () => {
                if (await confirm("¿Eliminar este evento?")) deleteEvento(e.id);
              }}
              title="Eliminar"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const eventosDelDiaSeleccionado = eventosPorFecha[selectedDate] || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 }}>
        <button
          onClick={irMesAnterior}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 600, minWidth: 170, textAlign: "center" }}>
          {MESES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </div>
        <button
          onClick={irMesSiguiente}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={irHoy}
          style={{ padding: "6px 12px", fontSize: 11.5, fontWeight: 500, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          Hoy
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {grilla.map((cell) => {
            const eventosDia = eventosPorFecha[cell.dateStr] || [];
            const esHoy = cell.dateStr === hoy;
            const esSeleccionado = cell.dateStr === selectedDate;
            const tieneEventoUrgente = eventosDia.some((e) => e.estado === "Pendiente");
            const eventoDestacado = eventosDia.find((e) => e.estado === "Pendiente") || eventosDia[0];
            const IconDia = eventoDestacado ? TIPO_ICONS[eventoDestacado.tipo] || Calendar : null;
            return (
              <button
                key={cell.dateStr}
                onClick={() => seleccionarDia(cell.dateStr)}
                style={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  borderRadius: 8,
                  border: esSeleccionado ? "2px solid var(--sage)" : esHoy ? "1px solid var(--stamp)" : "1px solid transparent",
                  background: esSeleccionado ? "var(--sage-bg)" : "transparent",
                  color: cell.currentMonth ? "var(--ink)" : "var(--ink-soft)",
                  opacity: cell.currentMonth ? 1 : 0.4,
                  cursor: "pointer",
                  padding: 2,
                  minWidth: 0,
                }}
                title={eventosDia.length > 0 ? eventosDia.map((e) => e.titulo).join(", ") : undefined}
              >
                <span
                  className="despensa-mono"
                  style={{ fontSize: 12, fontWeight: esHoy ? 700 : 500, color: esHoy && !esSeleccionado ? "var(--stamp)" : undefined }}
                >
                  {cell.day}
                </span>
                {IconDia && (
                  <IconDia
                    size={11}
                    style={{ color: tieneEventoUrgente ? "var(--stamp)" : "var(--sage)", flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div className="despensa-tab-font" style={{ fontSize: 13.5, fontWeight: 600 }}>
            {formatDateDisplay(selectedDate)}
            {selectedDate === hoy && <span style={{ color: "var(--stamp)", fontWeight: 500, fontSize: 11.5 }}> · Hoy</span>}
          </div>
          <button
            onClick={abrirFormularioParaSeleccion}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            <Plus size={13} /> Agregar evento este día
          </button>
        </div>

        {showForm && renderForm(form, setForm, handleAdd, saving, formError, () => setShowForm(false), false)}

        {eventosDelDiaSeleccionado.length === 0 && !showForm ? (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--ink-soft)", fontSize: 12.5, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
            No tienes eventos este día.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eventosDelDiaSeleccionado.map(renderEvento)}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setMostrarLista((s) => !s)}
          style={{ fontSize: 12, color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 10 }}
        >
          {mostrarLista ? "Ocultar" : "Ver"} todos los próximos eventos ({proximos.length})
        </button>

        {mostrarLista && (
          <>
            {proximos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--ink-soft)", fontSize: 12.5 }}>
                Todavía no tienes eventos próximos.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {proximos.map(renderEvento)}
              </div>
            )}

            {pasados.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => setMostrarPasados((s) => !s)}
                  style={{ fontSize: 12, color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {mostrarPasados ? "Ocultar" : "Ver"} eventos pasados ({pasados.length})
                </button>
                {mostrarPasados && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, opacity: 0.7 }}>
                    {pasados.map(renderEvento)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
