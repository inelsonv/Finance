import React, { useMemo, useState } from "react";
import { Layers, Plus, X, Check, Trash2, Package, Pill, Clock } from "lucide-react";
import { addCompraProrateada, deleteCompraProrateada, updateProducto } from "../lib/db";
import { diasRestantesProducto, unidadesRestantesProducto, registrarReposicion, todayStr } from "../lib/inventario";
import { confirm } from "../lib/confirm";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Considera "pagada" una cuota cuya quincena ya pasó (mismo criterio simple
// usado en el resto de la app: comparar contra la quincena actual).
function periodoIndice(year, month, quincena) {
  return year * 24 + (month - 1) * 2 + (quincena === "Q2" ? 1 : 0);
}
function cuotaYaPaso(c) {
  const hoy = new Date();
  const idxHoy = periodoIndice(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() >= 15 ? "Q2" : "Q1");
  const idxCuota = periodoIndice(c.year, c.month, c.quincena);
  return idxCuota < idxHoy;
}

export default function ComprasProrateadas({ compras, categoriasGasto, products }) {
  const [showForm, setShowForm] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [productoVinculadoId, setProductoVinculadoId] = useState("");
  const [nombreManual, setNombreManual] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [cuotas, setCuotas] = useState("2");
  const [categoria, setCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayStr());
  const [sumarInventario, setSumarInventario] = useState(true);
  const [paquetesComprados, setPaquetesComprados] = useState("1");
  const [unidadesPorPaqueteCustom, setUnidadesPorPaqueteCustom] = useState("30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const productosOrdenados = useMemo(
    () => [...(products || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [products]
  );

  const idProductoFinal = productoId === "__otro__" ? productoVinculadoId : productoId;
  const productoSeleccionado = productosOrdenados.find((prod) => prod.id === idProductoFinal);

  const handleSeleccionarProducto = (id) => {
    setProductoId(id);
    if (id === "__otro__" || !id) {
      setProductoVinculadoId("");
      setSumarInventario(false);
      return;
    }
    const p = productosOrdenados.find((prod) => prod.id === id);
    if (p) {
      setSumarInventario(true);
      setPaquetesComprados("1");
      setUnidadesPorPaqueteCustom(p.unidadesPorPaquete != null ? String(p.unidadesPorPaquete) : "30");
      if (p.price) {
        setMontoTotal(String(Number(p.price)));
      }
      if (p.category) {
        const catCoincide = (categoriasGasto || []).find(
          (c) => c.nombre.toLowerCase() === p.category.toLowerCase()
        );
        if (catCoincide) setCategoria(catCoincide.nombre);
      }
    } else {
      setSumarInventario(false);
    }
  };

  const handleCambiarPaquetes = (val) => {
    setPaquetesComprados(val);
    const cant = parseInt(val, 10);
    if (productoSeleccionado && productoSeleccionado.price && Number.isFinite(cant) && cant > 0) {
      setMontoTotal(String(Math.round(Number(productoSeleccionado.price) * cant * 100) / 100));
    }
  };

  const nombreFinal = productoId === "__otro__" ? nombreManual.trim() : productosOrdenados.find((p) => p.id === productoId)?.name || "";

  const cuotaPreview = useMemo(() => {
    const total = parseFloat(montoTotal);
    const n = parseInt(cuotas, 10);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(n) || n <= 0) return null;
    return Math.round((total / n) * 100) / 100;
  }, [montoTotal, cuotas]);

  const inventarioPreview = useMemo(() => {
    if (!productoSeleccionado || !sumarInventario) return null;
    const unidadesActuales = unidadesRestantesProducto(productoSeleccionado) != null
      ? unidadesRestantesProducto(productoSeleccionado)
      : Math.max(0, Number(productoSeleccionado.unidadesDisponibles) || 0);

    const cantPaquetes = Math.max(1, parseInt(paquetesComprados, 10) || 1);
    const unidadesPorPaq = Math.max(
      1,
      parseInt(unidadesPorPaqueteCustom, 10) || Number(productoSeleccionado.unidadesPorPaquete) || 30
    );
    const unidadesNuevas = cantPaquetes * unidadesPorPaq;
    const stockResultante = unidadesActuales + unidadesNuevas;
    const consumo = Number(productoSeleccionado.consumoDiario) || 1;
    const diasResultantes = Math.floor(stockResultante / consumo);

    return {
      unidadesActuales,
      cantPaquetes,
      unidadesPorPaq,
      unidadesNuevas,
      stockResultante,
      consumo,
      diasResultantes,
    };
  }, [productoSeleccionado, sumarInventario, paquetesComprados, unidadesPorPaqueteCustom]);

  const resetForm = () => {
    setProductoId("");
    setProductoVinculadoId("");
    setNombreManual("");
    setMontoTotal("");
    setCuotas("2");
    setCategoria("");
    setFechaInicio(todayStr());
    setSumarInventario(true);
    setPaquetesComprados("1");
    setUnidadesPorPaqueteCustom("30");
    setError(null);
  };

  const handleGuardar = async () => {
    if (!nombreFinal) {
      setError("Elige un producto o escribe un nombre para la compra");
      return;
    }
    const total = parseFloat(montoTotal);
    if (!Number.isFinite(total) || total <= 0) {
      setError("Ingresa un monto total válido");
      return;
    }
    const n = parseInt(cuotas, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Ingresa una cantidad de cuotas válida");
      return;
    }
    if (!categoria) {
      setError("Elige una categoría de gasto");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let unidadesSumadas = null;
      let paquetesSumados = null;

      // Si se activa sumar al inventario, calcular el nuevo stock disponible y actualizar el producto
      if (sumarInventario && productoSeleccionado && inventarioPreview) {
        paquetesSumados = inventarioPreview.cantPaquetes;
        unidadesSumadas = inventarioPreview.unidadesNuevas;

        const repo = registrarReposicion(productoSeleccionado, paquetesSumados, {
          fechaInicio,
          unidadesPorPaquete: inventarioPreview.unidadesPorPaq,
          consumoDiario: inventarioPreview.consumo,
        });

        await updateProducto(productoSeleccionado.id, {
          ...repo,
          seguimiento: true,
          unidadesPorPaquete: inventarioPreview.unidadesPorPaq,
          consumoDiario: inventarioPreview.consumo,
        });
      }

      await addCompraProrateada({
        nombre: nombreFinal,
        montoTotal: total,
        cuotas: n,
        categoria,
        fechaInicio,
        productoId: productoSeleccionado?.id || null,
        paquetesInventario: paquetesSumados,
        unidadesInventario: unidadesSumadas,
      });

      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (compra) => {
    let msg = `¿Eliminar "${compra.nombre}"? Esto revierte los montos ya sumados al presupuesto de cada quincena.`;
    if (compra.unidadesInventario) {
      msg += ` También se revertirán las ${compra.unidadesInventario} unidades sumadas al inventario.`;
    }
    if (!(await confirm(msg))) return;
    await deleteCompraProrateada(compra.id, compra);
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="despensa-tab-font" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={15} /> Compras prorateadas
        </span>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: showForm ? "var(--card)" : "var(--sage)", color: showForm ? "var(--ink-soft)" : "#fff", border: showForm ? "1px solid var(--line)" : "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancelar" : "Prorratear compra"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Producto o concepto a prorratear:</div>
          <select
            value={productoId}
            onChange={(e) => handleSeleccionarProducto(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", marginBottom: 8 }}
          >
            <option value="">Elige un producto del catálogo…</option>
            {productosOrdenados.map((p) => {
              const u = unidadesRestantesProducto(p);
              const stockTxt = p.seguimiento && u != null ? ` · [Stock hoy: ${u} un.]` : "";
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{p.price ? ` — ${formatMoney(Number(p.price))}` : ""}{stockTxt}
                </option>
              );
            })}
            <option value="__otro__">Otro (escribir manualmente)…</option>
          </select>

          {productoId === "__otro__" && (
            <div style={{ marginBottom: 8 }}>
              <input
                placeholder="Nombre del artículo o compra (ej. Farmacia Los Hidalgos / Medicinas)"
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 6 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)", cursor: "pointer", marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={sumarInventario}
                  onChange={(e) => setSumarInventario(e.target.checked)}
                />
                <span>Vincular con un producto del inventario para sumar existencias</span>
              </label>
              {sumarInventario && (
                <select
                  value={productoVinculadoId}
                  onChange={(e) => {
                    setProductoVinculadoId(e.target.value);
                    const prod = productosOrdenados.find((p) => p.id === e.target.value);
                    if (prod) {
                      setUnidadesPorPaqueteCustom(prod.unidadesPorPaquete ? String(prod.unidadesPorPaquete) : "30");
                    }
                  }}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5, background: "var(--card)" }}
                >
                  <option value="">Selecciona el producto del inventario a reponer…</option>
                  {productosOrdenados.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Sección de Reposición automática de Inventario */}
          {productoSeleccionado && (
            <div
              style={{
                background: sumarInventario ? "var(--sage-bg)" : "var(--paper)",
                border: sumarInventario ? "1px solid var(--sage)" : "1px solid var(--line)",
                borderRadius: 9,
                padding: "10px 12px",
                marginBottom: 10,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 600, fontSize: 12.5, color: "var(--ink)" }}>
                <input
                  type="checkbox"
                  checked={sumarInventario}
                  onChange={(e) => setSumarInventario(e.target.checked)}
                />
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Package size={14} color="var(--sage)" />
                  Sumar esta compra al inventario de <strong>{productoSeleccionado.name}</strong>
                </span>
              </label>

              {sumarInventario && inventarioPreview && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Paquetes / cajas compradas:</div>
                      <input
                        className="despensa-mono"
                        type="number"
                        min="1"
                        step="1"
                        value={paquetesComprados}
                        onChange={(e) => handleCambiarPaquetes(e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5, background: "var(--card)", textAlign: "center" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Trae por paquete:</div>
                      <input
                        className="despensa-mono"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Ej. 30"
                        value={unidadesPorPaqueteCustom}
                        onChange={(e) => setUnidadesPorPaqueteCustom(e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5, background: "var(--card)", textAlign: "center" }}
                      />
                    </div>
                  </div>

                  {/* Resumen del cálculo exacto del inventario */}
                  <div style={{ background: "var(--card)", border: "1px solid var(--line-soft)", borderRadius: 7, padding: "8px 10px", fontSize: 11.5 }}>
                    <div style={{ fontWeight: 700, color: "var(--sage)", display: "flex", alignItems: "center", gap: 5 }}>
                      <Check size={13} />
                      Stock: {inventarioPreview.unidadesActuales} disponibles + {inventarioPreview.unidadesNuevas} nuevas ({inventarioPreview.cantPaquetes} paq. × {inventarioPreview.unidadesPorPaq}) = {inventarioPreview.stockResultante} unidades
                    </div>
                    <div style={{ color: "var(--ink-soft)", marginTop: 3, fontSize: 11 }}>
                      📅 Al ritmo de <strong>{inventarioPreview.consumo} unidad al día</strong>, alcanzará para <strong>{inventarioPreview.diasResultantes} días</strong> (restando 1 diaria a partir de hoy).
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>Monto total de la compra</div>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto total"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>Cantidad de cuotas (quincenas)</div>
              <input
                className="despensa-mono"
                type="number"
                step="1"
                min="1"
                placeholder="Cantidad de cuotas"
                value={cuotas}
                onChange={(e) => setCuotas(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>Categoría de gasto</div>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                <option value="">Categoría de gasto…</option>
                {(categoriasGasto || []).map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>Fecha de inicio</div>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>

          {cuotaPreview != null && (
            <div style={{ fontSize: 12, color: "var(--sage)", marginBottom: 8 }}>
              Cada cuota será de aproximadamente <strong>{formatMoney(cuotaPreview)}</strong>, asignada a quincenas consecutivas empezando en la fecha elegida.
            </div>
          )}

          <button
            onClick={handleGuardar}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
          >
            <Check size={13} /> {saving ? "Guardando…" : "Prorratear y asignar al presupuesto"}
          </button>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
        </div>
      )}

      {(compras || []).length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--ink-soft)" }}>Compra</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Valor original</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--ink-soft)" }}>Cuotas</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Valor cuota</th>
                <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--ink-soft)" }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const cuotasPendientes = (c.cuotasDetalle || []).filter((d) => !cuotaYaPaso(d));
                const balance = cuotasPendientes.reduce((s, d) => s + d.monto, 0);
                const cuotasPagadas = (c.cuotasDetalle || []).length - cuotasPendientes.length;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "8px" }}>
                      <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
                        <span>{c.categoria}</span>
                        {c.unidadesInventario ? (
                          <span style={{ padding: "1px 6px", borderRadius: 4, background: "var(--sage-bg)", color: "var(--sage)", fontSize: 9.5, fontWeight: 600 }}>
                            +{c.unidadesInventario} unidades al inventario
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px" }}>{formatMoney(c.montoTotal)}</td>
                    <td className="despensa-mono" style={{ textAlign: "center", padding: "8px" }}>{cuotasPagadas} / {c.cuotas}</td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px" }}>{formatMoney(c.montoCuota)}</td>
                    <td className="despensa-mono" style={{ textAlign: "right", padding: "8px", fontWeight: 600, color: balance > 0 ? "var(--stamp)" : "var(--sage)" }}>
                      {formatMoney(balance)}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => handleEliminar(c)}
                        title="Eliminar (revierte el presupuesto e inventario)"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 5, cursor: "pointer" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
