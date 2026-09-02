import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { auth, ALLOWED_EMAIL } from "./firebase";
import { watchProducts, watchList, watchEntidades, watchConnectionStatus, watchMovimientos, watchPrestamos, watchCuentas, watchTarjetas, watchMembresias, watchFuentesIngreso, watchCategoriasGasto, watchPresupuestoAnual, watchContratos, watchFlujo, watchTiposEntidad, watchCalendario, watchActivos, watchMantenimientos, watchMetasAhorro, watchSeguros, watchHistorialCompras, watchOrdenesCompra, watchVacaciones, watchDiezmoConfig, watchAhorroAutoConfig, watchRenovaciones, watchPuntos, watchPuntosHistorial, watchChecklistTodos, watchCategoriasPuntosConfig, watchIngresosPuntuales, evaluarCumplimientoQuincena, watchTopesAjusteConfig, evaluarAjustesPresupuesto, watchAjustesPresupuestoHistorial, evaluarInteresYMoraTarjeta, watchComprasProrateadas, evaluarExcedenteQuincena, watchSugerenciasInversion, watchDiasCobroConfig } from "./lib/db";
import { cicloVencidoParaTarjeta } from "./lib/tarjetaCiclos";
import { periodoActualConfigurado, periodoAdyacenteConfigurado } from "./lib/quincenaConfig";
import { periodoKey } from "./lib/racha";
import { calcularResumenQuincena, rangoFechasQuincena } from "./lib/quincenaResumen";
import { LoginScreen, AccessDeniedScreen } from "./components/Login.jsx";
import AccountMenu from "./components/AccountMenu.jsx";
import ConfirmDialogHost from "./components/ConfirmDialogHost.jsx";
import GlobalSearch from "./components/GlobalSearch.jsx";
import MobileMenu from "./components/MobileMenu.jsx";
import PullToRefresh from "./components/PullToRefresh.jsx";
import { Menu, Trophy } from "lucide-react";
import Catalogo from "./components/Catalogo.jsx";
import Compras from "./components/Compras.jsx";
import Finanzas from "./components/Finanzas.jsx";
import PagosFijos from "./components/PagosFijos.jsx";
import Vacaciones from "./components/Vacaciones.jsx";
import Entidades from "./components/Entidades.jsx";
import Presupuesto from "./components/Presupuesto.jsx";
import Movimientos from "./components/Movimientos.jsx";
import Prestamos from "./components/Prestamos.jsx";
import Cuentas from "./components/Cuentas.jsx";
import Tarjetas from "./components/Tarjetas.jsx";
import Membresias from "./components/Membresias.jsx";
import FuentesIngreso from "./components/FuentesIngreso.jsx";
import CategoriaGasto from "./components/CategoriaGasto.jsx";
import Inicio from "./components/Inicio.jsx";
import PresupuestoAnual from "./components/PresupuestoAnual.jsx";
import Contratos from "./components/Contratos.jsx";
import FlujoEditor from "./components/FlujoEditor.jsx";
import Inversion from "./components/Inversion.jsx";
import EstrategiaDeudas from "./components/EstrategiaDeudas.jsx";
import Calendario from "./components/Calendario.jsx";
import Activos from "./components/Activos.jsx";
import Ahorro from "./components/Ahorro.jsx";
import Seguros from "./components/Seguros.jsx";
import Renovaciones from "./components/Renovaciones.jsx";
import OrdenesCompra from "./components/OrdenesCompra.jsx";
import ChecklistPagos from "./components/ChecklistPagos.jsx";
import Configuracion from "./components/Configuracion.jsx";
import EscanearFactura from "./components/EscanearFactura.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import Puntos from "./components/Puntos.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import NotificacionesPage from "./components/NotificacionesPage.jsx";

const THEME_KEY = "smart-finance-theme";
const SIDEBAR_KEY = "smart-finance-sidebar-collapsed";

