import React, { useMemo, useState } from "react";
import {
  Plus,
  X,
  Check,
  Flame,
  Trash2,
  Droplet,
  Salad,
  Dumbbell,
  Moon,
  BookOpen,
  Sun,
  Star,
  HandHeart,
  Church,
  Heart,
  Sparkles,
  Sunrise,
  Coffee,
  Bike,
  Footprints,
  Brain,
  Smile,
  Music,
  Palette,
  PenTool,
  GraduationCap,
  Leaf,
  Users,
  Phone,
  MessageCircle,
  Gift,
  Target,
  Bed,
  Apple,
  Pill,
  Wallet,
  PiggyBank,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { addHabito, deleteHabito, toggleHabitoRegistro, reordenarHabitos, updateHabito } from "../lib/db";
import { calcularRachaHabito, historialHabitoVisual, periodoDeFecha, periodosSinCumplir } from "../lib/rachaHabito";
import { lanzarMonedaHaciaTrofeo } from "../lib/monedaVolando";
import { confirm } from "../lib/confirm";

// Lucide no tiene un ícono de "manos orando" — este es de Phosphor Icons
// (versión "thin"), la librería tenía uno específico para esto y con un
// trazo delgado parecido al contorno del resto de los íconos.
function PrayingHands({ size = 24, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M232.49,182.83l-37-37L158.79,24.62A17.77,17.77,0,0,0,128,18.56a17.77,17.77,0,0,0-30.79,6.06L60.46,145.88l-36.95,37a12,12,0,0,0,0,17L56.2,232.49a12,12,0,0,0,17,0l48.28-48.29a36,36,0,0,0,6.55-8.94,36,36,0,0,0,6.55,8.94l48.28,48.29a12,12,0,0,0,17,0l32.69-32.69A12,12,0,0,0,232.49,182.83Zm-165,44a4,4,0,0,1-5.66,0L29.17,194.15a4,4,0,0,1,0-5.66L44.68,173,83,211.32Zm48.29-48.28L88.68,205.66,50.34,167.32l16.48-16.49a3.92,3.92,0,0,0,1-1.67l37-122.22A9.78,9.78,0,0,1,124,29.78v129A27.81,27.81,0,0,1,115.8,178.55Zm16.2-19.8v-129a9.78,9.78,0,0,1,19.14-2.84l37,122.22a3.92,3.92,0,0,0,1,1.67l17.38,17.38-39.18,37.51L140.2,178.55A27.81,27.81,0,0,1,132,158.75Zm94.83,35.4-32.68,32.68a4,4,0,0,1-5.66,0L173,211.38l39.18-37.51,14.61,14.62A4,4,0,0,1,226.83,194.15Z" />
    </svg>
  );
}

const ICONOS_HABITO = {
  check: Check,
  droplet: Droplet,
  salad: Salad,
  dumbbell: Dumbbell,
  moon: Moon,
  book: BookOpen,
  sun: Sun,
  star: Star,
  handHeart: HandHeart,
  prayingHands: PrayingHands,
  church: Church,
  heart: Heart,
  sparkles: Sparkles,
  sunrise: Sunrise,
  coffee: Coffee,
  bike: Bike,
  footprints: Footprints,
  brain: Brain,
  smile: Smile,
  music: Music,
  palette: Palette,
  penTool: PenTool,
  graduationCap: GraduationCap,
  leaf: Leaf,
  users: Users,
  phone: Phone,
  messageCircle: MessageCircle,
  gift: Gift,
  target: Target,
  bed: Bed,
  apple: Apple,
  pill: Pill,
  wallet: Wallet,
  piggyBank: PiggyBank,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function HabitTracker({ habitos, habitosRegistro }) {
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("check");
  const [frecuencia, setFrecuencia] = useState("Diario");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hoy = new Date();
  const [dragId, setDragId] = useState(null);
  const [ordenLocal, setOrdenLocal] = useState(null);

  const habitosOrdenados = useMemo(() => {
    if (ordenLocal) return ordenLocal;
    return [...(habitos || [])].sort((a, b) => {
      const oa = a.orden ?? 999999;
      const ob = b.orden ?? 999999;
      return oa - ob;
    });
  }, [habitos, ordenLocal]);

  const handleDragStart = (id) => setDragId(id);

  const handleDragOver = (e, sobreId) => {
    e.preventDefault();
    if (!dragId || dragId === sobreId) return;
    const listaBase = ordenLocal || habitosOrdenados;
    const desdeIdx = listaBase.findIndex((h) => h.id === dragId);
    const haciaIdx = listaBase.findIndex((h) => h.id === sobreId);
    if (desdeIdx === -1 || haciaIdx === -1) return;
    const nuevaLista = [...listaBase];
    const [movido] = nuevaLista.splice(desdeIdx, 1);
    nuevaLista.splice(haciaIdx, 0, movido);
    setOrdenLocal(nuevaLista);
  };

  const handleDragEnd = async () => {
    setDragId(null);
    if (ordenLocal) {
      await reordenarHabitos(ordenLocal.map((h) => h.id));
      setOrdenLocal(null);
    }
  };

  const moverHabito = async (idx, dir) => {
    const otroIdx = idx + dir;
    if (otroIdx < 0 || otroIdx >= habitosOrdenados.length) return;
    const nuevaLista = [...habitosOrdenados];
    [nuevaLista[idx], nuevaLista[otroIdx]] = [nuevaLista[otroIdx], nuevaLista[idx]];
    await reordenarHabitos(nuevaLista.map((h) => h.id));
  };

  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editIcono, setEditIcono] = useState("check");
  const [editFrecuencia, setEditFrecuencia] = useState("Diario");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const openEdit = (h) => {
    setEditingId(h.id);
    setEditNombre(h.nombre);
    setEditIcono(h.icono || "check");
    setEditFrecuencia(h.frecuencia || "Diario");
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editNombre.trim()) {
      setEditError("Ponle un nombre al hábito");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateHabito(editingId, { nombre: editNombre.trim(), icono: editIcono, frecuencia: editFrecuencia });
      setEditingId(null);
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };


  const fechasPorHabito = useMemo(() => {
    const map = {};
    for (const r of habitosRegistro || []) {
      if (!map[r.habitoId]) map[r.habitoId] = [];
      map[r.habitoId].push(r.fecha);
    }
    return map;
  }, [habitosRegistro]);

  const handleAdd = async () => {
    if (!nombre.trim()) {
      setError("Ponle un nombre al hábito");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addHabito(nombre, icono, frecuencia);
      setNombre("");
      setIcono("check");
      setFrecuencia("Diario");
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (h) => {
    if (!(await confirm(`¿Eliminar el hábito "${h.nombre}"? Se pierde su historial y racha.`))) return;
    await deleteHabito(h.id);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Hábitos</span>
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
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancelar" : "Nuevo hábito"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <input
            autoFocus
            placeholder="Nombre, ej. Consumo de agua"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["Diario", "Semanal", "Mensual"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrecuencia(f)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: frecuencia === f ? "2px solid var(--sage)" : "1px solid var(--line)",
                  background: frecuencia === f ? "var(--sage-bg)" : "var(--paper)",
                  color: frecuencia === f ? "var(--sage)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {Object.keys(ICONOS_HABITO).map((key) => {
              const Icon = ICONOS_HABITO[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcono(key)}
                  style={{
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    border: icono === key ? "2px solid var(--sage)" : "1px solid var(--line)",
                    background: icono === key ? "var(--sage-bg)" : "var(--paper)",
                    color: icono === key ? "var(--sage)" : "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
          >
            <Check size={13} /> {saving ? "Guardando…" : "Crear hábito"}
          </button>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
        </div>
      )}

      {(habitos || []).length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          Todavía no tienes hábitos. Crea el primero — por ejemplo, "Buena alimentación" o "Consumo de agua".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {habitosOrdenados.map((h, idx) => {
            const Icon = ICONOS_HABITO[h.icono] || Check;
            const frecuenciaHabito = h.frecuencia || "Diario";
            const fechas = fechasPorHabito[h.id] || [];
            const racha = calcularRachaHabito(fechas, frecuenciaHabito, hoy);
            const historial = historialHabitoVisual(fechas, frecuenciaHabito, hoy);
            const periodoActual = periodoDeFecha(frecuenciaHabito, hoy);
            const cumplidoHoy = fechas.includes(periodoActual);
            const etiquetaPeriodo = frecuenciaHabito === "Semanal" ? "esta semana" : frecuenciaHabito === "Mensual" ? "este mes" : "hoy";
            const sinCumplir = periodosSinCumplir(fechas, frecuenciaHabito, hoy);
            const colorEstado = cumplidoHoy ? "var(--sage)" : sinCumplir <= 2 ? "#d9a441" : "var(--stamp)";
            const colorEstadoBg = cumplidoHoy ? "var(--sage-bg)" : sinCumplir <= 2 ? "rgba(217,164,65,0.15)" : "var(--stamp-bg)";
            return (
              <div
                key={h.id}
                draggable={editingId !== h.id}
                onDragStart={() => handleDragStart(h.id)}
                onDragOver={(e) => handleDragOver(e, h.id)}
                onDragEnd={handleDragEnd}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 12,
                  opacity: dragId === h.id ? 0.5 : 1,
                }}
              >
                {editingId === h.id ? (
                  <div>
                    <input
                      autoFocus
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["Diario", "Semanal", "Mensual"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setEditFrecuencia(f)}
                          style={{
                            flex: 1,
                            padding: "6px 4px",
                            fontSize: 11.5,
                            fontWeight: 500,
                            borderRadius: 8,
                            border: editFrecuencia === f ? "2px solid var(--sage)" : "1px solid var(--line)",
                            background: editFrecuencia === f ? "var(--sage-bg)" : "var(--paper)",
                            color: editFrecuencia === f ? "var(--sage)" : "var(--ink-soft)",
                            cursor: "pointer",
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      {Object.keys(ICONOS_HABITO).map((key) => {
                        const IconOpt = ICONOS_HABITO[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditIcono(key)}
                            style={{
                              width: 28,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 8,
                              border: editIcono === key ? "2px solid var(--sage)" : "1px solid var(--line)",
                              background: editIcono === key ? "var(--sage-bg)" : "var(--paper)",
                              color: editIcono === key ? "var(--sage)" : "var(--ink-soft)",
                              cursor: "pointer",
                            }}
                          >
                            <IconOpt size={13} />
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: editSaving ? "not-allowed" : "pointer" }}
                      >
                        <Check size={12} /> {editSaving ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                      >
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                    {editError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>}
                  </div>
                ) : (
                  <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div title="Arrastra para reordenar" style={{ cursor: "grab", color: "var(--ink-soft)", flexShrink: 0, touchAction: "none" }}>
                    <GripVertical size={14} />
                  </div>
                  <button
                    onClick={(e) => {
                      if (!cumplidoHoy) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        lanzarMonedaHaciaTrofeo(rect.left + rect.width / 2, rect.top + rect.height / 2);
                      }
                      toggleHabitoRegistro(h.id, periodoActual, h.nombre);
                    }}
                    title={cumplidoHoy ? `Cumplido ${etiquetaPeriodo} — toca para desmarcar` : `Marcar ${etiquetaPeriodo}`}
                    style={{
                      position: "relative",
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: colorEstadoBg,
                      color: colorEstado,
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <Icon size={16} />
                    {cumplidoHoy && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 15,
                          height: 15,
                          borderRadius: "50%",
                          background: "var(--sage)",
                          border: "2px solid var(--card)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {h.nombre}
                      {frecuenciaHabito !== "Diario" && (
                        <span style={{ fontSize: 9.5, fontWeight: 500, color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 10, padding: "1px 6px" }}>
                          {frecuenciaHabito}
                        </span>
                      )}
                    </div>
                    {racha > 0 && (
                      <div style={{ fontSize: 11, color: "var(--stamp)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Flame size={11} /> {racha} {frecuenciaHabito === "Semanal" ? `semana${racha !== 1 ? "s" : ""}` : frecuenciaHabito === "Mensual" ? `mes${racha !== 1 ? "es" : ""}` : `día${racha !== 1 ? "s" : ""}`} seguido{racha !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button
                      onClick={() => moverHabito(idx, -1)}
                      disabled={idx === 0}
                      title="Subir"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 13, background: "transparent", color: idx === 0 ? "var(--line)" : "var(--ink-soft)", border: "none", cursor: idx === 0 ? "default" : "pointer" }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => moverHabito(idx, 1)}
                      disabled={idx === habitosOrdenados.length - 1}
                      title="Bajar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 13, background: "transparent", color: idx === habitosOrdenados.length - 1 ? "var(--line)" : "var(--ink-soft)", border: "none", cursor: idx === habitosOrdenados.length - 1 ? "default" : "pointer" }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => openEdit(h)}
                    title="Editar hábito"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleEliminar(h)}
                    title="Eliminar hábito"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                  >
                    <Trash2 size={12} />
                  </button>                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {historial.map((d) => (
                    <div
                      key={d.periodo}
                      title={d.periodo}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 4,
                        background: d.completado ? "var(--sage)" : "var(--line-soft)",
                        border: d.esActual ? "1px solid var(--ink)" : "none",
                      }}
                    />
                  ))}
                </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
