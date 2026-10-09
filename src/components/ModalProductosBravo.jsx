import React, { useMemo, useState } from "react";
import {
  X,
  Search,
  Check,
  Plus,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Tag,
  DollarSign,
  ArrowUpDown,
  CheckCheck,
} from "lucide-react";
import {
  PRODUCTOS_BRAVO_REGULARES,
  buscarProductosSupermercadosRd,
  normalizarTexto,
  formatearPrecioRD,
} from "../lib/supermercadosRd";
import { addProduct, setProductImageUrl, updateProductPrice } from "../lib/db";

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
  const [orden, setOrden] = useState("defecto"); // "defecto" | "precio-asc" | "precio-desc"
  const [resultadosEnVivo, setResultadosEnVivo] = useState(null);
  const [buscandoEnVivo, setBuscandoEnVivo] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [sincronizandoCatalogo, setSincronizandoCatalogo] = useState(false);
  const [sincronizandoPrecios, setSincronizandoPrecios] = useState(false);
  const [preciosEditados, setPreciosEditados] = useState({});
  const [mensaje, setMensaje] = useState(null);

  // Mapa de productos existentes en el catálogo del usuario para saber si ya están agregados y comparar precios
  const catalogoPorNombre = useMemo(() => {
    const mapa = new Map();
    products.forEach((p) => {
      if (p?.name) {
        mapa.set(normalizarTexto(p.name), p);
      }
    });
    return mapa;
  }, [products]);

  // Lista base filtrada por categoría, búsqueda y ordenada
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

    if (orden === "precio-asc") {
      lista = [...lista].sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
    } else if (orden === "precio-desc") {
      lista = [...lista].sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
    }

    return lista;
  }, [categoriaActiva, busqueda, resultadosEnVivo, orden]);

  // Manejo de cambio de precio personalizado local antes de agregar
  const handleCambioPrecioItem = (itemId, nuevoValor) => {
    const val = parseFloat(nuevoValor);
    setPreciosEditados((prev) => ({
      ...prev,
      [itemId]: isNaN(val) ? 0 : val,
    }));
  };

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

  // Agregar producto al catálogo del usuario con su foto Y su precio
  const handleAgregarAlCatalogo = async (item) => {
    const itemKey = item.id || item.nombre;
    setProcesandoId(itemKey);
    setMensaje(null);

    const precioFinal = preciosEditados[itemKey] !== undefined ? preciosEditados[itemKey] : (Number(item.precio) || 0);

    try {
      await addProduct({
        name: item.nombre,
        category: item.categoria || "Despensa",
        unit: item.unidad || "unidad",
        price: precioFinal,
        imageUrl: item.imagenUrl || null,
        tienda: "Supermercados Bravo",
        urlReferencia: item.fuente || "https://supermercadosrd.com/",
      });
      setMensaje({
        tipo: "ok",
        texto: `"${item.nombre}" agregado con precio ${formatearPrecioRD(precioFinal)} y foto oficial a tu catálogo.`,
      });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "Error al agregar producto" });
    } finally {
      setProcesandoId(null);
    }
  };

  // Actualizar el precio de un producto que ya existe en el catálogo con el precio oficial de Bravo
  const handleActualizarPrecioAExistente = async (productoCatalogo, nuevoPrecio) => {
    setProcesandoId(productoCatalogo.id);
    setMensaje(null);
    try {
      await updateProductPrice(productoCatalogo.id, Number(nuevoPrecio) || 0);
      setMensaje({
        tipo: "ok",
        texto: `Precio actualizado a ${formatearPrecioRD(nuevoPrecio)} para "${productoCatalogo.name}".`,
      });
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al actualizar el precio del producto." });
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

  // Escaneo masivo de fotos: busca automáticamente imágenes de Bravo para todos los productos sin foto
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
        setMensaje({ tipo: "info", texto: "No se encontraron coincidencias automáticas para los productos sin foto." });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Ocurrió un problema durante la sincronización." });
    } finally {
      setSincronizandoCatalogo(false);
    }
  };

  // Escaneo masivo de precios: actualiza los precios de productos en el catálogo que coincidan con Bravo
  const handleSincronizarPreciosCatalogo = async () => {
    setSincronizandoPrecios(true);
    setMensaje(null);
    let actualizados = 0;

    try {
      for (const prod of products) {
        if (!prod?.name) continue;
        const prodNorm = normalizarTexto(prod.name);
        const palabras = prodNorm.split(" ").filter((w) => w.length > 2);
        const match = PRODUCTOS_BRAVO_REGULARES.find((b) => {
          const bNorm = normalizarTexto(b.nombre);
          return palabras.length > 0 && palabras.every((w) => bNorm.includes(w));
        });

        if (match?.precio && Math.abs((Number(prod.price) || 0) - Number(match.precio)) > 0.01) {
          await updateProductPrice(prod.id, Number(match.precio));
          actualizados++;
        }
      }

      if (actualizados > 0) {
        setMensaje({
          tipo: "ok",
          texto: `¡Excelente! Se actualizaron los precios de ${actualizados} productos en tu catálogo con los precios de Bravo.`,
        });
      } else {
        setMensaje({
          tipo: "info",
          texto: "Los productos de tu catálogo que coinciden con Bravo ya tienen el precio oficial al día.",
        });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Ocurrió un problema durante la sincronización de precios." });
    } finally {
      setSincronizandoPrecios(false);
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
          width: "min(100%, 860px)",
          maxHeight: "92vh",
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
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--amber-bg, #fef3c7)",
                color: "var(--amber, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag size={21} />
            </div>
            <div>
              <div className="despensa-tab-font" style={{ fontSize: 17, fontWeight: 700 }}>
                Catálogo Bravo con Precios & Fotos RD$
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft, #64748b)" }}>
                Precios oficiales en Pesos Dominicanos (RD$) y fotos de supermercadosrd.com
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <input
                type="text"
                placeholder="Buscar arroz, aceite, leche, cloro, jamón, huevos…"
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
              style={{ fontSize: 12, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              {buscandoEnVivo ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
              {buscandoEnVivo ? "Buscando…" : "Buscar en vivo"}
            </button>

            {/* Sincronización masiva de precios */}
            <button
              type="button"
              onClick={handleSincronizarPreciosCatalogo}
              disabled={sincronizandoPrecios}
              title="Actualiza los precios de tus productos en catálogo con los precios de Bravo"
              className="despensa-btn-secondary"
              style={{
                fontSize: 12,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "var(--amber-bg, #fef3c7)",
                color: "var(--amber, #d97706)",
                borderColor: "var(--amber, #d97706)",
                fontWeight: 600,
              }}
            >
              {sincronizandoPrecios ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Tag size={13} />}
              <span>{sincronizandoPrecios ? "Actualizando precios…" : "Auto-precio en catálogo"}</span>
            </button>

            {/* Sincronización masiva de fotos */}
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
              <span>{sincronizandoCatalogo ? "Sincronizando fotos…" : "Auto-foto en catálogo"}</span>
            </button>
          </div>

          {/* Categorías pill y selector de orden */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, flex: 1 }}>
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

            {/* Selector de orden por precio */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-soft)" }}>
              <ArrowUpDown size={12} />
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  fontSize: 11.5,
                  color: "var(--ink)",
                }}
              >
                <option value="defecto">Orden normal</option>
                <option value="precio-asc">Menor precio (RD$)</option>
                <option value="precio-desc">Mayor precio (RD$)</option>
              </select>
            </div>
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {mensaje.tipo === "ok" ? <CheckCheck size={14} /> : null}
              {mensaje.texto}
            </div>
          )}
        </div>

        {/* Cuadrícula de productos con foto y precio */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 20px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {productosFiltrados.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--ink-soft)",
                fontSize: 13,
              }}
            >
              No se encontraron productos. Prueba con otra palabra clave o haz clic en "Buscar en vivo".
            </div>
          ) : (
            productosFiltrados.map((item, idx) => {
              const itemNorm = normalizarTexto(item.nombre);
              const productoEnCatalogo = catalogoPorNombre.get(itemNorm);
              const yaEnCatalogo = !!productoEnCatalogo;
              const tieneFotoEnCatalogo = !!productoEnCatalogo?.imageUrl;
              const itemKey = item.id || `${item.nombre}-${idx}`;
              const estaProcesando = procesandoId === itemKey || procesandoId === productoEnCatalogo?.id;

              const precioOficial = Number(item.precio) || 0;
              const precioActual = preciosEditados[itemKey] !== undefined ? preciosEditados[itemKey] : precioOficial;
              const precioCatalogo = Number(productoEnCatalogo?.price || 0);
              const precioDifiere = yaEnCatalogo && Math.abs(precioCatalogo - precioOficial) > 0.01;

              return (
                <div
                  key={itemKey}
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
                      position: "relative",
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

                    {/* Badge de precio flotante en la foto */}
                    <div
                      className="despensa-mono"
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        background: "rgba(15, 23, 42, 0.85)",
                        color: "#fbbf24",
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backdropFilter: "blur(2px)",
                      }}
                    >
                      {formatearPrecioRD(precioActual)}
                    </div>
                  </div>

                  {/* Datos del producto */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 9.5, color: "var(--amber)", fontWeight: 700, textTransform: "uppercase" }}>
                      {item.tienda || "Supermercados Bravo"}
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

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 1 }}>
                      <span style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                        {item.categoria || "Despensa"}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 500 }}>
                        {item.unidad || "unidad"}
                      </span>
                    </div>

                    {/* Precio destacado con campo de ajuste opcional */}
                    <div
                      style={{
                        marginTop: 4,
                        padding: "4px 6px",
                        background: "var(--paper, #f8fafc)",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid var(--line-soft, #e2e8f0)",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Precio RD$:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={precioActual}
                          onChange={(e) => handleCambioPrecioItem(itemKey, e.target.value)}
                          className="despensa-mono"
                          title="Puedes modificar el precio si lo compraste a otro valor"
                          style={{
                            width: 60,
                            border: "none",
                            background: "transparent",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--amber, #d97706)",
                            textAlign: "right",
                            padding: 0,
                          }}
                        />
                      </div>
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
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Check size={13} /> En catálogo
                          </span>
                          <span className="despensa-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                            (${precioCatalogo.toFixed(2)})
                          </span>
                        </div>

                        {/* Botón para actualizar precio si el catálogo tiene un precio diferente o cero */}
                        {precioDifiere && (
                          <button
                            type="button"
                            onClick={() => handleActualizarPrecioAExistente(productoEnCatalogo, precioActual)}
                            disabled={estaProcesando}
                            className="despensa-btn-secondary"
                            style={{
                              fontSize: 10.5,
                              padding: "4px 6px",
                              width: "100%",
                              textAlign: "center",
                              background: "var(--amber-bg, #fef3c7)",
                              color: "var(--amber, #d97706)",
                              borderColor: "var(--amber, #d97706)",
                              fontWeight: 600,
                            }}
                          >
                            {estaProcesando ? "Actualizando…" : `Actualizar a RD$ ${precioActual}`}
                          </button>
                        )}

                        {!tieneFotoEnCatalogo && item.imagenUrl && (
                          <button
                            type="button"
                            onClick={() => handleAsignarFotoAExistente(productoEnCatalogo, item.imagenUrl)}
                            disabled={estaProcesando}
                            className="despensa-btn-secondary"
                            style={{ fontSize: 10.5, padding: "3px 6px", width: "100%", textAlign: "center" }}
                          >
                            {estaProcesando ? "Asignando foto…" : "Asignar foto"}
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
                          padding: "6px 8px",
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
                        {estaProcesando ? "Agregando…" : `Agregar con precio`}
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
            flexWrap: "wrap",
            gap: 10,
            fontSize: 11.5,
            color: "var(--ink-soft)",
          }}
        >
          <span>
            Mostrando {productosFiltrados.length} productos de Bravo con precio en RD$ y foto oficial · Datos de supermercadosrd.com
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