const TITLES = {
  inicio: "Inicio",
  notificaciones: "Notificaciones",
  presupuesto: "Presupuesto",
  movimientos: "Movimientos",
  catalogo: "Catálogo",
  compras: "Compras",
  "dinero-cuentas": "Finanzas",
  "deudas-pagos": "Pagos fijos",
  entidades: "Entidades",
  cuentas: "Cuentas",
  prestamos: "Préstamos",
  tarjetas: "Tarjetas",
  membresias: "Membresías",
  contratos: "Contratos",
  ingresos: "Ingresos",
  "presupuesto-categoria-gasto": "Categoría de gasto",
  "presupuesto-mensual": "Presupuesto mensual",
  "presupuesto-flujo": "Editor de flujo",
  inversion: "Inversión",
  "estrategia-deudas": "Estrategia de deudas",
  "checklist-pagos": "Checklist de pagos",
  vacaciones: "Vacaciones",
  calendario: "Calendario",
  activos: "Activos",
  ahorro: "Ahorro",
  seguros: "Seguros",
  renovaciones: "Renovaciones y Trámites",
  puntos: "Puntos",
  "ordenes-compra": "Órdenes de compra",
  configuracion: "Configuración",
  "escanear-factura": "Registrar compra (factura)",
};

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch (e) {
    // localStorage no disponible, seguimos con el valor por defecto
  }
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getInitialCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function leerParamsURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const year = parseInt(params.get("year"), 10);
    const month = parseInt(params.get("month"), 10);
    const quincena = params.get("quincena");
    if (tab === "checklist-pagos" && year && month && (quincena === "Q1" || quincena === "Q2")) {
      return { tab, periodo: { year, month, quincena } };
    }
    if (tab) return { tab, periodo: null };
    return null;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [authUser, setAuthUser] = useState(undefined); // undefined = cargando, null = sin sesión
  const [tab, setTab] = useState(() => leerParamsURL()?.tab || "inicio");
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [fuentesIngreso, setFuentesIngreso] = useState([]);
  const [categoriasGasto, setCategoriasGasto] = useState([]);
  const [presupuestoAnual, setPresupuestoAnual] = useState({});
  const [contratos, setContratos] = useState([]);
  const [tiposEntidad, setTiposEntidad] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [activos, setActivos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [metasAhorro, setMetasAhorro] = useState([]);
  const [seguros, setSeguros] = useState([]);
  const [renovaciones, setRenovaciones] = useState([]);
  const [ingresosPuntuales, setIngresosPuntuales] = useState([]);
  const [historialCompras, setHistorialCompras] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [diezmoConfig, setDiezmoConfig] = useState(undefined);
  const [ahorroAutoConfig, setAhorroAutoConfig] = useState(undefined);
  const [puntos, setPuntos] = useState(0);
  const [puntosHistorial, setPuntosHistorial] = useState([]);
  const [checklistTodos, setChecklistTodos] = useState({});
  const [categoriasPuntos, setCategoriasPuntos] = useState([]);
  const [topesAjuste, setTopesAjuste] = useState({});
  const [ajustesPresupuesto, setAjustesPresupuesto] = useState([]);
  const [comprasProrateadas, setComprasProrateadas] = useState([]);
  const [sugerenciasInversion, setSugerenciasInversion] = useState([]);
  const [diasCobro, setDiasCobro] = useState([15, 30]);
  const [checklistPeriodoInicial, setChecklistPeriodoInicial] = useState(() => leerParamsURL()?.periodo || null);
  const [highlightId, setHighlightId] = useState(null);
  const [flujo, setFlujo] = useState(undefined);
  const [presupuestoYear, setPresupuestoYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsed);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // si falla el guardado, el tema sigue funcionando solo en esta sesión
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
    } catch (e) {
      // si falla el guardado, la preferencia sigue funcionando solo en esta sesión
    }
  }, [sidebarCollapsed]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  useEffect(() => {
    if (!highlightId) return;
    const id = highlightId;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-record-id="${CSS.escape(id)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("despensa-highlight");
        setTimeout(() => el.classList.remove("despensa-highlight"), 2400);
      }
      setHighlightId(null);
    }, 200);
    return () => clearTimeout(timer);
  }, [highlightId, tab]);

  const handleNavigate = (tabId, periodoObjetivo) => {
    setTab(tabId);
    if (periodoObjetivo) setChecklistPeriodoInicial(periodoObjetivo);
  };
  const handleSearchNavigate = (tabId, recordId) => {
    setTab(tabId);
    if (recordId) setHighlightId(recordId);
  };
  const toggleSidebar = () => setSidebarCollapsed((c) => !c);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      try {
        sessionStorage.setItem("smart-finance-auth-error", err.message || String(err));
      } catch (e) {
        // sessionStorage no disponible, el error simplemente no se muestra
      }
    });
    const unsub = onAuthStateChanged(auth, (user) => setAuthUser(user));
    return () => unsub();
  }, []);

  const authorized = authUser && authUser.email === ALLOWED_EMAIL;

  const fechaHoy = (() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  })();

  useEffect(() => {
    if (!authorized) return;
    const handleError = (err) => {
      setError(err.message || String(err));
      setLoading(false);
    };
    const unsubProducts = watchProducts((p) => {
      setProducts(p);
      setLoading(false);
    }, handleError);
    const unsubList = watchList(setList, handleError);
    const unsubEntidades = watchEntidades(setEntidades, handleError);
    const unsubMovimientos = watchMovimientos(setMovimientos, handleError);
    const unsubPrestamos = watchPrestamos(setPrestamos, handleError);
    const unsubCuentas = watchCuentas(setCuentas, handleError);
    const unsubTarjetas = watchTarjetas(setTarjetas, handleError);
    const unsubMembresias = watchMembresias(setMembresias, handleError);
    const unsubFuentesIngreso = watchFuentesIngreso(setFuentesIngreso, handleError);
    const unsubCategoriasGasto = watchCategoriasGasto(setCategoriasGasto, handleError);
    const unsubContratos = watchContratos(setContratos, handleError);
    const unsubTiposEntidad = watchTiposEntidad(setTiposEntidad, handleError);
    const unsubFlujo = watchFlujo(setFlujo, handleError);
    const unsubCalendario = watchCalendario(setEventos, handleError);
    const unsubActivos = watchActivos(setActivos, handleError);
    const unsubMantenimientos = watchMantenimientos(setMantenimientos, handleError);
    const unsubMetasAhorro = watchMetasAhorro(setMetasAhorro, handleError);
    const unsubSeguros = watchSeguros(setSeguros, handleError);
    const unsubRenovaciones = watchRenovaciones(setRenovaciones, handleError);
    const unsubIngresosPuntuales = watchIngresosPuntuales(setIngresosPuntuales, handleError);
    const unsubHistorialCompras = watchHistorialCompras(setHistorialCompras, handleError);
    const unsubOrdenesCompra = watchOrdenesCompra(setOrdenesCompra, handleError);
    const unsubVacaciones = watchVacaciones(setVacaciones, handleError);
    const unsubDiezmo = watchDiezmoConfig(setDiezmoConfig, handleError);
    const unsubAhorroAuto = watchAhorroAutoConfig(setAhorroAutoConfig, handleError);
    const unsubPuntos = watchPuntos(setPuntos, handleError);
    const unsubPuntosHistorial = watchPuntosHistorial(setPuntosHistorial, handleError);
    const unsubChecklistTodos = watchChecklistTodos(setChecklistTodos, handleError);
    const unsubCategoriasPuntos = watchCategoriasPuntosConfig(setCategoriasPuntos, handleError);
    const unsubTopesAjuste = watchTopesAjusteConfig(setTopesAjuste, handleError);
    const unsubAjustesPresupuesto = watchAjustesPresupuestoHistorial(setAjustesPresupuesto, handleError);
    const unsubComprasProrateadas = watchComprasProrateadas(setComprasProrateadas, handleError);
    const unsubSugerenciasInversion = watchSugerenciasInversion(setSugerenciasInversion, handleError);
    const unsubDiasCobro = watchDiasCobroConfig(setDiasCobro, handleError);
    const unsubStatus = watchConnectionStatus(setSynced);
    return () => {
      unsubProducts();
      unsubList();
      unsubEntidades();
      unsubMovimientos();
      unsubPrestamos();
      unsubCuentas();
      unsubTarjetas();
      unsubMembresias();
      unsubFuentesIngreso();
      unsubCategoriasGasto();
      unsubContratos();
      unsubTiposEntidad();
      unsubFlujo();
      unsubCalendario();
      unsubActivos();
      unsubMantenimientos();
      unsubMetasAhorro();
      unsubSeguros();
      unsubRenovaciones();
      unsubIngresosPuntuales();
      unsubHistorialCompras();
      unsubOrdenesCompra();
      unsubVacaciones();
      unsubDiezmo();
      unsubAhorroAuto();
      unsubPuntos();
      unsubPuntosHistorial();
      unsubChecklistTodos();
      unsubCategoriasPuntos();
      unsubTopesAjuste();
      unsubAjustesPresupuesto();
      unsubComprasProrateadas();
      unsubSugerenciasInversion();
      unsubDiasCobro();
      unsubStatus();
    };
  }, [authorized]);

  // Al abrir la app, revisa si la quincena que acaba de cerrar cumplió el
  // presupuesto (sin excederse), y en ese caso otorga puntos. Protegido
  // contra doble-evaluación desde db.js, así que es seguro que corra en cada
  // sesión sin duplicar puntos.
  const cumplimientoEvaluado = useRef(false);
  useEffect(() => {
    if (!authorized || cumplimientoEvaluado.current) return;
    if (!presupuestoAnual || categoriasGasto.length === 0) return;

    const periodoCerrado = periodoAdyacenteConfigurado(periodoActualConfigurado(diasCobro), diasCobro, -1);
    if (periodoCerrado.year !== presupuestoYear) return; // datos de otro año no disponibles aquí

    cumplimientoEvaluado.current = true;
    const resumen = calcularResumenQuincena({
      year: periodoCerrado.year,
      month: periodoCerrado.month,
      quincena: periodoCerrado.quincena,
      presupuesto: presupuestoAnual,
      categoriasGasto,
      prestamos,
      movimientos,
      diasCobro,
    });
    evaluarCumplimientoQuincena(periodoKey(periodoCerrado), resumen.presupuestado, resumen.gastado).catch((err) =>
      console.error("No se pudo evaluar el cumplimiento de la quincena:", err)
    );
    evaluarExcedenteQuincena(periodoKey(periodoCerrado), resumen.presupuestado, resumen.gastado).catch((err) =>
      console.error("No se pudo evaluar el excedente de la quincena:", err)
    );
  }, [authorized, presupuestoAnual, categoriasGasto, prestamos, movimientos, presupuestoYear, diasCobro]);

  // Al abrir la app, revisa si alguna categoría con tope configurado se
  // excedió en la quincena que acaba de cerrar, y si es así, ajusta
  // automáticamente el presupuesto de la quincena actual (la "próxima" desde
  // el punto de vista de la que cerró) hasta el tope definido.
  const topesAjusteEvaluado = useRef(false);
  useEffect(() => {
    if (!authorized || topesAjusteEvaluado.current) return;
    if (!presupuestoAnual || categoriasGasto.length === 0) return;
    if (Object.keys(topesAjuste).length === 0) return;

    const periodoCerrado = periodoAdyacenteConfigurado(periodoActualConfigurado(diasCobro), diasCobro, -1);
    if (periodoCerrado.year !== presupuestoYear) return;

    topesAjusteEvaluado.current = true;

    const { fechaInicio, fechaFin } = rangoFechasQuincena(periodoCerrado.year, periodoCerrado.month, periodoCerrado.quincena, diasCobro);
    const gastoPorCategoria = {};
    for (const m of movimientos) {
      if (m.type !== "Gasto") continue;
      if (!m.date || m.date < fechaInicio || m.date > fechaFin) continue;
      gastoPorCategoria[m.category] = (gastoPorCategoria[m.category] || 0) + (Number(m.amount) || 0);
    }
    const presupuestoPorCategoria = {};
    for (const c of categoriasGasto) {
      const val = presupuestoAnual?.[c.nombre]?.[String(periodoCerrado.month)]?.[periodoCerrado.quincena];
      if (typeof val === "number") presupuestoPorCategoria[c.nombre] = val;
    }

    evaluarAjustesPresupuesto(periodoKey(periodoCerrado), gastoPorCategoria, presupuestoPorCategoria, topesAjuste, periodoActualConfigurado(diasCobro)).catch((err) =>
      console.error("No se pudieron evaluar los ajustes automáticos de presupuesto:", err)
    );
  }, [authorized, presupuestoAnual, categoriasGasto, movimientos, presupuestoYear, topesAjuste, diasCobro]);

  // Al abrir la app, revisa cada tarjeta activa con TAE configurada: si su
  // ciclo de corte más reciente ya venció el plazo de gracia sin saldarse,
  // aplica automáticamente el interés (y la mora, si está configurada) al
  // saldo actual. Protegido contra doble-aplicación desde db.js (un ciclo
  // solo se evalúa una vez).
  const interesTarjetasEvaluado = useRef(false);
  useEffect(() => {
    if (!authorized || interesTarjetasEvaluado.current) return;
    if (!tarjetas || tarjetas.length === 0) return;
    interesTarjetasEvaluado.current = true;

    const hoy = new Date();
    for (const t of tarjetas) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
      const ciclo = cicloVencidoParaTarjeta(t, hoy);
      if (!ciclo) continue;
      evaluarInteresYMoraTarjeta(t.id, ciclo.cicloKey, Number(t.saldoActual) || 0, t.tasaTAE, t.montoMora).catch((err) =>
        console.error(`No se pudo evaluar interés/mora de la tarjeta ${t.id}:`, err)
      );
    }
  }, [authorized, tarjetas]);

  useEffect(() => {
    if (!authorized) return;
    const unsub = watchPresupuestoAnual(
      presupuestoYear,
      setPresupuestoAnual,
      (err) => setError(err.message || String(err))
    );
    return () => unsub();
  }, [authorized, presupuestoYear]);

  if (authUser === undefined) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ink-soft)" }}>
        Verificando sesión…
      </div>
    );
  }

  if (authUser === null) {
    return <LoginScreen />;
  }

  if (!authorized) {
    return <AccessDeniedScreen user={authUser} />;
  }

  if (loading) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ink-soft)" }}>
        Cargando Smart Finance…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1rem" }}>
        <div style={{ background: "var(--stamp-bg)", color: "var(--stamp)", borderRadius: 10, padding: "1rem 1.25rem", fontSize: 13 }}>
          <strong style={{ display: "block", marginBottom: 6 }}>No se pudo conectar con Firebase</strong>
          {error}
          <div style={{ marginTop: 10, color: "var(--ink-soft)" }}>
            Revisa que las 6 variables VITE_FIREBASE_* estén configuradas correctamente
            (en local: archivo .env; en GitHub Pages: repository secrets) y que las
            reglas de Firestore estén desplegadas.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="despensa-shell">
      <Sidebar
        tab={tab}
        setTab={setTab}
        listCount={(ordenesCompra.find((o) => o.estado === "Borrador")?.items || []).length}
        prestamosActivosCount={prestamos.filter((p) => p.estado === "Activo").length}
        theme={theme}
        onToggleTheme={toggleTheme}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />
      <BottomNav
        tab={tab}
        setTab={setTab}
        categoriasGasto={categoriasGasto}
        ingresosPuntuales={ingresosPuntuales}
        ajustesPresupuesto={ajustesPresupuesto}
        sugerenciasInversion={sugerenciasInversion}
        diasCobro={diasCobro}
        prestamos={prestamos}
        tarjetas={tarjetas}
        membresias={membresias}
        contratos={contratos}
        movimientos={movimientos}
        products={products}
        entidades={entidades}
        fuentesIngreso={fuentesIngreso}
        eventos={eventos}
        presupuesto={presupuestoAnual}
        presupuestoYear={presupuestoYear}
        seguros={seguros}
      />
      <PullToRefresh />
      <main className="despensa-main">
        <div className="despensa-header" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div className={`despensa-header-left${searchOpen ? " despensa-header-left--search-open" : ""}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowMobileMenu(true)}
              className="despensa-hamburger"
              title="Más opciones"
            >
              <Menu size={22} />
            </button>
            <h1 className="despensa-tab-font" style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              {TITLES[tab]}
            </h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {tab === "catalogo" && (
                <>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    {products.length} producto{products.length !== 1 ? "s" : ""} en catálogo
                  </span>
                  <button
                    onClick={() => setTab("escanear-factura")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: "var(--ink)",
                      color: "var(--paper)",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Registrar compra (factura)
                  </button>
                </>
              )}
              {tab === "entidades" && (
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  {entidades.length} entidad{entidades.length !== 1 ? "es" : ""} registrada{entidades.length !== 1 ? "s" : ""}
                </span>
              )}
              <GlobalSearch
                products={products}
                entidades={entidades}
                prestamos={prestamos}
                tarjetas={tarjetas}
                membresias={membresias}
                contratos={contratos}
                cuentas={cuentas}
                activos={activos}
                seguros={seguros}
                eventos={eventos}
                ordenesCompra={ordenesCompra}
                metasAhorro={metasAhorro}
                fuentesIngreso={fuentesIngreso}
                onNavigate={handleSearchNavigate}
                onOpenChange={setSearchOpen}
              />
              <button
                onClick={() => setTab("puntos")}
                title="Ver tus puntos"
                className={`despensa-puntos-btn${searchOpen ? " despensa-header-left--search-open" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--amber-bg)",
                  color: "var(--amber)",
                  border: "1px solid var(--amber)",
                  borderRadius: 20,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Trophy size={14} />
                <span className="despensa-mono despensa-puntos-monto">${puntos}</span>
              </button>
              <div className="despensa-desktop-only">
                <NotificationBell
                  prestamos={prestamos}
                  tarjetas={tarjetas}
                  membresias={membresias}
                  contratos={contratos}
                  movimientos={movimientos}
                  products={products}
                  entidades={entidades}
                  fuentesIngreso={fuentesIngreso}
                  eventos={eventos}
                  presupuesto={presupuestoAnual}
                  presupuestoYear={presupuestoYear}
                  seguros={seguros}
                  onNavigate={handleNavigate}
                  categoriasGasto={categoriasGasto}
                  ingresosPuntuales={ingresosPuntuales}
                  ajustesPresupuesto={ajustesPresupuesto}
                  sugerenciasInversion={sugerenciasInversion}
                  diasCobro={diasCobro}
                />
              </div>
              <AccountMenu user={authUser} onSignOut={() => signOut(auth)} onOpenSettings={() => setTab("configuracion")} synced={synced} />
            </div>
            <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              {fechaHoy}
            </span>
          </div>
        </div>

        {tab === "inicio" && <Inicio prestamos={prestamos} tarjetas={tarjetas} fuentesIngreso={fuentesIngreso} movimientos={movimientos} cuentas={cuentas} />}
        {tab === "notificaciones" && (
          <NotificacionesPage
            prestamos={prestamos}
            tarjetas={tarjetas}
            membresias={membresias}
            contratos={contratos}
            movimientos={movimientos}
            products={products}
            entidades={entidades}
            fuentesIngreso={fuentesIngreso}
            eventos={eventos}
            presupuesto={presupuestoAnual}
            presupuestoYear={presupuestoYear}
            seguros={seguros}
            onNavigate={handleNavigate}
            categoriasGasto={categoriasGasto}
            ingresosPuntuales={ingresosPuntuales}
            ajustesPresupuesto={ajustesPresupuesto}
            sugerenciasInversion={sugerenciasInversion}
            diasCobro={diasCobro}
          />
        )}
        {tab === "puntos" && (
          <Puntos
            puntos={puntos}
            puntosHistorial={puntosHistorial}
            categoriasGasto={categoriasGasto}
            checklistTodos={checklistTodos}
            categoriasPuntos={categoriasPuntos}
            fuentesIngreso={fuentesIngreso}
            topesAjuste={topesAjuste}
          />
        )}
        {tab === "compras" && (
          <Compras products={products} ordenesCompra={ordenesCompra} historialCompras={historialCompras} onNavigate={setTab} />
        )}
        {tab === "dinero-cuentas" && (
          <Finanzas cuentas={cuentas} metasAhorro={metasAhorro} fuentesIngreso={fuentesIngreso} movimientos={movimientos} onNavigate={setTab} />
        )}
        {tab === "deudas-pagos" && (
          <PagosFijos prestamos={prestamos} tarjetas={tarjetas} membresias={membresias} contratos={contratos} movimientos={movimientos} onNavigate={setTab} />
        )}
        {tab === "catalogo" && (
          <Catalogo
            products={products}
            entidades={entidades}
            historialCompras={historialCompras}
            ordenesCompra={ordenesCompra}
            onNavigate={setTab}
            categoriasGasto={categoriasGasto}
            comprasProrateadas={comprasProrateadas}
          />
        )}
        {tab === "entidades" && <Entidades entidades={entidades} tiposPersonalizados={tiposEntidad} />}
        {tab === "presupuesto" && (
          <Presupuesto
            movimientos={movimientos}
            onOpenMovimientos={() => setTab("movimientos")}
            presupuesto={presupuestoAnual}
            categoriasGasto={categoriasGasto}
            prestamos={prestamos}
            diasCobro={diasCobro}
          />
        )}
        {tab === "movimientos" && (
          <Movimientos
            movimientos={movimientos}
            entidades={entidades}
            prestamos={prestamos}
            cuentas={cuentas}
            tarjetas={tarjetas}
            membresias={membresias}
            fuentesIngreso={fuentesIngreso}
            categoriasGasto={categoriasGasto}
            contratos={contratos}
            presupuesto={presupuestoAnual}
            presupuestoYear={presupuestoYear}
            diasCobro={diasCobro}
          />
        )}
        {tab === "prestamos" && <Prestamos prestamos={prestamos} entidades={entidades} movimientos={movimientos} activos={activos} />}
        {tab === "cuentas" && <Cuentas cuentas={cuentas} entidades={entidades} />}
        {tab === "tarjetas" && <Tarjetas tarjetas={tarjetas} entidades={entidades} movimientos={movimientos} />}
        {tab === "membresias" && <Membresias membresias={membresias} entidades={entidades} movimientos={movimientos} />}
        {tab === "contratos" && <Contratos contratos={contratos} entidades={entidades} movimientos={movimientos} />}
        {tab === "ingresos" && (
          <FuentesIngreso fuentes={fuentesIngreso} entidades={entidades} movimientos={movimientos} ingresosPuntuales={ingresosPuntuales} />
        )}
        {tab === "presupuesto-categoria-gasto" && <CategoriaGasto movimientos={movimientos} categoriasPersonalizadas={categoriasGasto} />}
        {tab === "presupuesto-mensual" && (
          <PresupuestoAnual
            presupuesto={presupuestoAnual}
            categoriasPersonalizadas={categoriasGasto}
            year={presupuestoYear}
            onChangeYear={setPresupuestoYear}
            renovaciones={renovaciones}
            flujo={flujo}
            prestamos={prestamos}
            metasAhorro={metasAhorro}
            fuentesIngreso={fuentesIngreso}
            cuentas={cuentas}
            movimientos={movimientos}
            eventos={eventos}
            ordenesCompra={ordenesCompra}
            vacaciones={vacaciones}
            diezmoConfig={diezmoConfig}
            tarjetas={tarjetas}
            ahorroConfig={ahorroAutoConfig}
            diasCobro={diasCobro}
          />
        )}
        {tab === "presupuesto-flujo" && (
          <FlujoEditor
            flujo={flujo}
            fuentesIngreso={fuentesIngreso}
            categoriasGasto={categoriasGasto}
            prestamos={prestamos}
            metasAhorro={metasAhorro}
            movimientos={movimientos}
            tarjetas={tarjetas}
            presupuesto={presupuestoAnual}
            diasCobro={diasCobro}
          />
        )}
        {tab === "inversion" && <Inversion cuentas={cuentas} movimientos={movimientos} />}
        {tab === "estrategia-deudas" && <EstrategiaDeudas prestamos={prestamos} tarjetas={tarjetas} movimientos={movimientos} />}
        {tab === "checklist-pagos" && (
          <ChecklistPagos
            categoriasGasto={categoriasGasto}
            presupuesto={presupuestoAnual}
            prestamos={prestamos}
            presupuestoYear={presupuestoYear}
            periodoInicial={checklistPeriodoInicial}
            onConsumePeriodoInicial={() => setChecklistPeriodoInicial(null)}
            fuentesIngreso={fuentesIngreso}
            diasCobro={diasCobro}
            movimientos={movimientos}
          />
        )}
        {tab === "vacaciones" && (
          <Vacaciones vacaciones={vacaciones} fuentesIngreso={fuentesIngreso} categoriasGasto={categoriasGasto} />
        )}
        {tab === "calendario" && (
          <Calendario eventos={eventos} entidades={entidades} categoriasGasto={categoriasGasto} vacaciones={vacaciones} tarjetas={tarjetas} />
        )}
        {tab === "activos" && <Activos activos={activos} mantenimientos={mantenimientos} />}
        {tab === "ahorro" && (
          <Ahorro metas={metasAhorro} cuentas={cuentas} movimientos={movimientos} fuentesIngreso={fuentesIngreso} onNavigate={setTab} />
        )}
        {tab === "seguros" && <Seguros seguros={seguros} entidades={entidades} activos={activos} />}
        {tab === "renovaciones" && (
          <Renovaciones renovaciones={renovaciones} entidades={entidades} activos={activos} categoriasGasto={categoriasGasto} />
        )}
        {tab === "ordenes-compra" && <OrdenesCompra ordenes={ordenesCompra} products={products} entidades={entidades} categoriasGasto={categoriasGasto} />}
        {tab === "configuracion" && (
          <Configuracion theme={theme} onToggleTheme={toggleTheme} user={authUser} onSignOut={() => signOut(auth)} categoriasGasto={categoriasGasto} />
        )}
        {tab === "escanear-factura" && <EscanearFactura products={products} />}
      </main>
      <ConfirmDialogHost />
      {showMobileMenu && <MobileMenu tab={tab} setTab={(t) => setTab(t)} onClose={() => setShowMobileMenu(false)} onSignOut={() => signOut(auth)} />}
    </div>
  );
}
