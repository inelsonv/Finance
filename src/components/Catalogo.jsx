import React, { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, X, Image as ImageIcon, Camera } from "lucide-react";
import {
  addProduct,
  deleteProduct,
  updateProductPrice,
  addToList,
  incrementListQty,
  uploadProductImage,
  removeProductImage,
} from "../lib/db";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];
const UNITS = ["unidad", "kg", "g", "l", "ml", "paquete", "rollo"];

export default function Catalogo({ products, list }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "" });
  const [formImage, setFormImage] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const formFileRef = useRef(null);
  const rowFileRefs = useRef({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleFormImagePick = (file) => {
    if (!file) return;
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    setFormError(null);
    try {
      const price = parseFloat(form.price);
      const docRef = await addProduct({
        name,
        category: form.category,
        unit: form.unit,
        price: Number.isFinite(price) ? price : 0,
      });
      if (formImage) {
        await uploadProductImage(docRef.id, formImage);
      }
      setForm({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "" });
      setFormImage(null);
      setFormImagePreview(null);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRowImagePick = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      await uploadProductImage(id, file);
    } catch (err) {
      // el error se ve reflejado si el producto no actualiza su imagen
    } finally {
      setUploadingId(null);
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
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              ref={formFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFormImagePick(e.target.files[0])}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => formFileRef.current?.click()}
              title="Agregar foto"
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 8,
                border: "1px dashed var(--line)",
                background: formImagePreview ? `url(${formImagePreview}) center/cover` : "var(--card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-soft)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {!formImagePreview && <Camera size={18} />}
            </button>
            <div
              className="despensa-formgrid"
              style={{ flex: 1, display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr", gap: 8 }}
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
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <input
                ref={(el) => (rowFileRefs.current[p.id] = el)}
                type="file"
                accept="image/*"
                onChange={(e) => handleRowImagePick(p.id, e.target.files[0])}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => rowFileRefs.current[p.id]?.click()}
                title={p.imageUrl ? "Cambiar foto" : "Agregar foto"}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  border: "none",
                  borderBottom: "1px solid var(--line-soft)",
                  background: p.imageUrl ? `url(${p.imageUrl}) center/cover` : "var(--paper)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  padding: 0,
                  opacity: uploadingId === p.id ? 0.5 : 1,
                }}
              >
                {!p.imageUrl && <ImageIcon size={26} />}
              </button>

              <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    minHeight: 32,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2, marginBottom: 8 }}>
                  {p.category} · por {p.unit}
                </div>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="despensa-mono" style={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12.5, flex: 1, minWidth: 0 }}>
                    $
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(p.price || 0).toFixed(2)}
                      key={p.price}
                      onBlur={(e) => handlePriceBlur(p.id, e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 0,
                        padding: "4px 5px",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        fontSize: 12.5,
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
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    title="Eliminar producto"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      background: "transparent",
                      color: "var(--stamp)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
