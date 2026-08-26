import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Check,
  ClipboardList,
  Download,
  Store,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  RotateCcw,
  Pencil,
} from "lucide-react";
import { addOrdenCompra, updateOrdenCompra, deleteOrdenCompra, registrarCompraProducto, deleteHistorialCompra, addMovimiento, deleteMovimiento, agregarItemABorrador } from "../lib/db";

const ESTADO_COLORES = {
  Borrador: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  "Enviada a proveedor": { bg: "var(--stamp-bg)", color: "var(--stamp)" },
  "Compra presencial": { bg: "var(--amber-bg)", color: "var(--amber)" },
  Completada: { bg: "var(--sage-bg)", color: "var(--sage)" },
  Cancelada: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function totalOrden(orden) {
  return (orden.items || []).reduce((s, it) => s + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 0), 0);
}

function descargarCSV(orden) {
  const header = "Producto,Cantidad,Precio unitario,Subtotal\n";
  const rows = (orden.items || [])
    .map((it) => {
      const nombre = (it.productName || "").replace(/"/g, '""');
      const subtotal = (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 0);
      return `"${nombre}",${it.cantidad},${it.precioUnitario ?? ""},${subtotal.toFixed(2)}`;
    })
    .join("\n");
  const csv = "\uFEFF" + header + rows;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${orden.folio}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OrdenesCompra({ ordenes, products, entidades }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [seleccion, setSeleccion] = useState({}); // { productId: cantidad }
  const [proveedorId, setProveedorId] = useState("");
  const [notas, setNotas] = useState("");
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [buscarAgregar, setBuscarAgregar] = useState("");
  const [busy, setBusy] = useState(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const toggleSeleccion = (productId) => {
    setSeleccion((prev) => {
      const next = { ...prev };
      if (next[productId] != null) delete next[productId];
      else next[productId] = 1;
      return next;
    });
  };

  const cambiarCantidad = (productId, cantidad) => {
    setSeleccion((prev) => ({ ...prev, [productId]: cantidad }));
  };

  const resetForm = () => {
    setSeleccion({});
    setProveedorId("");
    setNotas("");
    setSearch("");
    setFormError(null);
  };

  const crearOrden = async () => {
    const items = Object.entries(seleccion)
      .filter(([, cant]) => cant > 0)
      .map(([productId, cantidad]) => {
        const p = products.find((pr) => pr.id === productId);
        return { productId, productName: p?.name || "", cantidad: Number(cantidad), precioUnitario: p?.price ?? null };
      });
    if (items.length === 0) {
      setFormError("Selecciona al menos un producto");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const proveedor = entidades.find((e) => e.docId === proveedorId);
      await addOrdenCompra({
        items,
        proveedorId: proveedorId || null,
        proveedorNombre: proveedor ? proveedor.name : "",
        notas: notas.trim(),
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const solicitarAProveedor = async (orden) => {
    if (!orden.proveedorId) {
      alert("Esta orden no tiene proveedor asignado. Edítala o crea una nueva con proveedor seleccionado.");
      return;
    }
    setBusy(orden.id);
    try {
      descargarCSV(orden);
      await updateOrdenCompra(orden.id, { estado: "Enviada a proveedor", modalidad: "Proveedor" });
    } finally {
      setBusy(null);
    }
  };

  const iniciarCompraPresencial = async (orden) => {
    setBusy(orden.id);
    try {
      await updateOrdenCompra(orden.id, {
        estado: "Compra presencial",
        modalidad: "Presencial",
        items: orden.items.map((it) => ({ ...it, comprado: it.comprado || false })),
      });
      setExpandidoId(orden.id);
    } finally {
      setBusy(null);
    }
  };

  const cancelarCompraPresencial = async (orden) => {
    setBusy(orden.id);
    try {
      await updateOrdenCompra(orden.id, { estado: "Borrador", modalidad: null });
    } finally {
      setBusy(null);
    }
  };

  const toggleCompradoItem = async (orden, idx) => {
    const nuevosItems = orden.items.map((it, i) => (i === idx ? { ...it, comprado: !it.comprado } : it));
    await updateOrdenCompra(orden.id, { items: nuevosItems });
  };

  const eliminarItemOrden = async (orden, idx) => {
    const nuevosItems = orden.items.filter((_, i) => i !== idx);
    await updateOrdenCompra(orden.id, { items: nuevosItems });
  };

  const cambiarCantidadItem = async (orden, idx, cantidad) => {
    const cant = Math.max(1, parseInt(cantidad, 10) || 1);
    const nuevosItems = orden.items.map((it, i) => (i === idx ? { ...it, cantidad: cant } : it));
    await updateOrdenCompra(orden.id, { items: nuevosItems });
  };

  const agregarProductoAOrden = async (orden, product) => {
    await agregarItemABorrador(orden, { productId: product.id, productName: product.name, precioUnitario: product.price });
    setBuscarAgregar("");
  };

  const cambiarProveedorOrden = async (orden, proveedorId) => {
    const proveedor = entidades.find((e) => e.docId === proveedorId);
    await updateOrdenCompra(orden.id, { proveedorId: proveedorId || null, proveedorNombre: proveedor ? proveedor.name : "" });
  };

  const finalizarCompraPresencial = async (orden) => {
    setBusy(orden.id);
    try {
      const fecha = todayStr();
      const historialIds = [];
      for (const it of orden.items) {
        if (it.comprado && it.productId) {
          const ref = await registrarCompraProducto({ productId: it.productId, productName: it.productName, fecha, cantidad: it.cantidad });
          if (ref?.id) historialIds.push(ref.id);
        }
      }
      const total = orden.items
        .filter((it) => it.comprado)
        .reduce((s, it) => s + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 0), 0);
      let movimientoId = null;
      if (total > 0) {
        const ref = await addMovimiento({
          type: "Gasto",
          category: "Alimentos",
          amount: total,
          description: `Compra presencial - ${orden.folio}`,
          date: fecha,
          clasificacion: "Variable",
          metodoPago: "Efectivo",
        });
        movimientoId = ref?.id || null;
      }
      await updateOrdenCompra(orden.id, { estado: "Completada", historialIds, movimientoId });
    } finally {
      setBusy(null);
    }
  };

  const revertirCompletada = async (orden) => {
    if (!window.confirm("Esto deshace el gasto y el historial registrados por esta compra, y la regresa al checklist para que la ajustes. ¿Continuar?")) return;
    setBusy(orden.id);
    try {
      for (const hId of orden.historialIds || []) {
        await deleteHistorialCompra(hId).catch(() => {});
      }
      if (orden.movimientoId) {
        await deleteMovimiento(orden.movimientoId).catch(() => {});
      }
      await updateOrdenCompra(orden.id, {
        estado: "Compra presencial",
        modalidad: "Presencial",
        historialIds: [],
        movimientoId: null,
      });
      setExpandidoId(orden.id);
    } finally {
      setBusy(null);
    }
  };

  const totalSeleccionado = Object.entries(seleccion).reduce((s, [id, cant]) => {
    const p = products.find((pr) => pr.id === id);
    return s + (p?.price || 0) * (Number(cant) || 0);
  }, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => {
            if (!showForm) resetForm();
            setShowForm((s) => !s);
          }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nueva orden de compra"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-soft)" }} />
            <input
              placeholder="Buscar producto en tu catálogo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 30px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--line-soft)", borderRadius: 8, marginBottom: 8 }}>
            {filteredProducts.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: "var(--ink-soft)", textAlign: "center" }}>Sin productos que coincidan.</div>
            ) : (
              filteredProducts.map((p) => {
                const seleccionado = seleccion[p.id] != null;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderBottom: "1px solid var(--line-soft)",
                      background: seleccionado ? "var(--sage-bg)" : "transparent",
                    }}
                  >
                    <input type="checkbox" checked={seleccionado} onChange={() => toggleSeleccion(p.id)} />
                    <span style={{ flex: 1, fontSize: 12.5, minWidth: 0 }}>{p.name}</span>
                    <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", flexShrink: 0 }}>{formatMoney(p.price)}</span>
                    {seleccionado && (
                      <input
                        className="despensa-mono"
                        type="number"
                        min="1"
                        value={seleccion[p.id]}
                        onChange={(e) => cambiarCantidad(p.id, parseInt(e.target.value, 10) || 1)}
                        style={{ width: 50, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, flexShrink: 0 }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Proveedor (opcional, necesario para solicitar por CSV)</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
          </div>

          <input
            placeholder="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {Object.keys(seleccion).length} producto(s) seleccionado(s)
            </span>
            <span className="despensa-mono" style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(totalSeleccionado)}</span>
          </div>

          <button
            onClick={crearOrden}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
          >
            <ClipboardList size={14} /> {saving ? "Creando…" : "Crear orden"}
          </button>
          {formError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>}
        </div>
      )}

      {ordenes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no has creado ninguna orden de compra.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ordenes.map((o) => {
            const estadoStyle = ESTADO_COLORES[o.estado] || ESTADO_COLORES.Borrador;
            const expandido = expandidoId === o.id;
            const busyThis = busy === o.id;
            return (
              <div key={o.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="despensa-mono" style={{ fontSize: 13.5, fontWeight: 700 }}>{o.folio}</span>
                      <span
                        className="despensa-tab-font"
                        style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: estadoStyle.bg, color: estadoStyle.color }}
                      >
                        {o.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                      {formatDateDisplay(o.fecha)} · {(o.items || []).length} producto(s) · {formatMoney(totalOrden(o))}
                      {o.proveedorNombre && <> · {o.proveedorNombre}</>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOrdenCompra(o.id)}
                    title="Eliminar orden"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", color: "var(--stamp)", border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <button
                    onClick={() => setExpandidoId(expandido ? null : o.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Ver productos {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {o.estado !== "Completada" && o.estado !== "Cancelada" && (
                    <button
                      onClick={() => {
                        const activando = editandoId !== o.id;
                        setEditandoId(activando ? o.id : null);
                        if (activando) setExpandidoId(o.id);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: editandoId === o.id ? "var(--sage)" : "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <Pencil size={12} /> {editandoId === o.id ? "Listo" : "Editar"}
                    </button>
                  )}
                </div>

                {expandido && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {editandoId === o.id && (
                      <div style={{ marginBottom: 6 }}>
                        <select
                          value={o.proveedorId || ""}
                          onChange={(e) => cambiarProveedorOrden(o, e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, background: "var(--card)" }}
                        >
                          <option value="">Sin proveedor asignado</option>
                          {entidades.map((e) => (
                            <option key={e.docId} value={e.docId}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(o.items || []).length === 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "6px 0" }}>Sin productos en esta orden.</div>
                    )}
                    {(o.items || []).map((it, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", borderRadius: 7, padding: "6px 9px" }}>
                        {o.estado === "Compra presencial" && editandoId !== o.id && (
                          <input type="checkbox" checked={!!it.comprado} onChange={() => toggleCompradoItem(o, idx)} />
                        )}
                        <span style={{ flex: 1, fontSize: 12, minWidth: 0, textDecoration: it.comprado ? "line-through" : "none", color: it.comprado ? "var(--ink-soft)" : "var(--ink)" }}>
                          {it.productName}
                        </span>
                        {editandoId === o.id ? (
                          <input
                            className="despensa-mono"
                            type="number"
                            min="1"
                            value={it.cantidad}
                            onChange={(e) => cambiarCantidadItem(o, idx, e.target.value)}
                            style={{ width: 48, padding: "3px 5px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 11, flexShrink: 0 }}
                          />
                        ) : (
                          <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", flexShrink: 0 }}>x{it.cantidad}</span>
                        )}
                        {it.precioUnitario != null && (
                          <span className="despensa-mono" style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                            {formatMoney(it.precioUnitario * it.cantidad)}
                          </span>
                        )}
                        {editandoId === o.id && (
                          <button
                            onClick={() => eliminarItemOrden(o, idx)}
                            title="Quitar de la orden"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, background: "transparent", color: "var(--stamp)", border: "none", cursor: "pointer", flexShrink: 0 }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}

                    {editandoId === o.id && (
                      <div style={{ marginTop: 6, position: "relative" }}>
                        <Search size={12} style={{ position: "absolute", left: 9, top: 9, color: "var(--ink-soft)" }} />
                        <input
                          placeholder="Buscar producto para agregar…"
                          value={buscarAgregar}
                          onChange={(e) => setBuscarAgregar(e.target.value)}
                          style={{ width: "100%", padding: "7px 9px 7px 28px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12 }}
                        />
                        {buscarAgregar.trim() && (
                          <div style={{ marginTop: 4, maxHeight: 160, overflowY: "auto", border: "1px solid var(--line-soft)", borderRadius: 7 }}>
                            {products
                              .filter((p) => p.name.toLowerCase().includes(buscarAgregar.trim().toLowerCase()))
                              .filter((p) => !(o.items || []).some((it) => it.productId === p.id))
                              .slice(0, 8)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => agregarProductoAOrden(o, p)}
                                  style={{
                                    display: "flex",
                                    width: "100%",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    padding: "6px 9px",
                                    background: "var(--card)",
                                    border: "none",
                                    borderBottom: "1px solid var(--line-soft)",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  <span>{p.name}</span>
                                  <Plus size={12} style={{ color: "var(--sage)", flexShrink: 0 }} />
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {o.estado === "Borrador" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => solicitarAProveedor(o)}
                      disabled={busyThis}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--stamp)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}
                    >
                      <Send size={12} /> Solicitar al proveedor (CSV)
                    </button>
                    <button
                      onClick={() => iniciarCompraPresencial(o)}
                      disabled={busyThis}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--amber)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}
                    >
                      <Store size={12} /> Iniciar compra presencial
                    </button>
                  </div>
                )}

                {o.estado === "Enviada a proveedor" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => descargarCSV(o)}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 7, cursor: "pointer" }}
                    >
                      <Download size={12} /> Descargar CSV de nuevo
                    </button>
                    <button
                      onClick={() => updateOrdenCompra(o.id, { estado: "Completada" })}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}
                    >
                      <Check size={12} /> Marcar como recibida
                    </button>
                  </div>
                )}

                {o.estado === "Compra presencial" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => finalizarCompraPresencial(o)}
                      disabled={busyThis}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}
                    >
                      <Check size={12} /> {busyThis ? "Finalizando…" : "Finalizar compra presencial"}
                    </button>
                    <button
                      onClick={() => cancelarCompraPresencial(o)}
                      disabled={busyThis}
                      title="Vuelve a Borrador para hacerla después"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 7, cursor: "pointer" }}
                    >
                      <X size={12} /> Cancelar (para después)
                    </button>
                  </div>
                )}

                {o.estado === "Completada" && (
                  <button
                    onClick={() => revertirCompletada(o)}
                    disabled={busyThis}
                    title="Deshace el gasto y el historial registrados"
                    style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "var(--card)", color: "var(--stamp)", border: "1px solid var(--line)", borderRadius: 7, cursor: "pointer" }}
                  >
                    <RotateCcw size={12} /> {busyThis ? "Revirtiendo…" : "Revertir compra"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
