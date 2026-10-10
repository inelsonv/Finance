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
  CheckSquare,
  Square,
  Layers,
  LayoutGrid,
  List,
  ChevronDown,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import {
  PRODUCTOS_BRAVO_REGULARES,
  CATEGORIAS_BRAVO,
  buscarProductosSupermercadosRd,
  normalizarTexto,
  formatearPrecioRD,
} from "../lib/supermercadosRd";
import { addProduct, setProductImageUrl, updateProductPrice } from "../lib/db";

const ITEMS_POR_PAGINA = 32;

export default function ModalProductosBravo({ products = [], onClose }) {
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("defecto"); // "defecto" | "precio-asc" | "precio-desc" | "nombre-asc" | "nombre-desc"
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "no-agregados" | "en-catalogo" | "difiere-precio"
  const [vista, setVista] = useState("grid"); // "grid" | "lista"
  const [limiteVisible, setLimiteVisible] = useState(ITEMS_POR_PAGINA);

  const [resultadosEnVivo, setResultadosEnVivo] = useState(null);
  const [buscandoEnVivo, setBuscandoEnVivo] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [progresoBatch, setProgresoBatch] = useState(null);
  const [sincronizandoCatalogo, setSincronizandoCatalogo] = useState(false);
  const [sincronizandoPrecios, setSincronizandoPrecios] = useState(false);
  const [preciosEditados, setPreciosEditados] = useState({});
  const [seleccionados, setSeleccionados] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [zoomImagen, setZoomImagen] = useState(null);

  // Mapa de productos existentes en el catálogo del usuario para cotejar estado y precios
  const catalogoPorNombre = useMemo(() => {
    const mapa = new Map();
    products.forEach((p) => {
      if (p?.name) {
        mapa.set(normalizarTexto(p.name), p);
      }
    });
    return mapa;
  }, [products]);

  // Contadores por categoría del catálogo oficial completo
  const contadoresPorCategoria = useMemo(() => {
    const counts = { Todos: PRODUCTOS_BRAVO_REGULARES.length };
    PRODUCTOS_BRAVO_REGULARES.forEach((p) => {
      const cat = p.categoria || "Despensa";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, []);

  // Lista base filtrada por categoría, búsqueda, filtro de estado y orden
  const { productosFiltrados, conteoTotal } = useMemo(() => {
    let lista = resultadosEnVivo || PRODUCTOS_BRAVO_REGULARES;

    // Filtro por categoría
    if (categoriaActiva !== "Todos" && !resultadosEnVivo) {
      lista = lista.filter((p) => p.categoria === categoriaActiva);
    }

    // Filtro por texto de búsqueda
    if (busqueda.trim()) {
      const qNorm = normalizarTexto(busqueda);
      const palabras = qNorm.split(" ").filter((w) => w.length > 1);
      lista = lista.filter((p) => {
        const nNorm = normalizarTexto(p.nombre);
        return palabras.every((w) => nNorm.includes(w));
      });
    }

    // Filtro por estado en catálogo
    if (filtroEstado !== "todos") {
      lista = lista.filter((item) => {
        const itemNorm = normalizarTexto(item.nombre);
        const enCatalogo = catalogoPorNombre.has(itemNorm);
        if (filtroEstado === "no-agregados") return !enCatalogo;
        if (filtroEstado === "en-catalogo") return enCatalogo;
        if (filtroEstado === "difiere-precio") {
          if (!enCatalogo) return false;
          const prod = catalogoPorNombre.get(itemNorm);
          return Math.abs((Number(prod?.price) || 0) - (Number(item.precio) || 0)) > 0.01;
        }
        return true;
      });
    }

    // Ordenamiento
    if (orden === "precio-asc") {
      lista = [...lista].sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
    } else if (orden === "precio-desc") {
      lista = [...lista].sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
    } else if (orden === "nombre-asc") {
      lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === "nombre-desc") {
      lista = [...lista].sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    return { productosFiltrados: lista, conteoTotal: lista.length };
  }, [categoriaActiva, busqueda, resultadosEnVivo, orden, filtroEstado, catalogoPorNombre]);

  // Lista paginada visible en pantalla
  const productosVisibles = useMemo(() => {
    return productosFiltrados.slice(0, limiteVisible);
  }, [productosFiltrados, limiteVisible]);

  // Manejo de cambio de precio personalizado local
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
      setLimiteVisible(ITEMS_POR_PAGINA);
      return;
    }
    setBuscandoEnVivo(true);
    setMensaje(null);
    try {
      const res = await buscarProductosSupermercadosRd(busqueda.trim());
      setResultadosEnVivo(res);
      setLimiteVisible(ITEMS_POR_PAGINA);
      if (res.length === 0) {
        setMensaje({ tipo: "info", texto: `No se encontraron productos en supermercadosrd.com para "${busqueda}".` });
      } else {
        setMensaje({ tipo: "ok", texto: `Se encontraron ${res.length} resultados en vivo desde supermercadosrd.com.` });
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "No se pudo conectar con la búsqueda en vivo." });
    } finally {
      setBuscandoEnVivo(false);
    }
  };

  const handleLimpiarBusqueda = () => {
    setBusqueda("");
    setResultadosEnVivo(null);
    setLimiteVisible(ITEMS_POR_PAGINA);
  };

  // Agregar producto individual al catálogo
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

  // Toggle selección de un producto para lote
  const handleToggleSeleccion = (itemKey) => {
    setSeleccionados((prev) => {
      const next = { ...prev };
      if (next[itemKey]) {
        delete next[itemKey];
      } else {
        next[itemKey] = true;
      }
      return next;
    });
  };

  // Seleccionar / Deseleccionar todos los visibles
  const handleToggleSeleccionarTodosVisibles = () => {
    const todosVisiblesSeleccionados = productosVisibles.every((item) => {
      const key = item.id || item.nombre;
      return seleccionados[key];
    });

    if (todosVisiblesSeleccionados) {
      setSeleccionados({});
    } else {
      const next = { ...seleccionados };
      productosVisibles.forEach((item) => {
        const key = item.id || item.nombre;
        const itemNorm = normalizarTexto(item.nombre);
        if (!catalogoPorNombre.has(itemNorm)) {
          next[key] = true;
        }
      });
      setSeleccionados(next);
    }
  };

  // Agregar lote de seleccionados
  const handleAgregarLoteSeleccionados = async () => {
    const claves = Object.keys(seleccionados).filter((k) => seleccionados[k]);
    if (claves.length === 0) return;

    setProcesandoId("batch");
    setMensaje(null);
    let agregados = 0;
    const total = claves.length;
    setProgresoBatch({ actual: 0, total });

    try {
      for (let i = 0; i < total; i++) {
        const key = claves[i];
        const item = productosFiltrados.find((p) => String(p.id) === String(key) || p.nombre === key);
        if (item) {
          const itemNorm = normalizarTexto(item.nombre);
          if (!catalogoPorNombre.has(itemNorm)) {
            const precioFinal = preciosEditados[key] !== undefined ? preciosEditados[key] : (Number(item.precio) || 0);
            await addProduct({
              name: item.nombre,
              category: item.categoria || "Despensa",
              unit: item.unidad || "unidad",
              price: precioFinal,
              imageUrl: item.imagenUrl || null,
              tienda: "Supermercados Bravo",
              urlReferencia: item.fuente || "https://supermercadosrd.com/",
            });
            agregados++;
          }
        }
        setProgresoBatch({ actual: i + 1, total });
      }

      setSeleccionados({});
      setMensaje({
        tipo: "ok",
        texto: `¡Éxito! Se agregaron ${agregados} productos de Supermercados Bravo con precios y fotos oficiales a tu catálogo.`,
      });
    } catch (err) {
      setMensaje({ tipo: "error", texto: `Ocurrió un error al agregar en lote: ${err.message}` });
    } finally {
      setProcesandoId(null);
      setProgresoBatch(null);
    }
  };

  // Actualizar precio a producto existente
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

  // Asignar foto a producto existente
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

  // Escaneo masivo de fotos para el catálogo
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

  // Escaneo masivo de precios
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

  const cantSeleccionados = Object.values(seleccionados).filter(Boolean).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card, #ffffff)",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: 16,
          width: "min(100%, 1020px)",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "linear-gradient(to right, rgba(254, 243, 199, 0.4), rgba(240, 253, 244, 0.4))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#e21c1b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: -0.5,
                boxShadow: "0 4px 12px rgba(226, 28, 27, 0.35)",
              }}
            >
              B
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="despensa-tab-font" style={{ fontSize: 18, fontWeight: 700 }}>
                  Catálogo Completo Supermercados Bravo
                </span>
                <span
                  style={{
                    background: "#e21c1b",
                    color: "#ffffff",
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  {PRODUCTOS_BRAVO_REGULARES.length.toLocaleString()} Productos
                </span>
                <span
                  style={{
                    background: "var(--amber-bg, #fef3c7)",
                    color: "var(--amber, #d97706)",
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(217, 119, 6, 0.2)",
                  }}
                >
                  Precios Oficiales RD$ & Fotos
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft, #64748b)", marginTop: 2 }}>
                Todo el surtido de Bravo extraído con fotos oficiales de supermercadosrd.com y precios en Pesos Dominicanos.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-soft)",
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Barra superior de herramientas y búsqueda */}
        <div style={{ padding: "12px 20px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {/* Campo de búsqueda instantánea */}
            <div style={{ position: "relative", flex: "1 1 260px" }}>
              <input
                type="text"
                placeholder="Buscar en todo el Bravo (arroz, aceite, leche, pechuga, queso, café, detergente…)"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setLimiteVisible(ITEMS_POR_PAGINA);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBuscarEnVivo()}
                style={{
                  width: "100%",
                  padding: "9px 34px 9px 36px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  fontSize: 13,
                  background: "var(--paper)",
                }}
              />
              <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: "var(--ink-soft)" }} />
              {busqueda && (
                <button
                  type="button"
                  onClick={handleLimpiarBusqueda}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-soft)",
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Botón búsqueda en vivo externa */}
            <button
              type="button"
              onClick={handleBuscarEnVivo}
              disabled={buscandoEnVivo}
              className="despensa-btn-secondary"
              title="Buscar en tiempo real directamente en la API de supermercadosrd.com"
              style={{ fontSize: 12, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              {buscandoEnVivo ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
              {buscandoEnVivo ? "Buscando en vivo…" : "Buscar en vivo web"}
            </button>

            {/* Sincronización masiva de precios */}
            <button
              type="button"
              onClick={handleSincronizarPreciosCatalogo}
              disabled={sincronizandoPrecios}
              title="Actualiza los precios de tus productos en despensa con los precios oficiales de Bravo"
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
              title="Busca y asigna fotos oficiales de Bravo a los productos de tu catálogo sin foto"
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

          {/* Selector de departamentos / categorías con conteos */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin" }}>
            {CATEGORIAS_BRAVO.map((cat) => {
              const count = contadoresPorCategoria[cat] || 0;
              const activo = categoriaActiva === cat && !resultadosEnVivo;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoriaActiva(cat);
                    setResultadosEnVivo(null);
                    setLimiteVisible(ITEMS_POR_PAGINA);
                  }}
                  style={{
                    padding: "5px 11px",
                    fontSize: 11.5,
                    borderRadius: 20,
                    border: activo ? "1.5px solid #e21c1b" : "1px solid var(--line)",
                    background: activo ? "#e21c1b" : "var(--card)",
                    color: activo ? "#ffffff" : "var(--ink)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontWeight: activo ? 600 : 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{cat}</span>
                  <span
                    style={{
                      fontSize: 10,
                      opacity: activo ? 0.9 : 0.65,
                      background: activo ? "rgba(255,255,255,0.25)" : "var(--line-soft, #f1f5f9)",
                      padding: "1px 5px",
                      borderRadius: 10,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-barra: filtros de estado, orden, vista y selección múltiple */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 4,
              borderTop: "1px solid var(--line-soft, #f1f5f9)",
            }}
          >
            {/* Filtros de estado rápido */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
              <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>Filtrar:</span>
              <button
                type="button"
                onClick={() => setFiltroEstado("todos")}
                style={{
                  background: filtroEstado === "todos" ? "var(--sage-bg)" : "none",
                  border: filtroEstado === "todos" ? "1px solid var(--sage)" : "1px solid transparent",
                  color: filtroEstado === "todos" ? "var(--sage)" : "var(--ink-soft)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Todos ({conteoTotal})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado("no-agregados")}
                style={{
                  background: filtroEstado === "no-agregados" ? "var(--sage-bg)" : "none",
                  border: filtroEstado === "no-agregados" ? "1px solid var(--sage)" : "1px solid transparent",
                  color: filtroEstado === "no-agregados" ? "var(--sage)" : "var(--ink-soft)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                No agregados
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado("en-catalogo")}
                style={{
                  background: filtroEstado === "en-catalogo" ? "var(--sage-bg)" : "none",
                  border: filtroEstado === "en-catalogo" ? "1px solid var(--sage)" : "1px solid transparent",
                  color: filtroEstado === "en-catalogo" ? "var(--sage)" : "var(--ink-soft)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Ya en catálogo
              </button>
            </div>

            {/* Ordenamiento, modo de vista y selección */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Seleccionar visibles */}
              <button
                type="button"
                onClick={handleToggleSeleccionarTodosVisibles}
                className="despensa-btn-secondary"
                style={{ fontSize: 11, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <CheckSquare size={12} />
                <span>Seleccionar visibles</span>
              </button>

              {/* Selector de orden */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--ink-soft)" }}>
                <ArrowUpDown size={12} />
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--card)",
                    fontSize: 11,
                    color: "var(--ink)",
                  }}
                >
                  <option value="defecto">Surtido estándar</option>
                  <option value="precio-asc">Precio: Menor a Mayor</option>
                  <option value="precio-desc">Precio: Mayor a Menor</option>
                  <option value="nombre-asc">Nombre: A a Z</option>
                  <option value="nombre-desc">Nombre: Z a A</option>
                </select>
              </div>

              {/* Toggle de vista grid vs lista */}
              <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setVista("grid")}
                  title="Vista cuadrícula de fotos"
                  style={{
                    background: vista === "grid" ? "var(--sage-bg)" : "var(--card)",
                    color: vista === "grid" ? "var(--sage)" : "var(--ink-soft)",
                    border: "none",
                    padding: "4px 7px",
                    cursor: "pointer",
                  }}
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  title="Vista lista compacta"
                  style={{
                    background: vista === "lista" ? "var(--sage-bg)" : "var(--card)",
                    color: vista === "lista" ? "var(--sage)" : "var(--ink-soft)",
                    border: "none",
                    borderLeft: "1px solid var(--line)",
                    padding: "4px 7px",
                    cursor: "pointer",
                  }}
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Mensajes de notificación / error */}
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
              {mensaje.tipo === "ok" ? <CheckCheck size={14} /> : <AlertCircle size={14} />}
              {mensaje.texto}
            </div>
          )}
        </div>

        {/* Zona principal con scroll: productos de Bravo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
          {productosFiltrados.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--ink-soft)",
                fontSize: 13,
              }}
            >
              <ShoppingBag size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <div>No se encontraron productos que coincidan con la búsqueda.</div>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>
                Prueba buscando otro término o haz clic en "Buscar en vivo web".
              </div>
            </div>
          ) : vista === "grid" ? (
            /* Vista Cuadrícula */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
                gap: 12,
              }}
            >
              {productosVisibles.map((item, idx) => {
                const itemNorm = normalizarTexto(item.nombre);
                const productoEnCatalogo = catalogoPorNombre.get(itemNorm);
                const yaEnCatalogo = !!productoEnCatalogo;
                const tieneFotoEnCatalogo = !!productoEnCatalogo?.imageUrl;
                const itemKey = item.id || `${item.nombre}-${idx}`;
                const estaProcesando = procesandoId === itemKey || procesandoId === productoEnCatalogo?.id || procesandoId === "batch";
                const estaSeleccionado = !!seleccionados[itemKey];

                const precioOficial = Number(item.precio) || 0;
                const precioActual = preciosEditados[itemKey] !== undefined ? preciosEditados[itemKey] : precioOficial;
                const precioCatalogo = Number(productoEnCatalogo?.price || 0);
                const precioDifiere = yaEnCatalogo && Math.abs(precioCatalogo - precioOficial) > 0.01;

                return (
                  <div
                    key={itemKey}
                    style={{
                      background: "var(--card)",
                      border: yaEnCatalogo
                        ? "1.5px solid var(--sage)"
                        : estaSeleccionado
                        ? "1.5px solid #e21c1b"
                        : "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      position: "relative",
                      transition: "transform 0.1s ease, box-shadow 0.1s ease",
                    }}
                  >
                    {/* Checkbox de selección múltiple (si no está agregado aún) */}
                    {!yaEnCatalogo && (
                      <button
                        type="button"
                        onClick={() => handleToggleSeleccion(itemKey)}
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          zIndex: 2,
                          background: estaSeleccionado ? "#e21c1b" : "rgba(255,255,255,0.9)",
                          color: estaSeleccionado ? "#ffffff" : "var(--ink-soft)",
                          border: "1px solid rgba(0,0,0,0.15)",
                          borderRadius: 6,
                          width: 22,
                          height: 22,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title={estaSeleccionado ? "Deseleccionar" : "Seleccionar para agregar en lote"}
                      >
                        {estaSeleccionado ? <Check size={14} /> : <Square size={13} />}
                      </button>
                    )}

                    {/* Foto oficial de Supermercados Bravo */}
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
                          cursor: "zoom-in",
                        }}
                        onClick={() => setZoomImagen({ url: item.imagenUrl, nombre: item.nombre })}
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
                          background: "rgba(15, 23, 42, 0.88)",
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
                      <div style={{ fontSize: 9.5, color: "#e21c1b", fontWeight: 700, textTransform: "uppercase" }}>
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
                          minHeight: 31,
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

                      {/* Input de precio ajustable */}
                      <div
                        style={{
                          marginTop: 4,
                          padding: "3px 6px",
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
                            title="Puedes modificar el precio antes de agregar"
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

                    {/* Acciones por tarjeta */}
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
              })}
            </div>
          ) : (
            /* Vista Lista Compacta */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {productosVisibles.map((item, idx) => {
                const itemNorm = normalizarTexto(item.nombre);
                const productoEnCatalogo = catalogoPorNombre.get(itemNorm);
                const yaEnCatalogo = !!productoEnCatalogo;
                const itemKey = item.id || `${item.nombre}-${idx}`;
                const estaProcesando = procesandoId === itemKey || procesandoId === productoEnCatalogo?.id || procesandoId === "batch";
                const estaSeleccionado = !!seleccionados[itemKey];

                const precioOficial = Number(item.precio) || 0;
                const precioActual = preciosEditados[itemKey] !== undefined ? preciosEditados[itemKey] : precioOficial;
                const precioCatalogo = Number(productoEnCatalogo?.price || 0);
                const precioDifiere = yaEnCatalogo && Math.abs(precioCatalogo - precioOficial) > 0.01;

                return (
                  <div
                    key={itemKey}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      background: "var(--card)",
                      border: yaEnCatalogo
                        ? "1.5px solid var(--sage)"
                        : estaSeleccionado
                        ? "1.5px solid #e21c1b"
                        : "1px solid var(--line)",
                      borderRadius: 10,
                    }}
                  >
                    {!yaEnCatalogo && (
                      <button
                        type="button"
                        onClick={() => handleToggleSeleccion(itemKey)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: estaSeleccionado ? "#e21c1b" : "var(--ink-soft)",
                          padding: 2,
                        }}
                      >
                        {estaSeleccionado ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    )}

                    <img
                      src={item.imagenUrl}
                      alt={item.nombre}
                      loading="lazy"
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: "contain",
                        background: "#ffffff",
                        borderRadius: 6,
                        border: "1px solid var(--line-soft)",
                        padding: 2,
                        cursor: "zoom-in",
                      }}
                      onClick={() => setZoomImagen({ url: item.imagenUrl, nombre: item.nombre })}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", gap: 10 }}>
                        <span>{item.categoria}</span>
                        <span>·</span>
                        <span>{item.unidad}</span>
                        <span>·</span>
                        <span style={{ color: "#e21c1b", fontWeight: 600 }}>Supermercados Bravo</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div className="despensa-mono" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--amber)" }}>
                        {formatearPrecioRD(precioActual)}
                      </div>
                      {yaEnCatalogo && (
                        <div style={{ fontSize: 10.5, color: precioDifiere ? "var(--amber)" : "var(--sage)" }}>
                          En despensa: {formatearPrecioRD(precioCatalogo)}
                        </div>
                      )}
                    </div>

                    <div>
                      {yaEnCatalogo ? (
                        precioDifiere ? (
                          <button
                            type="button"
                            onClick={() => handleActualizarPrecioAExistente(productoEnCatalogo, precioActual)}
                            disabled={estaProcesando}
                            className="despensa-btn-secondary"
                            style={{ fontSize: 11, padding: "5px 10px", background: "var(--amber-bg)", color: "var(--amber)", borderColor: "var(--amber)" }}
                          >
                            Actualizar precio
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--sage)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                            <Check size={14} /> Listo
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAgregarAlCatalogo(item)}
                          disabled={estaProcesando}
                          className="despensa-btn-secondary"
                          style={{ fontSize: 11, padding: "5px 10px", fontWeight: 600 }}
                        >
                          <Plus size={13} /> Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón de cargar más productos si hay más */}
          {limiteVisible < conteoTotal && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setLimiteVisible((prev) => prev + ITEMS_POR_PAGINA)}
                className="despensa-btn-secondary"
                style={{
                  padding: "9px 24px",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ChevronDown size={16} />
                <span>
                  Cargar más productos (mostrando {productosVisibles.length} de {conteoTotal.toLocaleString()})
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Barra flotante de acciones para lote seleccionado */}
        {cantSeleccionados > 0 && (
          <div
            style={{
              padding: "10px 20px",
              background: "#1e293b",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "0 -4px 15px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <CheckSquare size={16} style={{ color: "#38bdf8" }} />
              <span>
                <strong>{cantSeleccionados}</strong> producto{cantSeleccionados !== 1 ? "s" : ""} de Bravo seleccionado{cantSeleccionados !== 1 ? "s" : ""}
              </span>
              {progresoBatch && (
                <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                  (Procesando {progresoBatch.actual} de {progresoBatch.total}…)
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSeleccionados({})}
                disabled={procesandoId === "batch"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Deseleccionar
              </button>
              <button
                type="button"
                onClick={handleAgregarLoteSeleccionados}
                disabled={procesandoId === "batch"}
                style={{
                  background: "#e21c1b",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "7px 16px",
                  borderRadius: 8,
                  cursor: procesandoId === "batch" ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {procesandoId === "batch" ? (
                  <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Plus size={14} />
                )}
                <span>Agregar seleccionados a mi catálogo</span>
              </button>
            </div>
          </div>
        )}

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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>
              Mostrando {productosVisibles.length} de {conteoTotal.toLocaleString()} productos de Supermercados Bravo con precios en RD$ y fotos oficiales.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="https://supermercadosrd.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#e21c1b",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              supermercadosrd.com <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* Modal flotante de zoom de imagen */}
      {zoomImagen && (
        <div
          onClick={() => setZoomImagen(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 16,
              maxWidth: 480,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{zoomImagen.nombre}</span>
              <button
                onClick={() => setZoomImagen(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={zoomImagen.url}
              alt={zoomImagen.nombre}
              style={{ maxHeight: "65vh", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
