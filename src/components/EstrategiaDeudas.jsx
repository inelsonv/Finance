import React, { useMemo, useState } from "react";
import { Snowflake, Mountain, Landmark, CreditCard, Info } from "lucide-react";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EstrategiaDeudas({ prestamos, tarjetas, movimientos }) {
  const [metodo, setMetodo] = useState("bola");

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
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito" || t.saldoActual == null || t.saldoActual <= 0) continue;
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

    const ordenadas =
      metodo === "bola"
        ? [...list].sort((a, b) => a.saldo - b.saldo)
        : [...list].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));

    return ordenadas;
  }, [prestamos, tarjetas, pagadoPorPrestamo, metodo]);

  const totales = useMemo(() => {
    const saldoTotal = deudas.reduce((s, d) => s + d.saldo, 0);
    const cuotaTotal = deudas.reduce((s, d) => s + (d.cuotaMinima || 0), 0);
    return { saldoTotal, cuotaTotal };
  }, [deudas]);

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
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {d.subtitulo}
                      {d.tasaInteres != null && ` · ${d.tasaInteres}% interés`}
                      {d.cuotaMinima != null && ` · mín. ${formatMoney(d.cuotaMinima)}`}
                    </div>
                  </div>
                  <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: esPrioridad ? "var(--sage)" : "var(--ink)", flexShrink: 0 }}>
                    {formatMoney(d.saldo)}
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
