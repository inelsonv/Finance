import React, { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Star, BookOpen, BookMarked, BookCheck } from "lucide-react";
import { addLibro, updateLibro, deleteLibro } from "../lib/db";
import { confirm } from "../lib/confirm";

const ESTADOS = ["Pendiente", "Leyendo", "Leído"];
const ESTADO_ICONS = { Pendiente: BookMarked, Leyendo: BookOpen, Leído: BookCheck };
const ESTADO_COLORS = { Pendiente: "var(--ink-soft)", Leyendo: "var(--sage)", Leído: "var(--sage)" };

const emptyForm = () => ({ titulo: "", autor: "", estado: "Pendiente", genero: "", calificacion: 0, notas: "" });

function Estrellas({ valor, onChange, size = 16 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange && onChange(n === valor ? 0 : n)}
          disabled={!onChange}
          style={{ background: "transparent", border: "none", padding: 0, cursor: onChange ? "pointer" : "default" }}
        >
          <Star size={size} fill={n <= valor ? "#d9a441" : "none"} color={n <= valor ? "#d9a441" : "var(--line)"} />
        </button>
      ))}
    </div>
  );
}

export default function Biblioteca({ libros }) {
  const [filtro, setFiltro] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const librosFiltrados = useMemo(() => {
    if (filtro === "Todos") return libros || [];
    return (libros || []).filter((l) => l.estado === filtro);
  }, [libros, filtro]);

  const conteos = useMemo(() => {
    const c = { Pendiente: 0, Leyendo: 0, Leído: 0 };
    for (const l of libros || []) if (c[l.estado] != null) c[l.estado]++;
    return c;
  }, [libros]);

  const handleAdd = async () => {
    if (!form.titulo.trim()) {
      setError("Ponle un título al libro");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addLibro(form);
      setForm(emptyForm());
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (l) => {
    setEditingId(l.id);
    setEditForm({
      titulo: l.titulo || "",
      autor: l.autor || "",
      estado: l.estado || "Pendiente",
      genero: l.genero || "",
      calificacion: l.calificacion || 0,
      notas: l.notas || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm.titulo.trim()) return;
    setEditSaving(true);
    try {
      await updateLibro(editingId, editForm);
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleEliminar = async (l) => {
    if (!(await confirm(`¿Eliminar "${l.titulo}" de tu biblioteca?`))) return;
    await deleteLibro(l.id);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Biblioteca</span>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            background: showForm ? "var(--card)" : "var(--sage)",
            color: showForm ? "var(--ink-soft)" : "#fff",
            border: showForm ? "1px solid var(--line)" : "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancelar" : "Nuevo libro"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <input
            autoFocus
            placeholder="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          <input
            placeholder="Autor"
            value={form.autor}
            onChange={(e) => setForm({ ...form, autor: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          <input
            placeholder="Género (opcional)"
            value={form.genero}
            onChange={(e) => setForm({ ...form, genero: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {ESTADOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm({ ...form, estado: e })}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: form.estado === e ? "2px solid var(--sage)" : "1px solid var(--line)",
                  background: form.estado === e ? "var(--sage-bg)" : "var(--paper)",
                  color: form.estado === e ? "var(--sage)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          {form.estado === "Leído" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>Calificación</div>
              <Estrellas valor={form.calificacion} onChange={(v) => setForm({ ...form, calificacion: v })} />
            </div>
          )}
          <textarea
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            rows={2}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10, resize: "vertical", fontFamily: "inherit" }}
          />
          {error && <div style={{ fontSize: 11.5, color: "var(--stamp)", marginBottom: 8 }}>{error}</div>}
          <button
            onClick={handleAdd}
            disabled={saving || !form.titulo.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              background: form.titulo.trim() ? "var(--sage)" : "var(--line)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: form.titulo.trim() && !saving ? "pointer" : "not-allowed",
            }}
          >
            <Check size={13} /> {saving ? "Guardando…" : "Agregar libro"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["Todos", ...ESTADOS].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 20,
              border: filtro === f ? "1px solid var(--sage)" : "1px solid var(--line)",
              background: filtro === f ? "var(--sage-bg)" : "var(--card)",
              color: filtro === f ? "var(--sage)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {f} {f !== "Todos" && `(${conteos[f] || 0})`}
          </button>
        ))}
      </div>

      {librosFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {filtro === "Todos" ? "Todavía no tienes libros en tu biblioteca." : `No tienes libros en "${filtro}".`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {librosFiltrados.map((l) => {
            const IconEstado = ESTADO_ICONS[l.estado] || BookMarked;
            return (
              <div key={l.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
                {editingId === l.id ? (
                  <div>
                    <input
                      autoFocus
                      value={editForm.titulo}
                      onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                    />
                    <input
                      value={editForm.autor}
                      onChange={(e) => setEditForm({ ...editForm, autor: e.target.value })}
                      placeholder="Autor"
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {ESTADOS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, estado: e })}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 8,
                            border: editForm.estado === e ? "2px solid var(--sage)" : "1px solid var(--line)",
                            background: editForm.estado === e ? "var(--sage-bg)" : "var(--paper)",
                            color: editForm.estado === e ? "var(--sage)" : "var(--ink-soft)",
                            cursor: "pointer",
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    {editForm.estado === "Leído" && (
                      <div style={{ marginBottom: 10 }}>
                        <Estrellas valor={editForm.calificacion} onChange={(v) => setEditForm({ ...editForm, calificacion: v })} />
                      </div>
                    )}
                    <textarea
                      value={editForm.notas}
                      onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                      rows={2}
                      placeholder="Notas"
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10, resize: "vertical", fontFamily: "inherit" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
                      >
                        <Check size={12} /> Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, background: "var(--paper)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{l.titulo}</div>
                      {l.autor && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>{l.autor}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: l.notas ? 6 : 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: ESTADO_COLORS[l.estado] }}>
                          <IconEstado size={12} /> {l.estado}
                        </span>
                        {l.genero && <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>· {l.genero}</span>}
                        {l.estado === "Leído" && l.calificacion > 0 && <Estrellas valor={l.calificacion} size={12} />}
                      </div>
                      {l.notas && <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>{l.notas}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(l)}
                        title="Editar"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleEliminar(l)}
                        title="Eliminar"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--stamp)", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
