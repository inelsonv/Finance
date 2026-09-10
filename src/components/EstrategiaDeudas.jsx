import React, { useMemo, useState } from "react";
import { Snowflake, Mountain, Landmark, CreditCard, Info, Check, Power, Sparkles } from "lucide-react";
import { activarEstrategiaDeudas, desactivarEstrategiaDeudas } from "../lib/db";
import { calcularResumenQuincena } from "../lib/quincenaResumen";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { periodoActualConfigurado } from "../lib/quincenaConfig";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EstrategiaDeudas({ prestamos, tarjetas, movimientos, estrategiaDeudas, tipoCambio, fuentesIngreso, categoriasGasto, presupuesto, presupuestoYear, diasCobro }) {
  const [metodo, setMetodo] = useState(() => (estrategiaDeudas?.activo ? estrategiaDeudas.metodo : "bola"));
  const [activando, setActivando] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(() => periodoActualConfigurado(diasCobro));

  const estaActivaEsteMetodo = estrategiaDeudas?.activo && estrategiaDeudas.metodo === metodo;

  const handleActivar = async () => {
    setActivando(true);
    try {
      await activarEstrategiaDeudas(metodo);
    } finally {
      setActivando(false);
    }
  };

  const handleDesactivar = async () => {
    setActivando(true);
    try {
      await desactivarEstrategiaDeudas();
    } finally {
      setActivando(false);
    }
  };

  const pagadoPorPrestamo = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      map[m.prestamoId] = (map[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const deudas = useMemo(() => {
    const list = [];

    for (const p of prestamos) {
      if (p.estado !== "Activo") continue;
      const pagado = pagadoPorPrestamo[p.id] || 0;
      const saldo = Math.max((Number(p.montoAprobado) || 0) - pagado, 0);
      if (saldo <= 0) continue;
      list.push({
        id: `p-${p.id}`,
        nombre: `Préstamo ${p.numero}`,
        subtitulo: p.entidadName || "Sin entidad",
        saldo,
        tasaInteres: p.tasaInteres ?? null,
        cuotaMinima: p.cuota ?? null,
        icon: Landmark,
      });
    }

    for (const t of tarjetas) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
      if (t.saldoActual != null && t.saldoActual > 0) {
        list.push({
          id: `t-${t.id}`,
          nombre: t.nombre,
          subtitulo: t.entidadName || "Sin entidad",
          saldo: t.saldoActual,
          tasaInteres: t.tasaInteres ?? null,
          cuotaMinima: t.pagoMinimo ?? null,
          icon: CreditCard,
        });
      }
      // Si la tarjeta también maneja saldo en dólares, se agrega como una
      // deuda aparte — convertida a RD$ (con la tasa de cambio actual) solo
      // para poder ordenarla junto a las demás, pero el pago mínimo se
      // muestra en su moneda original.
      if (t.saldoActualUSD != null && t.saldoActualUSD > 0) {
        const saldoEnRDS = tipoCambio ? t.saldoActualUSD * tipoCambio : t.saldoActualUSD;
        list.push({
          id: `t-${t.id}-usd`,
          nombre: `${t.nombre} (USD)`,
          subtitulo: t.entidadName || "Sin entidad",
          saldo: saldoEnRDS,
          saldoOriginalUSD: t.saldoActualUSD,
          tasaInteres: t.tasaInteres ?? null,
          cuotaMinima: t.pagoMinimoUSD ?? null,
          esUSD: true,
          icon: CreditCard,
        });
      }
    }

    const ordenadas =
      metodo === "bola"
        ? [...list].sort((a, b) => a.saldo - b.saldo)
        : [...list].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));

    return ordenadas;
  }, [prestamos, tarjetas, pagadoPorPrestamo, metodo, tipoCambio]);

  const totales = useMemo(() => {
    const saldoTotal = deudas.reduce((s, d) => s + d.saldo, 0);
    const cuotaTotal = deudas.reduce((s, d) => {
      const monto = d.cuotaMinima || 0;
      return s + (d.esUSD && tipoCambio ? monto * tipoCambio : d.esUSD ? 0 : monto);
    }, 0);
    return { saldoTotal, cuotaTotal };
  }, [deudas, tipoCambio]);

  // Cuánto dinero "extra" queda disponible esta quincena, después de tu
  // ingreso esperado menos todo lo presupuestado (gastos fijos/variables +
  // cuotas de préstamo) y los pagos mínimos de tarjeta — esa es la parte que
  // se sugiere destinar a tu deuda prioritaria.
  const disponibleExtra = useMemo(() => {
    if (!fuentesIngreso || !categoriasGasto || !presupuesto) return null;
    const periodo = periodoSeleccionado;
    const ingreso = ingresoMensualNeto(fuentesIngreso) / 2;
    const resumen = calcularResumenQuincena({
      year: periodo.year,
      month: periodo.month,
      quincena: periodo.quincena,
      presupuesto,
      categoriasGasto,
      prestamos,
      movimientos,
      diasCobro,
    });

    let minimoTarjetas = 0;
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      const diasEnMes = new Date(periodo.year, periodo.month, 0).getDate();
      const diaPago = Math.min(Number(t.fechaPago), diasEnMes);
      const q = diaPago > 15 ? "Q2" : "Q1";
      if (q !== periodo.quincena) continue;
      if (t.saldoActual > 0 && t.pagoMinimo) minimoTarjetas += Number(t.pagoMinimo) || 0;
      if (t.saldoActualUSD > 0 && t.pagoMinimoUSD) minimoTarjetas += (Number(t.pagoMinimoUSD) || 0) * (tipoCambio || 1);
    }

    const extra = ingreso - resumen.presupuestado - minimoTarjetas;
    return { ingreso, presupuestado: resumen.presupuestado, minimoTarjetas, extra, periodo };
  }, [fuentesIngreso, categoriasGasto, presupuesto, prestamos, tarjetas, movimientos, diasCobro, tipoCambio, periodoSeleccionado]);

  const tarjetasSinSaldo = tarjetas.filter((t) => t.estado === "Activa" && t.saldoActual == null);

  return (
    <div>
      {deudas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          No tienes deudas activas registradas (préstamos con saldo pendiente, o tarjetas con "Saldo actual"
          configurado en la sección Tarjetas).
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Deuda total</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--stamp)" }}>{formatMoney(totales.saldoTotal)}</div>
            </div>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Cuotas mínimas mensuales</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(totales.cuotaTotal)}</div>
            </div>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Deudas activas</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700 }}>{deudas.length}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => setMetodo("bola")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: metodo === "bola" ? "var(--sage-bg)" : "var(--card)",
                color: metodo === "bola" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <Snowflake size={14} /> Bola de nieve
            </button>
            <button
              onClick={() => setMetodo("avalancha")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: metodo === "avalancha" ? "var(--sage-bg)" : "var(--card)",
                color: metodo === "avalancha" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <Mountain size={14} /> Avalancha
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5, display: "flex", gap: 6 }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {metodo === "bola"
              ? "Bola de nieve: ordena tus deudas de menor a mayor saldo. Paga el mínimo en todas, y todo el dinero extra que puedas destínalo a la más pequeña hasta liquidarla; luego sigue con la siguiente. Genera avances rápidos y motivación."
              : "Avalancha: ordena tus deudas de mayor a menor tasa de interés. Paga el mínimo en todas, y el dinero extra destínalo a la de tasa más alta primero. Matemáticamente es la que menos intereses totales termina pagando."}
          </div>

          <div style={{ marginBottom: 16 }}>
            {estaActivaEsteMetodo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)", borderRadius: 8 }}>
                  <Check size={13} /> Estrategia activa
                </div>
                <button
                  onClick={handleDesactivar}
                  disabled={activando}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 11.5, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <Power size={12} /> Desactivar
                </button>
              </div>
            ) : (
              <button
                onClick={handleActivar}
                disabled={activando}
                style={{ padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                {activando ? "Activando…" : `Activar esta estrategia`}
              </button>
            )}
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
              Al activarla, recibirás una notificación si tu deuda prioritaria según este plan queda atrasada.
            </div>
          </div>

          {disponibleExtra && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select
                value={periodoSeleccionado.month}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, month: Number(e.target.value) })}
                style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
              >
                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(
                  (nombre, i) => (
                    <option key={nombre} value={i + 1}>{nombre}</option>
                  )
                )}
              </select>
              <input
                type="number"
                value={periodoSeleccionado.year}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, year: Number(e.target.value) || periodoSeleccionado.year })}
                style={{ width: 80, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              />
              <select
                value={periodoSeleccionado.quincena}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, quincena: e.target.value })}
                style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
              >
                <option value="Q1">1ra quincena</option>
                <option value="Q2">2da quincena</option>
              </select>
            </div>
          )}

          {disponibleExtra && (
            <div
              style={{
                background: disponibleExtra.extra > 0 ? "var(--sage-bg)" : "var(--stamp-bg)",
                border: `1px solid ${disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkles size={14} style={{ color: disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)" }}>
                  {disponibleExtra.extra > 0 ? "Dinero extra disponible" : "No hay dinero extra"} —{" "}
                  {disponibleExtra.periodo.quincena === "Q1" ? "1ra" : "2da"} quincena de{" "}
                  {["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][disponibleExtra.periodo.month - 1]}
                </span>
              </div>
              {disponibleExtra.extra > 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>
                  Después de tu ingreso NETO esperado ({formatMoney(disponibleExtra.ingreso)}, ya con AFP/SFS/ISR
                  descontados donde aplica) menos tus gastos presupuestados y cuotas mínimas (
                  {formatMoney(disponibleExtra.presupuestado + disponibleExtra.minimoTarjetas)}), te quedarían{" "}
                  <strong className="despensa-mono">{formatMoney(disponibleExtra.extra)}</strong> libres.
                  {deudas[0] && (
                    <>
                      {" "}Sugerencia: destínalos a <strong>{deudas[0].nombre}</strong>, tu deuda prioritaria según este plan.
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>
                  Con tu ingreso neto esperado y tus compromisos en esta quincena, no queda margen extra para adelantar
                  deuda — con cumplir los mínimos vas bien.
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deudas.map((d, i) => {
              const Icon = d.icon;
              const esPrioridad = i === 0;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--card)",
                    border: esPrioridad ? "2px solid var(--sage)" : "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    className="despensa-mono"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: esPrioridad ? "var(--sage)" : "var(--line-soft)",
                      color: esPrioridad ? "#fff" : "var(--ink-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <Icon size={16} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{d.nombre}</span>
                      {esPrioridad && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--sage-bg)", color: "var(--sage)" }}
                        >
                          Prioridad
                        </span>
                      )}
                      {d.esUSD && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--amber-bg)", color: "var(--amber)" }}
                          title="Esta deuda está denominada en dólares, no en pesos"
                        >
                          Consumo en USD
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {d.subtitulo}
                      {d.tasaInteres != null && ` · ${d.tasaInteres}% interés`}
                      {d.cuotaMinima != null && ` · mín. ${d.esUSD ? "US$" + d.cuotaMinima.toLocaleString("es", { minimumFractionDigits: 2 }) : formatMoney(d.cuotaMinima)}`}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: esPrioridad ? "var(--sage)" : "var(--ink)" }}>
                      {d.esUSD ? "US$" + d.saldoOriginalUSD.toLocaleString("es", { minimumFractionDigits: 2 }) : formatMoney(d.saldo)}
                    </div>
                    {d.esUSD && (
                      <div className="despensa-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                        ≈ {formatMoney(d.saldo)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tarjetasSinSaldo.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 16, lineHeight: 1.5 }}>
          Nota: {tarjetasSinSaldo.map((t) => t.nombre).join(", ")} no {tarjetasSinSaldo.length === 1 ? "tiene" : "tienen"} un
          "Saldo actual" configurado en Tarjetas, así que no {tarjetasSinSaldo.length === 1 ? "aparece" : "aparecen"} aquí.
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.5, borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
        Esto es información general basada en dos métodos conocidos de pago de deudas, no un consejo financiero
        personalizado. Ajusta según tu propia situación.
      </div>
    </div>
  );
}
