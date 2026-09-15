import React, { useEffect, useMemo, useState } from "react";
import { PiggyBank, TrendingUp, Check, X } from "lucide-react";
import { watchFondosSostenibles, activarFondoSostenible, desactivarFondoSostenible, actualizarMontoFondoSostenible } from "../lib/db";
import { calcularCapitalNecesario, montoMensualPromedio, TASA_RENDIMIENTO_DEFAULT } from "../lib/fondosSostenibles";

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "";
  return "RD$" + Number(n).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FondosSostenibles({ categoriasGasto, presupuesto }) {
  const [fondos, setFondos] = useState({});
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [montoEditado, setMontoEditado] = useState("");

  useEffect(() => {
    const unsub = watchFondosSostenibles(setFondos, () => setFondos({}));
    return () => unsub && unsub();
  }, []);

  const categoriasFijas = useMemo(
    () => (categoriasGasto || []).filter((c) => c.clasificacion === "Fijo"),
    [categoriasGasto]
  );

  const datos = useMemo(
    () =>
      categoriasFijas.map((c) => {
        const montoMensual = montoMensualPromedio(c.nombre, presupuesto);
        const capitalNecesario = calcularCapitalNecesario(montoMensual, TASA_RENDIMIENTO_DEFAULT);
        const fondo = fondos[c.nombre];
        const montoAcumulado = fondo?.montoAcumulado || 0;
        const progresoPct = capitalNecesario > 0 ? Math.min(100, (montoAcumulado / capitalNecesario) * 100) : 0;
        return { categoria: c, montoMensual, capitalNecesario, activo: !!fondo?.activo, montoAcumulado, progresoPct };
      }),
    [categoriasFijas, presupuesto, fondos]
  );

  const totalCapitalNecesario = datos.reduce((s, d) => (d.activo ? s + d.capitalNecesario : s), 0);
  const totalAcumulado = datos.reduce((s, d) => (d.activo ? s + d.montoAcumulado : s), 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="despensa-tab-font" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Fondos autosostenibles
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Para cada gasto fijo, calcula cuánto capital necesitarías invertido (a una tasa conservadora del{" "}
          {(TASA_RENDIMIENTO_DEFAULT * 100).toFixed(0)}% anual) para que el rendimiento pague ese gasto solo,
          indefinidamente — sin tocar el capital.
        </div>
      </div>

      {datos.some((d) => d.activo) && (
        <div style={{ background: "var(--sage-bg)", border: "1px solid var(--sage)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--sage)", fontWeight: 600, marginBottom: 4 }}>Progreso total de tus fondos activos</div>
          <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700 }}>
            {formatMoney(totalAcumulado)} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-soft)" }}>de {formatMoney(totalCapitalNecesario)}</span>
          </div>
        </div>
      )}

      {categoriasFijas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          No tienes categorías marcadas como "Fijo" todavía. Ve a Presupuesto → Categoría de gasto para marcar tus
          gastos fijos (luz, agua, internet, etc.).
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {datos.map((d) => (
            <div key={d.categoria.id} style={{ background: "var(--card)", border: `1px solid ${d.activo ? "var(--sage)" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PiggyBank size={15} style={{ color: d.activo ? "var(--sage)" : "var(--ink-soft)" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.categoria.nombre}</span>
                </div>
                {d.activo ? (
                  <button
                    onClick={() => desactivarFondoSostenible(d.categoria.nombre)}
                    style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() => activarFondoSostenible(d.categoria.nombre)}
                    disabled={d.montoMensual <= 0}
                    title={d.montoMensual <= 0 ? "Primero presupuesta esta categoría" : ""}
                    style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, background: d.montoMensual > 0 ? "var(--sage)" : "var(--line)", color: "#fff", border: "none", borderRadius: 8, cursor: d.montoMensual > 0 ? "pointer" : "not-allowed" }}
                  >
                    Activar fondo
                  </button>
                )}
              </div>

              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: d.activo ? 10 : 0 }}>
                Gasto mensual promedio: {formatMoney(d.montoMensual)} · Capital necesario: {formatMoney(d.capitalNecesario)}
              </div>

              {d.activo && (
                <>
                  <div style={{ height: 8, background: "var(--line-soft)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${d.progresoPct}%`, background: "var(--sage)", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{d.progresoPct.toFixed(1)}% del capital necesario</span>
                    {editandoCategoria === d.categoria.nombre ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          value={montoEditado}
                          onChange={(e) => setMontoEditado(e.target.value)}
                          autoFocus
                          style={{ width: 110, padding: "4px 6px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6 }}
                        />
                        <button
                          onClick={async () => {
                            await actualizarMontoFondoSostenible(d.categoria.nombre, montoEditado);
                            setEditandoCategoria(null);
                          }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditandoCategoria(null)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoCategoria(d.categoria.nombre);
                          setMontoEditado(String(d.montoAcumulado || ""));
                        }}
                        style={{ fontSize: 11.5, fontWeight: 600, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Actualizar monto acumulado
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
