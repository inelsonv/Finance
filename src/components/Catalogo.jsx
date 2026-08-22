import React, { useMemo, useState } from "react";
import { Plus, Trash2, Search, X } from "lucide-react";
import { addProduct, deleteProduct, updateProductPrice, addToList, incrementListQty } from "../lib/db";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];
const UNITS = ["unidad", "kg", "g", "l", "ml", "paquete", "rollo"];

function formatDate(ts) {
  if (!ts) return "sin compras registradas";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Catalogo({ products, list }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    setFormError(null);
    try {
      const price = parseFloat(form.price);
      await addProduct({
        name,
        category: form.category,
        unit: form.unit,
        price: Number.isFinite(price) ? price : 0,
      });
      setForm({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "" });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePriceBlur = (id, value) => {
    const price = parseFloat(value);
    if (Number.isFinite(price)) updateProductPrice(id, price);
  };

  const handleAddToList = async (id) => {
    const existing = list.find((it) => it.id === id);
    if (existing) {
      await incrementListQty(id, existing.qty || 1, 1);
    } else {
      await addToList(id);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--card)",
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar producto"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div
            className="despensa-formgrid"
            style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr", gap: 8, marginBottom: 10 }}
          >
            <input
              autoFocus
              placeholder="Nombre del producto"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.name.trim() || saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: form.name.trim() ? "var(--sage)" : "var(--line)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: form.name.trim() && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Guardando…" : "Guardar producto"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>
              No se pudo guardar: {formError}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {products.length === 0
            ? "Tu catálogo está vacío. Agrega tu primer producto."
            : "No hay productos que coincidan con la búsqueda."}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="despensa-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                  {p.category} · por {p.unit} · actualizado: {formatDate(p.updatedAt)}
                </div>
              </div>
              <div className="despensa-mono" style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 13 }}>
                $
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(p.price || 0).toFixed(2)}
                  key={p.price}
                  onBlur={(e) => handlePriceBlur(p.id, e.target.value)}
                  style={{
                    width: 64,
                    padding: "5px 6px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "IBM Plex Mono, monospace",
                    textAlign: "right",
                  }}
                />
              </div>
              <button
                onClick={() => handleAddToList(p.id)}
                title="Agregar a la lista de compra"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  background: "var(--sage-bg)",
                  color: "var(--sage)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Plus size={15} />
              </button>
              <button
                onClick={() => deleteProduct(p.id)}
                title="Eliminar producto"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  background: "transparent",
                  color: "var(--stamp)",
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
