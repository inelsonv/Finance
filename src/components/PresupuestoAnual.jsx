import React, { useMemo, useState, useEffect, useRef } from "react";
import { Landmark, PiggyBank, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ClipboardList as ClipboardListIcon, Palmtree as PalmtreeIcon, HandCoins as HandCoinsIcon, ScrollText as ScrollTextIcon, ListOrdered, CreditCard, Lock, FileText, Fuel, SquareParking, UtensilsCrossed, Coffee, Dumbbell, Church, Wrench, Car, Scissors, HeartPulse, Stethoscope, Pill, Repeat, Wifi, Home, ShoppingBag, Shirt, GraduationCap, Baby, Dog, Gift, Plane, Bus, Music, Film, Gamepad2, BookOpen, Receipt, Sliders, PieChart, Sparkles, Heart, Users, Share2, Eye } from "lucide-react";
import {
  setPresupuestoCelda,
  watchPagoRapido,
  watchMetodologiaPresupuestoConfig,
  watchPresupuestoCompartido,
  watchCategoriasCompartidas,
  setPresupuestoCeldaCompartida,
  watchEstadoPresupuestoCompartido,
} from "../lib/db";
import { calcularResumenQuincena } from "../lib/quincenaResumen";
import { contratoActivoEnMes, calcularQuincenaEfectivaContrato } from "./Contratos.jsx";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { consumoPresupuesto } from "../lib/presupuestoConsumo";
import { formatearOrdenPrioridad } from "../lib/flujoPrioridad";
import { periodoActualConfigurado, periodoAdyacenteConfigurado, rangoFechasQuincenaConfigurado, clasificarFecha } from "../lib/quincenaConfig";
import { iconoParaCategoria } from "../lib/categoriaIconos";
import { abreviarNombreCategoria } from "../lib/categoriaAbreviatura";
import { METODOLOGIAS } from "../lib/metodologiaPresupuesto";
import MetodologiaPresupuestoModal from "./MetodologiaPresupuestoModal.jsx";
import ModalCompartirPresupuesto from "./ModalCompartirPresupuesto.jsx";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const QUINCENAS = ["Q1", "Q2"];

const CONFIG_TRIMESTRES = [
  {
    trimestre: "T1",
    label: "1er Trimestre",
    periodo: "Ene - Mar",
    color: "#0284c7", // Azul / Celeste
    bordeColor: "#0284c7",
    bgSoft: "rgba(2, 132, 199, 0.07)",
    headerBg: "rgba(2, 132, 199, 0.12)",
    meses: [0, 1, 2],
  },
  {
    trimestre: "T2",
    label: "2do Trimestre",
    periodo: "Abr - Jun",
    color: "#059669", // Esmeralda / Verde
    bordeColor: "#059669",
    bgSoft: "rgba(5, 150, 105, 0.07)",
    headerBg: "rgba(5, 150, 105, 0.12)",
    meses: [3, 4, 5],
  },
  {
    trimestre: "T3",
    label: "3er Trimestre",
    periodo: "Jul - Sep",
    color: "#d97706", // Ámbar / Naranja
    bordeColor: "#d97706",
    bgSoft: "rgba(217, 119, 6, 0.07)",
    headerBg: "rgba(217, 119, 6, 0.12)",
    meses: [6, 7, 8],
  },
  {
    trimestre: "T4",
    label: "4to Trimestre",
    periodo: "Oct - Dic",
    color: "#7c3aed", // Púrpura / Violeta
    bordeColor: "#7c3aed",
    bgSoft: "rgba(124, 58, 237, 0.07)",
    headerBg: "rgba(124, 58, 237, 0.12)",
    meses: [9, 10, 11],
  },
];

function obtenerTrimestreMes(mesIndex) {
  const qIdx = Math.floor(mesIndex / 3);
  return CONFIG_TRIMESTRES[Math.min(Math.max(qIdx, 0), 3)];
}

