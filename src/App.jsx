import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, getRedirectResult } from "firebase/auth";
import { auth, ALLOWED_EMAIL } from "./firebase";
import { watchProducts, watchList, watchEntidades, watchConnectionStatus, watchMovimientos, watchPrestamos, watchCuentas, watchTarjetas, watchMembresias, watchFuentesIngreso, watchCategoriasGasto, watchPresupuestoAnual, watchContratos, watchFlujo, watchTiposEntidad, watchCalendario, watchActivos, watchMantenimientos, watchMetasAhorro, watchSeguros, watchHistorialCompras, watchOrdenesCompra } from "./lib/db";
import { LoginScreen, AccessDeniedScreen } from "./components/Login.jsx";
import AccountMenu from "./components/AccountMenu.jsx";
import ConfirmDialogHost from "./components/ConfirmDialogHost.jsx";
import GlobalSearch from "./components/GlobalSearch.jsx";
import Catalogo from "./components/Catalogo.jsx";
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
import OrdenesCompra from "./components/OrdenesCompra.jsx";
import ChecklistPagos from "./components/ChecklistPagos.jsx";
import Configuracion from "./components/Configuracion.jsx";
import EscanearFactura from "./components/EscanearFactura.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import Sidebar from "./components/Sidebar.jsx";

const THEME_KEY = "smart-finance-theme";
const SIDEBAR_KEY = "smart-finance-sidebar-collapsed";

