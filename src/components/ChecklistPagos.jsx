import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Landmark, Wallet } from "lucide-react";
import { watchChecklistPeriodo, setChecklistItem } from "../lib/db";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const METODOS = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function celdaPrestamo(prestamo, year, mes) {
  if (!prestamo.fechaInicio || !prestamo.cuota) return { activo: false, quincena: null };
  const [sy, sm, sd] = prestamo.fechaInicio.split("-").map(Number);
  if (!sy || !sm) return { activo: false, quincena: null };
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return { activo: false, quincena: null };
  const offset = (year - sy) * 12 + (mes - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  const quincena = sd && sd > 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

function periodoActual() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, quincena: now.getDate() <= 15 ? "Q1" : "Q2" };
}

function periodoAdyacente(periodo, dir) {
  let { year, month, quincena } = periodo;
  if (dir > 0) {
    if (quincena === "Q1") return { year, month, quincena: "Q2" };
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return { year, month, quincena: "Q1" };
  } else {
    if (quincena === "Q2") return { year, month, quincena: "Q1" };
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return { year, month, quincena: "Q2" };
  }
}

export default function ChecklistPagos({ categoriasGasto, presupuesto, prestamos, presupuestoYear, periodoInicial, onConsumePeriodoInicial }) {
  const [periodo, setPeriodo] = useState(() => periodoInicial || periodoActual());
  const [checklist, setChecklist] = useState({});

  // Cuando llegamos aquí desde la notificación de "día de cobro", saltamos directo
  // a la quincena que corresponde pagar (Q1 del mes siguiente si el cobro es a fin
  // de mes, o Q2 del mismo mes si el cobro es a mitad de mes). Una vez aplicado, se
  // limpia para que una visita normal (desde el menú) no quede "pegada" a esa quincena.
  useEffect(() => {
    if (periodoInicial) {
      setPeriodo(periodoInicial);
      if (onConsumePeriodoInicial) onConsumePeriodoInicial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoInicial]);

  const periodoKey = `${periodo.year}-${periodo.month}-${periodo.quincena}`;

  useEffect(() => {
    const unsub = watchChecklistPeriodo(periodoKey, setChecklist, () => {});
    return () => unsub();
  }, [periodoKey]);

  const presupuestoDisponible = periodo.year === presupuestoYear;

  const items = useMemo(() => {
    const list = [];
    if (presupuestoDisponible) {
      for (const c of categoriasGasto) {
        const val = presupuesto?.[c.nombre]?.[String(periodo.month)]?.[periodo.quincena];
        if (typeof val === "number" && val > 0) {
          list.push({ key: c.nombre, nombre: c.nombre, monto: val, icon: Wallet });
        }
      }
    }
    for (const p of prestamos || []) {
      if (p.estado !== "Activo") continue;
      const { activo, quincena } = celdaPrestamo(p, periodo.year, periodo.month);
      if (activo && quincena === periodo.quincena && p.cuota) {
        list.push({ key: `prestamo-${p.id}`, nombre: `Préstamo ${p.numero}`, monto: p.cuota, icon: Landmark });
      }
    }
    return list.sort((a, b) => b.monto - a.monto);
  }, [categoriasGasto, presupuesto, prestamos, periodo, presupuestoDisponible]);

  const totales = useMemo(() => {
    let total = 0;
    let pagado = 0;
    for (const it of items) {
      total += it.monto;
      if (checklist?.items?.[it.key]?.pagado) pagado += it.monto;
    }
    return { total, pagado, pendiente: total - pagado };
  }, [items, checklist]);

  const toggleItem = (key) => {
    const actual = checklist?.items?.[key] || {};
    setChecklistItem(periodoKey, key, { ...actual, pagado: !actual.pagado });
  };

  const setMetodo = (key, metodo) => {
    const actual = checklist?.items?.[key] || {};
    setChecklistItem(periodoKey, key, { ...actual, metodoPago: metodo });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setPeriodo(periodoAdyacente(periodo, -1))}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 600, minWidth: 200, textAlign: "center" }}>
          {MESES[periodo.month - 1]} {periodo.year} · {periodo.quincena === "Q1" ? "1ra quincena" : "2da quincena"}
        </div>
        <button
          onClick={() => setPeriodo(periodoAdyacente(periodo, 1))}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total a pagar</div>
          <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(totales.total)}</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ya pagado</div>
          <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--sage)" }}>{formatMoney(totales.pagado)}</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Pendiente</div>
          <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: totales.pendiente > 0 ? "var(--stamp)" : "var(--sage)" }}>{formatMoney(totales.pendiente)}</div>
        </div>
      </div>

      {!presupuestoDisponible && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 12 }}>
          Solo se muestran categorías presupuestadas del año {presupuestoYear} (el que estás usando en Presupuesto mensual). Los préstamos sí se calculan para cualquier año.
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          No hay montos presupuestados para esta quincena. Ve a{" "}
          <strong style={{ color: "var(--ink)" }}>Presupuesto → Presupuesto mensual</strong> para llenar los
          montos de cada categoría, o revisa que tengas préstamos activos.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const estado = checklist?.items?.[it.key] || {};
            const Icon = it.icon;
            return (
              <div
                key={it.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--card)",
                  border: `1px solid ${estado.pagado ? "var(--sage)" : "var(--line)"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  opacity: estado.pagado ? 0.7 : 1,
                }}
              >
                <button
                  onClick={() => toggleItem(it.key)}
                  title={estado.pagado ? "Marcar como pendiente" : "Marcar como pagado"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    border: `2px solid ${estado.pagado ? "var(--sage)" : "var(--line)"}`,
                    background: estado.pagado ? "var(--sage)" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {estado.pagado && <Check size={15} />}
                </button>

                <Icon size={14} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: estado.pagado ? "line-through" : "none" }}>{it.nombre}</div>
                </div>

                <select
                  value={estado.metodoPago || ""}
                  onChange={(e) => setMetodo(it.key, e.target.value)}
                  style={{ padding: "5px 6px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 11.5, background: "var(--paper)", color: "var(--ink)", flexShrink: 0 }}
                >
                  <option value="">Método…</option>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <span className="despensa-mono" style={{ fontSize: 13.5, fontWeight: 600, minWidth: 80, textAlign: "right", flexShrink: 0 }}>
                  {formatMoney(it.monto)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