function CeldaPresupuestoInput({
  val,
  montoEvento,
  bloqueada,
  tooltipTexto,
  savingKey,
  cellKey,
  cellStyle,
  nota,
  onSave,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState("");

  const formatConComa = (v) => {
    if (v == null || v === "" || isNaN(Number(v))) return "";
    const n = Number(v);
    if (n === 0) return "";
    return n.toLocaleString("en-US");
  };

  useEffect(() => {
    if (!isFocused) {
      setTextValue(val != null && val > 0 ? formatConComa(val) : "");
    }
  }, [val, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Al entrar al campo: mostrar únicamente el número plano sin comas para edición fluida
    setTextValue(val != null && val > 0 ? String(val) : "");
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    // Permitir dígitos y punto decimal opcional
    if (/^[0-9]*\.?[0-9]*$/.test(raw) || raw === "") {
      setTextValue(raw);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleanNumStr = textValue.replace(/,/g, "").trim();
    const num = parseFloat(cleanNumStr);
    const validNum = Number.isFinite(num) && num > 0 ? num : 0;
    setTextValue(validNum > 0 ? formatConComa(validNum) : "");
    if (validNum !== (val || 0)) {
      onSave(validNum);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={textValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={montoEvento > 0 ? `+${Math.round(montoEvento).toLocaleString("en-US")}` : "—"}
      readOnly={bloqueada}
      title={tooltipTexto}
      style={{
        ...cellStyle,
        opacity: savingKey === cellKey ? 0.5 : 1,
        background: bloqueada ? "var(--line-soft)" : nota ? "var(--sage-bg)" : cellStyle.background,
        cursor: bloqueada ? "not-allowed" : "text",
        fontFamily: "var(--font-mono, monospace)",
        textAlign: "right",
      }}
    />
  );
}

const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };
const TIPOS_CUENTA_AHORRO = ["Ahorro", "Inversión", "Corretaje"];
const ICONOS_CATEGORIA = {
  fuel: Fuel, parking: SquareParking, utensils: UtensilsCrossed, coffee: Coffee, dumbbell: Dumbbell,
  church: Church, wrench: Wrench, car: Car, landmark: Landmark, scissors: Scissors, heartpulse: HeartPulse,
  stethoscope: Stethoscope, pill: Pill, repeat: Repeat, creditcard: CreditCard, wifi: Wifi, home: Home,
  shoppingbag: ShoppingBag, shirt: Shirt, graduationcap: GraduationCap, baby: Baby, dog: Dog, gift: Gift,
  plane: Plane, bus: Bus, music: Music, film: Film, gamepad: Gamepad2, book: BookOpen, receipt: Receipt,
};

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  if (v === 0) return "";
  return v.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Calcula, para un préstamo dado, qué monto (cuota) le corresponde a un mes/quincena
// específico del año mostrado, basándose en su fecha de inicio y plazo.
function celdaPrestamo(prestamo, year, mes) {
  if (!prestamo || !prestamo.fechaInicio || typeof prestamo.fechaInicio !== "string" || !prestamo.cuota) return { activo: false, quincena: null };
  const parts = prestamo.fechaInicio.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { activo: false, quincena: null };
  const [sy, sm, sd] = parts;
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return { activo: false, quincena: null };
  const offset = (year - sy) * 12 + (mes - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  const quincena = sd && sd >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

// Calcula, para una meta de ahorro dada, cuánto le corresponde aportar en un mes
// específico. Si es por porcentaje de ingreso, es un monto fijo recurrente todos los
// meses. Si es una meta con monto y fecha objetivo, reparte lo que falta entre los
// meses que quedan desde hoy hasta esa fecha.
function celdaMeta(meta, year, mes, { ingresoMensual, aportadoPorCuenta }) {
  if (!meta || meta.estado !== "Activa") return { activo: false, monto: 0 };

  if (meta.tipoMeta === "Porcentaje de ingreso") {
    if (!meta.porcentaje || !ingresoMensual) return { activo: false, monto: 0 };
    return { activo: true, monto: ingresoMensual * (meta.porcentaje / 100) };
  }

  if (!meta.montoObjetivo || !meta.fechaObjetivo || typeof meta.fechaObjetivo !== "string") return { activo: false, monto: 0 };
  const parts = meta.fechaObjetivo.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { activo: false, monto: 0 };
  const [ey, em] = parts;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const mesesRestantes = (ey - currentYear) * 12 + (em - currentMonth);
  if (mesesRestantes < 0) return { activo: false, monto: 0 };

  const aportado = meta.cuentaId ? aportadoPorCuenta?.[meta.cuentaId] || 0 : 0;
  const faltante = Math.max(meta.montoObjetivo - aportado, 0);
  const montoMensual = faltante / Math.max(mesesRestantes + 1, 1);

  const offsetDesdeHoy = (year - currentYear) * 12 + (mes - currentMonth);
  const offsetHastaMeta = (ey - year) * 12 + (em - mes);
  const activo = offsetDesdeHoy >= 0 && offsetHastaMeta >= 0;
  return { activo, monto: montoMensual };
}

// Calcula, para un evento del calendario vinculado a una categoría de gasto, en
// qué mes/quincena cae según su fecha exacta y la configuración de días de cobro.
function celdaEvento(evento, year, mes, diasCobro) {
  if (!evento || !evento.fecha || typeof evento.fecha !== "string") return { activo: false, quincena: null };
  try {
    const info = clasificarFecha(evento.fecha, diasCobro);
    if (!info) return { activo: false, quincena: null };
    return { activo: info.year === year && info.month === mes, quincena: info.quincena };
  } catch {
    return { activo: false, quincena: null };
  }
}

// Igual que celdaEvento, pero para una orden de compra usando su fecha planeada
// de compra (no la fecha en que se creó la orden).
function celdaOrdenCompra(orden, year, mes) {
  if (!orden || !orden.fechaPlaneada || typeof orden.fechaPlaneada !== "string") return { activo: false, quincena: null };
  const parts = orden.fechaPlaneada.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { activo: false, quincena: null };
  const [oy, om, od] = parts;
  const activo = oy === year && om === mes;
  const quincena = od && od >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

// Igual que las anteriores, pero para un periodo de vacaciones, usando su
// fecha de inicio como referencia.
function celdaVacacion(vacacion, year, mes) {
  if (!vacacion || !vacacion.fechaInicio || typeof vacacion.fechaInicio !== "string") return { activo: false, quincena: null };
  const parts = vacacion.fechaInicio.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { activo: false, quincena: null };
  const [vy, vm, vd] = parts;
  const activo = vy === year && vm === mes;
  const quincena = vd && vd >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

function celdaRenovacion(renovacion, year, mes) {
  if (!renovacion || !renovacion.fechaInicio || typeof renovacion.fechaInicio !== "string") return { activo: false, quincena: null };
  const parts = renovacion.fechaInicio.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return { activo: false, quincena: null };
  const [ry, rm, rd] = parts;
  const activo = ry === year && rm === mes;
  const quincena = rd && rd >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

function totalItemsOrden(orden) {
  if (!orden || !Array.isArray(orden.items)) return 0;
  return orden.items.reduce((s, it) => s + (Number(it?.precioUnitario) || 0) * (Number(it?.cantidad) || 0), 0);
}

export default function PresupuestoAnual({
  presupuesto = {},
  categoriasPersonalizadas = [],
  year = new Date().getFullYear(),
  prestamos = [],
  metasAhorro = [],
  fuentesIngreso = [],
  cuentas = [],
  movimientos = [],
  eventos = [],
  ordenesCompra = [],
  vacaciones = [],
  diezmoConfig = {},
  tarjetas = [],
  tipoCambio = null,
  ahorroConfig = {},
  onChangeYear,
  renovaciones = [],
  flujo = {},
  diasCobro = [15, 30],
  puntosHistorial = [],
  entidades = [],
  contratos = [],
  planActual = null,
  duoInfo = null,
  isOwner = false,
  user = null,
  usuariosRegistrados = [],
  abrirModalMetodologia = false,
  onCloseModalMetodologia,
  onAbrirPlanes,
}) {
  const [configMetodologia, setConfigMetodologia] = useState({ metodologia: "50-30-20", pilares: {}, customPct: { necesidad: 50, deseo: 30, ahorro: 20 } });
  const [modalMetodologiaAbierto, setModalMetodologiaAbierto] = useState(false);
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);
  const [panelSuperiorAbierto, setPanelSuperiorAbierto] = useState(() => {
    try {
      return localStorage.getItem("smart-finance-presupuesto-panel-superior") === "abierto";
    } catch {
      return false;
    }
  });

  const togglePanelSuperior = () => {
    setPanelSuperiorAbierto((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smart-finance-presupuesto-panel-superior", next ? "abierto" : "cerrado");
      } catch (e) {}
      return next;
    });
  };

  // Gestión de Presupuesto Compartido (Plan Dúo <-> Plan Individual)
  const [infoCompartido, setInfoCompartido] = useState(null);
  const [presupuestoCompartido, setPresupuestoCompartido] = useState(null);
  const [categoriasCompartidas, setCategoriasCompartidas] = useState(null);
  const [vistaPresupuesto, setVistaPresupuesto] = useState(() => {
    try {
      return localStorage.getItem(`smart-finance-vista-presupuesto-${user?.uid}`) || "personal";
    } catch {
      return "personal";
    }
  });

  useEffect(() => {
    if (!user) return;
    const unsub = watchEstadoPresupuestoCompartido(user, (info) => {
      setInfoCompartido(info);
      if (info?.tieneAcceso) {
        try {
          const pref = localStorage.getItem(`smart-finance-vista-presupuesto-${user.uid}`);
          if (pref) {
            setVistaPresupuesto(pref);
          } else {
            setVistaPresupuesto("compartido");
          }
        } catch (e) {}
      }
    });
    return () => unsub && unsub();
  }, [user]);

  useEffect(() => {
    if (!infoCompartido?.tieneAcceso || !infoCompartido?.titularEmail) {
      setPresupuestoCompartido(null);
      setCategoriasCompartidas(null);
      return;
    }
    const unsubP = watchPresupuestoCompartido(
      year,
      infoCompartido.titularEmail,
      infoCompartido.titularUid,
      setPresupuestoCompartido
    );
    const unsubC = watchCategoriasCompartidas(
      infoCompartido.titularEmail,
      infoCompartido.titularUid,
      setCategoriasCompartidas
    );
    return () => {
      unsubP && unsubP();
      unsubC && unsubC();
    };
  }, [infoCompartido?.titularEmail, infoCompartido?.titularUid, year]);

  const esVistaCompartida = vistaPresupuesto === "compartido" && Boolean(infoCompartido?.tieneAcceso);
  const presupuestoEfectivo = (esVistaCompartida && presupuestoCompartido) ? presupuestoCompartido : (presupuesto || {});
  const categoriasPersonalizadasEfectivas = (esVistaCompartida && categoriasCompartidas && categoriasCompartidas.length > 0)
    ? categoriasCompartidas
    : categoriasPersonalizadas;

  useEffect(() => {
    const unsub = watchMetodologiaPresupuestoConfig(setConfigMetodologia, () => {});
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (abrirModalMetodologia) {
      setModalMetodologiaAbierto(true);
    }
  }, [abrirModalMetodologia]);

  // Puramente informativo: el orden de prioridad definido en el Editor de
  // flujo, mostrado como referencia visual. No depende de ningún otro cálculo
  // de este componente ni los modifica.
  const ordenFlujoReferencia = useMemo(() => formatearOrdenPrioridad(flujo?.nodes, flujo?.edges), [flujo]);

  // Quincena activa y próxima, para resaltar la cabecera de la tabla. Usa la
  // configuración de días de cobro (etapa 3 de la migración).
  const { mesActivo, quincenaActiva, mesProximo, quincenaProxima, yearProximo } = useMemo(() => {
    const actual = periodoActualConfigurado(diasCobro);
    const siguiente = periodoAdyacenteConfigurado(actual, diasCobro, 1);
    return {
      mesActivo: actual.year === year ? actual.month : null,
      quincenaActiva: actual.quincena,
      mesProximo: siguiente.year === year ? siguiente.month : null,
      quincenaProxima: siguiente.quincena,
      yearProximo: siguiente.year,
    };
  }, [year, diasCobro]);

  const [savingKey, setSavingKey] = useState(null);
  const [mostrarComparacion, setMostrarComparacion] = useState(() => {
    try {
      return localStorage.getItem("smart-finance-mostrar-comparacion") === "true";
    } catch {
      return false;
    }
  });

  const toggleMostrarComparacion = () => {
    setMostrarComparacion((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smart-finance-mostrar-comparacion", next ? "true" : "false");
      } catch (e) {}
      return next;
    });
  };
  const tablaPresupuestoRef = useRef(null);

  useEffect(() => {
    if (!mesActivo) return undefined;
    const frame = requestAnimationFrame(() => {
      const contenedor = tablaPresupuestoRef.current;
      const encabezadoMes = contenedor?.querySelector(`[data-mes-presupuesto="${mesActivo}"]`);
      if (!contenedor || !encabezadoMes) return;
      const desplazamiento = encabezadoMes.getBoundingClientRect().left - contenedor.getBoundingClientRect().left;
      contenedor.scrollLeft = Math.max(0, contenedor.scrollLeft + desplazamiento - 150);
    });
    return () => cancelAnimationFrame(frame);
  }, [year, mesActivo]);

  const [pagoRapido, setPagoRapido] = useState({});
  useEffect(() => {
    const unsub = watchPagoRapido(setPagoRapido, () => setPagoRapido({}));
    return () => unsub && unsub();
  }, []);

  // Excedente real disponible en CUALQUIER quincena (mismo cálculo que en
  // Estrategia de deudas y el Checklist) — se usa para reflejar aquí el
  // pago extraordinario de "Pago rápido" en la quincena que se esté
  // planificando (no solo la que está en curso hoy), ya que el presupuesto
  // se llena con anticipación para meses futuros también.
  const calcularExtraPagoRapido = (mes, quincena) => {
    if (!pagoRapido?.activo || !fuentesIngreso || !categoriasPersonalizadasEfectivas) return 0;

    // La estrategia de Pago rápido nunca mira hacia atrás — solo aplica
    // desde la quincena actual en adelante. Si la deuda ya se saldó, deja
    // de aplicar automáticamente (no hay más celdas de esa deuda con saldo
    // pendiente donde sumarse).
    const hoy = periodoActualConfigurado(diasCobro);
    const indice = (y, m, q) => y * 24 + (m - 1) * 2 + (q === "Q2" ? 1 : 0);
    if (indice(year, mes, quincena) < indice(hoy.year, hoy.month, hoy.quincena)) return 0;

    const ingresoQuincenal = ingresoMensualNeto(fuentesIngreso) / 2;
    const resumenQuincena = calcularResumenQuincena({
      year,
      month: mes,
      quincena,
      presupuesto: presupuestoEfectivo,
      categoriasGasto: categoriasPersonalizadasEfectivas,
      prestamos,
      movimientos,
      diasCobro,
    });
    let minimoTarjetasQuincena = 0;
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      const diasEnMesT = new Date(year, mes, 0).getDate();
      const diaPagoT = Math.min(Number(t.fechaPago), diasEnMesT);
      const qT = diaPagoT >= 15 ? "Q2" : "Q1";
      if (qT !== quincena) continue;
      // No cuenta el mínimo de la propia tarjeta que recibe el pago rápido,
      // para no restarle a sí misma antes de sumarle el excedente.
      if (pagoRapido.deudaId === `t-${t.id}` || pagoRapido.deudaId === `t-${t.id}-usd`) continue;
      if (t.saldoActual > 0 && t.pagoMinimo) minimoTarjetasQuincena += Number(t.pagoMinimo) || 0;
    }
    return Math.max(ingresoQuincenal - resumenQuincena.presupuestado - minimoTarjetasQuincena, 0);
  };
  const [mostrarPrestamos, setMostrarPrestamos] = useState(false);

  const categorias = useMemo(() => {
    const list = (categoriasPersonalizadasEfectivas || []).map((c) => ({
      nombre: c.nombre,
      clasificacion: c.clasificacion,
      agruparConCompromisos: !!c.agruparConCompromisos,
      color: c.color || null,
      soloAsignablePorPuntos: !!c.soloAsignablePorPuntos,
    }));
    // Las categorías marcadas para agruparse con "Compromisos financieros" se
    // ordenan al final, para que queden justo antes de esa sección en la
    // tabla (sin fusionarse — solo se acomodan una al lado de la otra).
    return [...list].sort((a, b) => (a.agruparConCompromisos ? 1 : 0) - (b.agruparConCompromisos ? 1 : 0));
  }, [categoriasPersonalizadasEfectivas]);

  const prestamosActivos = useMemo(
    () =>
      (prestamos || []).filter((p) => {
        if (p.estado !== "Activo") return false;
        if (p.frecuenciaCuota === "Personalizado") return (p.cuotasPersonalizadas || []).length > 0;
        return p.fechaInicio && p.cuota && p.plazo;
      }),
    [prestamos]
  );

  const contratosActivos = useMemo(
    () => (contratos || []).filter((c) => c.estado === "Activo" && c.diaPago && c.montoEstimado),
    [contratos]
  );

  // Tarjetas de crédito con pago mínimo activo que deben integrarse en Compromisos financieros
  const tarjetasConPagoMinimo = useMemo(
    () =>
      (tarjetas || []).filter(
        (t) =>
          (t.estado === "Activa" || !t.estado) &&
          (t.tipoTarjeta || "Crédito") === "Crédito" &&
          ((Number(t.pagoMinimo) || 0) > 0 || (Number(t.pagoMinimoUSD) || 0) > 0)
      ),
    [tarjetas]
  );

  const ingresoMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentesIngreso || []) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
    }
    return total;
  }, [fuentesIngreso]);

  const aportadoPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentas || []) {
      if (!TIPOS_CUENTA_AHORRO.includes(c.tipo)) continue;
      let total = c.saldoInicial || 0;
      for (const mv of movimientos || []) {
        if (mv.cuentaId === c.id && mv.category === c.tipo) total += Number(mv.amount) || 0;
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const metasActivas = useMemo(
    () =>
      (metasAhorro || []).filter(
        (m) => m.estado === "Activa" && (m.tipoMeta === "Porcentaje de ingreso" ? m.porcentaje : m.montoObjetivo && m.fechaObjetivo)
      ),
    [metasAhorro]
  );

  const eventosConGasto = useMemo(
    () => (eventos || []).filter((e) => e.estado !== "Cancelado" && e.categoriaGasto && e.montoEstimado && e.fecha),
    [eventos]
  );

  const ordenesConGasto = useMemo(
    () =>
      (ordenesCompra || []).filter(
        (o) => o.estado !== "Cancelada" && o.categoriaGasto && o.fechaPlaneada && totalItemsOrden(o) > 0
      ),
    [ordenesCompra]
  );

  const vacacionesConGasto = useMemo(
    () =>
      (vacaciones || []).filter(
        (v) => v.estado !== "Cancelada" && v.categoriaGasto && v.presupuestoEstimado && v.fechaInicio
      ),
    [vacaciones]
  );

  const categoriasVacacionesUnicas = useMemo(
    () => [...new Set(vacacionesConGasto.map((v) => v.categoriaGasto))],
    [vacacionesConGasto]
  );

  const renovacionesConGasto = useMemo(
    () =>
      (renovaciones || []).filter(
        (r) => r.estado !== "Cancelado" && r.categoriaGasto && r.monto && r.fechaInicio
      ),
    [renovaciones]
  );

  const categoriasRenovacionesUnicas = useMemo(
    () => [...new Set(renovacionesConGasto.map((r) => r.categoriaGasto))],
    [renovacionesConGasto]
  );

  const getCeldaPrestamo = (prestamo, mes, quincena) => {
    if (prestamo.frecuenciaCuota === "Personalizado") {
      let total = 0;
      for (const c of prestamo.cuotasPersonalizadas || []) {
        if (!c || !c.fecha || typeof c.fecha !== "string") continue;
        const parts = c.fecha.split("-").map(Number);
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
        const [cy, cm, cd] = parts;
        if (cy !== year || cm !== mes) continue;
        const q = cd && cd >= 15 ? "Q2" : "Q1";
        if (q === quincena) total += Number(c.monto) || 0;
      }
      return total;
    }

    // Igual que en el Checklist de pagos: una cuota puede haberse movido
    // manualmente a otra quincena (incluso de otro mes). Revisa ambos casos:
    // 1) la cuota natural de este mes, si no fue movida a otro lado, y
    // 2) cuotas de otros meses que fueron movidas para caer aquí.
    const overrides = prestamo.quincenaOverrides || {};
    const overrideEsteMesRaw = overrides[`${mes}-${year}`];
    const overrideEsteMes = overrideEsteMesRaw && typeof overrideEsteMesRaw === "object" ? overrideEsteMesRaw : null;

    let total = 0;
    const { activo, quincena: q } = celdaPrestamo(prestamo, year, mes);
    if (activo && !overrideEsteMes && q === quincena) {
      total += Number(prestamo.cuota) || 0;
    }
    for (const destino of Object.values(overrides)) {
      if (!destino || typeof destino !== "object") continue;
      if (destino.year === year && destino.month === mes && destino.quincena === quincena) {
        total += Number(prestamo.cuota) || 0;
      }
    }

    // "Pago rápido" activo para este préstamo: refleja el pago
    // extraordinario en la celda de la quincena que está en curso ahora
    // mismo (la única para la que tiene sentido calcular el excedente
    // real disponible).
    if (pagoRapido?.activo && pagoRapido.deudaId === `p-${prestamo.id}` && total > 0) {
      total += calcularExtraPagoRapido(mes, quincena);
    }

    return total;
  };

  const totalMesPrestamo = (prestamo, mes) => getCeldaPrestamo(prestamo, mes, "Q1") + getCeldaPrestamo(prestamo, mes, "Q2");

  const getCeldaMeta = (meta, mes, quincena) => {
    const { activo, monto } = celdaMeta(meta, year, mes, { ingresoMensual, aportadoPorCuenta });
    if (!activo) return 0;
    return monto / 2;
  };

  const totalMesMeta = (meta, mes) => getCeldaMeta(meta, mes, "Q1") + getCeldaMeta(meta, mes, "Q2");

  // El diezmo es un porcentaje fijo del ingreso mensual, recurrente todos los
  // meses (igual que una meta de ahorro por porcentaje de ingreso), sin
  // depender de una fecha específica.
  const diezmoMensual = diezmoConfig?.activo && ingresoMensual > 0 ? ingresoMensual * ((diezmoConfig.porcentaje || 0) / 100) : 0;
  const getCeldaDiezmo = () => (diezmoMensual > 0 ? diezmoMensual / 2 : 0);

  // Consumos de tarjeta de crédito cuya fecha de pago calculada (corte +
  // días de gracia de cada tarjeta) cae dentro de esta quincena específica
  // — mismo criterio que la tarjeta "Próximos pagos" en Presupuesto, pero
  // aquí extendido a cualquier mes/quincena de la tabla anual.
  const getCeldaTarjetaPendiente = (mes, quincena) => {
    const { fechaInicio, fechaFin } = rangoFechasQuincenaConfigurado(year, mes, quincena, diasCobro);
    return (movimientos || []).reduce((s, m) => {
      if (m.type !== "Gasto" || m.metodoPago !== "Tarjeta de crédito" || !m.fechaPagoTarjeta) return s;
      if (m.fechaPagoTarjeta < fechaInicio || m.fechaPagoTarjeta > fechaFin) return s;
      return s + (Number(m.amount) || 0);
    }, 0);
  };
  const totalMesTarjetaPendiente = (mes) => getCeldaTarjetaPendiente(mes, "Q1") + getCeldaTarjetaPendiente(mes, "Q2");
  const tarjetaPendienteAnual = MESES.reduce((s, _, i) => s + totalMesTarjetaPendiente(i + 1), 0);

  // Nivel de endeudamiento: % del ingreso mensual comprometido en cuotas de
  // préstamos + pagos mínimos de tarjetas (misma fórmula que el indicador de Inicio).
  const cuotaPrestamosMensual = useMemo(
    () =>
      (prestamos || [])
        .filter((p) => {
          if (p.estado !== "Activo") return false;
          const cuotasTotales = p.frecuenciaCuota === "Personalizado" ? (p.cuotasPersonalizadas || []).length : p.plazoUnidad === "años" ? (p.plazo || 0) * 12 : p.plazo || 0;
          return cuotasTotales > 1;
        })
        .reduce((s, p) => s + (Number(p.cuota) || 0), 0),
    [prestamos]
  );
  const pagoTarjetasMensual = useMemo(
    () => (tarjetas || []).filter((t) => t.estado === "Activa").reduce((s, t) => s + (Number(t.pagoMinimo) || 0), 0),
    [tarjetas]
  );
  const nivelEndeudamiento = ingresoMensual > 0 ? ((cuotaPrestamosMensual + pagoTarjetasMensual) / ingresoMensual) * 100 : 0;
  const endeudamientoAlto = nivelEndeudamiento > 35;

  const ahorroSeSalta = ahorroConfig?.activo && ahorroConfig?.condicionadoADeuda !== false && endeudamientoAlto;
  const ahorroMensual =
    ahorroConfig?.activo && ingresoMensual > 0 && !ahorroSeSalta
      ? ingresoMensual * ((ahorroConfig.porcentaje || 0) / 100)
      : 0;
  const getCeldaAhorroAuto = () => (ahorroMensual > 0 ? ahorroMensual / 2 : 0);

  const getCeldaEvento = (evento, mes, quincena) => {
    const { activo, quincena: q } = celdaEvento(evento, year, mes, diasCobro);
    return activo && q === quincena ? Number(evento.montoEstimado) || 0 : 0;
  };

  const totalMesEvento = (evento, mes) => getCeldaEvento(evento, mes, "Q1") + getCeldaEvento(evento, mes, "Q2");

  // Varios eventos pueden compartir la misma categoría de gasto (ej. 3 citas
  // odontológicas en meses distintos) — se agrupan en UNA sola fila del
  // presupuesto en vez de una fila por cada evento. Si esa categoría YA
  // existe como categoría de gasto manual, no se crea una fila aparte (para
  // no repetirla) — su monto sigue sumando al total general igual que antes,
  // y se marca con un pequeño ícono de calendario junto al nombre.
  const nombresCategoriasManuales = useMemo(() => new Set(categorias.map((c) => c.nombre)), [categorias]);

  // Notas dejadas al canjear puntos hacia una categoría/quincena específica
  // (ej. "Necesito comprar medias") — se muestran como tooltip en esa celda.
  const notasPorCelda = useMemo(() => {
    const map = {};
    for (const h of puntosHistorial || []) {
      if (h.tipo !== "canje" || h.revertido || !h.nota || h.year !== year) continue;
      map[`${h.categoria}-${h.month}-${h.quincena}`] = h.nota;
    }
    return map;
  }, [puntosHistorial, year]);
  const categoriasEventosUnicas = useMemo(
    () => [...new Set(eventosConGasto.map((e) => e.categoriaGasto))].filter((nombre) => !nombresCategoriasManuales.has(nombre)),
    [eventosConGasto, nombresCategoriasManuales]
  );

  const getCeldaEventoCategoria = (categoriaNombre, mes, quincena) =>
    eventosConGasto
      .filter((e) => e.categoriaGasto === categoriaNombre)
      .reduce((s, e) => s + getCeldaEvento(e, mes, quincena), 0);

  const totalMesEventoCategoria = (categoriaNombre, mes) =>
    getCeldaEventoCategoria(categoriaNombre, mes, "Q1") + getCeldaEventoCategoria(categoriaNombre, mes, "Q2");

  const getCeldaOrden = (orden, mes, quincena) => {
    const { activo, quincena: q } = celdaOrdenCompra(orden, year, mes);
    return activo && q === quincena ? totalItemsOrden(orden) : 0;
  };

  const totalMesOrden = (orden, mes) => getCeldaOrden(orden, mes, "Q1") + getCeldaOrden(orden, mes, "Q2");

  const getCeldaVacacion = (vacacion, mes, quincena) => {
    const { activo, quincena: q } = celdaVacacion(vacacion, year, mes);
    return activo && q === quincena ? vacacion.presupuestoEstimado : 0;
  };

  const getCeldaVacacionCategoria = (categoriaNombre, mes, quincena) =>
    vacacionesConGasto
      .filter((v) => v.categoriaGasto === categoriaNombre)
      .reduce((s, v) => s + getCeldaVacacion(v, mes, quincena), 0);

  const totalMesVacacionCategoria = (categoriaNombre, mes) =>
    getCeldaVacacionCategoria(categoriaNombre, mes, "Q1") + getCeldaVacacionCategoria(categoriaNombre, mes, "Q2");

  const getCeldaRenovacion = (renovacion, mes, quincena) => {
    const { activo, quincena: q } = celdaRenovacion(renovacion, year, mes);
    return activo && q === quincena ? renovacion.monto : 0;
  };

  const getCeldaRenovacionCategoria = (categoriaNombre, mes, quincena) =>
    renovacionesConGasto
      .filter((r) => r.categoriaGasto === categoriaNombre)
      .reduce((s, r) => s + getCeldaRenovacion(r, mes, quincena), 0);

  const totalMesRenovacionCategoria = (categoriaNombre, mes) =>
    getCeldaRenovacionCategoria(categoriaNombre, mes, "Q1") + getCeldaRenovacionCategoria(categoriaNombre, mes, "Q2");

  const getCelda = (categoria, mes, quincena) => {
    const val = presupuestoEfectivo?.[categoria]?.[String(mes)]?.[quincena];
    return typeof val === "number" ? val : null;
  };

  const totalMesCategoria = (categoria, mes) => (getCelda(categoria, mes, "Q1") || 0) + (getCelda(categoria, mes, "Q2") || 0);

  const totalPorPrestamo = (p) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesPrestamo(p, m);
    return total;
  };

  // Suma de TODOS los préstamos activos juntos, para la fila resumen
  // colapsable "Compromisos financieros".
  const getCeldaPrestamosTodos = (mes, quincena) =>
    prestamosActivos.reduce((s, p) => s + getCeldaPrestamo(p, mes, quincena), 0);

  const totalPrestamosTodos = () => prestamosActivos.reduce((s, p) => s + totalPorPrestamo(p), 0);

  // Igual que getCeldaPrestamo, pero para un contrato de servicio — usa el
  // día de pago + días de gracia para saber en qué quincena vence
  // realmente, y solo aparece en los meses en que el contrato está vigente
  // (entre su fecha de inicio y de fin, si tiene una).
  const getCeldaContrato = (contrato, mes, quincena) => {
    // La facturación de ESTE mes puede vencer en este mismo mes o
    // recorrerse al siguiente por los días de gracia — así que para saber
    // si esta celda le corresponde, hay que revisar tanto la facturación
    // de este mes como la del mes anterior (que pudo haberse recorrido
    // hasta aquí).
    for (const offset of [0, -1]) {
      let mesFacturacion = mes + offset;
      let yearFacturacion = year;
      if (mesFacturacion < 1) {
        mesFacturacion = 12;
        yearFacturacion -= 1;
      }
      if (!contratoActivoEnMes(contrato, yearFacturacion, mesFacturacion)) continue;
      const efectivo = calcularQuincenaEfectivaContrato(contrato.diaPago, contrato.diasGracia, yearFacturacion, mesFacturacion);
      if (efectivo && efectivo.year === year && efectivo.month === mes && efectivo.quincena === quincena) {
        return Number(contrato.montoEstimado) || 0;
      }
    }
    return 0;
  };

  const totalMesContrato = (contrato, mes) => getCeldaContrato(contrato, mes, "Q1") + getCeldaContrato(contrato, mes, "Q2");

  const totalPorContrato = (contrato) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesContrato(contrato, m);
    return total;
  };

  const getCeldaContratosTodos = (mes, quincena) =>
    contratosActivos.reduce((s, c) => s + getCeldaContrato(c, mes, quincena), 0);

  const totalContratosTodos = () => contratosActivos.reduce((s, c) => s + totalPorContrato(c), 0);

  // Pago mínimo de tarjetas de crédito dentro de Compromisos Financieros:
  // Usa la fecha de pago (por ejemplo, día 20 de cada mes corresponde a la 2da quincena Q2;
  // si el día de pago es < 15, corresponde a la 1ra quincena Q1).
  // Solo se considera a partir de la quincena de noviembre de 2026 en adelante,
  // correspondiente al balance y corte actual (vencimiento noviembre 2026).
  const getCeldaTarjetaMinimo = (tarjeta, mes, quincena, moneda = "RD") => {
    if (!tarjeta) return 0;
    const diaPago = Number(tarjeta.fechaPago) || 20;
    const quincenaEfectiva = diaPago >= 15 ? "Q2" : "Q1";
    if (quincena !== quincenaEfectiva) return 0;

    // Solo considerar a partir de la quincena de noviembre de 2026 en adelante
    if (year < 2026) return 0;
    if (year === 2026 && mes < 11) return 0;

    if (moneda === "USD") {
      if (!tarjeta.tieneMonedaSecundaria) return 0;
      const minUSD = Number(tarjeta.pagoMinimoUSD) || 0;
      if (minUSD <= 0) return 0;
      const factorConversion = tipoCambio && tipoCambio > 0 ? tipoCambio : 60.3;
      return minUSD * factorConversion;
    }

    return Number(tarjeta.pagoMinimo) || 0;
  };

  const totalMesTarjetaMinimo = (tarjeta, mes, moneda = "RD") =>
    getCeldaTarjetaMinimo(tarjeta, mes, "Q1", moneda) + getCeldaTarjetaMinimo(tarjeta, mes, "Q2", moneda);

  const totalPorTarjetaMinimo = (tarjeta, moneda = "RD") => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesTarjetaMinimo(tarjeta, m, moneda);
    return total;
  };

  const getCeldaTarjetasTodas = (mes, quincena) =>
    tarjetasConPagoMinimo.reduce((s, t) => {
      let sum = s + getCeldaTarjetaMinimo(t, mes, quincena, "RD");
      if (t.tieneMonedaSecundaria && Number(t.pagoMinimoUSD) > 0) {
        sum += getCeldaTarjetaMinimo(t, mes, quincena, "USD");
      }
      return sum;
    }, 0);

  const totalTarjetasTodas = () =>
    tarjetasConPagoMinimo.reduce((s, t) => {
      let sum = s + totalPorTarjetaMinimo(t, "RD");
      if (t.tieneMonedaSecundaria && Number(t.pagoMinimoUSD) > 0) {
        sum += totalPorTarjetaMinimo(t, "USD");
      }
      return sum;
    }, 0);

  const totalPorMes = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const cat of categorias) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesCategoria(cat.nombre, m);
    }
    for (const p of prestamosActivos) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesPrestamo(p, m);
    }
    for (const c of contratosActivos) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesContrato(c, m);
    }
    for (const t of tarjetasConPagoMinimo) {
      for (let m = 1; m <= 12; m++) {
        totals[m - 1] += totalMesTarjetaMinimo(t, m, "RD");
        if (t.tieneMonedaSecundaria && Number(t.pagoMinimoUSD) > 0) {
          totals[m - 1] += totalMesTarjetaMinimo(t, m, "USD");
        }
      }
    }
    for (const meta of metasActivas) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesMeta(meta, m);
    }
    for (const evento of eventosConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesEvento(evento, m);
    }
    for (const orden of ordenesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += totalMesOrden(orden, m);
    }
    for (const vacacion of vacacionesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += getCeldaVacacion(vacacion, m, "Q1") + getCeldaVacacion(vacacion, m, "Q2");
    }
    for (const renovacion of renovacionesConGasto) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += getCeldaRenovacion(renovacion, m, "Q1") + getCeldaRenovacion(renovacion, m, "Q2");
    }
    if (diezmoMensual > 0) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += diezmoMensual;
    }
    if (ahorroMensual > 0) {
      for (let m = 1; m <= 12; m++) totals[m - 1] += ahorroMensual;
    }
    return totals;
  }, [categorias, presupuestoEfectivo, prestamosActivos, contratosActivos, tarjetasConPagoMinimo, tipoCambio, metasActivas, eventosConGasto, ordenesConGasto, vacacionesConGasto, renovacionesConGasto, diezmoMensual, ahorroMensual, year, ingresoMensual, aportadoPorCuenta]);

  const totalPorQuincenaGlobal = useMemo(() => {
    const totals = {};
    for (let m = 1; m <= 12; m++) {
      totals[`${m}-Q1`] = 0;
      totals[`${m}-Q2`] = 0;
      for (const cat of categorias) {
        totals[`${m}-Q1`] += getCelda(cat.nombre, m, "Q1") || 0;
        totals[`${m}-Q2`] += getCelda(cat.nombre, m, "Q2") || 0;
      }
      for (const p of prestamosActivos) {
        totals[`${m}-Q1`] += getCeldaPrestamo(p, m, "Q1");
        totals[`${m}-Q2`] += getCeldaPrestamo(p, m, "Q2");
      }
      for (const c of contratosActivos) {
        totals[`${m}-Q1`] += getCeldaContrato(c, m, "Q1");
        totals[`${m}-Q2`] += getCeldaContrato(c, m, "Q2");
      }
      for (const t of tarjetasConPagoMinimo) {
        totals[`${m}-Q1`] += getCeldaTarjetaMinimo(t, m, "Q1", "RD");
        totals[`${m}-Q2`] += getCeldaTarjetaMinimo(t, m, "Q2", "RD");
        if (t.tieneMonedaSecundaria && Number(t.pagoMinimoUSD) > 0) {
          totals[`${m}-Q1`] += getCeldaTarjetaMinimo(t, m, "Q1", "USD");
          totals[`${m}-Q2`] += getCeldaTarjetaMinimo(t, m, "Q2", "USD");
        }
      }
      for (const meta of metasActivas) {
        totals[`${m}-Q1`] += getCeldaMeta(meta, m, "Q1");
        totals[`${m}-Q2`] += getCeldaMeta(meta, m, "Q2");
      }
      for (const evento of eventosConGasto) {
        totals[`${m}-Q1`] += getCeldaEvento(evento, m, "Q1");
        totals[`${m}-Q2`] += getCeldaEvento(evento, m, "Q2");
      }
      for (const orden of ordenesConGasto) {
        totals[`${m}-Q1`] += getCeldaOrden(orden, m, "Q1");
        totals[`${m}-Q2`] += getCeldaOrden(orden, m, "Q2");
      }
      for (const vacacion of vacacionesConGasto) {
        totals[`${m}-Q1`] += getCeldaVacacion(vacacion, m, "Q1");
        totals[`${m}-Q2`] += getCeldaVacacion(vacacion, m, "Q2");
      }
      for (const renovacion of renovacionesConGasto) {
        totals[`${m}-Q1`] += getCeldaRenovacion(renovacion, m, "Q1");
        totals[`${m}-Q2`] += getCeldaRenovacion(renovacion, m, "Q2");
      }
      if (diezmoMensual > 0) {
        totals[`${m}-Q1`] += getCeldaDiezmo();
        totals[`${m}-Q2`] += getCeldaDiezmo();
      }
      totals[`${m}-Q1`] += getCeldaTarjetaPendiente(m, "Q1");
      totals[`${m}-Q2`] += getCeldaTarjetaPendiente(m, "Q2");
      if (ahorroMensual > 0) {
        totals[`${m}-Q1`] += getCeldaAhorroAuto();
        totals[`${m}-Q2`] += getCeldaAhorroAuto();
      }
    }
    return totals;
  }, [categorias, presupuestoEfectivo, prestamosActivos, contratosActivos, tarjetasConPagoMinimo, tipoCambio, metasActivas, eventosConGasto, ordenesConGasto, vacacionesConGasto, renovacionesConGasto, diezmoMensual, ahorroMensual, year, ingresoMensual, aportadoPorCuenta]);


  const totalPorCategoria = (categoria) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      total += totalMesCategoria(categoria, m) + totalMesEventoCategoria(categoria, m);
    }
    return total;
  };

  const totalPorMeta = (meta) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesMeta(meta, m);
    return total;
  };

  const totalPorEvento = (evento) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesEvento(evento, m);
    return total;
  };

  const totalPorEventoCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesEventoCategoria(categoriaNombre, m);
    return total;
  };

  const totalPorOrden = (orden) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesOrden(orden, m);
    return total;
  };

  const totalPorVacacionCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesVacacionCategoria(categoriaNombre, m);
    return total;
  };

  const totalPorRenovacionCategoria = (categoriaNombre) => {
    let total = 0;
    for (let m = 1; m <= 12; m++) total += totalMesRenovacionCategoria(categoriaNombre, m);
    return total;
  };

  const totalAnual = totalPorMes.reduce((s, v) => s + v, 0);

  const ingresoQuincenal = ingresoMensual / 2;

  const excedeQuincena = (mes, q) => ingresoQuincenal > 0 && (totalPorQuincenaGlobal[`${mes}-${q}`] || 0) > ingresoQuincenal;

  const hoy = new Date();
  const { year: yearActualConfig, month: mesActual, quincena: quincenaActual } = useMemo(() => periodoActualConfigurado(diasCobro, hoy), [diasCobro]);
  const excesoActual =
    yearActualConfig === year && ingresoQuincenal > 0
      ? (totalPorQuincenaGlobal[`${mesActual}-${quincenaActual}`] || 0) - ingresoQuincenal
      : 0;
  const quincenasExcedidas = useMemo(() => {
    if (ingresoQuincenal <= 0) return 0;
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      if (excedeQuincena(m, "Q1")) count++;
      if (excedeQuincena(m, "Q2")) count++;
    }
    return count;
  }, [totalPorQuincenaGlobal, ingresoQuincenal]);

  const comparacionActual = useMemo(() => {
    if (year !== yearActualConfig) return [];
    return categorias
      .map((cat) => {
        const resultado = consumoPresupuesto({
          presupuesto: presupuestoEfectivo,
          movimientos: movimientos || [],
          categoria: cat.nombre,
          year,
          month: mesActual,
          quincena: quincenaActual,
          diasCobro,
        });
        if (!resultado) return null;
        return { nombre: cat.nombre, ...resultado };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);
  }, [categorias, presupuestoEfectivo, movimientos, year, mesActual, quincenaActual, yearActualConfig, diasCobro]);


  if (categorias.length === 0 && prestamosActivos.length === 0 && metasActivas.length === 0 && eventosConGasto.length === 0 && ordenesConGasto.length === 0 && vacacionesConGasto.length === 0 && renovacionesConGasto.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
        Todavía no has creado ninguna categoría propia. Ve a{" "}
        <strong style={{ color: "var(--ink)" }}>Presupuesto → Categoría de gasto</strong> y usa "Nueva
        categoría" para agregar las que quieras presupuestar aquí.
      </div>
    );
  }

  const handleBlur = async (categoria, mes, quincena, value) => {
    // Protección extra: si esta categoría está bloqueada para asignación
    // manual (solo canjeable por puntos), no se guarda nada aunque llegue
    // a dispararse el evento — el input ya es de solo lectura, esto es un
    // respaldo por si acaso.
    const catInfo = categorias.find((c) => c.nombre === categoria);
    if (catInfo?.soloAsignablePorPuntos) return;

    const key = `${categoria}-${mes}-${quincena}`;
    const cleanStr = String(value ?? "").replace(/,/g, "").trim();
    const num = parseFloat(cleanStr);
    const validNum = Number.isFinite(num) && num > 0 ? num : 0;
    setSavingKey(key);
    try {
      if (esVistaCompartida && infoCompartido?.titularEmail) {
        await setPresupuestoCeldaCompartida(
          year,
          categoria,
          mes,
          quincena,
          validNum,
          infoCompartido.titularEmail,
          infoCompartido.titularUid
        );
      } else {
        await setPresupuestoCelda(year, categoria, mes, quincena, validNum);
      }
    } finally {
      setSavingKey(null);
    }
  };

  const cellStyle = { border: "none", background: "transparent", textAlign: "right", padding: "6px 4px", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink)", width: 52 };
  const columnaQuincena = (mes, quincena) => 2 + (mes - 1) * 2 + (quincena === "Q2" ? 1 : 0);

  return (
    <div>
      <style>{`
        ${mesActivo ? `.presupuesto-grid tbody tr > td:nth-child(${columnaQuincena(mesActivo, quincenaActiva)}) { box-shadow: inset 0 0 0 999px var(--sage-bg) !important; }` : ""}
        ${mesProximo ? `.presupuesto-grid tbody tr > td:nth-child(${columnaQuincena(mesProximo, quincenaProxima)}) { box-shadow: inset 0 0 0 999px var(--amber-bg) !important; }` : ""}
        .presupuesto-grid td:first-child,
        .presupuesto-grid th:first-child {
          position: sticky !important;
          left: 0 !important;
          z-index: 3 !important;
          background-clip: padding-box !important;
          box-shadow: 2px 0 6px rgba(0, 0, 0, 0.45) !important;
          opacity: 1 !important;
        }
        .presupuesto-grid th:first-child {
          z-index: 5 !important;
          background-color: var(--card) !important;
        }
        .presupuesto-grid tfoot td:first-child {
          z-index: 4 !important;
          background-color: var(--card) !important;
        }
      `}</style>

      {/* Barra compacta de Configuración, Alertas y Metodología (retraída por defecto para ver primero el desglose) */}
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={togglePanelSuperior}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 14px",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "var(--sage-bg)",
                color: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sliders size={14} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                Configuración y Modelo:
              </span>
              <span style={{ color: "var(--ink-soft)" }}>
                {METODOLOGIAS[configMetodologia.metodologia]?.nombre || "Regla 50 / 30 / 20"}
              </span>

              {esVistaCompartida && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 8,
                    background: "rgba(139, 92, 246, 0.16)",
                    color: "#8b5cf6",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                  }}
                >
                  💜 Plan Dúo
                </span>
              )}

              {ahorroSeSalta && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 8,
                    background: "var(--amber-bg)",
                    color: "var(--amber)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <AlertTriangle size={10} />
                  Endeudamiento {Math.round(nivelEndeudamiento)}%
                </span>
              )}

              {ingresoQuincenal > 0 && excesoActual > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 8,
                    background: "var(--stamp-bg)",
                    color: "var(--stamp)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                >
                  Exceso en quincena
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-soft)", fontSize: 11.5, flexShrink: 0 }}>
            <span>{panelSuperiorAbierto ? "Ocultar panel superior" : "Desplegar configuración y alertas"}</span>
            {panelSuperiorAbierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {/* Contenido desplegable (retraído por defecto) */}
        {panelSuperiorAbierto && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }} className="fade-in-quick">
            {ingresoQuincenal > 0 && excesoActual > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--stamp-bg)",
            border: "1px solid var(--stamp)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--stamp)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: "var(--stamp)", lineHeight: 1.5 }}>
            Tu presupuesto de esta quincena ({formatMoney(totalPorQuincenaGlobal[`${mesActual}-${quincenaActual}`])}) supera tu
            ingreso quincenal esperado ({formatMoney(ingresoQuincenal)}) por{" "}
            <strong>{formatMoney(excesoActual)}</strong>. Deberías reducir la distribución de esta quincena.
          </div>
        </div>
      )}

      {ahorroSeSalta && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "var(--amber-bg)",
            border: "1px solid var(--amber)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={16} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: "var(--amber)", lineHeight: 1.5 }}>
            Tu ahorro automático no se aplicó este mes: tu nivel de endeudamiento está en{" "}
            <strong>{Math.round(nivelEndeudamiento)}%</strong> (Alto/Crítico). Prioriza gastos fijos y deudas
            primero. Puedes cambiar esto en Configuración → Modo Ahorro.
          </div>
        </div>
      )}

      {ordenFlujoReferencia && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--sage-bg)",
            border: "1px solid var(--sage)",
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 14,
            fontSize: 12,
            color: "var(--sage)",
            flexWrap: "wrap",
          }}
        >
          <ListOrdered size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Orden de prioridad (según tu Editor de flujo):</strong> {ordenFlujoReferencia}
          </span>
        </div>
      )}

      {/* Banner / Selector de Metodología de Presupuesto */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
          border: "1px solid var(--sage)",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--sage-bg)",
              color: "var(--sage)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PieChart size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Modelo Activo: {METODOLOGIAS[configMetodologia.metodologia]?.nombre || "Regla 50 / 30 / 20"}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "1px 7px",
                  borderRadius: 10,
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-soft)",
                }}
              >
                {METODOLOGIAS[configMetodologia.metodologia]?.badge || "50% Necesidades · 30% Deseos · 20% Ahorro"}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>
              Aplica configuraciones automáticas (50/30/20, Base Cero, 70/20/10, etc.) o ajusta los pilares de tus categorías
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalMetodologiaAbierto(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--sage)",
            color: "#ffffff",
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
          }}
        >
          <Sliders size={14} />
          Configurar / Aplicar Tipo de Presupuesto
        </button>
      </div>

      {/* Selector de Vista: Mi Presupuesto Personal vs Presupuesto Plan Dúo (Compartido) */}
      {(infoCompartido?.tieneAcceso || planActual?.planId === "duo" || isOwner) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {infoCompartido?.tieneAcceso ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--paper)",
                padding: "3px 4px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setVistaPresupuesto("personal");
                  try {
                    localStorage.setItem(`smart-finance-vista-presupuesto-${user?.uid}`, "personal");
                  } catch (e) {}
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: vistaPresupuesto === "personal" ? "var(--card)" : "transparent",
                  color: vistaPresupuesto === "personal" ? "var(--ink)" : "var(--ink-soft)",
                  fontWeight: vistaPresupuesto === "personal" ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: vistaPresupuesto === "personal" ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                👤 Mi Presupuesto Personal
              </button>
              <button
                type="button"
                onClick={() => {
                  setVistaPresupuesto("compartido");
                  try {
                    localStorage.setItem(`smart-finance-vista-presupuesto-${user?.uid}`, "compartido");
                  } catch (e) {}
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: vistaPresupuesto === "compartido" ? "#8b5cf6" : "transparent",
                  color: vistaPresupuesto === "compartido" ? "#ffffff" : "var(--ink-soft)",
                  fontWeight: vistaPresupuesto === "compartido" ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: vistaPresupuesto === "compartido" ? "0 2px 8px rgba(139, 92, 246, 0.35)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <Heart size={14} fill={vistaPresupuesto === "compartido" ? "#ffffff" : "none"} />
                Presupuesto Plan Dúo ({infoCompartido.titularEmail?.split("@")[0] || "Titular"})
              </button>
            </div>
          ) : <div />}

          {(planActual?.planId === "duo" || isOwner) && (
            <button
              type="button"
              onClick={() => setModalCompartirAbierto(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                background: "rgba(139, 92, 246, 0.1)",
                color: "#8b5cf6",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Share2 size={14} />
              Compartir Presupuesto (Plan Dúo)
            </button>
          )}
        </div>
      )}

      {/* Banner cuando se visualiza el Presupuesto Compartido del Plan Dúo */}
      {esVistaCompartida && infoCompartido?.titularEmail && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.05) 100%)",
            border: "1.5px solid rgba(139, 92, 246, 0.4)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#8b5cf6",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
                flexShrink: 0,
              }}
            >
              <Eye size={19} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                  Estás viendo el Presupuesto del Plan Dúo
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "rgba(139, 92, 246, 0.2)",
                    color: "#8b5cf6",
                  }}
                >
                  ✓ Sincronizado en tiempo real
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "3px 0 0" }}>
                Compartido por <strong>{infoCompartido.titularEmail}</strong>. Tu cuenta mantiene su <strong>Plan Individual</strong> y tus cuentas, tarjetas y movimientos personales siguen 100% privados.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                setVistaPresupuesto("personal");
                try {
                  localStorage.setItem(`smart-finance-vista-presupuesto-${user?.uid}`, "personal");
                } catch (e) {}
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ver Mi Presupuesto Personal
            </button>
          </div>
        </div>
      )}

      {/* Banner para el titular o usuario en Plan Dúo */}
      {!esVistaCompartida && (planActual?.planId === "duo" || duoInfo?.esDuo) && (() => {
        const parejaMiembro = Array.isArray(planActual?.miembros)
          ? planActual.miembros.find((m) => m.rol === "pareja" || m.rol === "miembro")
          : null;
        const titularEmail = duoInfo?.titularEmail || planActual?.titularEmail || "Titular";
        const esTitular = isOwner || user?.email?.toLowerCase() === titularEmail.toLowerCase();

        return (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)",
              border: "1.5px solid rgba(139, 92, 246, 0.35)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#8b5cf6",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(139, 92, 246, 0.3)",
                  flexShrink: 0,
                }}
              >
                <Heart size={18} fill="#fff" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                    Presupuesto Familiar Compartido · Plan Dúo
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: "rgba(139, 92, 246, 0.18)",
                      color: "#8b5cf6",
                    }}
                  >
                    ✓ Sincronizado en tiempo real
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "2px 0 0", lineHeight: 1.4 }}>
                  {esTitular
                    ? `Este presupuesto está compartido con ${parejaMiembro?.email ? `tu pareja (${parejaMiembro.email})` : "otro usuario"}. Pueden ver y planificar juntos (incluso si tiene Plan Individual).`
                    : `Estás viendo el presupuesto compartido con el titular (${titularEmail}). Cualquier cambio se refleja para ambos en tiempo real.`}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {esTitular && (
                <button
                  type="button"
                  onClick={() => setModalCompartirAbierto(true)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 7,
                    background: "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Share2 size={13} />
                  Gestionar Acceso
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-soft)" }}>
                <Users size={13} style={{ color: "#8b5cf6" }} />
                <span>2 usuarios en sincronía</span>
              </div>
            </div>
          </div>
        );
      })()}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
        <button
          onClick={() => onChangeYear && onChangeYear(year - 1)}
          disabled={!onChangeYear}
          title="Año anterior"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--blue-bg)",
            color: "var(--blue)",
            cursor: onChangeYear ? "pointer" : "default",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700, minWidth: 56, textAlign: "center" }}>
          {year}
        </span>
        <button
          onClick={() => onChangeYear && onChangeYear(year + 1)}
          disabled={!onChangeYear}
          title="Año siguiente"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--blue-bg)",
            color: "var(--blue)",
            cursor: onChangeYear ? "pointer" : "default",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Presupuesto total {year}:</span>
            <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>${totalAnual.toLocaleString("es")}</span>
          </div>
          {ingresoQuincenal > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ingreso quincenal estimado:</span>
              <span className="despensa-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--sage)" }}>{formatMoney(ingresoQuincenal)}</span>
              {quincenasExcedidas > 0 && (
                <span className="despensa-tab-font" style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: "var(--stamp-bg)", color: "var(--stamp)" }}>
                  {quincenasExcedidas} quincena(s) excedida(s)
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          Cada mes tiene 2 columnas: Q1 (primera quincena) y Q2 (segunda quincena)
          {prestamosActivos.length > 0 && " · Las cuotas de préstamos (🏦) se calculan solas"}
          {metasActivas.length > 0 && " · Las metas de ahorro (🐷) también"}
          {eventosConGasto.length > 0 && " · Los eventos del calendario (📅) también"}
          {vacacionesConGasto.length > 0 && " · Tus vacaciones (🌴) también"}
        </div>
      </div>

      {comparacionActual.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={toggleMostrarComparacion}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--ink)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: mostrarComparacion ? 10 : 0,
            }}
          >
            Presupuestado vs. gastado real (quincena actual)
            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 500 }}>
              ({mostrarComparacion ? "ocultar" : "ver progreso"})
            </span>
            {mostrarComparacion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {mostrarComparacion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {comparacionActual.map((c) => {
                const barColor = c.pct >= 100 ? "var(--stamp)" : c.pct >= 80 ? "var(--amber)" : "var(--sage)";
                return (
                  <div key={c.nombre} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.nombre}</span>
                      <span className="despensa-mono" style={{ fontSize: 11.5, color: barColor, fontWeight: 600 }}>
                        {formatMoney(c.gastado)} / {formatMoney(c.presupuestado)} ({Math.round(c.pct)}%)
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, c.pct)}%`, background: barColor, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div ref={tablaPresupuestoRef} style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
        <table className="despensa-mono presupuesto-grid" style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 11, minWidth: 1500, width: "100%" }}>
          <thead>
            {/* Fila 1: Grupos de Trimestres con colores distintivos */}
            <tr>
              <th
                rowSpan={3}
                className="presupuesto-col-sticky"
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  zIndex: 10,
                  textAlign: "left",
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--line)",
                  borderRight: "1px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  minWidth: 185,
                  width: 185,
                  maxWidth: 185,
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                }}
              >
                Categoría
              </th>
              {CONFIG_TRIMESTRES.map((t, tIdx) => (
                <th
                  key={t.trimestre}
                  colSpan={6}
                  style={{
                    padding: "6px 8px",
                    borderBottom: `2.5px solid ${t.bordeColor}`,
                    borderLeft: tIdx > 0 ? `2.5px solid ${t.bordeColor}` : "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontWeight: 800,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    background: t.headerBg,
                    color: t.color,
                    letterSpacing: "0.03em",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ padding: "1px 6px", borderRadius: 6, background: t.color, color: "#ffffff", fontSize: 9.5, fontWeight: 900 }}>
                      {t.trimestre}
                    </span>
                    <span>{t.label} ({t.periodo})</span>
                  </div>
                </th>
              ))}
              <th
                rowSpan={3}
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--line)",
                  borderLeft: "1px solid var(--line)",
                  textAlign: "right",
                  fontWeight: 600,
                  background: "var(--sage-bg)",
                  color: "var(--sage)",
                }}
              >
                Total
              </th>
            </tr>

            {/* Fila 2: Meses con subrayado de color por trimestre */}
            <tr>
              {MESES.map((m, i) => {
                const mesNum = i + 1;
                const esActivo = mesActivo === mesNum;
                const esProximo = !esActivo && mesProximo === mesNum;
                const trimestre = obtenerTrimestreMes(i);
                const esInicioTrimestre = i % 3 === 0;

                return (
                  <th
                    key={m}
                    data-mes-presupuesto={mesNum}
                    colSpan={2}
                    style={{
                      padding: "6px 4px",
                      borderBottom: `3.5px solid ${trimestre.bordeColor}`,
                      borderLeft: esInicioTrimestre ? `2.5px solid ${trimestre.bordeColor}` : "1px solid var(--line-soft)",
                      textAlign: "center",
                      fontWeight: 700,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11.5,
                      background: esActivo ? "var(--sage-bg)" : esProximo ? "var(--amber-bg)" : trimestre.bgSoft,
                      color: esActivo ? "var(--sage)" : esProximo ? "var(--amber)" : "var(--ink)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: "0 4px",
                          borderRadius: 4,
                          background: `${trimestre.color}22`,
                          color: trimestre.color,
                          letterSpacing: "0.02em",
                        }}
                        title={`Mes ${mesNum} - ${m}`}
                      >
                        {String(mesNum).padStart(2, "0")}
                      </span>
                      <span>{m}</span>
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Fila 3: Quincenas Q1 y Q2 */}
            <tr>
              {MESES.map((m, i) =>
                QUINCENAS.map((q) => {
                  const mesNum = i + 1;
                  const esActivo = mesActivo === mesNum && quincenaActiva === q;
                  const esProximo = !esActivo && mesProximo === mesNum && quincenaProxima === q;
                  const trimestre = obtenerTrimestreMes(i);
                  const esInicioTrimestre = i % 3 === 0 && q === "Q1";

                  return (
                    <th
                      key={`${m}-${q}`}
                      style={{
                        padding: "4px 4px",
                        borderBottom: "1px solid var(--line)",
                        borderLeft: esInicioTrimestre
                          ? `2.5px solid ${trimestre.bordeColor}`
                          : q === "Q1"
                          ? "1px solid var(--line-soft)"
                          : "none",
                        textAlign: "right",
                        fontWeight: esActivo || esProximo ? 700 : 500,
                        color: esActivo ? "var(--sage)" : esProximo ? "var(--amber)" : "var(--ink-soft)",
                        fontSize: 9.5,
                        minWidth: 52,
                        background: esActivo
                          ? "var(--sage-bg)"
                          : esProximo
                          ? "var(--amber-bg)"
                          : "transparent",
                      }}
                    >
                      {q}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, rowIdx) => (
              <tr key={cat.nombre} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                <td
                  className="presupuesto-col-sticky"
                  style={{
                    position: "sticky",
                    left: 0,
                    background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: cat.color || (cat.clasificacion === "Fijo" ? "var(--stamp)" : "var(--sage)"),
                    minWidth: 185,
                    width: 185,
                    maxWidth: 185,
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`${cat.nombre} (${cat.clasificacion || "Categoría"})`}
                >
                  <div style={{ display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(() => {
                      const IconoCategoria = ICONOS_CATEGORIA[iconoParaCategoria(cat.nombre)] || Receipt;
                      return <IconoCategoria size={13} style={{ display: "inline-block", flexShrink: 0, marginRight: 6, color: cat.color || "var(--ink-soft)" }} />;
                    })()}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cat.nombre}>{abreviarNombreCategoria(cat.nombre)}</span>
                    {eventosConGasto.some((e) => e.categoriaGasto === cat.nombre) && (
                      <span title="Esta categoría también tiene eventos del calendario sumados a su total" style={{ marginLeft: 4, opacity: 0.7, flexShrink: 0 }}>
                        <CalendarIcon size={10} style={{ display: "inline-block" }} />
                      </span>
                    )}
                    {cat.agruparConCompromisos && (
                      <span title="Agrupada junto a Compromisos financieros" style={{ marginLeft: 4, opacity: 0.7, flexShrink: 0 }}>
                        <Landmark size={10} style={{ display: "inline-block" }} />
                      </span>
                    )}
                    {cat.soloAsignablePorPuntos && (
                      <span title="Solo se puede asignar presupuesto canjeando puntos" style={{ marginLeft: 4, opacity: 0.7, flexShrink: 0 }}>
                        <Lock size={10} style={{ display: "inline-block" }} />
                      </span>
                    )}
                  </div>
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const trimestre = obtenerTrimestreMes(i);
                  return QUINCENAS.map((q) => {
                    const key = `${cat.nombre}-${mes}-${q}`;
                    const val = getCelda(cat.nombre, mes, q);
                    const montoEvento = getCeldaEventoCategoria(cat.nombre, mes, q);
                    const nota = notasPorCelda[key];
                    const bloqueada = cat.soloAsignablePorPuntos;
                    const tooltipTexto = bloqueada
                      ? "Esta categoría solo se puede asignar canjeando puntos, en el módulo de Puntos"
                      : montoEvento > 0
                      ? `Presupuesto base: ${val != null ? formatMoney(val) : "—"} · Agendado en Calendario: ${formatMoney(montoEvento)} (Total quincena: ${formatMoney((val || 0) + montoEvento)})`
                      : nota || undefined;
                    const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                    return (
                      <td
                        key={key}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: esInicioTrimestre
                            ? `2.5px solid ${trimestre.bordeColor}55`
                            : q === "Q1"
                            ? "1px solid var(--line-soft)"
                            : "none",
                          padding: 0,
                          position: "relative",
                        }}
                        title={tooltipTexto}
                      >
                        <CeldaPresupuestoInput
                          val={val}
                          montoEvento={montoEvento}
                          bloqueada={bloqueada}
                          tooltipTexto={tooltipTexto}
                          savingKey={savingKey}
                          cellKey={key}
                          cellStyle={cellStyle}
                          nota={nota}
                          onSave={(num) => handleBlur(cat.nombre, mes, q, num)}
                        />
                        {montoEvento > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 1,
                              right: 2,
                              fontSize: 8.5,
                              fontWeight: 700,
                              color: "var(--amber)",
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              pointerEvents: "none",
                              lineHeight: 1,
                            }}
                            title={`Agendado en Calendario: +${formatMoney(montoEvento)}`}
                          >
                            <CalendarIcon size={8} />+{Math.round(montoEvento).toLocaleString()}
                          </div>
                        )}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {formatMoney(totalPorCategoria(cat.nombre)) || "0"}
                </td>
              </tr>
            ))}
            {(prestamosActivos.length > 0 || contratosActivos.length > 0 || tarjetasConPagoMinimo.length > 0) && (
              <tr style={{ background: "transparent" }}>
                <td
                  className="presupuesto-col-sticky"
                  onClick={() => setMostrarPrestamos((s) => !s)}
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--stamp-bg)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--stamp)",
                    cursor: "pointer",
                    minWidth: 185,
                    width: 185,
                    maxWidth: 185,
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Compromisos financieros (clic para ver el detalle de préstamos, contratos y tarjetas)"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mostrarPrestamos ? <ChevronUp size={12} style={{ flexShrink: 0 }} /> : <ChevronDown size={12} style={{ flexShrink: 0 }} />}
                    <Landmark size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title="Compromisos financieros">{abreviarNombreCategoria("Compromisos financieros")}</span>
                  </div>
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const trimestre = obtenerTrimestreMes(i);
                  return QUINCENAS.map((q) => {
                    const val = getCeldaPrestamosTodos(mes, q) + getCeldaContratosTodos(mes, q) + getCeldaTarjetasTodas(mes, q);
                    const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                    return (
                      <td
                        key={`prestamos-resumen-${mes}-${q}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: esInicioTrimestre
                            ? `2.5px solid ${trimestre.bordeColor}55`
                            : q === "Q1"
                            ? "1px solid var(--line-soft)"
                            : "none",
                          padding: "6px 4px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: "var(--stamp)",
                          opacity: val ? 1 : 0.35,
                        }}
                      >
                        {formatMoney(val) || "—"}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 700,
                    background: "var(--stamp-bg)",
                    color: "var(--stamp)",
                  }}
                >
                  {formatMoney(totalPrestamosTodos() + totalContratosTodos() + totalTarjetasTodas()) || "0"}
                </td>
              </tr>
            )}
            {mostrarPrestamos &&
              prestamosActivos.map((p, idx) => {
              const rowIdx = categorias.length + idx;
              return (
                <tr key={`prestamo-${p.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px 6px 20px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--stamp)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Calculado automáticamente desde Préstamos${(() => {
                      const entidad = entidades.find((e) => e.docId === p.entidadId);
                      return entidad ? ` — Entidad: ${entidad.name}` : "";
                    })()}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Landmark size={10} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Préstamo {p.numero}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaPrestamo(p, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${p.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                            : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--stamp)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--stamp-bg)",
                      color: "var(--stamp)",
                    }}
                  >
                    {formatMoney(totalPorPrestamo(p)) || "0"}
                  </td>
                </tr>
              );
            })}
            {mostrarPrestamos &&
              contratosActivos.map((c, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + idx;
              return (
                <tr key={`contrato-${c.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px 6px 20px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--stamp)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Calculado automáticamente desde Contratos (día ${c.diaPago}${c.diasGracia ? ` + ${c.diasGracia} días de gracia` : ""})${c.entidadName ? ` — Entidad: ${c.entidadName}` : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <FileText size={10} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Contrato ${c.nombre}`}>Contrato {abreviarNombreCategoria(c.nombre)}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaContrato(c, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${c.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--stamp)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--stamp-bg)",
                      color: "var(--stamp)",
                    }}
                  >
                    {formatMoney(totalPorContrato(c)) || "0"}
                  </td>
                </tr>
              );
            })}
            {mostrarPrestamos &&
              tarjetasConPagoMinimo.map((t, idx) => {
                const diaPago = Number(t.fechaPago) || 20;
                const quincenaEfectiva = diaPago >= 15 ? "Q2" : "Q1";
                const rowIdx = categorias.length + prestamosActivos.length + contratosActivos.length + idx * 2;
                const tieneUSD = t.tieneMonedaSecundaria && Number(t.pagoMinimoUSD) > 0;
                const tieneRD = (Number(t.pagoMinimo) || 0) > 0 || !tieneUSD;

                return (
                  <React.Fragment key={`tarjeta-minimo-${t.id || idx}`}>
                    {tieneRD && (
                      <tr style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                        <td
                          className="presupuesto-col-sticky"
                          style={{
                            position: "sticky",
                            left: 0,
                            background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                            padding: "6px 10px 6px 20px",
                            borderRight: "1px solid var(--line)",
                            borderBottom: "1px solid var(--line-soft)",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            color: "var(--stamp)",
                            minWidth: 185,
                            width: 185,
                            maxWidth: 185,
                            boxSizing: "border-box",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={`Pago mínimo de tarjeta: ${t.nombre || "Tarjeta"}${t.banco ? ` · ${t.banco}` : ""} (vence día ${diaPago} · ${quincenaEfectiva})`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <CreditCard size={10} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Mín. ${t.nombre || "Tarjeta"}`}>
                              Mín. {abreviarNombreCategoria(t.nombre || "Tarjeta")}
                            </span>
                          </div>
                        </td>
                        {MESES.map((_, i) => {
                          const mes = i + 1;
                          const trimestre = obtenerTrimestreMes(i);
                          return QUINCENAS.map((q) => {
                            const val = getCeldaTarjetaMinimo(t, mes, q, "RD");
                            const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                            return (
                              <td
                                key={`${t.id || idx}-rd-${mes}-${q}`}
                                style={{
                                  borderBottom: "1px solid var(--line-soft)",
                                  borderLeft: esInicioTrimestre
                                    ? `2.5px solid ${trimestre.bordeColor}55`
                                    : q === "Q1"
                                    ? "1px solid var(--line-soft)"
                                    : "none",
                                  padding: "6px 4px",
                                  textAlign: "right",
                                  color: "var(--stamp)",
                                  opacity: val ? 1 : 0.35,
                                }}
                              >
                                {formatMoney(val) || "—"}
                              </td>
                            );
                          });
                        })}
                        <td
                          style={{
                            borderLeft: "1px solid var(--line)",
                            borderBottom: "1px solid var(--line-soft)",
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 600,
                            background: "var(--stamp-bg)",
                            color: "var(--stamp)",
                          }}
                        >
                          {formatMoney(totalPorTarjetaMinimo(t, "RD")) || "0"}
                        </td>
                      </tr>
                    )}
                    {tieneUSD && (
                      <tr style={{ background: (rowIdx + 1) % 2 === 0 ? "transparent" : "var(--paper)" }}>
                        <td
                          className="presupuesto-col-sticky"
                          style={{
                            position: "sticky",
                            left: 0,
                            background: (rowIdx + 1) % 2 === 0 ? "var(--card)" : "var(--paper)",
                            padding: "6px 10px 6px 20px",
                            borderRight: "1px solid var(--line)",
                            borderBottom: "1px solid var(--line-soft)",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            color: "var(--stamp)",
                            minWidth: 185,
                            width: 185,
                            maxWidth: 185,
                            boxSizing: "border-box",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={`Pago mínimo USD: US$ ${Number(t.pagoMinimoUSD || 0).toFixed(2)} (tasa ~${tipoCambio || 60.3}) · vence día ${diaPago} (${quincenaEfectiva})`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <CreditCard size={10} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Mín. ${t.nombre || "Tarjeta"} (USD)`}>
                              Mín. {abreviarNombreCategoria(t.nombre || "Tarjeta")} (USD)
                            </span>
                          </div>
                        </td>
                        {MESES.map((_, i) => {
                          const mes = i + 1;
                          const trimestre = obtenerTrimestreMes(i);
                          return QUINCENAS.map((q) => {
                            const val = getCeldaTarjetaMinimo(t, mes, q, "USD");
                            const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                            return (
                              <td
                                key={`${t.id || idx}-usd-${mes}-${q}`}
                                style={{
                                  borderBottom: "1px solid var(--line-soft)",
                                  borderLeft: esInicioTrimestre
                                    ? `2.5px solid ${trimestre.bordeColor}55`
                                    : q === "Q1"
                                    ? "1px solid var(--line-soft)"
                                    : "none",
                                  padding: "6px 4px",
                                  textAlign: "right",
                                  color: "var(--stamp)",
                                  opacity: val ? 1 : 0.35,
                                }}
                                title={val > 0 ? `US$ ${Number(t.pagoMinimoUSD || 0).toFixed(2)}` : undefined}
                              >
                                {formatMoney(val) || "—"}
                              </td>
                            );
                          });
                        })}
                        <td
                          style={{
                            borderLeft: "1px solid var(--line)",
                            borderBottom: "1px solid var(--line-soft)",
                            padding: "7px 10px",
                            textAlign: "right",
                            fontWeight: 600,
                            background: "var(--stamp-bg)",
                            color: "var(--stamp)",
                          }}
                          title={`US$ ${(Number(t.pagoMinimoUSD || 0) * 12).toFixed(2)} / año`}
                        >
                          {formatMoney(totalPorTarjetaMinimo(t, "USD")) || "0"}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            {metasActivas.map((meta, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + idx;
              return (
                <tr key={`meta-${meta.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--sage)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title="Calculado automáticamente desde Ahorro"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <PiggyBank size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Meta: ${meta.nombre}`}>Meta: {abreviarNombreCategoria(meta.nombre)}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaMeta(meta, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${meta.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--sage)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                    }}
                  >
                    {formatMoney(totalPorMeta(meta)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasEventosUnicas.map((catNombre, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + idx;
              return (
                <tr key={`evento-cat-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Evento: ${catNombre}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <CalendarIcon size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={catNombre}>{abreviarNombreCategoria(catNombre)}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaEventoCategoria(catNombre, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorEventoCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {ordenesConGasto.map((orden, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + idx;
              return (
                <tr key={`orden-${orden.id}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Orden: ${orden.folio} (${orden.categoriaGasto})`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <ClipboardListIcon size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${orden.folio} (${orden.categoriaGasto})`}>
                        {orden.folio} ({abreviarNombreCategoria(orden.categoriaGasto)})
                      </span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaOrden(orden, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${orden.id}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorOrden(orden)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasVacacionesUnicas.map((catNombre, idx) => {
              const rowIdx = categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + ordenesConGasto.length + idx;
              return (
                <tr key={`vacacion-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Vacaciones: ${catNombre}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <PalmtreeIcon size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={catNombre}>{abreviarNombreCategoria(catNombre)}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaVacacionCategoria(catNombre, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorVacacionCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {categoriasRenovacionesUnicas.map((catNombre, idx) => {
              const rowIdx =
                categorias.length + prestamosActivos.length + metasActivas.length + categoriasEventosUnicas.length + ordenesConGasto.length + categoriasVacacionesUnicas.length + idx;
              return (
                <tr key={`renovacion-${catNombre}`} style={{ background: rowIdx % 2 === 0 ? "transparent" : "var(--paper)" }}>
                  <td
                    className="presupuesto-col-sticky"
                    style={{
                      position: "sticky",
                      left: 0,
                      background: rowIdx % 2 === 0 ? "var(--card)" : "var(--paper)",
                      padding: "6px 10px",
                      borderRight: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12.5,
                      color: "var(--amber)",
                      minWidth: 185,
                      width: 185,
                      maxWidth: 185,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Trámite: ${catNombre}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <ScrollTextIcon size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={catNombre}>{abreviarNombreCategoria(catNombre)}</span>
                    </div>
                  </td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const trimestre = obtenerTrimestreMes(i);
                    return QUINCENAS.map((q) => {
                      const val = getCeldaRenovacionCategoria(catNombre, mes, q);
                      const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                      return (
                        <td
                          key={`${catNombre}-${mes}-${q}`}
                          style={{
                            borderBottom: "1px solid var(--line-soft)",
                            borderLeft: esInicioTrimestre
                              ? `2.5px solid ${trimestre.bordeColor}55`
                              : q === "Q1"
                              ? "1px solid var(--line-soft)"
                              : "none",
                            padding: "6px 4px",
                            textAlign: "right",
                            color: "var(--amber)",
                            opacity: val ? 1 : 0.35,
                          }}
                        >
                          {formatMoney(val) || "—"}
                        </td>
                      );
                    });
                  })}
                  <td
                    style={{
                      borderLeft: "1px solid var(--line)",
                      borderBottom: "1px solid var(--line-soft)",
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      background: "var(--amber-bg)",
                      color: "var(--amber)",
                    }}
                  >
                    {formatMoney(totalPorRenovacionCategoria(catNombre)) || "0"}
                  </td>
                </tr>
              );
            })}
            {diezmoMensual > 0 && (
              <tr style={{ background: "var(--paper)" }}>
                <td
                  className="presupuesto-col-sticky"
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--paper)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: "var(--sage)",
                    minWidth: 185,
                    width: 185,
                    maxWidth: 185,
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Calculado automáticamente desde Configuración → Diezmo automático"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <HandCoinsIcon size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Diezmo ({diezmoConfig.porcentaje}%)</span>
                  </div>
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const trimestre = obtenerTrimestreMes(i);
                  return QUINCENAS.map((q) => {
                    const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                    return (
                      <td
                        key={`diezmo-${mes}-${q}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: esInicioTrimestre
                            ? `2.5px solid ${trimestre.bordeColor}55`
                            : q === "Q1"
                            ? "1px solid var(--line-soft)"
                            : "none",
                          padding: "6px 4px",
                          textAlign: "right",
                          color: "var(--sage)",
                        }}
                      >
                        {formatMoney(getCeldaDiezmo())}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--sage-bg)",
                    color: "var(--sage)",
                  }}
                >
                  {formatMoney(diezmoMensual * 12)}
                </td>
              </tr>
            )}
            {tarjetaPendienteAnual > 0 && (
              <tr style={{ background: "transparent" }}>
                <td
                  className="presupuesto-col-sticky"
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--card)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: "var(--amber)",
                    minWidth: 185,
                    width: 185,
                    maxWidth: 185,
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Calculado automáticamente desde los consumos registrados con tarjeta de crédito, según el corte y días de gracia de cada tarjeta"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <CreditCard size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title="Pago de tarjeta pendiente">{abreviarNombreCategoria("Pago de tarjeta pendiente")}</span>
                  </div>
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const trimestre = obtenerTrimestreMes(i);
                  return QUINCENAS.map((q) => {
                    const val = getCeldaTarjetaPendiente(mes, q);
                    const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                    return (
                      <td
                        key={`tarjeta-pendiente-${mes}-${q}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: esInicioTrimestre
                            ? `2.5px solid ${trimestre.bordeColor}55`
                            : q === "Q1"
                            ? "1px solid var(--line-soft)"
                            : "none",
                          padding: "6px 4px",
                          textAlign: "right",
                          color: "var(--amber)",
                          opacity: val ? 1 : 0.35,
                        }}
                      >
                        {formatMoney(val) || "—"}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--amber-bg)",
                    color: "var(--amber)",
                  }}
                >
                  {formatMoney(tarjetaPendienteAnual)}
                </td>
              </tr>
            )}
            {ahorroMensual > 0 && (
              <tr style={{ background: "transparent" }}>
                <td
                  className="presupuesto-col-sticky"
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "var(--card)",
                    padding: "6px 10px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12.5,
                    color: "var(--blue)",
                    minWidth: 185,
                    width: 185,
                    maxWidth: 185,
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Calculado automáticamente desde Configuración → Modo Ahorro"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <PiggyBank size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Modo Ahorro ({ahorroConfig.porcentaje}%)</span>
                  </div>
                </td>
                {MESES.map((_, i) => {
                  const mes = i + 1;
                  const trimestre = obtenerTrimestreMes(i);
                  return QUINCENAS.map((q) => {
                    const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                    return (
                      <td
                        key={`ahorro-auto-${mes}-${q}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          borderLeft: esInicioTrimestre
                            ? `2.5px solid ${trimestre.bordeColor}55`
                            : q === "Q1"
                            ? "1px solid var(--line-soft)"
                            : "none",
                          padding: "6px 4px",
                          textAlign: "right",
                          color: "var(--blue)",
                        }}
                      >
                        {formatMoney(getCeldaAhorroAuto())}
                      </td>
                    );
                  });
                })}
                <td
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line-soft)",
                    padding: "7px 10px",
                    textAlign: "right",
                    fontWeight: 600,
                    background: "var(--blue-bg)",
                    color: "var(--blue)",
                  }}
                >
                  {formatMoney(ahorroMensual * 12)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td
                className="presupuesto-col-sticky"
                style={{
                  position: "sticky",
                  left: 0,
                  background: "var(--card)",
                  padding: "8px 10px",
                  borderRight: "1px solid var(--line)",
                  borderTop: "2px solid var(--line)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12.5,
                  minWidth: 185,
                  width: 185,
                  maxWidth: 185,
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                }}
              >
                Total
              </td>
              {MESES.map((_, i) => {
                const mes = i + 1;
                const trimestre = obtenerTrimestreMes(i);
                return QUINCENAS.map((q) => {
                  const excedido = excedeQuincena(mes, q);
                  const esInicioTrimestre = i % 3 === 0 && q === "Q1";
                  return (
                    <td
                      key={`${mes}-${q}`}
                      title={excedido ? `Supera tu ingreso quincenal estimado (${formatMoney(ingresoQuincenal)})` : undefined}
                      style={{
                        padding: "8px 4px",
                        borderTop: "2px solid var(--line)",
                        borderLeft: esInicioTrimestre
                          ? `2.5px solid ${trimestre.bordeColor}55`
                          : q === "Q1"
                          ? "1px solid var(--line-soft)"
                          : "none",
                        textAlign: "right",
                        fontWeight: 600,
                        fontSize: 10.5,
                        background: excedido ? "var(--stamp-bg)" : "transparent",
                        color: excedido ? "var(--stamp)" : "var(--ink)",
                      }}
                    >
                      {formatMoney(totalPorQuincenaGlobal[`${mes}-${q}`]) || "0"}
                    </td>
                  );
                });
              })}
              <td style={{ padding: "8px 10px", borderTop: "2px solid var(--line)", borderLeft: "1px solid var(--line)", textAlign: "right", fontWeight: 700, background: "var(--sage-bg)", color: "var(--sage)" }}>
                {totalAnual.toLocaleString("es")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <MetodologiaPresupuestoModal
        isOpen={modalMetodologiaAbierto}
        onClose={() => {
          setModalMetodologiaAbierto(false);
          if (onCloseModalMetodologia) onCloseModalMetodologia();
        }}
        configActual={configMetodologia}
        categorias={categorias}
        presupuesto={presupuesto}
        year={year}
        ingresoMensual={ingresoMensual}
        prestamosActivos={prestamosActivos}
        contratosActivos={contratosActivos}
        tarjetasActivas={tarjetasConPagoMinimo}
        tipoCambio={tipoCambio}
        metasActivas={metasActivas}
        movimientos={movimientos}
        diezmoMensual={diezmoMensual}
        ahorroMensual={ahorroMensual}
        mesSeleccionado={mesActivo || (new Date().getMonth() + 1)}
      />
    </div>
  );
}
