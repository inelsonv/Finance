import React, { useEffect, useState } from "react";
import { watchProducts, watchList, watchEntidades, watchConnectionStatus, watchMovimientos, watchPrestamos, watchCuentas, watchTarjetas } from "./lib/db";
import Catalogo from "./components/Catalogo.jsx";
import ListaCompra from "./components/ListaCompra.jsx";
import Entidades from "./components/Entidades.jsx";
import Presupuesto from "./components/Presupuesto.jsx";
import Movimientos from "./components/Movimientos.jsx";
import Prestamos from "./components/Prestamos.jsx";
import Cuentas from "./components/Cuentas.jsx";
import Tarjetas from "./components/Tarjetas.jsx";
import Sidebar from "./components/Sidebar.jsx";

const THEME_KEY = "smart-finance-theme";
const SIDEBAR_KEY = "smart-finance-sidebar-collapsed";

const TITLES = {
  presupuesto: "Presupuesto",
  movimientos: "Movimientos",
  catalogo: "Catálogo",
  lista: "Lista de compra",
  entidades: "Entidades",
  cuentas: "Cuentas",
  prestamos: "Préstamos",
  tarjetas: "Tarjetas",
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
  const [tab, setTab] = useState("presupuesto");
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
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
  const toggleSidebar = () => setSidebarCollapsed((c) => !c);

  useEffect(() => {
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
    const unsubStatus = watchConnectionStatus(setSynced);
    return () => {
      unsubProducts();
      unsubList();
      unsubEntidades();
      unsubMovimientos();
      unsubPrestamos();
      unsubCuentas();
      unsubTarjetas();
      unsubStatus();
    };
  }, []);

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
        listCount={list.length}
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
          {tab === "catalogo" && (
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {products.length} producto{products.length !== 1 ? "s" : ""} en catálogo
            </span>
          )}
          {tab === "entidades" && (
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {entidades.length} entidad{entidades.length !== 1 ? "es" : ""} registrada{entidades.length !== 1 ? "s" : ""}
            </span>
          )}
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

        {tab === "catalogo" && <Catalogo products={products} list={list} />}
        {tab === "lista" && <ListaCompra products={products} list={list} />}
        {tab === "entidades" && <Entidades entidades={entidades} />}
        {tab === "presupuesto" && <Presupuesto movimientos={movimientos} onOpenMovimientos={() => setTab("movimientos")} />}
        {tab === "movimientos" && <Movimientos movimientos={movimientos} entidades={entidades} prestamos={prestamos} cuentas={cuentas} tarjetas={tarjetas} />}
        {tab === "prestamos" && <Prestamos prestamos={prestamos} entidades={entidades} movimientos={movimientos} />}
        {tab === "cuentas" && <Cuentas cuentas={cuentas} entidades={entidades} />}
        {tab === "tarjetas" && <Tarjetas tarjetas={tarjetas} entidades={entidades} movimientos={movimientos} />}
      </main>
    </div>
  );
}
