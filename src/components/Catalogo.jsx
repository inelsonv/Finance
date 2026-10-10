import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, X, Image as ImageIcon, Camera, Package, Clock, Sparkles, ShoppingCart, Check, ScanLine, Link as LinkIcon, UtensilsCrossed, ShoppingBag } from "lucide-react";
import {
  addProduct,
  deleteProduct,
  updateProductPrice,
  updateProducto,
  addOrdenCompra,
  agregarItemABorrador,
  agregarItemsABorrador,
  uploadProductImage,
  uploadProductImageFromUrl,
  removeProductImage,
  extraerProductoDeUrl,
  buscarYExtraerProducto,
  setProductImageUrl,
} from "../lib/db";
import { diasRestantesProducto, registrarReposicion } from "../lib/inventario";
import { calcularSugerenciasRecompra } from "../lib/recomendaciones";
import { confirm } from "../lib/confirm";
import BarcodeScanner from "./BarcodeScanner.jsx";
import ComprasProrateadas from "./ComprasProrateadas.jsx";
import ModalProductosBravo from "./ModalProductosBravo.jsx";
import { buscarImagenParaProducto, buscarProductosSupermercadosRd, buscarPrecioParaProducto, formatearPrecioRD } from "../lib/supermercadosRd";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];
const UNITS = ["unidad", "kg", "g", "l", "ml", "paquete", "rollo"];

async function buscarProductoPorCodigo(codigo) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const nombre = [p.product_name, p.brands].filter(Boolean).join(" - ");
    return { nombre: nombre || p.generic_name || null, imagen: p.image_front_small_url || p.image_url || null };
  } catch {
    return null;
  }
}

