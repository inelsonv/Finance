import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Landmark, Wallet, Banknote, CreditCard, ArrowLeftRight, HelpCircle } from "lucide-react";
import { watchChecklistPeriodo, setChecklistItem, addMovimiento } from "../lib/db";
import { confirm } from "../lib/confirm";
import { GASTO_CATS_FIJO } from "../lib/categorias";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const METODOS = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
const METODO_ICONS = { Efectivo: Banknote, Transferencia: ArrowLeftRight, Tarjeta: CreditCard, Otro: HelpCircle, "Sin definir": HelpCircle };

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
          list.push({ key: c.nombre, nombre: c.nombre, monto: val, icon: Wallet, metodoDefault: c.metodoPagoDefault || null, esPrestamo: false });
        }
      }
    }
    for (const p of prestamos || []) {
      if (p.estado !== "Activo" && p.estado !== "Pagado") continue;
      const saldado = p.estado === "Pagado";
      if (p.frecuenciaCuota === "Personalizado") {
        for (const c of p.cuotasPersonalizadas || []) {
          if (!c.fecha || !c.monto) continue;
          const [cy, cm, cd] = c.fecha.split("-").map(Number);
          if (cy !== periodo.year || cm !== periodo.month) continue;
          const q = cd && cd > 15 ? "Q2" : "Q1";
          if (q !== periodo.quincena) continue;
          list.push({
            key: `prestamo-${p.id}-${c.fecha}`,
            nombre: `Préstamo ${p.numero} (${c.fecha.split("-").reverse().slice(0, 2).join("/")})`,
            monto: c.monto,
            icon: Landmark,
            metodoDefault: null,
            esPrestamo: true,
            prestamoId: p.id,
            prestamoNumero: p.numero,
            entidadId: p.entidadId || "",
            entidadName: p.entidadName || "",
            bloqueadoPagado: saldado,
          });
        }
        continue;
      }
      const { activo, quincena } = celdaPrestamo(p, periodo.year, periodo.month);
      if (activo && quincena === periodo.quincena && p.cuota) {
        list.push({
          key: `prestamo-${p.id}`,
          nombre: `Préstamo ${p.numero}`,
          monto: p.cuota,
          icon: Landmark,
          metodoDefault: null,
          esPrestamo: true,
          prestamoId: p.id,
          prestamoNumero: p.numero,
          entidadId: p.entidadId || "",
          entidadName: p.entidadName || "",
          bloqueadoPagado: saldado,
        });
      }
    }
    return list.sort((a, b) => b.monto - a.monto);
  }, [categoriasGasto, presupuesto, prestamos, periodo, presupuestoDisponible]);

  const totales = useMemo(() => {
    let total = 0;
    let pagado = 0;
    for (const it of items) {
      total += it.monto;
      if (it.bloqueadoPagado || checklist?.items?.[it.key]?.pagado) pagado += it.monto;
    }
    return { total, pagado, pendiente: total - pagado };
  }, [items, checklist]);

  const resumenPorMetodo = useMemo(() => {
    const map = {};
    for (const it of items) {
      if (it.bloqueadoPagado) continue;
      const estado = checklist?.items?.[it.key] || {};
      if (estado.pagado) continue;
      const metodo = estado.metodoPago || it.metodoDefault || "Sin definir";
      map[metodo] = (map[metodo] || 0) + it.monto;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items, checklist]);

  const [confirmandoKey, setConfirmandoKey] = useState(null);

  const toggleItem = async (it) => {
    const actual = checklist?.items?.[it.key] || {};

    if (actual.pagado) {
      // Desmarcar no requiere confirmación ni registra nada (el movimiento ya
      // creado, si lo hay, se puede editar/eliminar desde Movimientos).
      setChecklistItem(periodoKey, it.key, { ...actual, pagado: false });
      return;
    }

    const metodoPago = actual.metodoPago || it.metodoDefault || "Efectivo";
    setConfirmandoKey(it.key);
    let confirmado;
    try {
      confirmado = await confirm(`¿Confirmar el pago de "${it.nombre}" por ${formatMoney(it.monto)}?`, {
        confirmLabel: "Confirmar pago",
        danger: false,
      });
    } finally {
      setConfirmandoKey(null);
    }
    if (!confirmado) return;

    await setChecklistItem(periodoKey, it.key, { ...actual, pagado: true, metodoPago });

    if (it.esPrestamo) {
      await addMovimiento({
        type: "Pago de préstamo",
        category: "Pago de préstamo",
        amount: it.monto,
        description: it.nombre,
        date: todayStr(),
        metodoPago,
        entidadId: it.entidadId || null,
        entidadName: it.entidadName || "",
        prestamoId: it.prestamoId,
        prestamoNumero: it.prestamoNumero || "",
      });
    } else {
      await addMovimiento({
        type: "Gasto",
        category: it.nombre,
        amount: it.monto,
        description: it.nombre,
        date: todayStr(),
        clasificacion: GASTO_CATS_FIJO.includes(it.nombre) ? "Fijo" : "Variable",
        metodoPago,
      });
    }
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
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

      {resumenPorMetodo.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
            Qué hacer con lo pendiente
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {resumenPorMetodo.map(([metodo, monto]) => {
              const Icon = METODO_ICONS[metodo] || HelpCircle;
              return (
                <div
                  key={metodo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: metodo === "Sin definir" ? "var(--amber-bg)" : "var(--sage-bg)",
                    border: `1px solid ${metodo === "Sin definir" ? "var(--amber)" : "var(--sage)"}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  <Icon size={14} style={{ color: metodo === "Sin definir" ? "var(--amber)" : "var(--sage)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: metodo === "Sin definir" ? "var(--amber)" : "var(--ink)" }}>
                    {metodo === "Sin definir" ? "Sin definir aún" : metodo}
                  </span>
                  <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 700, color: metodo === "Sin definir" ? "var(--amber)" : "var(--sage)" }}>
                    {formatMoney(monto)}
                  </span>
                </div>
              );
            })}
          </div>
          {resumenPorMetodo.some(([m]) => m === "Sin definir") && (
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
              Define un método de pago habitual en cada categoría (Presupuesto → Categoría de gasto) para que esto se calcule solo.
            </div>
          )}
        </div>
      )}

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
            const estado = it.bloqueadoPagado ? { pagado: true } : checklist?.items?.[it.key] || {};
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
                  onClick={() => !it.bloqueadoPagado && toggleItem(it)}
                  disabled={confirmandoKey === it.key || it.bloqueadoPagado}
                  title={it.bloqueadoPagado ? "Préstamo saldado — ya no se puede modificar" : estado.pagado ? "Marcar como pendiente" : "Marcar como pagado"}
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
                    cursor: it.bloqueadoPagado ? "not-allowed" : confirmandoKey === it.key ? "wait" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {estado.pagado && <Check size={15} />}
                </button>

                <Icon size={14} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: estado.pagado ? "line-through" : "none" }}>
                    {it.nombre}
                    {it.bloqueadoPagado && (
                      <span className="despensa-mono" style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "var(--sage-bg)", color: "var(--sage)", textDecoration: "none" }}>
                        Saldado
                      </span>
                    )}
                  </div>
                  {it.esPrestamo && it.entidadName && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      <Landmark size={10} /> Pagar a: {it.entidadName}
                    </div>
                  )}
                </div>

                <select
                  value={estado.metodoPago || it.metodoDefault || ""}
                  onChange={(e) => setMetodo(it.key, e.target.value)}
                  disabled={it.bloqueadoPagado}
                  style={{
                    padding: "5px 6px",
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    fontSize: 11.5,
                    background: it.bloqueadoPagado ? "var(--line-soft)" : "var(--paper)",
                    color: it.bloqueadoPagado ? "var(--ink-soft)" : "var(--ink)",
                    flexShrink: 0,
                    cursor: it.bloqueadoPagado ? "not-allowed" : "pointer",
                  }}
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
