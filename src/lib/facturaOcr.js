// Utilidad para escanear facturas con IA, comparar con el Catálogo de productos
// y permitir registrar gastos y actualizar precios de forma interactiva.
import { escanearFactura, addMovimiento, updateProductPrice, registrarCompraProducto, addProduct } from "./db";

/**
 * Reduce imágenes de alta resolución tomadas con teléfonos (ej. 12MP+)
 * a un tamaño óptimo para enviarlas al modelo de visión sin pérdida de legibilidad.
 */
export function redimensionarImagen(file, maxWidth = 1600) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }
      const escala = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.88);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

/**
 * Convierte un Blob/File a string Base64.
 */
export function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Normaliza nombres para comparación flexible entre el recibo y el catálogo.
 */
function normalizarTexto(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(lb|libras?|paq|pack|und|unidad(?:es)?|kg|kilos?|litros?|lt|gr|gramos?|ml)\b/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca coincidencia entre un artículo de la factura y los productos del catálogo.
 */
export function buscarProductoEnCatalogo(nombreItem, products = []) {
  if (!nombreItem || !Array.isArray(products) || products.length === 0) return null;

  const itemNorm = normalizarTexto(nombreItem);
  if (!itemNorm) return null;

  // 1. Coincidencia exacta por nombre normalizado
  let encontrado = products.find((p) => normalizarTexto(p.name) === itemNorm);
  if (encontrado) return encontrado;

  // 2. Coincidencia por inclusión de substring
  encontrado = products.find((p) => {
    const pNorm = normalizarTexto(p.name);
    return (
      (pNorm.length >= 3 && itemNorm.includes(pNorm)) ||
      (itemNorm.length >= 3 && pNorm.includes(itemNorm))
    );
  });
  if (encontrado) return encontrado;

  // 3. Coincidencia por palabras clave compartidas
  const palabrasItem = itemNorm.split(" ").filter((w) => w.length >= 3);
  if (palabrasItem.length > 0) {
    let mejorPuntaje = 0;
    let mejorProd = null;
    for (const p of products) {
      const pNorm = normalizarTexto(p.name);
      const palabrasProd = pNorm.split(" ").filter((w) => w.length >= 3);
      const comunes = palabrasItem.filter((w) => palabrasProd.includes(w));
      const puntaje = comunes.length;
      if (puntaje > mejorPuntaje && puntaje >= 1) {
        mejorPuntaje = puntaje;
        mejorProd = p;
      }
    }
    if (mejorPuntaje >= 1) return mejorProd;
  }

  return null;
}

/**
 * Procesa la imagen de la factura con IA y la vincula con los productos del catálogo.
 */
export async function procesarFacturaConCatalogo(file, products = []) {
  const imagenOptimizada = await redimensionarImagen(file);
  const base64 = await blobABase64(imagenOptimizada);
  const mediaType = imagenOptimizada.type || file.type || "image/jpeg";

  const datosFactura = await escanearFactura(base64, mediaType);
  if (!datosFactura || (typeof datosFactura !== "object")) {
    throw new Error("No se pudo interpretar el contenido de la factura.");
  }

  const itemsCrudos = Array.isArray(datosFactura.items) ? datosFactura.items : [];

  const itemsProcesados = itemsCrudos
    .filter((it) => it && (it.nombre || it.totalLinea || it.precioUnitario))
    .map((it, idx) => {
      const nombre = String(it.nombre || `Artículo ${idx + 1}`).trim();
      const cantidad = Number(it.cantidad) > 0 ? Number(it.cantidad) : 1;
      let precioUnitario = Number(it.precioUnitario);
      const totalLinea = Number(it.totalLinea);

      if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
        if (Number.isFinite(totalLinea) && totalLinea > 0) {
          precioUnitario = Math.round((totalLinea / cantidad) * 100) / 100;
        } else {
          precioUnitario = 0;
        }
      }

      const productoMatch = buscarProductoEnCatalogo(nombre, products);
      const precioAnterior = productoMatch && Number.isFinite(productoMatch.price) ? Number(productoMatch.price) : null;
      const diferencia = precioAnterior !== null && precioUnitario > 0 ? precioUnitario - precioAnterior : null;

      return {
        id: `factura-item-${idx}-${Date.now()}`,
        nombre,
        cantidad,
        precioUnitario,
        totalLinea: totalLinea > 0 ? totalLinea : Math.round(precioUnitario * cantidad * 100) / 100,
        productoExistente: productoMatch,
        esNuevo: !productoMatch,
        precioAnterior,
        nuevoPrecio: precioUnitario,
        diferenciaPrecio: diferencia,
        incluir: true,
      };
    });

  const totalCalculado = itemsProcesados.reduce((sum, it) => sum + (it.totalLinea || 0), 0);
  const totalFinal = Number(datosFactura.total) > 0 ? Number(datosFactura.total) : totalCalculado;
  const fechaFinal = datosFactura.fecha && /^\d{4}-\d{2}-\d{2}$/.test(datosFactura.fecha)
    ? datosFactura.fecha
    : new Date().toISOString().slice(0, 10);

  return {
    tienda: datosFactura.tienda || "Supermercado",
    fecha: fechaFinal,
    total: totalFinal,
    moneda: datosFactura.moneda || "DOP",
    items: itemsProcesados,
    totalArticulos: itemsProcesados.length,
    coincidencias: itemsProcesados.filter((it) => !it.esNuevo),
    nuevos: itemsProcesados.filter((it) => it.esNuevo),
  };
}

/**
 * Guarda el movimiento de gasto y actualiza el catálogo en Firestore.
 */
export async function aplicarFacturaACatalogoYMovimientos({
  facturaData,
  metodoPago = "Tarjeta",
  categoriaGasto = "Alimentos",
  agregarNuevosAlCatalogo = true,
}) {
  if (!facturaData || !Array.isArray(facturaData.items)) {
    throw new Error("Datos de factura inválidos");
  }

  const itemsAIncluir = facturaData.items.filter((it) => it.incluir !== false);
  const total = Number(facturaData.total) > 0 ? Number(facturaData.total) : itemsAIncluir.reduce((s, it) => s + it.totalLinea, 0);
  const tienda = (facturaData.tienda || "Supermercado").trim();
  const fecha = facturaData.fecha || new Date().toISOString().slice(0, 10);

  // 1. Registra el movimiento de gasto
  await addMovimiento({
    type: "Gasto",
    category: categoriaGasto,
    amount: total,
    description: `Compra en ${tienda} (factura escaneada con IA)`,
    date: fecha,
    clasificacion: "Variable",
    metodoPago,
  });

  let preciosActualizados = 0;
  let productosCreados = 0;

  // 2. Actualiza catálogo y compras
  for (const it of itemsAIncluir) {
    const nuevoPrecio = it.nuevoPrecio || it.precioUnitario;
    if (it.productoExistente?.id) {
      if (nuevoPrecio > 0 && nuevoPrecio !== it.productoExistente.price) {
        await updateProductPrice(it.productoExistente.id, nuevoPrecio);
        preciosActualizados++;
      }
      await registrarCompraProducto(it.productoExistente.id, Number(it.cantidad) || 1);
    } else if (agregarNuevosAlCatalogo && it.esNuevo && it.nombre) {
      if (nuevoPrecio > 0) {
        await addProduct({
          name: it.nombre,
          category: "Alimentos",
          price: nuevoPrecio,
          currentStock: Number(it.cantidad) || 1,
          minStock: 0,
          unit: "unidad",
        });
        productosCreados++;
      }
    }
  }

  return {
    total,
    tienda,
    preciosActualizados,
    productosCreados,
  };
}
