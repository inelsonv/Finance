import React, { useEffect, useState } from "react";
import { watchProducts, watchList, watchEntidades } from "./lib/db";
import Catalogo from "./components/Catalogo.jsx";
import ListaCompra from "./components/ListaCompra.jsx";
import Entidades from "./components/Entidades.jsx";
import Sidebar from "./components/Sidebar.jsx";

const TITLES = {
  catalogo: "Catálogo",
  lista: "Lista de compra",
  entidades: "Entidades",
};

export default function App() {
  const [tab, setTab] = useState("catalogo");
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return () => {
      unsubProducts();
      unsubList();
      unsubEntidades();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ink-soft)" }}>
        Cargando tu despensa…
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
      <Sidebar tab={tab} setTab={setTab} listCount={list.length} />
      <main className="despensa-main">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
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

        {tab === "catalogo" && <Catalogo products={products} list={list} />}
        {tab === "lista" && <ListaCompra products={products} list={list} />}
        {tab === "entidades" && <Entidades entidades={entidades} />}
      </main>
    </div>
  );
}
