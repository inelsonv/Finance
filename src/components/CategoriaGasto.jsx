import React, { useMemo, useState, useRef, useEffect } from "react";
import { Plus, X, Trash2, Landmark, Lock, Unlock, Search, CreditCard, Banknote, ArrowRightLeft, HelpCircle, ChevronDown, Check, Car, Home, UtensilsCrossed, Wifi, HeartPulse, User, Film, Layers, Tag } from "lucide-react";
import { addCategoriaGasto, deleteCategoriaGasto, updateCategoriaGasto } from "../lib/db";
import { confirm } from "../lib/confirm";
import { inferirCategoriaSuperior, iconoParaCategoriaSuperior, CATEGORIAS_SUPERIORES_PREDEFINIDAS } from "../lib/categoriaSuperior";

const FLOW_COLORS = [
  "#a23e2e", "#b8892b", "#5b7a5b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a",
  "#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777"
];
const METODOS_PAGO_BASICOS = ["Efectivo", "Transferencia", "Tarjeta", "Tarjeta de crédito", "Débito", "Otro"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getIconMetodoPago(metodo) {
  const m = (metodo || "").toLowerCase();
  if (m.includes("tarjeta") || m.includes("crédito") || m.includes("credito") || m.includes("débito") || m.includes("debito")) {
    return <CreditCard size={12} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />;
  }
  if (m.includes("transferencia") || m.includes("banco") || m.includes("cuenta")) {
    return <ArrowRightLeft size={12} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />;
  }
  if (m.includes("efectivo")) {
    return <Banknote size={12} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />;
  }
  return <HelpCircle size={12} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />;
}

export function IconoSuperior({ nombre, size = 12, style = {} }) {
  const iconName = iconoParaCategoriaSuperior(nombre);
  if (iconName === "car") return <Car size={size} style={style} />;
  if (iconName === "home") return <Home size={size} style={style} />;
  if (iconName === "utensils") return <UtensilsCrossed size={size} style={style} />;
  if (iconName === "wifi") return <Wifi size={size} style={style} />;
  if (iconName === "heartpulse") return <HeartPulse size={size} style={style} />;
  if (iconName === "user") return <User size={size} style={style} />;
  if (iconName === "film") return <Film size={size} style={style} />;
  if (iconName === "landmark") return <Landmark size={size} style={style} />;
  return <Layers size={size} style={style} />;
}

export function CustomCategoriaSuperiorSelect({ value, onChange, fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const [escribiendoPersonalizado, setEscribiendoPersonalizado] = useState(false);
  const [nuevoValor, setNuevoValor] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setEscribiendoPersonalizado(false);
      setNuevoValor("");
      return;
    }
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const displayLabel = value || "Vehículo";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={`Categoría Principal: ${displayLabel} (clic para cambiar)`}
        style={{
          width: fullWidth ? "100%" : "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(16, 185, 129, 0.12)",
          border: `1px solid ${open ? "var(--sage)" : "rgba(16, 185, 129, 0.35)"}`,
          borderRadius: 20,
          padding: fullWidth ? "8px 12px" : "2px 8px",
          cursor: "pointer",
          color: "var(--sage)",
          fontSize: fullWidth ? 13 : 10.5,
          fontWeight: 600,
          textAlign: "left",
          boxSizing: "border-box",
          transition: "all 0.15s ease",
        }}
      >
        <IconoSuperior nombre={displayLabel} size={fullWidth ? 14 : 11} style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        <ChevronDown size={10} style={{ flexShrink: 0, opacity: 0.8 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: fullWidth ? "100%" : 230,
            minWidth: 210,
            maxHeight: 280,
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
            zIndex: 130,
            padding: "4px 0",
          }}
        >
          <div
            style={{
              padding: "4px 10px 2px",
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--ink-soft)",
            }}
          >
            Categoría principal / superior
          </div>
          {CATEGORIAS_SUPERIORES_PREDEFINIDAS.map((catSup) => {
            const isSel = (value || "").toLowerCase() === catSup.toLowerCase();
            return (
              <button
                key={catSup}
                type="button"
                onClick={() => {
                  onChange(catSup);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  fontSize: 11.5,
                  fontWeight: isSel ? 600 : 400,
                  color: isSel ? "var(--sage)" : "var(--ink)",
                  background: isSel ? "rgba(16, 185, 129, 0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSel) e.currentTarget.style.background = "var(--paper)";
                }}
                onMouseLeave={(e) => {
                  if (!isSel) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <IconoSuperior nombre={catSup} size={12} style={{ color: isSel ? "var(--sage)" : "var(--ink-soft)" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {catSup}
                  </span>
                </div>
                {isSel && <Check size={12} style={{ flexShrink: 0, color: "var(--sage)" }} />}
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid var(--line-soft)", padding: "6px 8px 4px", marginTop: 4 }}>
            {escribiendoPersonalizado ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  autoFocus
                  placeholder="Nueva categoría superior..."
                  value={nuevoValor}
                  onChange={(e) => setNuevoValor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevoValor.trim()) {
                      onChange(nuevoValor.trim());
                      setOpen(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "4px 6px",
                    fontSize: 11,
                    borderRadius: 5,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (nuevoValor.trim()) {
                      onChange(nuevoValor.trim());
                      setOpen(false);
                    }
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 5,
                    background: "var(--sage)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEscribiendoPersonalizado(true)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  fontSize: 11,
                  color: "var(--sage)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "3px 4px",
                }}
              >
                + Escribir otra categoría principal…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomMetodoPagoSelect({ value, onChange, tarjetas = [], fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!value) return "Efectivo";
    if (value.startsWith("Tarjeta: ")) {
      return value.replace("Tarjeta: ", "");
    }
    return value;
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : 135,
        maxWidth: fullWidth ? "100%" : 135,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={`Método: ${displayLabel}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--paper)",
          border: `1px solid ${open ? "var(--sage)" : "var(--line)"}`,
          borderRadius: 6,
          padding: fullWidth ? "8px 10px" : "3px 7px",
          cursor: "pointer",
          color: "var(--ink)",
          textAlign: "left",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease, background 0.15s ease",
          boxShadow: open ? "0 0 0 2px rgba(16, 185, 129, 0.2)" : "none",
        }}
      >
        <span style={{ display: "inline-flex", flexShrink: 0, alignItems: "center" }}>
          {getIconMetodoPago(value)}
        </span>
        <span
          style={{
            fontSize: fullWidth ? 13 : 11.5,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
            color: "var(--ink)",
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: "var(--ink-soft)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: fullWidth ? "100%" : 210,
            minWidth: 190,
            maxHeight: 250,
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
            zIndex: 120,
            padding: "4px 0",
          }}
        >
          <div
            style={{
              padding: "4px 10px",
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--ink-soft)",
            }}
          >
            Métodos básicos
          </div>
          {METODOS_PAGO_BASICOS.map((m) => {
            const isSel = (value || "Efectivo") === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  fontSize: 11.5,
                  fontWeight: isSel ? 600 : 400,
                  color: isSel ? "var(--sage)" : "var(--ink)",
                  background: isSel ? "rgba(16, 185, 129, 0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSel) e.currentTarget.style.background = "var(--paper)";
                }}
                onMouseLeave={(e) => {
                  if (!isSel) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, overflow: "hidden" }}>
                  {getIconMetodoPago(m)}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m}</span>
                </div>
                {isSel && <Check size={13} style={{ flexShrink: 0, color: "var(--sage)" }} />}
              </button>
            );
          })}

          {tarjetas.length > 0 && (
            <>
              <div
                style={{
                  marginTop: 4,
                  paddingTop: 4,
                  borderTop: "1px solid var(--line-soft)",
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingBottom: 4,
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-soft)",
                }}
              >
                Mis Tarjetas
              </div>
              {tarjetas.map((t) => {
                const val = `Tarjeta: ${t.nombre}`;
                const isSel = value === val;
                return (
                  <button
                    key={t.id || t.nombre}
                    type="button"
                    onClick={() => {
                      onChange(val);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 10px",
                      fontSize: 11.5,
                      fontWeight: isSel ? 600 : 400,
                      color: isSel ? "var(--sage)" : "var(--ink)",
                      background: isSel ? "rgba(16, 185, 129, 0.12)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel) e.currentTarget.style.background = "var(--paper)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, overflow: "hidden" }}>
                      <CreditCard size={12} style={{ color: isSel ? "var(--sage)" : "var(--ink-soft)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.nombre}>
                        {t.nombre}
                      </span>
                    </div>
                    {isSel && <Check size={13} style={{ flexShrink: 0, color: "var(--sage)" }} />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoriaGasto({
  movimientos = [],
  categoriasPersonalizadas = [],
  tarjetas = [],
  cuentas = [],
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroSuperior, setFiltroSuperior] = useState("todas");
  const [nombre, setNombre] = useState("");
  const [categoriaSuperior, setCategoriaSuperior] = useState("Vehículo");
  const [superiorModificadaManualmente, setSuperiorModificadaManualmente] = useState(false);
  const [clasificacion, setClasificacion] = useState("Variable");
  const [tipoGastoChecklist, setTipoGastoChecklist] = useState("pago_unico");
  const [metodoPagoDefault, setMetodoPagoDefault] = useState("Efectivo");
  const [color, setColor] = useState(FLOW_COLORS[0]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Tarjetas activas para ofrecer como método asignable específico
  const tarjetasActivas = useMemo(() => {
    return (tarjetas || []).filter((t) => t.nombre);
  }, [tarjetas]);

  // Cálculo de gastos por categoría a partir de movimientos
  const { gastosPorCategoriaMap, totalGastos } = useMemo(() => {
    const map = {};
    let total = 0;
    for (const m of movimientos || []) {
      if (m.type !== "Gasto") continue;
      const amt = Number(m.amount) || 0;
      const cat = m.category || "Otros Gastos";
      map[cat] = (map[cat] || 0) + amt;
      total += amt;
    }
    return { gastosPorCategoriaMap: map, totalGastos: total };
  }, [movimientos]);

  // Lista unificada: fusiona categoriasPersonalizadas con categorías presentes en movimientos
  const categoriasUnificadas = useMemo(() => {
    const lista = [];
    const vistas = new Set();

    // 1. Agregar las categorías personalizadas registradas
    for (const c of categoriasPersonalizadas || []) {
      const nombreNorm = (c.nombre || "").trim();
      if (!nombreNorm) continue;
      vistas.add(nombreNorm.toLowerCase());
      const spent = gastosPorCategoriaMap[nombreNorm] || 0;
      lista.push({
        id: c.id,
        nombre: nombreNorm,
        clasificacion: c.clasificacion || "Variable",
        tipoGastoChecklist: c.tipoGastoChecklist || "pago_unico",
        metodoPagoDefault: c.metodoPagoDefault || "Efectivo",
        color: c.color || FLOW_COLORS[lista.length % FLOW_COLORS.length],
        agruparConCompromisos: !!c.agruparConCompromisos,
        soloAsignablePorPuntos: !!c.soloAsignablePorPuntos,
        categoriaSuperior: c.categoriaSuperior ? c.categoriaSuperior.trim() : inferirCategoriaSuperior(nombreNorm, null),
        amount: spent,
        esPersonalizada: true,
      });
    }

    // 2. Agregar cualquier categoría que tenga movimientos pero aún no esté en categoriasPersonalizadas
    for (const [catName, spent] of Object.entries(gastosPorCategoriaMap)) {
      if (!catName || vistas.has(catName.toLowerCase())) continue;
      vistas.add(catName.toLowerCase());
      lista.push({
        id: null,
        nombre: catName,
        clasificacion: "Variable",
        tipoGastoChecklist: "pago_unico",
        metodoPagoDefault: "Efectivo",
        color: FLOW_COLORS[lista.length % FLOW_COLORS.length],
        agruparConCompromisos: false,
        soloAsignablePorPuntos: false,
        categoriaSuperior: inferirCategoriaSuperior(catName, null),
        amount: spent,
        esPersonalizada: false,
      });
    }

    // Ordenar: primero las que tienen monto consumido (de mayor a menor gasto), luego alfabéticamente
    lista.sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });

    return lista;
  }, [categoriasPersonalizadas, gastosPorCategoriaMap]);

  // Filtro de búsqueda y categoría superior
  const categoriasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categoriasUnificadas.filter((c) => {
      if (filtroSuperior !== "todas") {
        if ((c.categoriaSuperior || "").toLowerCase() !== filtroSuperior.toLowerCase()) return false;
      }
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.categoriaSuperior && c.categoriaSuperior.toLowerCase().includes(q)) ||
        (c.metodoPagoDefault && c.metodoPagoDefault.toLowerCase().includes(q)) ||
        (c.clasificacion && c.clasificacion.toLowerCase().includes(q))
      );
    });
  }, [categoriasUnificadas, search, filtroSuperior]);

  const handleAdd = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setError("Escribe un nombre para la categoría");
      return;
    }
    const yaExiste = categoriasPersonalizadas.some(
      (c) => (c.nombre || "").toLowerCase() === nombreTrim.toLowerCase()
    );
    if (yaExiste) {
      setError("Ya existe una categoría con ese nombre");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const superiorFinal = (categoriaSuperior || "").trim() || inferirCategoriaSuperior(nombreTrim, "");
      await addCategoriaGasto({
        nombre: nombreTrim,
        clasificacion,
        metodoPagoDefault,
        color,
        tipoGastoChecklist,
        categoriaSuperior: superiorFinal,
      });
      setNombre("");
      setCategoriaSuperior("Vehículo");
      setSuperiorModificadaManualmente(false);
      setClasificacion("Variable");
      setTipoGastoChecklist("pago_unico");
      setMetodoPagoDefault("Efectivo");
      setColor(FLOW_COLORS[0]);
      setShowForm(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarCategoriaSuperior = async (cat, nuevaSuperior) => {
    try {
      if (cat.id) {
        await updateCategoriaGasto(cat.id, { categoriaSuperior: nuevaSuperior });
      } else {
        await addCategoriaGasto({
          nombre: cat.nombre,
          clasificacion: cat.clasificacion || "Variable",
          metodoPagoDefault: cat.metodoPagoDefault || "Efectivo",
          color: cat.color || FLOW_COLORS[0],
          tipoGastoChecklist: cat.tipoGastoChecklist || "pago_unico",
          categoriaSuperior: nuevaSuperior,
        });
      }
    } catch (e) {
      console.error("Error al asignar categoría superior:", e);
    }
  };

  const handleCambiarMetodoPago = async (cat, nuevoMetodo) => {
    try {
      if (cat.id) {
        await updateCategoriaGasto(cat.id, { metodoPagoDefault: nuevoMetodo });
      } else {
        await addCategoriaGasto({
          nombre: cat.nombre,
          clasificacion: cat.clasificacion || "Variable",
          metodoPagoDefault: nuevoMetodo,
          color: cat.color || FLOW_COLORS[0],
          tipoGastoChecklist: cat.tipoGastoChecklist || "pago_unico",
        });
      }
    } catch (e) {
      console.error("Error al asignar método de pago:", e);
    }
  };

  const handleCycleColor = async (cat) => {
    const currentColor = cat.color || FLOW_COLORS[0];
    const idx = FLOW_COLORS.indexOf(currentColor);
    const nextColor = FLOW_COLORS[(idx + 1) % FLOW_COLORS.length];
    try {
      if (cat.id) {
        await updateCategoriaGasto(cat.id, { color: nextColor });
      } else {
        await addCategoriaGasto({
          nombre: cat.nombre,
          clasificacion: cat.clasificacion || "Variable",
          metodoPagoDefault: cat.metodoPagoDefault || "Efectivo",
          color: nextColor,
          tipoGastoChecklist: cat.tipoGastoChecklist || "pago_unico",
        });
      }
    } catch (e) {
      console.error("Error al cambiar color:", e);
    }
  };

  const handleToggleClasificacion = async (cat) => {
    const nueva = cat.clasificacion === "Fijo" ? "Variable" : "Fijo";
    try {
      if (cat.id) {
        await updateCategoriaGasto(cat.id, { clasificacion: nueva });
      } else {
        await addCategoriaGasto({
          nombre: cat.nombre,
          clasificacion: nueva,
          metodoPagoDefault: cat.metodoPagoDefault || "Efectivo",
          color: cat.color || FLOW_COLORS[0],
          tipoGastoChecklist: cat.tipoGastoChecklist || "pago_unico",
        });
      }
    } catch (e) {
      console.error("Error al alternar clasificación:", e);
    }
  };

  const handleToggleTipoChecklist = async (cat) => {
    const esGradual = cat.tipoGastoChecklist
      ? cat.tipoGastoChecklist === "consumo_gradual"
      : (cat.clasificacion === "Variable" && /^(combustible|gasolina|gasoil|diesel|supermercado|alimentos?|alimentaci[oó]n|despensa|comida|mercado|v[ií]veres)$/i.test(cat.nombre));
    const nuevoTipo = esGradual ? "pago_unico" : "consumo_gradual";
    try {
      if (cat.id) {
        await updateCategoriaGasto(cat.id, { tipoGastoChecklist: nuevoTipo });
      } else {
        await addCategoriaGasto({
          nombre: cat.nombre,
          clasificacion: cat.clasificacion || "Variable",
          metodoPagoDefault: cat.metodoPagoDefault || "Efectivo",
          color: cat.color || FLOW_COLORS[0],
          tipoGastoChecklist: nuevoTipo,
        });
      }
    } catch (e) {
      console.error("Error al alternar formato de checklist:", e);
    }
  };

  const handleToggleCompromisos = async (cat) => {
    if (!cat.id) return;
    try {
      await updateCategoriaGasto(cat.id, { agruparConCompromisos: !cat.agruparConCompromisos });
    } catch (e) {
      console.error("Error al alternar agrupación con compromisos:", e);
    }
  };

  const handleTogglePuntos = async (cat) => {
    if (!cat.id) return;
    try {
      await updateCategoriaGasto(cat.id, { soloAsignablePorPuntos: !cat.soloAsignablePorPuntos });
    } catch (e) {
      console.error("Error al alternar bloqueo por puntos:", e);
    }
  };

  const handleEliminarCategoria = async (cat) => {
    if (await confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) {
      if (cat.id) {
        await deleteCategoriaGasto(cat.id);
      }
    }
  };

  return (
    <div>
      {/* Barra superior con resumen de gastos y acción para agregar categoría */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {totalGastos > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total en gastos:</span>
              <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--stamp)" }}>{formatMoney(totalGastos)}</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 500 }}>
            {categoriasUnificadas.length} {categoriasUnificadas.length === 1 ? "categoría" : "categorías"}
          </div>
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
          {showForm ? "Cancelar" : "Nueva categoría"}
        </button>
      </div>

      {/* Formulario desplegable para nueva categoría */}
      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 10 }}>
            <input
              autoFocus
              placeholder="Nombre, ej. Combustible"
              value={nombre}
              onChange={(e) => {
                const val = e.target.value;
                setNombre(val);
                if (/combustible|gasolina|gasoil|diesel|supermercado|alimento|comida|despensa|mercado/i.test(val)) {
                  setTipoGastoChecklist("consumo_gradual");
                  setClasificacion("Variable");
                } else if (/mantenimiento|reparaci|taller|repuesto|mec[aá]nic/i.test(val)) {
                  setTipoGastoChecklist("pago_unico");
                  setClasificacion("Variable");
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              {["Variable", "Fijo"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setClasificacion(c);
                    if (c === "Fijo") setTipoGastoChecklist("pago_unico");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: clasificacion === c ? "var(--stamp-bg)" : "var(--paper)",
                    color: clasificacion === c ? "var(--stamp)" : "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Categoría Superior / Principal (Grupo en Presupuesto) */}
          <div style={{ marginBottom: 10, background: "var(--paper)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
                <IconoSuperior nombre={categoriaSuperior} size={12} style={{ color: "var(--sage)" }} />
                Categoría principal / superior (para segmentar en Presupuesto):
              </label>
              <span style={{ fontSize: 9.5, color: "var(--sage)", fontWeight: 700 }}>
                {categoriaSuperior}
              </span>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {CATEGORIAS_SUPERIORES_PREDEFINIDAS.filter((cs) => cs !== "Compromisos financieros").map((cs) => {
                const esActiva = (categoriaSuperior || "").toLowerCase() === cs.toLowerCase();
                return (
                  <button
                    key={cs}
                    type="button"
                    onClick={() => {
                      setCategoriaSuperior(cs);
                      setSuperiorModificadaManualmente(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 16,
                      fontSize: 10.5,
                      fontWeight: esActiva ? 700 : 500,
                      border: `1px solid ${esActiva ? "var(--sage)" : "var(--line)"}`,
                      background: esActiva ? "rgba(16, 185, 129, 0.15)" : "var(--card)",
                      color: esActiva ? "var(--sage)" : "var(--ink-soft)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IconoSuperior nombre={cs} size={11} style={{ color: esActiva ? "var(--sage)" : "var(--ink-soft)" }} />
                    {cs}
                  </button>
                );
              })}
            </div>
            <input
              placeholder="O escribe una personalizada (ej. Vehículo, Hogar, Personal...)"
              value={categoriaSuperior}
              onChange={(e) => {
                setCategoriaSuperior(e.target.value);
                setSuperiorModificadaManualmente(true);
              }}
              style={{
                width: "100%",
                padding: "6px 9px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 12,
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>
              Formato en el Checklist de pagos:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { id: "pago_unico", label: "Pago único (con casilla)", desc: "Se paga una sola vez (ej. mantenimiento, servicios)" },
                { id: "consumo_gradual", label: "Consumo gradual (con barra)", desc: "Se va gastando poco a poco (ej. gasolina, súper)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTipoGastoChecklist(opt.id)}
                  style={{
                    padding: "6px 8px",
                    textAlign: "left",
                    borderRadius: 8,
                    border: `1px solid ${tipoGastoChecklist === opt.id ? "var(--sage)" : "var(--line)"}`,
                    background: tipoGastoChecklist === opt.id ? "var(--sage-bg)" : "var(--paper)",
                    color: tipoGastoChecklist === opt.id ? "var(--sage)" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 9.5, color: "var(--ink-soft)", marginTop: 1 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>
              Método de pago habitual predeterminado:
            </label>
            <CustomMetodoPagoSelect
              value={metodoPagoDefault}
              onChange={setMetodoPagoDefault}
              tarjetas={tarjetasActivas}
              fullWidth={true}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
              Color representativo:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FLOW_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColor(col)}
                  title={col}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: col,
                    border: color === col ? "2px solid var(--ink)" : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Guardando…" : "Guardar categoría"}
          </button>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
        </div>
      )}

      {/* Buscador rápido de categorías y píldoras por categoría principal */}
      <div style={{ marginBottom: 12 }}>
        {categoriasUnificadas.length > 4 && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} />
            <input
              type="text"
              placeholder="Buscar categoría o método de pago…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                fontSize: 12.5,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
          </div>
        )}

        {/* Píldoras de filtro por categoría principal */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
          {["todas", ...CATEGORIAS_SUPERIORES_PREDEFINIDAS].map((sup) => {
            const esActivo = filtroSuperior.toLowerCase() === sup.toLowerCase();
            const count = sup === "todas"
              ? categoriasUnificadas.length
              : categoriasUnificadas.filter((c) => (c.categoriaSuperior || "").toLowerCase() === sup.toLowerCase()).length;
            if (sup !== "todas" && count === 0) return null;
            return (
              <button
                key={sup}
                type="button"
                onClick={() => setFiltroSuperior(sup)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 16,
                  fontSize: 10.5,
                  fontWeight: esActivo ? 700 : 500,
                  border: `1px solid ${esActivo ? "var(--sage)" : "var(--line)"}`,
                  background: esActivo ? "rgba(16, 185, 129, 0.16)" : "var(--card)",
                  color: esActivo ? "var(--sage)" : "var(--ink-soft)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {sup !== "todas" && <IconoSuperior nombre={sup} size={11} />}
                {sup === "todas" ? "Todas" : sup}
                <span style={{ fontSize: 9.5, opacity: 0.85 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista unificada donde cada fila tiene la categoría, su método de pago asignable, el monto consumido y su barra de progreso */}
      {categoriasFiltradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
          {search ? "No se encontraron categorías que coincidan con la búsqueda." : "Todavía no hay categorías registradas. Haz clic en 'Nueva categoría' para comenzar."}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          {categoriasFiltradas.map((c, i) => {
            const pct = totalGastos ? Math.round((c.amount / totalGastos) * 100) : 0;
            const catColor = c.color || FLOW_COLORS[i % FLOW_COLORS.length];
            const esGradual = c.tipoGastoChecklist
              ? c.tipoGastoChecklist === "consumo_gradual"
              : (c.clasificacion === "Variable" && /^(combustible|gasolina|gasoil|diesel|supermercado|alimentos?|alimentaci[oó]n|despensa|comida|mercado|v[ií]veres)$/i.test(c.nombre));

            return (
              <div
                key={c.id || c.nombre}
                className="despensa-row"
                style={{
                  padding: "11px 14px",
                  borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                }}
              >
                {/* Fila principal: Información de categoría, selector de método de pago, monto consumido y acciones */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  
                  {/* Bloque izquierdo: Color, Nombre, Categoría Superior y Etiquetas */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", flex: "1 1 auto", minWidth: 200 }}>
                    {/* Botón de color (clic para alternar paleta) */}
                    <button
                      type="button"
                      onClick={() => handleCycleColor(c)}
                      title="Clic para cambiar el color"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: catColor,
                        border: "1px solid rgba(0,0,0,0.2)",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    />

                    {/* Nombre de la categoría */}
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                      {c.nombre}
                    </span>

                    {/* Badge y selector de Categoría Superior asignable con 1 clic */}
                    <CustomCategoriaSuperiorSelect
                      value={c.categoriaSuperior || "Vehículo"}
                      onChange={(nueva) => handleCambiarCategoriaSuperior(c, nueva)}
                      fullWidth={false}
                    />

                    {/* Badge Fijo / Variable */}
                    <button
                      type="button"
                      onClick={() => handleToggleClasificacion(c)}
                      title="Clic para alternar entre Fijo y Variable"
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 20,
                        border: `1px solid ${c.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)"}`,
                        background: "transparent",
                        color: c.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {c.clasificacion || "Variable"}
                    </button>

                    {/* Badge Barra / Pago único (Checklist) */}
                    <button
                      type="button"
                      onClick={() => handleToggleTipoChecklist(c)}
                      title={
                        esGradual
                          ? "En Checklist: Barra de consumo continuo (clic para cambiar a pago único)"
                          : "En Checklist: Pago único con casilla (clic para cambiar a barra)"
                      }
                      style={{
                        fontSize: 9.5,
                        padding: "2px 6px",
                        borderRadius: 20,
                        border: "1px solid var(--line)",
                        background: esGradual ? "var(--sage-bg)" : "transparent",
                        color: esGradual ? "var(--sage)" : "var(--ink-soft)",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {esGradual ? "Barra" : "Pago único"}
                    </button>

                    {/* Agrupación con compromisos */}
                    {c.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleCompromisos(c)}
                        title={
                          c.agruparConCompromisos
                            ? "Agrupada junto a Compromisos financieros (clic para quitar)"
                            : "Mostrar junto a Compromisos financieros"
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          background: c.agruparConCompromisos ? "var(--stamp-bg)" : "transparent",
                          color: c.agruparConCompromisos ? "var(--stamp)" : "var(--ink-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: 5,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <Landmark size={11} />
                      </button>
                    )}

                    {/* Bloqueo para asignación exclusiva por puntos */}
                    {c.id && (
                      <button
                        type="button"
                        onClick={() => handleTogglePuntos(c)}
                        title={
                          c.soloAsignablePorPuntos
                            ? "Asignación exclusiva por puntos (clic para desbloquear)"
                            : "Clic para bloquear asignación manual (solo por puntos)"
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          background: c.soloAsignablePorPuntos ? "var(--stamp-bg)" : "transparent",
                          color: c.soloAsignablePorPuntos ? "var(--stamp)" : "var(--ink-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: 5,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {c.soloAsignablePorPuntos ? <Lock size={11} /> : <Unlock size={11} />}
                      </button>
                    )}
                  </div>

                  {/* Bloque derecho: Asignación de Método de Pago en la misma fila + Monto consumido + Eliminar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    
                    {/* Selector de Método de Pago integrado con diseño adaptado a la app y ancho fijo */}
                    <CustomMetodoPagoSelect
                      value={c.metodoPagoDefault || "Efectivo"}
                      onChange={(nuevo) => handleCambiarMetodoPago(c, nuevo)}
                      tarjetas={tarjetasActivas}
                      fullWidth={false}
                    />

                    {/* Monto consumido y porcentaje */}
                    <div style={{ textAlign: "right", minWidth: 85 }}>
                      <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 600, color: c.amount > 0 ? "var(--ink)" : "var(--ink-soft)" }}>
                        {formatMoney(c.amount)}
                      </span>
                      {totalGastos > 0 && (
                        <span style={{ color: "var(--ink-soft)", fontSize: 11, marginLeft: 4 }}>
                          ({pct}%)
                        </span>
                      )}
                    </div>

                    {/* Eliminar categoría */}
                    {c.id && (
                      <button
                        type="button"
                        onClick={() => handleEliminarCategoria(c)}
                        title={`Eliminar categoría ${c.nombre}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          background: "transparent",
                          color: "var(--ink-soft)",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--stamp)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-soft)")}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de progreso de consumo para la categoría */}
                <div style={{ height: 6, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: totalGastos > 0 ? `${Math.min(pct, 100)}%` : "0%",
                      background: catColor,
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
