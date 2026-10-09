import React, { useMemo, useState } from "react";
import { X, Search, Check, Plus, RefreshCw, ShoppingBag, ExternalLink, Image as ImageIcon, Sparkles } from "lucide-react";
import {
  PRODUCTOS_BRAVO_REGULARES,
  buscarProductosSupermercadosRd,
  normalizarTexto,
} from "../lib/supermercadosRd";
import { addProduct, setProductImageUrl } from "../lib/db";

const CATEGORIAS_BRAVO = [
  "Todos",
  "Despensa",
  "Lácteos y Huevos",
  "Carnes y Embutidos",
  "Limpieza",
  "Cuidado Personal",
  "Bebidas y Snacks",
];

export default function ModalProductosBravo({ products = [], onClose }) {
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [resultadosEnVivo, setResultadosEnVivo] = useState(null);
  const [buscandoEnVivo, setBuscandoEnVivo] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [sincronizandoCatalogo, setSincronizandoCatalogo] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Mapa de productos existentes en el catálogo del usuario para saber si ya están agregados
  const catalogoPorNombre = useMemo(() => {
    const mapa = new Map();
    products.forEach((p) => {
      if (p?.name) {
        mapa.set(normalizarTexto(p.name), p);
      }
    });
    return mapa;
  }, [products]);

  // Lista base filtrada por categoría y búsqueda local
  const productosFiltrados = useMemo(() => {
    let lista = resultadosEnVivo || PRODUCTOS_BRAVO_REGULARES;
    if (categoriaActiva !== "Todos" && !resultadosEnVivo) {
      lista = lista.filter((p) => p.categoria === categoriaActiva);
    }
    if (busqueda.trim()) {
      const qNorm = normalizarTexto(busqueda);
      const palabras = qNorm.split(" ").filter((w) => w.length > 1);
      lista = lista.filter((p) => {
        const nNorm = normalizarTexto(p.nombre);
        return palabras.every((w) => nNorm.includes(w));
      });
    }
    return lista;
  }, [categoriaActiva, busqueda, resultadosEnVivo]);

  // Búsqueda en vivo en supermercadosrd.com
  const handleBuscarEnVivo = async () => {
    if (!busqueda.trim()) {
      setResultadosEnVivo(null);
      return;
    }
    setBuscandoEnVivo(true);
    setMensaje(null);
    try {
      const res = await buscarProductosSupermercadosRd(busqueda.trim());
      setResultadosEnVivo(res);
      if (res.length === 0) {
        setMensaje({ tipo: "info", texto: `No se encontraron productos en supermercadosrd.com para "${busqueda}".` });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "No se pudo conectar con la búsqueda en vivo." });
    } finally {
      setBuscandoEnVivo(false);
    }
  };

  // Agregar producto al catálogo del usuario con su foto
  const handleAgregarAlCatalogo = async (item) => {
    setProcesandoId(item.id || item.nombre);
    setMensaje(null);
    try {
      await addProduct({
        name: item.nombre,
        category: item.categoria || "Despensa",
        unit: item.unidad || "unidad",
        price: item.precio || 0,
        imageUrl: item.imagenUrl || null,
        tienda: "Supermercados Bravo",
        urlReferencia: item.fuente || "https://supermercadosrd.com/",
      });
      setMensaje({ tipo: "ok", texto: `"${item.nombre}" agregado con foto a tu catálogo.` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "Error al agregar producto" });
    } finally {
      setProcesandoId(null);
    }
  };

  // Asignar foto a un producto que ya existe en el catálogo pero no tenía foto
  const handleAsignarFotoAExistente = async (productoCatalogo, imagenUrl) => {
    setProcesandoId(productoCatalogo.id);
    setMensaje(null);
    try {
      await setProductImageUrl(productoCatalogo.id, imagenUrl);
      setMensaje({ tipo: "ok", texto: `Foto actualizada para "${productoCatalogo.name}".` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al actualizar la foto." });
    } finally {
      setProcesandoId(null);
    }
  };

  // Escaneo masivo: busca automáticamente imágenes de Bravo para todos los productos sin foto
  const handleSincronizarFotosCatalogo = async () => {
    const sinFoto = products.filter((p) => !p.imageUrl && p.name);
    if (sinFoto.length === 0) {
      setMensaje({ tipo: "info", texto: "Todos tus productos en catálogo ya tienen foto." });
      return;
    }
    setSincronizandoCatalogo(true);
    setMensaje(null);
    let actualizados = 0;

    try {
      for (const prod of sinFoto) {
        const prodNorm = normalizarTexto(prod.name);
        const palabras = prodNorm.split(" ").filter((w) => w.length > 2);
        const match = PRODUCTOS_BRAVO_REGULARES.find((b) => {
          const bNorm = normalizarTexto(b.nombre);
          return palabras.every((w) => bNorm.includes(w));
        });

        if (match?.imagenUrl) {
          await setProductImageUrl(prod.id, match.imagenUrl);
          actualizados++;
        }
      }

      if (actualizados > 0) {
        setMensaje({ tipo: "ok", texto: `¡Listo! Se encontraron y asignaron ${actualizados} fotos oficiales de Bravo.` });
      } else {
        setMensaje({ tipo: "info", texto: "No se encontraron coincidencias directas automáticas para los productos sin foto." });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Ocurrió un problema durante la sincronización." });
    } finally {
      setSincronizandoCatalogo(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card, #ffffff)",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: 16,
          width: "min(100%, 780px)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--amber-bg, #fef3c7)",
                color: "var(--amber, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700 }}>
                Productos Bravo & supermercadosrd.com
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft, #64748b)" }}>
                Productos regulares del supermercado con fotos oficiales extraídas de supermercadosrd.com
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-soft)",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de acciones y búsqueda */}
        <div style={{ padding: "14px 20px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar arroz, aceite, leche, cloro, jamón, avena…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscarEnVivo()}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 34px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  fontSize: 13,
                  background: "var(--paper)",
                }}
              />
              <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-soft)" }} />
            </div>

            <button
              type="button"
              onClick={handleBuscarEnVivo}
              disabled={buscandoEnVivo}
              className="despensa-btn-secondary"
              style={{ fontSize: 12.5, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {buscandoEnVivo ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
              {buscandoEnVivo ? "Buscando…" : "Buscar en vivo"}
            </button>

            <button
              type="button"
              onClick={handleSincronizarFotosCatalogo}
              disabled={sincronizandoCatalogo}
              title="Busca y agrega fotos a los productos de tu catálogo que aún no tienen imagen"
              className="despensa-btn-secondary"
              style={{
                fontSize: 12,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "var(--sage-bg)",
                color: "var(--sage)",
                borderColor: "var(--sage)",
              }}
            >
              {sincronizandoCatalogo ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={13} />}
              <span>{sincronizandoCatalogo ? "Sincronizando…" : "Auto-foto en mi catálogo"}</span>
            </button>
          </div>

          {/* Categorías pill */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIAS_BRAVO.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoriaActiva(cat);
                  setResultadosEnVivo(null);
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: 11.5,
                  borderRadius: 20,
                  border: categoriaActiva === cat && !resultadosEnVivo ? "1px solid var(--sage)" : "1px solid var(--line)",
                  background: categoriaActiva === cat && !resultadosEnVivo ? "var(--sage)" : "var(--card)",
                  color: categoriaActiva === cat && !resultadosEnVivo ? "#ffffff" : "var(--ink)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Mensajes de confirmación */}
          {mensaje && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                background: mensaje.tipo === "ok" ? "var(--sage-bg)" : mensaje.tipo === "error" ? "var(--stamp-bg)" : "var(--amber-bg)",
                color: mensaje.tipo === "ok" ? "var(--sage)" : mensaje.tipo === "error" ? "var(--stamp)" : "var(--amber)",
              }}
            >
              {mensaje.texto}
            </div>
          )}
        </div>

        {/* Cuadrícula de productos con foto */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 20px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {productosFiltrados.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 10px", color: "var(--ink-soft)" }}>
              No se encontraron productos. Prueba con otra palabra clave o haz clic en "Buscar en vivo".
            </div>
          ) : (
            productosFiltrados.map((item, idx) => {
              const itemNorm = normalizarTexto(item.nombre);
              const productoEnCatalogo = catalogoPorNombre.get(itemNorm);
              const yaEnCatalogo = !!productoEnCatalogo;
              const tieneFotoEnCatalogo = !!productoEnCatalogo?.imageUrl;
              const estaProcesando = procesandoId === (item.id || item.nombre) || procesandoId === productoEnCatalogo?.id;

              return (
                <div
                  key={item.id || `${item.nombre}-${idx}`}
                  style={{
                    background: "var(--card)",
                    border: yaEnCatalogo ? "1.5px solid var(--sage)" : "1px solid var(--line)",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                  }}
                >
                  {/* Foto oficial del producto extraída de supermercadosrd.com */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      borderRadius: 8,
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <img
                      src={item.imagenUrl}
                      alt={item.nombre}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        padding: 6,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Datos del producto */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700, textTransform: "uppercase" }}>
                      Supermercados Bravo
                    </div>
                    <div
                      title={item.nombre}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        color: "var(--ink)",
                      }}
                    >
                      {item.nombre}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                      {item.categoria || "Despensa"}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div>
                    {yaEnCatalogo ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--sage)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Check size={13} /> En tu catálogo
                        </div>
                        {!tieneFotoEnCatalogo && (
                          <button
                            type="button"
                            onClick={() => handleAsignarFotoAExistente(productoEnCatalogo, item.imagenUrl)}
                            disabled={estaProcesando}
                            className="despensa-btn-secondary"
                            style={{ fontSize: 10.5, padding: "3px 6px", width: "100%", textAlign: "center" }}
                          >
                            {estaProcesando ? "Asignando…" : "Asignar foto"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAgregarAlCatalogo(item)}
                        disabled={estaProcesando}
                        className="despensa-btn-secondary"
                        style={{
                          width: "100%",
                          fontSize: 11.5,
                          padding: "5px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          background: "var(--paper)",
                          color: "var(--ink)",
                          fontWeight: 600,
                        }}
                      >
                        {estaProcesando ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
                        {estaProcesando ? "Agregando…" : "Agregar a catálogo"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie del modal */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid var(--line, #e2e8f0)",
            background: "var(--paper, #f8fafc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--ink-soft)",
          }}
        >
          <span>
            Mostrando {productosFiltrados.length} productos de Bravo con foto · Datos de supermercadosrd.com
          </span>
          <a
            href="https://supermercadosrd.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--sage)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Ver en supermercadosrd.com <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
