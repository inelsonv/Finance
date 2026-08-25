import React, { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { setPresupuestoCelda } from "../lib/db";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const QUINCENAS = ["Q1", "Q2"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  if (v === 0) return "";
  return v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Calcula, para un préstamo dado, qué monto (cuota) le corresponde a un mes/quincena
// específico del año mostrado, basándose en su fecha de inicio y plazo.
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

export default function PresupuestoAnual({ presupuesto, categoriasPersonalizadas, year, prestamos }) {
  const [savingKey, setSavingKey] = useState(null);

  const categorias = useMemo(() => {
    return categoriasPersonalizadas.map((c) => ({ nombre: c.nombre, clasificacion: c.clasificacion }));
  }, [categoriasPersonalizadas]);

  const prestamosActivos = useMemo(
    () => (prestamos || []).filter((p) => p.estado === "Activo" && p.fechaInicio && p.cuota && p.plazo),
    [prestamos]
  );

  const getCeldaPrestamo = (prestamo, mes, quincena) => {
    const { activo, quincena: q } = celdaPrestamo(prestamo, year, mes);
    return activo && q === quincena ? prestamo.cuota : 0;
  };

  const totalMesPrestamo = (prestamo, mes) => getCeldaPrestamo(prestamo, mes, "Q1") + getCeldaPrestamo(prestamo, mes, "Q2");

  const getCelda = (categoria, mes, quincena) => {
    const val = presupuesto?.[categoria]?.[String(mes)]?.[quincena];
    return typeof val === "number" ? val : null;
  };

  const totalMesCategoria = (categoria, mes) => (getCelda(categoria, mes, "Q1") || 0) + (getCelda(categoria, mes, "Q2") || 0);

  const totalPorMes = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const cat of categorias) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesCategoria(cat.nombre, m);
    }
    for (const p of prestamosActivos) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesPrestamo(p, m);
    }
    return totals;
  }, [categorias, presupuesto, prestamosActivos, year]);

  const totalPorQuincenaGlobal = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      totals[`${m}-Q1`] = 0;
      totals[`${m}-Q2`] = 0;
      for (const cat of categorias) {
        totals[`${m}-Q1`] += getCelda(cat.nombre, m, "Q1") || 0;
        totals[`${m}-Q2`] += getCelda(cat.nombre, m, "Q2") || 0;
      }
      for (const p of prestamosActivos) {
        totals[`${m}-Q1`] += getCeldaPrestamo(p, m, "Q1");
        totals[`${m}-Q2`] += getCeldaPrestamo(p, m, "Q2");
      }
    }
    return totals;
  }, [categorias, presupuesto, prestamosActivos, year]);

  const totalPorCategoria = (categoria) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesCategoria(categoria, m);
    return total;
  };

  const totalPorPrestamo = (p) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesPrestamo(p, m);
    return total;
  };

  const totalAnual = totalPorMes.reduce((s, v) => s + v, 0);

  if (categorias.length === 0 && prestamosActivos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no has creado ninguna categoría propia. Ve a{" "}
        <strong style={{ color: "var(--ink)" }}>Presupuesto → Categoría de gasto</strong> y usa "Nueva
        categoría" para agregar las que quieras presupuestar aquí.
      </div>
    );
  }

  const handleBlur = async (categoria, mes, quincena, value) => {
    const key = `${categoria}-${mes}-${quincena}`;
    const num = parseFloat(value);
    setSavingKey(key);
    try {
      await setPresupuestoCelda(year, categoria, mes, quincena, Number.isFinite(num) && num > 0 ? num : 0);
    } finally {
      setSavingKey(null);
    }
  };

  const cellStyle = { border: "none", background: "transparent", textAlign: "right", padding: "6px 4px", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink)", width: 52 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Presupuesto total {year}:</span>
          <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>${totalAnual.toLocaleString("es")}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          Cada mes tiene 2 columnas: Q1 (primera quincena) y Q2 (segunda quincena)
          {prestamosActivos.length > 0 && " · Las cuotas de préstamos (🏦) se calculan solas"}
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
        <table className="despensa-mono" style={{ borderCollapse: "collapse", fontSize: 11, minWidth: 1500, width: "100%" }}>
          <thead>
            <tr>
              <th
                rowSpan={2}
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
                  minWidth: 150,
                }}
              >
                Categoría
              </th>
              {MESES.map((m) => (
                <th
                  key={m}
                  colSpan={2}
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid var(--line-soft)",
                    borderLeft: "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                  }}
                >
                  {m}
                </th>
              ))}
              <th rowSpan={2} style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)" }}>
                Total
              </th>
            </tr>
            <tr>
              {MESES.map((m) =>
                QUINCENAS.map((q) => (
                  <th
                    key={`${m}-${q}`}
                    style={{
                      padding: "4px 4px",
                      borderBottom: "1px solid var(--line)",
                      borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                      textAlign: "right",
                      fontWeight: 500,
                      color: "var(--ink-soft)",
                      fontSize: 9.5,
                      minWidth: 52,
                    }}
                  >
                    {q}
                  </th>
                ))
              )}
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
                  return QUINCENAS.map((q) => {
                    const key = `${cat.nombre}-${mes}-${q}`;
                    const val = getCelda(cat.nombre, mes, q);
                    return (
                      <td key={key} style={{ borderBottom: "1px solid var(--line-soft)", borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none", padding: 0 }}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={val ?? ""}
                          key={val}
                          onBlur={(e) => handleBlur(cat.nombre, mes, q, e.target.value)}
                          placeholder="—"
                          style={{ ...cellStyle, opacity: savingKey === key ? 0.5 : 1 }}
                        />
                      </td>
                    );
                  });
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
            {prestamosActivos.map((p, idx) => {
              const rowIdx = categorias.length + idx;
              return (
                <tr key={`prestamo-${p.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
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
                      color: "var(--stamp)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Calculado automáticamente desde Préstamos"
                  >
                    <Landmark size={11} /> Préstamo {p.numero}
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    return QUINCENAS.map((q) => {
                      const val = getCeldaPrestamo(p, mes, q);
                      return (
                        <td
                          key={`${p.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--stamp)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--stamp-bg)",
                      color: "var(--stamp)",
                    }}
                  >
                    {formatMoney(totalPorPrestamo(p)) || "0"}
                  </td>
                </tr>
              );
            })}
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
                Total
              </td>
              {MESES.map((_, i) => {
                const mes = i + 1;
                return QUINCENAS.map((q) => (
                  <td
                    key={`${mes}-${q}`}
                    style={{
                      padding: "8px 4px",
                      borderTop: "2px solid var(--line)",
                      borderLeft: q === "Q1" ? "1px solid var(--line-soft)" : "none",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: 10.5,
                    }}
                  >
                    {formatMoney(totalPorQuincenaGlobal[`${mes}-${q}`]) || "0"}
                  </td>
                ));
              })}
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
