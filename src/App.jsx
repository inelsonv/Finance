import React, { useEffect, useState } from "react";
import { Package, ShoppingCart } from "lucide-react";
import { watchProducts, watchList } from "./lib/db";
import Catalogo from "./components/Catalogo.jsx";
import ListaCompra from "./components/ListaCompra.jsx";

export default function App() {
  const [tab, setTab] = useState("catalogo");
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProducts = watchProducts((p) => {
      setProducts(p);
      setLoading(false);
    });
    const unsubList = watchList(setList);
    return () => {
      unsubProducts();
      unsubList();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ink-soft)" }}>
        Cargando tu despensa…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
        <h1 className="despensa-tab-font" style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
          Mi Despensa
        </h1>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          {products.length} producto{products.length !== 1 ? "s" : ""} en catálogo
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "1px solid var(--line)" }}>
        {[
          { id: "catalogo", label: "Catálogo", icon: Package },
          { id: "lista", label: "Lista de compra", icon: ShoppingCart },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              className="despensa-tab-font"
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: 500,
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--stamp)" : "2px solid transparent",
                color: active ? "var(--stamp)" : "var(--ink-soft)",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              <Icon size={15} />
              {t.label}
              {t.id === "lista" && list.length > 0 && (
                <span
                  className="despensa-mono"
                  style={{
                    background: active ? "var(--stamp)" : "var(--line)",
                    color: active ? "var(--stamp-bg)" : "var(--ink)",
                    borderRadius: 10,
                    fontSize: 11,
                    padding: "1px 6px",
                  }}
                >
                  {list.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "catalogo" ? (
        <Catalogo products={products} list={list} />
      ) : (
        <ListaCompra products={products} list={list} />
      )}
    </div>
  );
}
