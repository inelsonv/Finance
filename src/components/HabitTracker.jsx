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
} from "lucide-react";
import { addHabito, deleteHabito, toggleHabitoRegistro, reordenarHabitos } from "../lib/db";
import { calcularRachaHabito, historialHabitoVisual } from "../lib/rachaHabito";
import { confirm } from "../lib/confirm";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hoy = todayStr();
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
      await addHabito(nombre, icono);
      setNombre("");
      setIcono("check");
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
            const fechas = fechasPorHabito[h.id] || [];
            const racha = calcularRachaHabito(fechas);
            const historial = historialHabitoVisual(fechas);
            const cumplidoHoy = fechas.includes(hoy);
            return (
              <div
                key={h.id}
                draggable
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div title="Arrastra para reordenar" style={{ cursor: "grab", color: "var(--ink-soft)", flexShrink: 0, touchAction: "none" }}>
                    <GripVertical size={14} />
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.nombre}</div>
                    {racha > 0 && (
                      <div style={{ fontSize: 11, color: "var(--stamp)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Flame size={11} /> {racha} día{racha !== 1 ? "s" : ""} seguido{racha !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleHabitoRegistro(h.id, hoy, h.nombre)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: cumplidoHoy ? "none" : "1px solid var(--line)",
                      background: cumplidoHoy ? "var(--sage)" : "var(--paper)",
                      color: cumplidoHoy ? "#fff" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <Check size={13} /> {cumplidoHoy ? "Cumplido hoy" : "Marcar hoy"}
                  </button>
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
                    onClick={() => handleEliminar(h)}
                    title="Eliminar hábito"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", color: "var(--ink-soft)", border: "none", borderRadius: 6, cursor: "pointer" }}
                  >
                    <Trash2 size={12} />
                  </button>                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {historial.map((d) => (
                    <div
                      key={d.fecha}
                      title={d.fecha}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 4,
                        background: d.completado ? "var(--sage)" : "var(--line-soft)",
                        border: d.esHoy ? "1px solid var(--ink)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
