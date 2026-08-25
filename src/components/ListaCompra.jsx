import React, { useMemo, useState } from "react";
import { Plus, Minus, Check, X, RotateCcw } from "lucide-react";
import {
  addToList,
  incrementListQty,
  setListChecked,
  removeFromList,
  updateProducto,
  registrarCompraProducto,
} from "../lib/db";
import { registrarReposicion } from "../lib/inventario";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toFixed(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ListaCompra({ products, list }) {
  const [confirmReset, setConfirmReset] = useState(false);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => (m[p.id] = p));
    return m;
  }, [products]);

  const rows = useMemo(
    () => list.map((it) => ({ ...it, product: productMap[it.id] })).filter((r) => r.product),
    [list, productMap]
  );

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.product.price * r.qty, 0), [rows]);

  const handleQuickAdd = async (id) => {
    const existing = list.find((it) => it.id === id);
    if (existing) {
      await incrementListQty(id, existing.qty || 1, 1);
    } else {
      await addToList(id);
    }
  };

  const handleToggleChecked = async (row) => {
    const marcandoComoComprado = !row.checked;
    await setListChecked(row.id, marcandoComoComprado);
    if (marcandoComoComprado) {
      registrarCompraProducto({
        productId: row.product.id,
        productName: row.product.name,
        fecha: todayStr(),
        cantidad: row.qty || 1,
      });
      if (row.product.seguimiento) {
        const cambios = registrarReposicion(row.product, row.qty || 1);
        await updateProducto(row.product.id, cambios);
      }
    }
  };

  const clearChecked = async () => {
    await Promise.all(rows.filter((r) => r.checked).map((r) => removeFromList(r.id)));
  };

  const clearAll = async () => {
    await Promise.all(rows.map((r) => removeFromList(r.id)));
    setConfirmReset(false);
  };

  return (
    <div>
      {products.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Agregar rápido desde el catálogo
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => handleQuickAdd(p.id)}
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Tu lista de compra está vacía. Agrega productos desde el catálogo.
        </div>
      ) : (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "1.25rem 1.1rem 1rem",
          }}
        >
          <div className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginBottom: 10, letterSpacing: "0.08em" }}>
            TICKET DE COMPRA · {new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <div style={{ borderTop: "1px dashed var(--line)", marginBottom: 8 }} />
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
              <button
                onClick={() => handleToggleChecked(r)}
                title={r.checked ? "Marcar como pendiente" : "Marcar como comprado"}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: r.checked ? "none" : "1px solid var(--muted-line)",
                  background: r.checked ? "var(--sage)" : "transparent",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                {r.checked && <Check size={12} />}
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: r.checked ? "var(--muted-line)" : "var(--ink)",
                  textDecoration: r.checked ? "line-through" : "none",
                  flexShrink: 0,
                  maxWidth: "38%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.product.name}
              </span>
              <span style={{ flex: 1, borderBottom: "1px dotted var(--line)", marginBottom: 4 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => incrementListQty(r.id, r.qty, -1)}
                  style={{ width: 20, height: 20, border: "1px solid var(--line)", background: "var(--card)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Minus size={11} />
                </button>
                <span className="despensa-mono" style={{ fontSize: 12, width: 18, textAlign: "center" }}>{r.qty}</span>
                <button
                  onClick={() => incrementListQty(r.id, r.qty, 1)}
                  style={{ width: 20, height: 20, border: "1px solid var(--line)", background: "var(--card)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Plus size={11} />
                </button>
              </div>
              <span className="despensa-mono" style={{ fontSize: 13, width: 60, textAlign: "right", color: r.checked ? "var(--muted-line)" : "var(--ink)", flexShrink: 0 }}>
                {formatMoney(r.product.price * r.qty)}
              </span>
              <button
                onClick={() => removeFromList(r.id)}
                style={{ background: "transparent", border: "none", color: "var(--muted-line)", cursor: "pointer", padding: 2, flexShrink: 0 }}
                title="Quitar de la lista"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <div style={{ borderTop: "1px dashed var(--line)", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>TOTAL</span>
            <span className="despensa-mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--stamp)" }}>{formatMoney(total)}</span>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button
            onClick={clearChecked}
            style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--line)", background: "var(--card)", borderRadius: 7, cursor: "pointer", color: "var(--ink-soft)" }}
          >
            Quitar comprados
          </button>
          {confirmReset ? (
            <button
              onClick={clearAll}
              style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--stamp)", background: "var(--stamp-bg)", borderRadius: 7, cursor: "pointer", color: "var(--stamp)" }}
            >
              Confirmar: vaciar lista
            </button>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 12px", border: "1px solid var(--line)", background: "var(--card)", borderRadius: 7, cursor: "pointer", color: "var(--ink-soft)" }}
            >
              <RotateCcw size={12} /> Vaciar lista
            </button>
          )}
        </div>
      )}
    </div>
  );
}
