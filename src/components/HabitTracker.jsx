import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Check,
  Flame,
  Crown,
  Gem,
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
  HeartPulse,
  ListTodo,
} from "lucide-react";
import { addHabito, deleteHabito, toggleHabitoRegistro, reordenarHabitos, updateHabito, saveDatosCorporales, watchPerfilPersonal } from "../lib/db";
import { calcularRachaHabito, historialHabitoVisual, periodoDeFecha, periodosSinCumplir } from "../lib/rachaHabito";
import { calcularAguaRecomendada, calcularIMC, clasificarIMC } from "../lib/saludCalculos";
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

function SelectorCategoriaHabito({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {[
        { valor: "Salud", label: "Salud", icon: HeartPulse },
        { valor: "Tarea", label: "Tarea/Quehacer", icon: ListTodo },
      ].map(({ valor, label, icon: Icon }) => (
        <button
          key={valor}
          type="button"
          onClick={() => onChange(valor)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            border: value === valor ? "2px solid var(--sage)" : "1px solid var(--line)",
            background: value === valor ? "var(--sage-bg)" : "var(--paper)",
            color: value === valor ? "var(--sage)" : "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}

const DIAS_SEMANA = [
  { valor: 0, label: "Domingo", plural: "domingos" },
  { valor: 1, label: "Lunes", plural: "lunes" },
  { valor: 2, label: "Martes", plural: "martes" },
  { valor: 3, label: "Miércoles", plural: "miércoles" },
  { valor: 4, label: "Jueves", plural: "jueves" },
  { valor: 5, label: "Viernes", plural: "viernes" },
  { valor: 6, label: "Sábado", plural: "sábados" },
];

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

const HABITOS_SUGERIDOS = [
  { nombre: "Oración", icono: "prayingHands", frecuencia: "Diario", categoria: "Salud", detalle: "Tiempo diario de oración" },
  { nombre: "Consumo de agua", icono: "droplet", frecuencia: "Diario", categoria: "Salud", detalle: "Hidratación diaria recomendada" },
  { nombre: "Lectura", icono: "book", frecuencia: "Diario", categoria: "Salud", detalle: "Lectura diaria (15-20 min)" },
  { nombre: "Lectura de la Biblia", icono: "church", frecuencia: "Diario", categoria: "Salud", detalle: "Se marca al leer el versículo" },
  { nombre: "Ejercicio", icono: "dumbbell", frecuencia: "Diario", categoria: "Salud", detalle: "Entrenamiento o caminata" },
  { nombre: "Buena alimentación", icono: "salad", frecuencia: "Diario", categoria: "Salud", detalle: "Comidas nutritivas" },
  { nombre: "Dormir 8 horas", icono: "moon", frecuencia: "Diario", categoria: "Salud", detalle: "Descanso saludable" },
  { nombre: "Gratitud", icono: "sparkles", frecuencia: "Diario", categoria: "Salud", detalle: "Reflexión positiva del día" },
];

function normalizarNombreHabito(str) {
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esHabitoAgua(h) {
  const n = normalizarNombreHabito(h?.nombre);
  return h?.icono === "droplet" || n.includes("agua") || n.includes("hidrat");
}

export default function HabitTracker({ habitos, habitosRegistro, datosCorporales, products = [], historialCompras = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [showDatosCorporales, setShowDatosCorporales] = useState(false);
  const [peso, setPeso] = useState(datosCorporales?.peso != null ? String(datosCorporales.peso) : "");
  const [estatura, setEstatura] = useState(datosCorporales?.estatura != null ? String(datosCorporales.estatura) : "");
  const [edad, setEdad] = useState(datosCorporales?.edad != null ? String(datosCorporales.edad) : "");
  const [nivelActividad, setNivelActividad] = useState(datosCorporales?.nivelActividad || "Moderado");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [perfilPersonal, setPerfilPersonal] = useState(null);

  useEffect(() => {
    setPeso(datosCorporales?.peso != null ? String(datosCorporales.peso) : "");
    setEstatura(datosCorporales?.estatura != null ? String(datosCorporales.estatura) : "");
    setEdad(datosCorporales?.edad != null ? String(datosCorporales.edad) : "");
    setNivelActividad(datosCorporales?.nivelActividad || "Moderado");
  }, [datosCorporales]);

  useEffect(() => {
    const unsub = watchPerfilPersonal(setPerfilPersonal, () => setPerfilPersonal(null));
    return () => unsub && unsub();
  }, []);

  // Si hay fecha de nacimiento guardada en el Perfil personal, la edad se
  // calcula sola en vez de tener que escribirla a mano cada vez.
  const edadCalculada = useMemo(() => {
    if (!perfilPersonal?.fechaNacimiento) return null;
    const [y, m, d] = perfilPersonal.fechaNacimiento.split("-").map(Number);
    if (!y || !m || !d) return null;
    const hoy = new Date();
    let edadCalc = hoy.getFullYear() - y;
    const noHaCumplidoEsteAno = hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d);
    if (noHaCumplidoEsteAno) edadCalc -= 1;
    return edadCalc;
  }, [perfilPersonal]);


  const handleGuardarDatosCorporales = async () => {
    setGuardandoDatos(true);
    try {
      await saveDatosCorporales({
        peso: peso ? parseFloat(peso) : null,
        estatura: estatura ? parseFloat(estatura) : null,
        edad: edadCalculada != null ? edadCalculada : edad ? parseInt(edad, 10) : null,
        nivelActividad,
      });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const aguaRecomendada = calcularAguaRecomendada(parseFloat(peso), nivelActividad);
  const imc = calcularIMC(parseFloat(peso), parseFloat(estatura));
  const imcClasificacion = clasificarIMC(imc);

  const [showSugerencias, setShowSugerencias] = useState(false);
  const [addingPreset, setAddingPreset] = useState(null);
  const [vasosAguaHoy, setVasosAguaHoy] = useState(() => {
    try {
      const clave = `smart-finance-agua-${periodoDeFecha("Diario", new Date())}`;
      const raw = localStorage.getItem(clave);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("check");
  const [frecuencia, setFrecuencia] = useState("Diario");
  const [categoria, setCategoria] = useState("Salud");
  const [diaRecurrencia, setDiaRecurrencia] = useState(6); // sábado por defecto
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hoy = useMemo(() => new Date(), []);
  const [dragId, setDragId] = useState(null);
  const [ordenLocal, setOrdenLocal] = useState(null);

  const habitosOrdenados = useMemo(() => {
    // Las de categoría "Tarea" se muestran en el Calendario en vez de aquí.
    const soloSalud = (habitos || []).filter((h) => h.categoria !== "Tarea");
    if (ordenLocal) return ordenLocal.filter((h) => h.categoria !== "Tarea");
    return [...soloSalud].sort((a, b) => {
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
  const [editDiaRecurrencia, setEditDiaRecurrencia] = useState(6);
  const [editCategoria, setEditCategoria] = useState("Salud");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const openEdit = (h) => {
    setEditingId(h.id);
    setEditNombre(h.nombre);
    setEditIcono(h.icono || "check");
    setEditFrecuencia(h.frecuencia || "Diario");
    setEditDiaRecurrencia(h.diaRecurrencia != null ? h.diaRecurrencia : 6);
    setEditCategoria(h.categoria || "Salud");
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
      await updateHabito(editingId, {
        nombre: editNombre.trim(),
        icono: editIcono,
        frecuencia: editFrecuencia,
        diaRecurrencia: editFrecuencia === "Semanal" ? editDiaRecurrencia : null,
        categoria: editCategoria,
      });
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

  const rachaMaxima = useMemo(() => {
    let max = 0;
    for (const h of habitosOrdenados) {
      const fechas = fechasPorHabito[h.id] || [];
      const r = calcularRachaHabito(fechas, h.frecuencia || "Diario", hoy);
      if (r > max) max = r;
    }
    return max;
  }, [habitosOrdenados, fechasPorHabito, hoy]);

  const habitosCumplidosHoy = useMemo(() => {
    return habitosOrdenados.filter((h) => {
      const periodo = periodoDeFecha(h.frecuencia || "Diario", hoy);
      return (fechasPorHabito[h.id] || []).includes(periodo);
    }).length;
  }, [habitosOrdenados, fechasPorHabito, hoy]);

  const nombresExistentesSet = useMemo(() => {
    return new Set(habitosOrdenados.map((h) => normalizarNombreHabito(h.nombre)));
  }, [habitosOrdenados]);

  const metaVasosAgua = useMemo(() => {
    if (!aguaRecomendada || aguaRecomendada <= 0) return 8;
    return Math.max(6, Math.min(16, Math.round(aguaRecomendada / 250)));
  }, [aguaRecomendada]);

  const actualizarVasosAgua = async (delta, habitoAgua, yaCumplido) => {
    const periodoHoy = periodoDeFecha("Diario", hoy);
    const siguiente = Math.max(0, Math.min(20, vasosAguaHoy + delta));
    setVasosAguaHoy(siguiente);
    try {
      localStorage.setItem(`smart-finance-agua-${periodoHoy}`, String(siguiente));
    } catch {}
    if (habitoAgua) {
      if (siguiente >= metaVasosAgua && !yaCumplido) {
        await toggleHabitoRegistro(habitoAgua.id, periodoHoy, habitoAgua.nombre, habitoAgua.categoria);
      } else if (siguiente < metaVasosAgua && yaCumplido && delta < 0) {
        await toggleHabitoRegistro(habitoAgua.id, periodoHoy, habitoAgua.nombre, habitoAgua.categoria);
      }
    }
  };

  const handleAdd = async () => {
    if (!nombre.trim()) {
      setError("Ponle un nombre al hábito");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addHabito(nombre, icono, frecuencia, frecuencia === "Semanal" ? diaRecurrencia : null, categoria);
      setNombre("");
      setIcono("check");
      setFrecuencia("Diario");
      setDiaRecurrencia(6);
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarSugerido = async (preset) => {
    if (nombresExistentesSet.has(normalizarNombreHabito(preset.nombre))) return;
    setAddingPreset(preset.nombre);
    try {
      await addHabito(preset.nombre, preset.icono, preset.frecuencia, null, preset.categoria || "Salud");
    } finally {
      setAddingPreset(null);
    }
  };

  const handleAgregarEsenciales = async () => {
    const esenciales = HABITOS_SUGERIDOS.slice(0, 3); // Oración, Consumo de agua, Lectura
    setAddingPreset("__esenciales__");
    try {
      for (const preset of esenciales) {
        if (!nombresExistentesSet.has(normalizarNombreHabito(preset.nombre))) {
          await addHabito(preset.nombre, preset.icono, preset.frecuencia, null, preset.categoria || "Salud");
        }
      }
    } finally {
      setAddingPreset(null);
    }
  };

  const handleEliminar = async (h) => {
    if (!(await confirm(`¿Eliminar el hábito "${h.nombre}"? Se pierde su historial y racha.`))) return;
    await deleteHabito(h.id);
  };

  return (
    <div>
      {/* Barra superior estilo Duolingo */}
      <div
        style={{
          background: "var(--card, #ffffff)",
          borderBottom: "2px solid var(--line, #e5e5e5)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 22, lineHeight: 1 }} title="Smart Finance">
          🇩🇴
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }} title="Hábitos completados hoy">
          <Crown size={22} style={{ color: "#ffc800", fill: "#ffc800" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffc800", fontFamily: "var(--font-mono, monospace)" }}>
            {habitosCumplidosHoy}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 14,
            background: "rgba(255,150,0,0.12)",
            border: "1.5px solid rgba(255,150,0,0.35)",
          }}
          title={`Racha máxima de hábitos: ${rachaMaxima} días/semanas`}
        >
          <Flame size={24} style={{ color: "#ff9600", fill: "#ff9600" }} />
          <span style={{ fontSize: 17, fontWeight: 900, color: "#ff9600", fontFamily: "var(--font-mono, monospace)" }}>
            {rachaMaxima}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }} title="Total de hábitos activos">
          <Heart size={21} style={{ color: "#ff4b4b", fill: "#ff4b4b" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ff4b4b", fontFamily: "var(--font-mono, monospace)" }}>
            {habitosOrdenados.length}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700 }}>Salud y Hábitos</span>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
        <button
          onClick={() => setShowDatosCorporales((s) => !s)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
            <Droplet size={15} /> Datos corporales
          </span>
          {showDatosCorporales ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {(showDatosCorporales || (!peso && !estatura)) && (
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.5 }}>
              Se usan para calcular recomendaciones como cuánta agua tomar — son estimaciones generales, no un consejo médico.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                placeholder="Peso (kg)"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <div>
                <input
                  type="number"
                  placeholder="Estatura (cm)"
                  value={estatura}
                  onChange={(e) => setEstatura(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
                {estatura && parseFloat(estatura) > 0 && (
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 3 }}>
                    {(() => {
                      const totalPulgadas = parseFloat(estatura) / 2.54;
                      const pies = Math.floor(totalPulgadas / 12);
                      const pulgadas = (totalPulgadas - pies * 12).toFixed(1);
                      return `≈ ${pies}' ${pulgadas}"`;
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {edadCalculada != null ? (
                <div
                  title="Calculada desde tu fecha de nacimiento en Configuración → Perfil personal"
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink-soft)", background: "var(--paper)" }}
                >
                  {edadCalculada} años (auto)
                </div>
              ) : (
                <input
                  type="number"
                  placeholder="Edad"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              )}
              <select
                value={nivelActividad}
                onChange={(e) => setNivelActividad(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink)" }}
              >
                {["Sedentario", "Moderado", "Activo", "Muy activo"].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGuardarDatosCorporales}
              disabled={guardandoDatos}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: guardandoDatos ? "not-allowed" : "pointer", marginBottom: 12 }}
            >
              <Check size={13} /> {guardandoDatos ? "Guardando…" : "Guardar"}
            </button>

            {(aguaRecomendada || imc) && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
                {aguaRecomendada && (
                  <div style={{ flex: 1, minWidth: 130, background: "var(--paper)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2 }}>Agua recomendada</div>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--sage)" }}>
                      {(aguaRecomendada / 1000).toFixed(1)}L/día
                    </div>
                  </div>
                )}
                {imc && (
                  <div style={{ flex: 1, minWidth: 130, background: "var(--paper)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2 }}>IMC</div>
                    <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: imcClasificacion?.color }}>
                      {imc} <span style={{ fontSize: 11, fontWeight: 500 }}>({imcClasificacion?.label})</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>


      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Hábitos</span>
          {habitosOrdenados.length > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)", marginLeft: 8 }}>
              {habitosCumplidosHoy}/{habitosOrdenados.length} hoy · +5 pts c/u
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setShowSugerencias((s) => !s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 500,
              background: showSugerencias ? "var(--sage-bg)" : "var(--card)",
              color: showSugerencias ? "var(--sage)" : "var(--ink-soft)",
              border: showSugerencias ? "1px solid var(--sage)" : "1px solid var(--line)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Sparkles size={13} /> Sugeridos
          </button>
          <button
            type="button"
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
      </div>

      {habitosOrdenados.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              {habitosCumplidosHoy === habitosOrdenados.length
                ? "¡Meta diaria completada!"
                : "Progreso de hábitos hoy"}
            </span>
            <span className="despensa-mono" style={{ fontWeight: 700, color: habitosCumplidosHoy === habitosOrdenados.length ? "var(--sage)" : "var(--ink-soft)" }}>
              {Math.round((habitosCumplidosHoy / habitosOrdenados.length) * 100)}%
            </span>
          </div>
          <div style={{ width: "100%", height: 7, borderRadius: 99, background: "var(--line-soft)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.round((habitosCumplidosHoy / habitosOrdenados.length) * 100))}%`,
                height: "100%",
                borderRadius: 99,
                background: "var(--sage)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {(showSugerencias || habitosOrdenados.length === 0) && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={13} style={{ color: "var(--sage)" }} />
                Hábitos recomendados (1 clic para agregar)
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                Oración, consumo de agua, lectura y bienestar diario.
              </div>
            </div>
            {HABITOS_SUGERIDOS.slice(0, 3).some((p) => !nombresExistentesSet.has(normalizarNombreHabito(p.nombre))) && (
              <button
                type="button"
                onClick={handleAgregarEsenciales}
                disabled={addingPreset !== null}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--sage)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: addingPreset !== null ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Plus size={12} />
                {addingPreset === "__esenciales__" ? "Agregando…" : "Agregar esenciales"}
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {HABITOS_SUGERIDOS.map((preset) => {
              const IconPreset = ICONOS_HABITO[preset.icono] || Check;
              const yaExiste = nombresExistentesSet.has(normalizarNombreHabito(preset.nombre));
              const agregando = addingPreset === preset.nombre;
              return (
                <button
                  key={preset.nombre}
                  type="button"
                  disabled={yaExiste || addingPreset !== null}
                  onClick={() => handleAgregarSugerido(preset)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: yaExiste ? "1px solid var(--sage)" : "1px solid var(--line)",
                    background: yaExiste ? "var(--sage-bg)" : "var(--paper)",
                    color: yaExiste ? "var(--sage)" : "var(--ink)",
                    textAlign: "left",
                    cursor: yaExiste ? "default" : addingPreset !== null ? "wait" : "pointer",
                    opacity: agregando ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: yaExiste ? "var(--sage)" : "var(--card)",
                      color: yaExiste ? "#fff" : "var(--sage)",
                      border: yaExiste ? "none" : "1px solid var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {yaExiste ? <Check size={13} /> : <IconPreset size={14} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {preset.nombre}
                    </div>
                    <div style={{ fontSize: 10, color: yaExiste ? "var(--sage)" : "var(--ink-soft)" }}>
                      {yaExiste ? "Ya agregado" : agregando ? "Agregando…" : preset.frecuencia}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {HABITOS_SUGERIDOS.slice(0, 5).map((p) => (
              <button
                key={p.nombre}
                type="button"
                onClick={() => {
                  setNombre(p.nombre);
                  setIcono(p.icono);
                  setFrecuencia(p.frecuencia);
                }}
                style={{
                  padding: "4px 9px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink-soft)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          <input
            autoFocus
            placeholder="Nombre, ej. Oración, Consumo de agua, Lectura"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
          />
          {/* Las tareas/quehaceres ahora se crean exclusivamente desde el Calendario. */}
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
          {frecuencia === "Semanal" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>¿Qué día de la semana?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DIAS_SEMANA.map((d) => (
                  <button
                    key={d.valor}
                    type="button"
                    onClick={() => setDiaRecurrencia(d.valor)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 11.5,
                      fontWeight: 500,
                      borderRadius: 20,
                      border: diaRecurrencia === d.valor ? "2px solid var(--sage)" : "1px solid var(--line)",
                      background: diaRecurrencia === d.valor ? "var(--sage-bg)" : "var(--paper)",
                      color: diaRecurrencia === d.valor ? "var(--sage)" : "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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

      {habitosOrdenados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.25rem 1rem", color: "var(--ink-soft)", fontSize: 12.5 }}>
          Elige un hábito recomendado arriba (Oración, Consumo de agua, Lectura…) o crea uno personalizado con "Nuevo hábito".
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
                    <SelectorCategoriaHabito value={editCategoria} onChange={setEditCategoria} />
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
                    {editFrecuencia === "Semanal" && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>¿Qué día de la semana?</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {DIAS_SEMANA.map((d) => (
                            <button
                              key={d.valor}
                              type="button"
                              onClick={() => setEditDiaRecurrencia(d.valor)}
                              style={{
                                padding: "6px 10px",
                                fontSize: 11.5,
                                fontWeight: 500,
                                borderRadius: 20,
                                border: editDiaRecurrencia === d.valor ? "2px solid var(--sage)" : "1px solid var(--line)",
                                background: editDiaRecurrencia === d.valor ? "var(--sage-bg)" : "var(--paper)",
                                color: editDiaRecurrencia === d.valor ? "var(--sage)" : "var(--ink-soft)",
                                cursor: "pointer",
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                    onClick={() => toggleHabitoRegistro(h.id, periodoActual, h.nombre)}
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
                          {frecuenciaHabito === "Semanal" && h.diaRecurrencia != null
                            ? `Todos los ${DIAS_SEMANA.find((d) => d.valor === h.diaRecurrencia)?.plural}`
                            : frecuenciaHabito}
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
                {esHabitoAgua(h) && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid var(--line-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Droplet size={13} style={{ color: "var(--sage)" }} />
                      <span>
                        Vasos hoy:{" "}
                        <strong className="despensa-mono" style={{ color: "var(--ink)" }}>
                          {vasosAguaHoy}/{metaVasosAgua}
                        </strong>
                        {" "}({((vasosAguaHoy * 250) / 1000).toFixed(2)}L
                        {aguaRecomendada ? ` / meta ${(aguaRecomendada / 1000).toFixed(1)}L` : ""})
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => actualizarVasosAgua(-1, h, cumplidoHoy)}
                        disabled={vasosAguaHoy <= 0}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: "var(--paper)",
                          color: vasosAguaHoy <= 0 ? "var(--line)" : "var(--ink)",
                          fontWeight: 700,
                          cursor: vasosAguaHoy <= 0 ? "default" : "pointer",
                        }}
                        title="Restar 1 vaso (250 ml)"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizarVasosAgua(1, h, cumplidoHoy)}
                        style={{
                          padding: "4px 10px",
                          height: 26,
                          borderRadius: 6,
                          border: "none",
                          background: "var(--sage-bg)",
                          color: "var(--sage)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Sumar 1 vaso (250 ml)"
                      >
                        +1 vaso
                      </button>
                    </div>
                  </div>
                )}
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
