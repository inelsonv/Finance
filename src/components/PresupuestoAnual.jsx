import React, { useMemo, useState } from "react";
import { setPresupuestoCelda } from "../lib/db";
import { GASTO_CATS_FIJO, GASTO_CATS_VARIABLE } from "../lib/categorias";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  if (v === 0) return "";
  return v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PresupuestoAnual({ presupuesto, categoriasPersonalizadas, year }) {
  const [savingKey, setSavingKey] = useState(null);

  const categorias = useMemo(() => {
    const fijas = GASTO_CATS_FIJO.map((nombre) => ({ nombre, clasificacion: "Fijo" }));
    const variables = GASTO_CATS_VARIABLE.map((nombre) => ({ nombre, clasificacion: "Variable" }));
    const personalizadas = categoriasPersonalizadas.map((c) => ({ nombre: c.nombre, clasificacion: c.clasificacion }));
    return [...fijas, ...variables, ...personalizadas];
  }, [categoriasPersonalizadas]);

  const getCelda = (categoria, mes) => {
    const val = presupuesto?.[categoria]?.[String(mes)];
    return typeof val === "number" ? val : null;
  };

  const totalPorMes = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const cat of categorias) {
      for (let m = 1; m <= 12; m++) {
        totals[m - 1] += getCelda(cat.nombre, m) || 0;
      }
    }
    return totals;
  }, [categorias, presupuesto]);

  const totalPorCategoria = (categoria) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += getCelda(categoria, m) || 0;
    return total;
  };

  const totalAnual = totalPorMes.reduce((s, v) => s + v, 0);

  const handleBlur = async (categoria, mes, value) => {
    const key = `${categoria}-${mes}`;
    const num = parseFloat(value);
    setSavingKey(key);
    try {
      await setPresupuestoCelda(year, categoria, mes, Number.isFinite(num) && num > 0 ? num : 0);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Presupuesto total {year}:</span>
          <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>${totalAnual.toLocaleString("es")}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          Clic en una celda para editarla · Tab / Enter para pasar a la siguiente
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
        <table className="despensa-mono" style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 920, width: "100%" }}>
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  zIndex: 2,
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--line)",
                  borderRight: "1px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  minWidth: 160,
                }}
              >
                Categoría
              </th>
              {MESES.map((m) => (
                <th key={m} style={{ padding: "8px 6px", borderBottom: "1px solid var(--line)", textAlign: "right", fontWeight: 600, minWidth: 68 }}>
                  {m}
                </th>
              ))}
              <th style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, rowIdx) => (
              <tr key={cat.nombre} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: cat.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)",
                  }}
                  title={cat.clasificacion}
                >
                  {cat.nombre}
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const key = `${cat.nombre}-${mes}`;
                  const val = getCelda(cat.nombre, mes);
                  return (
                    <td key={mes} style={{ borderBottom: "1px solid var(--line-soft)", padding: 0 }}>
                      <input
                        type="number"
                        min="0"
                        defaultValue={val ?? ""}
                        key={val}
                        onBlur={(e) => handleBlur(cat.nombre, mes, e.target.value)}
                        placeholder="—"
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          textAlign: "right",
                          padding: "7px 6px",
                          fontSize: 12,
                          fontFamily: "IBM Plex Mono, monospace",
                          color: "var(--ink)",
                          opacity: savingKey === key ? 0.5 : 1,
                        }}
                      />
                    </td>
                  );
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {formatMoney(totalPorCategoria(cat.nombre)) || "0"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  padding: "8px 10px",
                  borderRight: "1px solid var(--line)",
                  borderTop: "2px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
              >
                Total mes
              </td>
              {totalPorMes.map((t, i) => (
                <td key={i} style={{ padding: "8px 6px", borderTop: "2px solid var(--line)", textAlign: "right", fontWeight: 600 }}>
                  {formatMoney(t) || "0"}
                </td>
              ))}
              <td style={{ padding: "8px 10px", borderTop: "2px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 700, background: "var(--sage-bg)", color: "var(--sage)" }}>
                {totalAnual.toLocaleString("es")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
