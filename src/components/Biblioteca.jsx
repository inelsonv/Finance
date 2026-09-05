import React, { useMemo, useRef, useState } from "react";
import { Plus, Trash2, X, Pencil, Check, Star, BookOpen, BookMarked, BookCheck, Search, Loader2, Upload, FileText } from "lucide-react";
import { addLibro, updateLibro, deleteLibro, uploadLibroEpub, eliminarLibroEpub } from "../lib/db";
import { buscarPortadasLibro } from "../lib/openLibrary";
import { confirm } from "../lib/confirm";
import LectorEpub from "./LectorEpub.jsx";

const ESTADOS = ["Pendiente", "Leyendo", "Leído"];
const ESTADO_ICONS = { Pendiente: BookMarked, Leyendo: BookOpen, Leído: BookCheck };
const ESTADO_COLORS = { Pendiente: "var(--ink-soft)", Leyendo: "var(--sage)", Leído: "var(--sage)" };

const emptyForm = () => ({ titulo: "", autor: "", estado: "Pendiente", genero: "", calificacion: 0, notas: "", portadaUrl: null });

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

function Portada({ url, size = 52, tall = false }) {
  const esPorcentaje = size === "100%";
  return (
    <div
      style={{
        width: esPorcentaje ? "100%" : size,
        aspectRatio: "1 / 1.45",
        height: esPorcentaje ? "auto" : size * 1.45,
        borderRadius: 6,
        background: url ? `url(${url}) center/cover` : "var(--paper)",
        border: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!url && <BookMarked size={esPorcentaje ? 28 : size * 0.4} style={{ color: "var(--line)" }} />}
    </div>
  );
}

function SelectorPortada({ titulo, autor, portadaUrl, onSelect }) {
  const [buscando, setBuscando] = useState(false);
  const [candidatos, setCandidatos] = useState(null);
  const [error, setError] = useState(null);

  const buscar = async () => {
    if (!titulo?.trim()) return;
    setBuscando(true);
    setError(null);
    setCandidatos(null);
    try {
      const resultados = await buscarPortadasLibro(titulo.trim(), autor?.trim());
      if (resultados.length === 0) {
        setError("No se encontraron portadas para ese título/autor.");
      } else {
        setCandidatos(resultados);
      }
    } catch (err) {
      setError("No se pudo buscar: " + (err.message || String(err)));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Portada url={portadaUrl} size={44} />
        <button
          type="button"
          onClick={buscar}
          disabled={buscando || !titulo?.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            fontSize: 11.5,
            fontWeight: 500,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink-soft)",
            cursor: titulo?.trim() ? "pointer" : "not-allowed",
          }}
        >
          {buscando ? <Loader2 size={12} className="despensa-spin" /> : <Search size={12} />}
          {buscando ? "Buscando…" : "Buscar portada"}
        </button>
        {portadaUrl && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{ fontSize: 11, color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Quitar
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: "var(--stamp)", marginBottom: 6 }}>{error}</div>}
      {candidatos && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {candidatos.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(c.portadaUrl);
                setCandidatos(null);
              }}
              title={`${c.titulo}${c.anio ? " (" + c.anio + ")" : ""}`}
              style={{ padding: 0, border: portadaUrl === c.portadaUrl ? "2px solid var(--sage)" : "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: "transparent" }}
            >
              <img src={c.portadaUrl} alt={c.titulo} style={{ width: 42, height: 60, objectFit: "cover", borderRadius: 4, display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Biblioteca({ libros }) {
  const [filtro, setFiltro] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [libroLeyendo, setLibroLeyendo] = useState(null);
  const [subiendoEpub, setSubiendoEpub] = useState(false);
  const epubInputRef = useRef(null);

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

  const [libroRecienCreado, setLibroRecienCreado] = useState(null);

  const handleAdd = async () => {
    if (!form.titulo.trim()) {
      setError("Ponle un título al libro");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const docRef = await addLibro(form);
      setLibroRecienCreado({ id: docRef.id, titulo: form.titulo, epubUrl: null, epubNombreArchivo: null });
      setForm(emptyForm());
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const cerrarLibroRecienCreado = () => {
    setLibroRecienCreado(null);
    setShowForm(false);
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
      portadaUrl: l.portadaUrl || null,
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

  const handleSubirEpub = async (libroId, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".epub")) {
      alert("Ese archivo no parece ser un .epub");
      return;
    }
    setSubiendoEpub(true);
    try {
      await uploadLibroEpub(libroId, file);
    } catch (err) {
      alert("No se pudo subir el archivo: " + (err.message || String(err)));
    } finally {
      setSubiendoEpub(false);
    }
  };

  const handleQuitarEpub = async (libroId) => {
    if (!(await confirm("¿Quitar el archivo epub de este libro?"))) return;
    await eliminarLibroEpub(libroId);
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
          {libroRecienCreado ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                ✓ "{libroRecienCreado.titulo}" agregado
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
                ¿Tienes el archivo .epub a mano? Puedes subirlo ahora, o hacerlo después editando el libro.
              </div>
              <div style={{ padding: 10, background: "var(--paper)", borderRadius: 8, marginBottom: 12 }}>
                {libroRecienCreado.epubUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={14} style={{ color: "var(--sage)" }} />
                    <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{libroRecienCreado.epubNombreArchivo}</span>
                  </div>
                ) : (
                  <>
                    <input
                      ref={epubInputRef}
                      type="file"
                      accept=".epub"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleSubirEpub(libroRecienCreado.id, file);
                        setLibroRecienCreado((prev) => ({ ...prev, epubUrl: "pendiente", epubNombreArchivo: file.name }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => epubInputRef.current?.click()}
                      disabled={subiendoEpub}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 11.5, fontWeight: 500, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
                    >
                      {subiendoEpub ? <Loader2 size={12} className="despensa-spin" /> : <Upload size={12} />}
                      {subiendoEpub ? "Subiendo…" : "Subir archivo .epub"}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={cerrarLibroRecienCreado}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                <Check size={13} /> Listo
              </button>
            </div>
          ) : (
            <>
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
          <SelectorPortada titulo={form.titulo} autor={form.autor} portadaUrl={form.portadaUrl} onSelect={(url) => setForm({ ...form, portadaUrl: url })} />
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
            </>
          )}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
          {librosFiltrados.map((l) => {
            const IconEstado = ESTADO_ICONS[l.estado] || BookMarked;
            const editando = editingId === l.id;
            return (
              <div
                key={l.id}
                style={{
                  gridColumn: editando ? "1 / -1" : "auto",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: editando ? 12 : 8,
                  display: editando ? "block" : "flex",
                  flexDirection: "column",
                }}
              >
                {editando ? (
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
                    <SelectorPortada
                      titulo={editForm.titulo}
                      autor={editForm.autor}
                      portadaUrl={editForm.portadaUrl}
                      onSelect={(url) => setEditForm({ ...editForm, portadaUrl: url })}
                    />
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
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
                    <div style={{ marginBottom: 10, padding: 10, background: "var(--paper)", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Archivo del libro (.epub)</div>
                      {l.epubUrl ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FileText size={14} style={{ color: "var(--sage)" }} />
                          <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.epubNombreArchivo || "libro.epub"}</span>
                          <button
                            type="button"
                            onClick={() => handleQuitarEpub(l.id)}
                            style={{ fontSize: 11, color: "var(--stamp)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={epubInputRef}
                            type="file"
                            accept=".epub"
                            style={{ display: "none" }}
                            onChange={(e) => handleSubirEpub(l.id, e.target.files?.[0])}
                          />
                          <button
                            type="button"
                            onClick={() => epubInputRef.current?.click()}
                            disabled={subiendoEpub}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 11.5, fontWeight: 500, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
                          >
                            {subiendoEpub ? <Loader2 size={12} className="despensa-spin" /> : <Upload size={12} />}
                            {subiendoEpub ? "Subiendo…" : "Subir archivo .epub"}
                          </button>
                        </>
                      )}
                    </div>
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
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <Portada url={l.portadaUrl} size="100%" tall />
                      {l.progresoPct != null && l.progresoPct > 0 && (
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: "rgba(0,0,0,0.35)" }}>
                          <div style={{ width: `${l.progresoPct}%`, height: "100%", background: "var(--sage)" }} />
                        </div>
                      )}
                      <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                        <button
                          onClick={() => startEdit(l)}
                          title="Editar"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleEliminar(l)}
                          title="Eliminar"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 }}>{l.titulo}</div>
                      {l.autor && <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>{l.autor}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: ESTADO_COLORS[l.estado] }}>
                          <IconEstado size={11} /> {l.estado}
                        </span>
                        {l.estado === "Leyendo" && l.progresoPct != null && l.progresoPct > 0 && (
                          <span className="despensa-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>· {l.progresoPct}%</span>
                        )}
                      </div>
                      {l.estado === "Leído" && l.calificacion > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <Estrellas valor={l.calificacion} size={11} />
                        </div>
                      )}
                    </div>
                    {l.epubUrl && (
                      <button
                        onClick={() => setLibroLeyendo(l)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          width: "100%",
                          marginTop: 6,
                          padding: "5px 0",
                          fontSize: 11,
                          fontWeight: 600,
                          background: "var(--sage-bg)",
                          color: "var(--sage)",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        <BookOpen size={11} /> Leer
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {libroLeyendo && (
        <LectorEpub
          epubUrl={libroLeyendo.epubUrl}
          titulo={libroLeyendo.titulo}
          libroId={libroLeyendo.id}
          ultimaPosicion={libroLeyendo.ultimaPosicion}
          marcadores={libroLeyendo.marcadores}
          onClose={() => setLibroLeyendo(null)}
        />
      )}
    </div>
  );
}
