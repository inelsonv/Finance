import React, { useMemo, useState } from "react";
import { Plus, Trash2, Search, X, MapPin, Phone, Pencil, Check } from "lucide-react";
import { addEntidad, deleteEntidad, updateEntidad } from "../lib/db";

const TYPES = [
  "Banco",
  "Supermercado",
  "Farmacia",
  "Institución de gobierno",
  "Ferretería",
  "Aseguradora",
  "Otro",
];

export default function Entidades({ entidades }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: TYPES[0], address: "", phone: "", notes: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entidades;
    return entidades.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.address || "").toLowerCase().includes(q)
    );
  }, [entidades, search]);

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    setFormError(null);
    try {
      await addEntidad({ ...form, name });
      setForm({ name: "", type: TYPES[0], address: "", phone: "", notes: "" });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditingId(e.docId);
    setEditForm({ name: e.name || "", type: e.type || TYPES[0], address: e.address || "", phone: e.phone || "", notes: e.notes || "" });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    const name = editForm.name.trim();
    if (!name) {
      setEditError("El nombre no puede estar vacío");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateEntidad(editingId, { ...editForm, name });
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
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
            placeholder="Buscar entidad, tipo o dirección"
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
          {showForm ? "Cancelar" : "Agregar entidad"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div
            className="despensa-formgrid"
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}
          >
            <input
              autoFocus
              placeholder="Nombre, ej. Banco Popular Dominicano"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div
            className="despensa-formgrid"
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}
          >
            <input
              placeholder="Dirección (opcional)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              placeholder="Teléfono (opcional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
          <input
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />
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
            {saving ? "Guardando…" : "Guardar entidad"}
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
          {entidades.length === 0
            ? "Todavía no registraste ninguna entidad. Agrega la primera."
            : "No hay entidades que coincidan con la búsqueda."}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {filtered.map((e, i) => (
            <div
              key={e.docId}
              className="despensa-row"
              style={{
                padding: "10px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
            >
              {editingId === e.docId ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      autoFocus
                      value={editForm.name}
                      onChange={(ev) => setEditForm({ ...editForm, name: ev.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.type}
                      onChange={(ev) => setEditForm({ ...editForm, type: ev.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Dirección (opcional)"
                      value={editForm.address}
                      onChange={(ev) => setEditForm({ ...editForm, address: ev.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      placeholder="Teléfono (opcional)"
                      value={editForm.phone}
                      onChange={(ev) => setEditForm({ ...editForm, phone: ev.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <input
                    placeholder="Notas (opcional)"
                    value={editForm.notes}
                    onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={editSaving}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: editSaving ? "not-allowed" : "pointer" }}
                    >
                      <Check size={14} /> {editSaving ? "Guardando…" : "Guardar cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: "7px 14px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="despensa-mono"
                    style={{ fontSize: 11, color: "var(--ink-soft)", width: 28, flexShrink: 0 }}
                  >
                    #{e.num}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{e.type}</span>
                      {e.address && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={11} /> {e.address}
                        </span>
                      )}
                      {e.phone && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Phone size={11} /> {e.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(e)}
                    title="Editar entidad"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 30,
                      height: 30,
                      background: "transparent",
                      color: "var(--ink-soft)",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteEntidad(e.docId)}
                    title="Eliminar entidad"
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