export default function Catalogo({ products, entidades, historialCompras, ordenesCompra, onNavigate, categoriasGasto, comprasProrateadas }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "", codigoBarras: "", proteinaPor100g: "" });
  const [productoUrl, setProductoUrl] = useState("");
  const [importandoUrl, setImportandoUrl] = useState(false);
  const [importarUrlMsg, setImportarUrlMsg] = useState(null);
  const [imagenPendienteUrl, setImagenPendienteUrl] = useState(null);
  const [imagenesCandidatas, setImagenesCandidatas] = useState([]);
  const [urlReferenciaGuardada, setUrlReferenciaGuardada] = useState(null);
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [buscandoPorNombre, setBuscandoPorNombre] = useState(false);
  const [showModalBravo, setShowModalBravo] = useState(false);

  const handleAutoBuscarFoto = async (p) => {
    setUploadingId(p.id);
    try {
      const infoBravo = buscarPrecioParaProducto(p.name);
      let cambios = [];

      if (infoBravo?.imagenUrl && !p.imageUrl) {
        await setProductImageUrl(p.id, infoBravo.imagenUrl);
        cambios.push("foto oficial");
      }
      if (infoBravo?.precio && (!p.price || Number(p.price) === 0)) {
        await updateProductPrice(p.id, infoBravo.precio);
        cambios.push(`precio ${formatearPrecioRD(infoBravo.precio)}`);
      }

      if (cambios.length > 0) {
        setScanMsg({ tipo: "ok", texto: `Se actualizó ${cambios.join(" y ")} de Bravo para "${p.name}".` });
      } else {
        const img = await buscarImagenParaProducto(p.name);
        if (img) {
          await setProductImageUrl(p.id, img);
          setScanMsg({ tipo: "ok", texto: `Foto encontrada en supermercadosrd.com para "${p.name}".` });
        } else {
          setScanMsg({ tipo: "info", texto: `No se encontró foto ni precio automático para "${p.name}" en supermercadosrd.com.` });
        }
      }
    } catch (err) {
      setScanMsg({ tipo: "error", texto: "Error buscando datos en supermercadosrd.com." });
    } finally {
      setUploadingId(null);
    }
  };

  const handleImportarDesdeUrl = async () => {
    if (!productoUrl.trim()) {
      setImportarUrlMsg({ tipo: "error", texto: "Pega la URL del producto" });
      return;
    }
    setImportandoUrl(true);
    setImportarUrlMsg(null);
    try {
      const resultado = await extraerProductoDeUrl(productoUrl.trim());
      if (!resultado.nombre && !resultado.precio) {
        setImportarUrlMsg({ tipo: "error", texto: "No se pudo extraer el nombre ni el precio de esa página — agrégalo manualmente." });
        return;
      }
      setForm((f) => ({
        ...f,
        name: resultado.nombre || f.name,
        price: resultado.precio != null ? String(resultado.precio) : f.price,
      }));
      setImagenPendienteUrl(resultado.imagenUrl || null);
      setImagenesCandidatas(resultado.imagenesCandidatas || []);
      setUrlReferenciaGuardada(resultado.urlReferencia || productoUrl.trim());
      setImportarUrlMsg({ tipo: "ok", texto: "Se llenó el nombre y el precio — revísalos antes de guardar." + (resultado.imagenUrl ? " También se encontró una imagen." : "") });
    } catch (err) {
      setImportarUrlMsg({ tipo: "error", texto: err.message || String(err) });
    } finally {
      setImportandoUrl(false);
    }
  };

  const handleBuscarPorNombre = async () => {
    if (!nombreBusqueda.trim()) {
      setImportarUrlMsg({ tipo: "error", texto: "Escribe el nombre del producto a buscar" });
      return;
    }
    setBuscandoPorNombre(true);
    setImportarUrlMsg(null);
    try {
      // 1. Intenta primero en supermercadosrd.com / catálogo de Bravo
      const resBravo = await buscarProductosSupermercadosRd(nombreBusqueda.trim());
      if (resBravo.length > 0 && resBravo[0].imagenUrl) {
        const mejor = resBravo[0];
        setForm((f) => ({
          ...f,
          name: mejor.nombre || f.name,
          category: mejor.categoria || f.category,
          price: mejor.precio != null && Number(mejor.precio) > 0 ? String(mejor.precio) : f.price,
          unit: mejor.unidad || f.unit,
        }));
        setImagenPendienteUrl(mejor.imagenUrl);
        setUrlReferenciaGuardada(mejor.fuente || "https://supermercadosrd.com/");
        setImportarUrlMsg({
          tipo: "ok",
          texto: `¡Encontrado en supermercadosrd.com! "${mejor.nombre}" con precio oficial ${formatearPrecioRD(mejor.precio)} y foto de Bravo.`,
        });
        return;
      }

      // 2. Si no, fallback a buscarYExtraerProducto
      const resultado = await buscarYExtraerProducto(nombreBusqueda.trim());
      if (!resultado.nombre && !resultado.precio) {
        setImportarUrlMsg({ tipo: "error", texto: "No se encontró el producto automáticamente — agrégalo manualmente." });
        return;
      }
      setForm((f) => ({
        ...f,
        name: resultado.nombre || f.name,
        price: resultado.precio != null ? String(resultado.precio) : f.price,
      }));
      setImagenPendienteUrl(resultado.imagenUrl || null);
      setImagenesCandidatas(resultado.imagenesCandidatas || []);
      setUrlReferenciaGuardada(resultado.urlReferencia || null);
      setImportarUrlMsg({ tipo: "ok", texto: "Se encontró el producto y se llenó el nombre y el precio — revísalos antes de guardar." + (resultado.imagenUrl ? " También se encontró una imagen." : "") });
    } catch (err) {
      setImportarUrlMsg({ tipo: "error", texto: err.message || String(err) });
    } finally {
      setBuscandoPorNombre(false);
    }
  };

  const [formImage, setFormImage] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [urlPickerId, setUrlPickerId] = useState(null);
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState(null);
  const [configuringId, setConfiguringId] = useState(null);
  const [configForm, setConfigForm] = useState(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [dismissedSugerencias, setDismissedSugerencias] = useState([]);
  const [agregadoId, setAgregadoId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState(() => new Set());
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState("");
  const [agregandoSeleccionados, setAgregandoSeleccionados] = useState(false);
  const [creandoOrdenSeleccion, setCreandoOrdenSeleccion] = useState(false);
  const [errorSeleccion, setErrorSeleccion] = useState(null);
  const formFileRef = useRef(null);
  const rowFileRefs = useRef({});

  // Una orden "vigente" es cualquiera que aún no haya completado su ciclo
  // (no está Completada ni Cancelada) — puede estar en Borrador, ya enviada al
  // proveedor, o en compra presencial. Mientras siga vigente, los nuevos productos
  // se agregan ahí en vez de crear una orden nueva.
  const ordenVigente = useMemo(
    () => (ordenesCompra || []).find((o) => o.estado !== "Completada" && o.estado !== "Cancelada"),
    [ordenesCompra]
  );

  const ordenesAbiertas = useMemo(
    () => (ordenesCompra || []).filter((orden) => orden.estado !== "Completada" && orden.estado !== "Cancelada"),
    [ordenesCompra]
  );
  const productosEnOrdenesAbiertas = useMemo(() => {
    const incluidos = new Map();
    for (const orden of ordenesAbiertas) {
      for (const item of orden.items || []) {
        if (!item.productId) continue;
        const ordenesProducto = incluidos.get(item.productId) || [];
        ordenesProducto.push({
          id: orden.id,
          folio: orden.folio,
          cantidad: Number(item.cantidad) || 1,
        });
        incluidos.set(item.productId, ordenesProducto);
      }
    }
    return incluidos;
  }, [ordenesAbiertas]);
  const productosMarcados = useMemo(
    () => products.filter((product) => productosSeleccionados.has(product.id)),
    [products, productosSeleccionados]
  );

  useEffect(() => {
    if (!ordenesAbiertas.some((orden) => orden.id === ordenSeleccionadaId)) {
      setOrdenSeleccionadaId(ordenesAbiertas[0]?.id || "");
    }
  }, [ordenesAbiertas, ordenSeleccionadaId]);

  useEffect(() => {
    if (!ordenesAbiertas.length) setProductosSeleccionados(new Set());
  }, [ordenesAbiertas.length]);

  const sugerencias = useMemo(() => {
    const productIds = new Set(products.map((p) => p.id));
    return calcularSugerenciasRecompra(historialCompras || [])
      .filter((s) => productIds.has(s.productId) && !dismissedSugerencias.includes(s.productId))
      .slice(0, 6);
  }, [historialCompras, products, dismissedSugerencias]);

  const agregarACompra = async (product) => {
    await agregarItemABorrador(ordenVigente, { productId: product.id, productName: product.name, precioUnitario: product.price });
    setAgregadoId(product.id);
    setTimeout(() => setAgregadoId(null), 1500);
  };

  const alternarSeleccionProducto = (productId) => {
    if (!ordenesAbiertas.length) return;
    setErrorSeleccion(null);
    setProductosSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(productId)) siguiente.delete(productId);
      else siguiente.add(productId);
      return siguiente;
    });
  };

  const agregarSeleccionAOrden = async () => {
    if (!productosMarcados.length || agregandoSeleccionados) return;
    if (!ordenesAbiertas.length) {
      setErrorSeleccion("Abre o crea una orden de compra antes de seleccionar productos.");
      return;
    }
    const ordenDestino = ordenesAbiertas.find((orden) => orden.id === ordenSeleccionadaId) || null;
    if (ordenesAbiertas.length > 0 && !ordenDestino) {
      setErrorSeleccion("Selecciona una orden abierta para continuar.");
      return;
    }
    setAgregandoSeleccionados(true);
    setErrorSeleccion(null);
    try {
      const items = productosMarcados.map((product) => ({
        productId: product.id,
        productName: product.name,
        cantidad: 1,
        precioUnitario: product.price ?? null,
      }));
      await agregarItemsABorrador(ordenDestino, items);
      setProductosSeleccionados(new Set());
      if (onNavigate) onNavigate("ordenes-compra");
    } catch (err) {
      setErrorSeleccion(err.message || "No se pudieron agregar los productos a la orden.");
    } finally {
      setAgregandoSeleccionados(false);
    }
  };

  const crearOrdenParaSeleccion = async () => {
    if (ordenesAbiertas.length || creandoOrdenSeleccion) return;
    setCreandoOrdenSeleccion(true);
    setErrorSeleccion(null);
    try {
      const orden = await addOrdenCompra({ items: [] });
      setScanMsg({ tipo: "ok", texto: `Se creó la orden ${orden.folio}. Ya puedes seleccionar productos del catálogo.` });
    } catch (err) {
      setErrorSeleccion(err.message || "No se pudo crear la orden de compra.");
    } finally {
      setCreandoOrdenSeleccion(false);
    }
  };

  const agregarSugerenciaACompra = async (sugerencia) => {
    const product = products.find((p) => p.id === sugerencia.productId);
    await agregarItemABorrador(ordenVigente, {
      productId: sugerencia.productId,
      productName: sugerencia.productName,
      precioUnitario: product?.price ?? null,
    });
    setDismissedSugerencias((prev) => [...prev, sugerencia.productId]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleBarcodeDetected = async (codigo) => {
    setShowScanner(false);
    setScanBusy(true);
    setScanMsg(null);
    try {
      const yaExiste = products.find((p) => p.codigoBarras === codigo);
      if (yaExiste) {
        await agregarACompra(yaExiste);
        setScanMsg({ tipo: "ok", texto: `"${yaExiste.name}" ya estaba en tu catálogo — lo agregué a tu orden de compra.` });
        return;
      }
      const resultado = await buscarProductoPorCodigo(codigo);
      setShowForm(true);
      if (resultado?.nombre) {
        setForm((f) => ({ ...f, name: resultado.nombre, codigoBarras: codigo }));
        setScanMsg({ tipo: "ok", texto: `Encontrado: ${resultado.nombre}. Revisa el nombre y completa el precio.` });
      } else {
        setForm((f) => ({ ...f, name: "", codigoBarras: codigo }));
        setScanMsg({ tipo: "info", texto: `No encontré este código (${codigo}) en la base de datos. Completa el nombre a mano.` });
      }
    } finally {
      setScanBusy(false);
    }
  };

  const handleFormImagePick = (file) => {
    if (!file) return;
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    setFormError(null);
    try {
      const price = parseFloat(form.price);
      const docRef = await addProduct({
        name,
        category: form.category,
        unit: form.unit,
        price: Number.isFinite(price) ? price : 0,
        codigoBarras: form.codigoBarras || null,
        urlReferencia: urlReferenciaGuardada || null,
        proteinaPor100g: form.proteinaPor100g ? parseFloat(form.proteinaPor100g) : null,
      });
      if (formImage) {
        await uploadProductImage(docRef.id, formImage);
      } else if (imagenPendienteUrl) {
        await uploadProductImageFromUrl(docRef.id, imagenPendienteUrl).catch(() => {
          // Si falla la descarga automática de la imagen encontrada, no se
          // bloquea el guardado del producto — solo se queda sin foto.
        });
      }
      setForm({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "", codigoBarras: "", proteinaPor100g: "" });
      setFormImage(null);
      setFormImagePreview(null);
      setProductoUrl("");
      setImagenPendienteUrl(null);
      setImagenesCandidatas([]);
      setUrlReferenciaGuardada(null);
      setImportarUrlMsg(null);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRowImagePick = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      await uploadProductImage(id, file);
    } catch (err) {
      // el error se ve reflejado si el producto no actualiza su imagen
    } finally {
      setUploadingId(null);
    }
  };

  const handleGuardarImagenPorUrl = async (id) => {
    if (!urlValue.trim()) {
      setUrlError("Pega una URL de imagen");
      return;
    }
    setUploadingId(id);
    setUrlError(null);
    try {
      await uploadProductImageFromUrl(id, urlValue.trim());
      setUrlPickerId(null);
      setUrlValue("");
    } catch (err) {
      setUrlError(err.message || String(err));
    } finally {
      setUploadingId(null);
    }
  };

  const handlePriceBlur = (id, value) => {
    const price = parseFloat(value);
    if (Number.isFinite(price)) updateProductPrice(id, price);
  };

  const handleAddToList = (id) => {
    const product = products.find((p) => p.id === id);
    if (product) agregarACompra(product);
  };

  const openConfig = (p) => {
    setConfiguringId(p.id);
    setConfigForm({
      seguimiento: !!p.seguimiento,
      unidadesPorPaquete: p.unidadesPorPaquete != null ? String(p.unidadesPorPaquete) : "30",
      consumoDiario: p.consumoDiario != null ? String(p.consumoDiario) : "1",
      diasAviso: p.diasAviso != null ? String(p.diasAviso) : "5",
      cajasReponer: "",
      entidadId: p.entidadId || "",
    });
  };

  const closeConfig = () => {
    setConfiguringId(null);
    setConfigForm(null);
  };

  const saveConfig = async () => {
    const producto = products.find((p) => p.id === configuringId);
    if (!producto) return;
    setConfigSaving(true);
    try {
      const unidadesPorPaquete = parseFloat(configForm.unidadesPorPaquete) || 1;
      const consumoDiario = parseFloat(configForm.consumoDiario) || 1;
      const diasAviso = parseInt(configForm.diasAviso, 10) || 5;
      const cajas = parseFloat(configForm.cajasReponer);

      const fields = {
        seguimiento: configForm.seguimiento,
        unidadesPorPaquete,
        consumoDiario,
        diasAviso,
        entidadId: configForm.entidadId || null,
        entidadName: entidades.find((e) => e.docId === configForm.entidadId)?.name || "",
      };

      if (configForm.seguimiento && Number.isFinite(cajas) && cajas > 0) {
        const productoActualizado = { ...producto, unidadesPorPaquete, consumoDiario };
        Object.assign(fields, registrarReposicion(productoActualizado, cajas));
      }

      await updateProducto(configuringId, fields);
      closeConfig();
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div>
      <ComprasProrateadas compras={comprasProrateadas} categoriasGasto={categoriasGasto} products={products} />

      {ordenVigente && (ordenVigente.items || []).length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "var(--sage-bg)",
            border: "1px solid var(--sage)",
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--sage)" }}>
            Tienes {ordenVigente.items.length} producto(s) en tu orden de compra {ordenVigente.folio} ({ordenVigente.estado}).
          </span>
          {onNavigate && (
            <button
              onClick={() => onNavigate("ordenes-compra")}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 11.5, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", flexShrink: 0 }}
            >
              <ShoppingCart size={12} /> Ver orden de compra
            </button>
          )}
        </div>
      )}

      {ordenesAbiertas.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 13px", marginBottom: 14, border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>La selección está desactivada</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Crea una orden de compra para poder marcar productos del catálogo.</div>
            {errorSeleccion && <div role="alert" style={{ marginTop: 5, fontSize: 11.5, color: "var(--stamp)" }}>{errorSeleccion}</div>}
          </div>
          <button
            type="button"
            onClick={crearOrdenParaSeleccion}
            disabled={creandoOrdenSeleccion}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", border: "none", borderRadius: 8, background: "var(--sage)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: creandoOrdenSeleccion ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            <ShoppingCart size={14} /> {creandoOrdenSeleccion ? "Creando…" : "Crear orden de compra"}
          </button>
        </div>
      )}

      {productosMarcados.length > 0 && (
        <div className="despensa-catalogo-seleccion-barra">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {productosMarcados.length} producto{productosMarcados.length === 1 ? "" : "s"} seleccionado{productosMarcados.length === 1 ? "" : "s"}
            </div>
            <div className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3 }}>
              Total estimado: ${productosMarcados.reduce((total, product) => total + (Number(product.price) || 0), 0).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
            {ordenesAbiertas.length > 1 && (
            <select
              aria-label="Orden de compra abierta"
              value={ordenSeleccionadaId}
              onChange={(event) => setOrdenSeleccionadaId(event.target.value)}
              style={{ minWidth: 150, maxWidth: 210, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink)", fontSize: 12 }}
            >
              {ordenesAbiertas.map((orden) => (
                <option key={orden.id} value={orden.id}>
                  {orden.folio} · {orden.estado}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={agregarSeleccionAOrden}
            disabled={agregandoSeleccionados}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 13px", border: "none", borderRadius: 9, background: "var(--sage)", color: "#fff", fontWeight: 600, fontSize: 12, cursor: agregandoSeleccionados ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            <ShoppingCart size={14} />
            {agregandoSeleccionados
              ? "Agregando…"
              : `Agregar a ${ordenesAbiertas.find((orden) => orden.id === ordenSeleccionadaId)?.folio || "la orden"}`}
          </button>
          <button
            type="button"
            onClick={() => { setProductosSeleccionados(new Set()); setErrorSeleccion(null); }}
            aria-label="Limpiar selección"
            title="Limpiar selección"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, flexShrink: 0, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
          {errorSeleccion && <div role="alert" style={{ flexBasis: "100%", fontSize: 11.5, color: "var(--stamp)" }}>{errorSeleccion}</div>}
        </div>
      )}

      {onNavigate && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => onNavigate("escanear-factura")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "11px 14px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <Camera size={15} /> Registrar compra (escanear factura)
          </button>
          <button
            onClick={() => onNavigate("recetas")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "11px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--sage-bg)",
              color: "var(--sage)",
              border: "1px solid var(--sage)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <UtensilsCrossed size={15} /> Sugerir platos con mi despensa (IA)
          </button>
        </div>
      )}

      {sugerencias.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={13} style={{ color: "var(--sage)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Sugerencias basadas en tus hábitos de compra
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sugerencias.map((s) => (
              <div
                key={s.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: s.vencido ? "var(--stamp-bg)" : "var(--sage-bg)",
                  border: `1px solid ${s.vencido ? "var(--stamp)" : "var(--sage)"}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.productName}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    Sueles comprarlo cada ~{s.promedioDias} días · última vez hace {s.diasDesdeUltima} días
                    {s.vencido && " · ya deberías haberlo repuesto"}
                  </div>
                </div>
                <button
                  onClick={() => agregarSugerenciaACompra(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    background: s.vencido ? "var(--stamp)" : "var(--sage)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <ShoppingCart size={12} /> Agregar a compra
                </button>
                <button
                  onClick={() => setDismissedSugerencias((prev) => [...prev, s.productId])}
                  title="Descartar"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--card)",
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => {
            setScanMsg(null);
            setShowScanner(true);
          }}
          title="Escanear código de barras"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--sage)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ScanLine size={14} /> Escanear
        </button>
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
          {showForm ? "Cancelar" : "Agregar producto"}
        </button>
        <button
          type="button"
          onClick={() => setShowModalBravo(true)}
          title="Ver todo el catálogo de Supermercados Bravo con más de 1,036 productos, fotos oficiales y precios en RD$"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            background: "#fff1f2",
            color: "#e21c1b",
            border: "1.5px solid #e21c1b",
            borderRadius: 8,
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(226, 28, 27, 0.12)",
          }}
        >
          <ShoppingBag size={15} /> Catálogo Completo Bravo (1,036+ Productos RD$)
        </button>
      </div>

      {scanBusy && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>
          Buscando el producto…
        </div>
      )}
      {scanMsg && (
        <div
          style={{
            fontSize: 12.5,
            marginBottom: 12,
            padding: "9px 12px",
            borderRadius: 8,
            background: scanMsg.tipo === "ok" ? "var(--sage-bg)" : "var(--amber-bg)",
            color: scanMsg.tipo === "ok" ? "var(--sage)" : "var(--amber)",
          }}
        >
          {scanMsg.texto}
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
              Buscar producto por nombre (lo encuentra en supermercadosrd.com automáticamente, sin que pegues ninguna URL)
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder='Ej. "jabón de avena protex"'
                value={nombreBusqueda}
                onChange={(e) => setNombreBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscarPorNombre()}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <button
                type="button"
                onClick={handleBuscarPorNombre}
                disabled={buscandoPorNombre}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--sage)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: buscandoPorNombre ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Search size={13} /> {buscandoPorNombre ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
              Importar desde una página de producto (opcional — puede que no funcione en todos los sitios)
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="Pega la URL del producto"
                value={productoUrl}
                onChange={(e) => setProductoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImportarDesdeUrl()}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <button
                type="button"
                onClick={handleImportarDesdeUrl}
                disabled={importandoUrl}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "var(--sage)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: importandoUrl ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <LinkIcon size={13} /> {importandoUrl ? "Buscando…" : "Importar"}
              </button>
            </div>
            {importarUrlMsg && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: importarUrlMsg.tipo === "ok" ? "var(--sage)" : "var(--stamp)" }}>
                {importarUrlMsg.texto}
              </div>
            )}
            {imagenesCandidatas.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Elige la foto del producto:</div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                  {imagenesCandidatas.map((img) => (
                    <button
                      key={img}
                      onClick={() => setImagenPendienteUrl(img)}
                      style={{
                        flexShrink: 0,
                        width: 56,
                        height: 56,
                        padding: 0,
                        borderRadius: 8,
                        border: img === imagenPendienteUrl ? "2px solid var(--sage)" : "1px solid var(--line)",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "var(--card)",
                      }}
                    >
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              ref={formFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFormImagePick(e.target.files[0])}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => formFileRef.current?.click()}
              title="Agregar foto"
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 8,
                border: "1px dashed var(--line)",
                backgroundColor: formImagePreview ? "#ffffff" : "var(--card)",
                backgroundImage: formImagePreview ? `url(${formImagePreview})` : "none",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-soft)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {!formImagePreview && <Camera size={18} />}
            </button>
            <div
              className="despensa-formgrid"
              style={{ flex: 1, display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr", gap: 8 }}
            >
              <input
                autoFocus
                placeholder="Nombre del producto"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Precio"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <input
                className="despensa-mono"
                type="number"
                step="0.1"
                min="0"
                placeholder="Proteína g/100g (opcional)"
                value={form.proteinaPor100g}
                onChange={(e) => setForm({ ...form, proteinaPor100g: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.name.trim() || saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: form.name.trim() ? "var(--sage)" : "var(--line)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: form.name.trim() && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Guardando…" : "Guardar producto"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>
              No se pudo guardar: {formError}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {products.length === 0
            ? "Tu catálogo está vacío. Agrega tu primer producto."
            : "No hay productos que coincidan con la búsqueda."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((p) => {
            const seleccionado = productosSeleccionados.has(p.id);
            const ordenesDelProducto = productosEnOrdenesAbiertas.get(p.id) || [];
            const incluidoEnOrden = ordenesDelProducto.length > 0;
            const incluidoEnDestino = ordenesDelProducto.some((orden) => orden.id === ordenSeleccionadaId);
            const unidadesEnOrden = ordenesDelProducto.reduce((total, orden) => total + orden.cantidad, 0);
            return (
            <div
              key={p.id}
              data-record-id={p.id}
              onClick={(event) => {
                if (!ordenesAbiertas.length || urlPickerId === p.id || event.target.closest("button, input, select, textarea, a")) return;
                alternarSeleccionProducto(p.id);
              }}
              aria-disabled={!ordenesAbiertas.length}
              title={ordenesAbiertas.length ? "Haz clic para seleccionar este producto" : "Crea una orden de compra para habilitar la selección"}
              style={{
                background: seleccionado || incluidoEnOrden ? "var(--sage-bg)" : "var(--card)",
                border: seleccionado || incluidoEnOrden ? "2px solid var(--sage)" : "1px solid var(--line)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                cursor: ordenesAbiertas.length ? "pointer" : "default",
                boxShadow: seleccionado || incluidoEnOrden ? "0 0 0 2px var(--sage-bg)" : "none",
              }}
            >
              <div style={{ position: "relative" }}>
                <input
                  ref={(el) => (rowFileRefs.current[p.id] = el)}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleRowImagePick(p.id, e.target.files[0])}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (p.imageUrl) alternarSeleccionProducto(p.id);
                    else rowFileRefs.current[p.id]?.click();
                  }}
                  title={p.imageUrl ? (ordenesAbiertas.length ? "Seleccionar producto" : "La selección requiere una orden abierta") : "Agregar foto"}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    border: "none",
                    borderBottom: "1px solid var(--line-soft)",
                backgroundColor: p.imageUrl ? "#ffffff" : "var(--paper)",
                    backgroundImage: p.imageUrl ? `url(${p.imageUrl})` : "none",
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                    padding: 0,
                    opacity: uploadingId === p.id ? 0.5 : 1,
                  }}
                >
                  {!p.imageUrl && <ImageIcon size={26} />}
                </button>
                <button
                  type="button"
                  aria-label={seleccionado ? `Quitar ${p.name} de la selección` : `Seleccionar ${p.name}`}
                  aria-pressed={seleccionado}
                  onClick={(event) => { event.stopPropagation(); alternarSeleccionProducto(p.id); }}
                  disabled={!ordenesAbiertas.length}
                  style={{ position: "absolute", top: 6, left: 6, zIndex: 2, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: seleccionado ? "1px solid var(--sage)" : "1px solid var(--line)", borderRadius: 8, background: seleccionado ? "var(--sage)" : "var(--paper)", color: seleccionado ? "#fff" : "var(--ink-soft)", boxShadow: "0 1px 6px rgba(0,0,0,0.2)", cursor: ordenesAbiertas.length ? "pointer" : "not-allowed", opacity: ordenesAbiertas.length ? 1 : 0.55 }}
                >
                  {seleccionado ? <Check size={16} /> : <span style={{ width: 12, height: 12, border: "1px solid currentColor", borderRadius: 3 }} />}
                </button>
                {p.imageUrl && (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); rowFileRefs.current[p.id]?.click(); }}
                    title="Cambiar foto"
                    aria-label={`Cambiar foto de ${p.name}`}
                    style={{ position: "absolute", bottom: 6, left: 6, zIndex: 2, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.58)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Camera size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleAutoBuscarFoto(p);
                  }}
                  title="Buscar foto automáticamente en supermercadosrd.com"
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.65)",
                    color: "#fde047",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Sparkles size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUrlPickerId(urlPickerId === p.id ? null : p.id);
                    setUrlValue("");
                    setUrlError(null);
                  }}
                  title="Agregar foto desde una URL"
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <LinkIcon size={12} />
                </button>
                {p.imageUrl && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const motivo = await confirm(`¿Quitar la foto de "${p.name}"?`, { requireReason: false });
                      if (motivo === false) return;
                      setUploadingId(p.id);
                      try {
                        await removeProductImage(p.id);
                      } finally {
                        setUploadingId(null);
                      }
                    }}
                    title="Quitar foto"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {urlPickerId === p.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 5,
                      background: "rgba(0,0,0,0.75)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: 10,
                    }}
                  >
                    <input
                      autoFocus
                      placeholder="Pega la URL de una imagen"
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGuardarImagenPorUrl(p.id)}
                      style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 11.5, marginBottom: 6, boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleGuardarImagenPorUrl(p.id)}
                        disabled={uploadingId === p.id}
                        style={{ flex: 1, padding: "5px 8px", fontSize: 11, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                      >
                        {uploadingId === p.id ? "Descargando…" : "Guardar"}
                      </button>
                      <button
                        onClick={() => {
                          setUrlPickerId(null);
                          setUrlError(null);
                        }}
                        style={{ padding: "5px 8px", fontSize: 11, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </div>
                    {urlError && <div style={{ marginTop: 6, fontSize: 10.5, color: "#ffb4b4" }}>{urlError}</div>}
                  </div>
                )}
              </div>

              <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    minHeight: 32,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2, marginBottom: incluidoEnOrden || seleccionado ? 5 : 8 }}>
                  {p.category} · por {p.unit}
                </div>
                {(incluidoEnOrden || seleccionado) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
                    {incluidoEnOrden && (
                      <span title={`${unidadesEnOrden} unidad(es) en ${ordenesDelProducto.map((orden) => orden.folio).join(", ")}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 6px", borderRadius: 6, background: "var(--sage)", color: "#fff", fontSize: 9.5, fontWeight: 600 }}>
                        <Check size={10} /> {incluidoEnDestino ? "En esta orden" : "En otra orden"} · {unidadesEnOrden}
                      </span>
                    )}
                    {seleccionado && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 6px", borderRadius: 6, background: "var(--card)", border: "1px solid var(--sage)", color: "var(--sage)", fontSize: 9.5, fontWeight: 600 }}>
                        Para agregar
                      </span>
                    )}
                  </div>
                )}

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="despensa-mono" style={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12.5, flex: 1, minWidth: 0 }}>
                    $
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(p.price || 0).toFixed(2)}
                      key={p.price}
                      onBlur={(e) => handlePriceBlur(p.id, e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 0,
                        padding: "4px 5px",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontFamily: "IBM Plex Mono, monospace",
                        textAlign: "right",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => openConfig(p)}
                    title="Seguimiento de inventario"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: p.seguimiento ? "var(--sage-bg)" : "transparent",
                      color: p.seguimiento ? "var(--sage)" : "var(--ink-soft)",
                      border: p.seguimiento ? "none" : "1px solid var(--line)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Package size={13} />
                  </button>
                  <button
                    onClick={() => handleAddToList(p.id)}
                    title="Agregar a orden de compra"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: agregadoId === p.id ? "var(--sage)" : "var(--sage-bg)",
                      color: agregadoId === p.id ? "#fff" : "var(--sage)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {agregadoId === p.id ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirm("¿Eliminar este producto del catálogo?")) deleteProduct(p.id);
                    }}
                    title="Eliminar producto"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: "transparent",
                      color: "var(--stamp)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {p.seguimiento && (() => {
                  const dias = diasRestantesProducto(p);
                  if (dias == null) return null;
                  const bajo = dias <= (p.diasAviso ?? 5);
                  return (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: bajo ? "var(--stamp)" : "var(--ink-soft)",
                      }}
                    >
                      <Clock size={10} />
                      {dias <= 0 ? "Se acabó" : `${dias} día${dias !== 1 ? "s" : ""} restantes`}
                    </div>
                  );
                })()}
              </div>
            </div>
          ); })}
        </div>
      )}

      {configuringId && configForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--stamp)", borderRadius: 10, padding: 14, marginTop: 16 }}>
          <div className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Seguimiento de inventario: {products.find((p) => p.id === configuringId)?.name}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={configForm.seguimiento}
              onChange={(e) => setConfigForm({ ...configForm, seguimiento: e.target.checked })}
            />
            Avisarme cuando se esté por acabar
          </label>

          {configForm.seguimiento && (
            <>
              <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Unidades por paquete</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.unidadesPorPaquete}
                    onChange={(e) => setConfigForm({ ...configForm, unidadesPorPaquete: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Consumo diario</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.consumoDiario}
                    onChange={(e) => setConfigForm({ ...configForm, consumoDiario: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Avisar con (días)</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.diasAviso}
                    onChange={(e) => setConfigForm({ ...configForm, diasAviso: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>
                  Comprado en (para poder pedir por WhatsApp desde la notificación)
                </div>
                <select
                  value={configForm.entidadId}
                  onChange={(e) => setConfigForm({ ...configForm, entidadId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                >
                  <option value="">Sin entidad (opcional)</option>
                  {entidades.map((e) => (
                    <option key={e.docId} value={e.docId}>{e.name}</option>
                  ))}
                </select>
                {configForm.entidadId && !entidades.find((e) => e.docId === configForm.entidadId)?.phone && (
                  <div style={{ fontSize: 11, color: "var(--stamp)", marginTop: 4 }}>
                    Esa entidad no tiene teléfono registrado — agrégalo en Entidades para poder pedir por WhatsApp.
                  </div>
                )}
              </div>

              {(() => {
                const producto = products.find((p) => p.id === configuringId);
                const dias = producto ? diasRestantesProducto(producto) : null;
                return (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
                    {dias == null
                      ? "Aún no has registrado ninguna compra — dile cuántos paquetes acabas de comprar abajo."
                      : dias <= 0
                      ? "Según lo registrado, ya se debería haber acabado."
                      : `Quedan aproximadamente ${dias} día${dias !== 1 ? "s" : ""} de inventario.`}
                  </div>
                );
              })()}

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>
                  ¿Compraste paquetes ahora? Escribe cuántos para sumarlos al inventario
                </div>
                <input
                  className="despensa-mono"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ej. 2"
                  value={configForm.cajasReponer}
                  onChange={(e) => setConfigForm({ ...configForm, cajasReponer: e.target.value })}
                  style={{ width: 120, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveConfig}
              disabled={configSaving}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: configSaving ? "not-allowed" : "pointer" }}
            >
              {configSaving ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={closeConfig}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showModalBravo && (
        <ModalProductosBravo
          products={products}
          onClose={() => setShowModalBravo(false)}
        />
      )}
    </div>
  );
}