const TITLES = {
  inicio: "Inicio",
  presupuesto: "Presupuesto",
  movimientos: "Movimientos",
  catalogo: "Catálogo",
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
  calendario: "Calendario",
  activos: "Activos",
  ahorro: "Ahorro",
  seguros: "Seguros",
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

export default function App() {
  const [authUser, setAuthUser] = useState(undefined); // undefined = cargando, null = sin sesión
  const [tab, setTab] = useState("inicio");
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
  const [historialCompras, setHistorialCompras] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [checklistPeriodoInicial, setChecklistPeriodoInicial] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [flujo, setFlujo] = useState(undefined);
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsed);

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
    const unsubPresupuestoAnual = watchPresupuestoAnual(currentYear, setPresupuestoAnual, handleError);
    const unsubContratos = watchContratos(setContratos, handleError);
    const unsubTiposEntidad = watchTiposEntidad(setTiposEntidad, handleError);
    const unsubFlujo = watchFlujo(setFlujo, handleError);
    const unsubCalendario = watchCalendario(setEventos, handleError);
    const unsubActivos = watchActivos(setActivos, handleError);
    const unsubMantenimientos = watchMantenimientos(setMantenimientos, handleError);
    const unsubMetasAhorro = watchMetasAhorro(setMetasAhorro, handleError);
    const unsubSeguros = watchSeguros(setSeguros, handleError);
    const unsubHistorialCompras = watchHistorialCompras(setHistorialCompras, handleError);
    const unsubOrdenesCompra = watchOrdenesCompra(setOrdenesCompra, handleError);
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
      unsubPresupuestoAnual();
      unsubContratos();
      unsubTiposEntidad();
      unsubFlujo();
      unsubCalendario();
      unsubActivos();
      unsubMantenimientos();
      unsubMetasAhorro();
      unsubSeguros();
      unsubHistorialCompras();
      unsubOrdenesCompra();
      unsubStatus();
    };
  }, [authorized]);

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
      <main className="despensa-main">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h1 className="despensa-tab-font" style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            {TITLES[tab]}
          </h1>
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
              />
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
                presupuestoYear={currentYear}
                seguros={seguros}
                onNavigate={handleNavigate}
              />
              <AccountMenu user={authUser} onSignOut={() => signOut(auth)} onOpenSettings={() => setTab("configuracion")} />
            </div>
            <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              {fechaHoy}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 20,
            marginBottom: "1.25rem",
            background: synced ? "var(--sage-bg)" : "var(--stamp-bg)",
            color: synced ? "var(--sage)" : "var(--stamp)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "currentColor",
              flexShrink: 0,
            }}
          />
          {synced === null
            ? "Conectando con Firebase…"
            : synced
            ? "Sincronizado con Firebase"
            : "Sin conexión con Firebase — guardando solo en este navegador"}
        </div>

        {tab === "inicio" && <Inicio prestamos={prestamos} tarjetas={tarjetas} fuentesIngreso={fuentesIngreso} movimientos={movimientos} cuentas={cuentas} />}
        {tab === "catalogo" && (
          <Catalogo
            products={products}
            entidades={entidades}
            historialCompras={historialCompras}
            ordenesCompra={ordenesCompra}
            onNavigate={setTab}
          />
        )}
        {tab === "entidades" && <Entidades entidades={entidades} tiposPersonalizados={tiposEntidad} />}
        {tab === "presupuesto" && <Presupuesto movimientos={movimientos} onOpenMovimientos={() => setTab("movimientos")} />}
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
            presupuestoYear={currentYear}
          />
        )}
        {tab === "prestamos" && <Prestamos prestamos={prestamos} entidades={entidades} movimientos={movimientos} activos={activos} />}
        {tab === "cuentas" && <Cuentas cuentas={cuentas} entidades={entidades} />}
        {tab === "tarjetas" && <Tarjetas tarjetas={tarjetas} entidades={entidades} movimientos={movimientos} />}
        {tab === "membresias" && <Membresias membresias={membresias} entidades={entidades} movimientos={movimientos} />}
        {tab === "contratos" && <Contratos contratos={contratos} entidades={entidades} movimientos={movimientos} />}
        {tab === "ingresos" && <FuentesIngreso fuentes={fuentesIngreso} entidades={entidades} movimientos={movimientos} />}
        {tab === "presupuesto-categoria-gasto" && <CategoriaGasto movimientos={movimientos} categoriasPersonalizadas={categoriasGasto} />}
        {tab === "presupuesto-mensual" && (
          <PresupuestoAnual
            presupuesto={presupuestoAnual}
            categoriasPersonalizadas={categoriasGasto}
            year={currentYear}
            prestamos={prestamos}
            metasAhorro={metasAhorro}
            fuentesIngreso={fuentesIngreso}
            cuentas={cuentas}
            movimientos={movimientos}
          />
        )}
        {tab === "presupuesto-flujo" && <FlujoEditor flujo={flujo} fuentesIngreso={fuentesIngreso} />}
        {tab === "inversion" && <Inversion cuentas={cuentas} movimientos={movimientos} />}
        {tab === "estrategia-deudas" && <EstrategiaDeudas prestamos={prestamos} tarjetas={tarjetas} movimientos={movimientos} />}
        {tab === "checklist-pagos" && (
          <ChecklistPagos
            categoriasGasto={categoriasGasto}
            presupuesto={presupuestoAnual}
            prestamos={prestamos}
            presupuestoYear={currentYear}
            periodoInicial={checklistPeriodoInicial}
            onConsumePeriodoInicial={() => setChecklistPeriodoInicial(null)}
          />
        )}
        {tab === "calendario" && <Calendario eventos={eventos} entidades={entidades} />}
        {tab === "activos" && <Activos activos={activos} mantenimientos={mantenimientos} />}
        {tab === "ahorro" && (
          <Ahorro metas={metasAhorro} cuentas={cuentas} movimientos={movimientos} fuentesIngreso={fuentesIngreso} onNavigate={setTab} />
        )}
        {tab === "seguros" && <Seguros seguros={seguros} entidades={entidades} activos={activos} />}
        {tab === "ordenes-compra" && <OrdenesCompra ordenes={ordenesCompra} products={products} entidades={entidades} />}
        {tab === "configuracion" && (
          <Configuracion theme={theme} onToggleTheme={toggleTheme} user={authUser} onSignOut={() => signOut(auth)} />
        )}
        {tab === "escanear-factura" && <EscanearFactura products={products} />}
      </main>
      <ConfirmDialogHost />
    </div>
  );
}
