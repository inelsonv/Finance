// Utilidades de integración con Supermercados Bravo y supermercadosrd.com
import bravoProductosRaw from "../data/bravoProductos.json";

export const PRODUCTOS_BRAVO_REGULARES = Array.isArray(bravoProductosRaw) ? bravoProductosRaw : [];

// Mapa de búsqueda rápida por nombre normalizado
const mapaNormalizado = new Map();
PRODUCTOS_BRAVO_REGULARES.forEach((p) => {
  if (p?.nombre) {
    const clave = normalizarTexto(p.nombre);
    mapaNormalizado.set(clave, p);
  }
});

export function normalizarTexto(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formatea un monto en Pesos Dominicanos (DOP).
 */
export function formatearPrecioRD(monto) {
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) return "RD$ 0.00";
  return `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Busca el precio oficial y detalles de un producto en el catálogo de Bravo / supermercadosrd.com.
 */
export function buscarPrecioParaProducto(nombreProducto) {
  if (!nombreProducto) return null;
  const pNorm = normalizarTexto(nombreProducto);

  if (mapaNormalizado.has(pNorm)) {
    const item = mapaNormalizado.get(pNorm);
    return {
      precio: item.precio || 0,
      unidad: item.unidad || "unidad",
      moneda: item.moneda || "DOP",
      imagenUrl: item.imagenUrl || null,
      nombre: item.nombre,
      categoria: item.categoria,
    };
  }

  const palabras = pNorm.split(" ").filter((w) => w.length > 2);
  const localMatch = PRODUCTOS_BRAVO_REGULARES.find((p) => {
    const itemNorm = normalizarTexto(p.nombre);
    return palabras.every((w) => itemNorm.includes(w));
  });

  if (localMatch) {
    return {
      precio: localMatch.precio || 0,
      unidad: localMatch.unidad || "unidad",
      moneda: localMatch.moneda || "DOP",
      imagenUrl: localMatch.imagenUrl || null,
      nombre: localMatch.nombre,
      categoria: localMatch.categoria,
    };
  }

  return null;
}

/**
 * Busca productos de Bravo / supermercadosrd.com por texto con sus precios oficiales e imágenes.
 * Combina el catálogo verificado local con la búsqueda en vivo si hay conexión.
 */
export async function buscarProductosSupermercadosRd(termino) {
  if (!termino || typeof termino !== "string") return [];
  const termNorm = normalizarTexto(termino);
  if (!termNorm) return [];

  // 1. Coincidencias en el catálogo local verificado de Bravo
  const palabras = termNorm.split(" ").filter((w) => w.length > 1);
  const coincidenciasLocales = PRODUCTOS_BRAVO_REGULARES.filter((p) => {
    const pNorm = normalizarTexto(p.nombre);
    return palabras.every((w) => pNorm.includes(w));
  });

  // 2. Consulta en vivo al endpoint proxy de supermercadosrd.com
  let enVivo = [];
  try {
    const res = await fetch(`/api/supermercados/buscar?q=${encodeURIComponent(termino)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.productos)) {
        enVivo = data.productos;
      }
    }
  } catch (err) {
    console.debug("Búsqueda en vivo no disponible, usando catálogo local:", err);
  }

  // Unifica resultados sin duplicados de imagen o nombre, asegurando precios
  const vistos = new Set();
  const unificados = [];

  for (const item of [...coincidenciasLocales, ...enVivo]) {
    const clave = normalizarTexto(item.nombre);
    if (!vistos.has(clave) && (item.imagenUrl || item.precio)) {
      vistos.add(clave);

      // Si el item en vivo no traía precio o categoría, intenta completarlo desde el catálogo verificado
      let precioFinal = Number(item.precio) || 0;
      let unidadFinal = item.unidad || "unidad";
      let categoriaFinal = item.categoria || "Despensa";

      if (precioFinal <= 0) {
        const info = buscarPrecioParaProducto(item.nombre);
        if (info?.precio) {
          precioFinal = info.precio;
          unidadFinal = info.unidad || unidadFinal;
          categoriaFinal = info.categoria || categoriaFinal;
        }
      }

      unificados.push({
        ...item,
        precio: precioFinal,
        unidad: unidadFinal,
        categoria: categoriaFinal,
        moneda: item.moneda || "DOP",
      });
    }
  }

  return unificados;
}

/**
 * Encuentra automáticamente la mejor imagen de producto en supermercadosrd.com / Bravo.
 */
export async function buscarImagenParaProducto(nombreProducto) {
  if (!nombreProducto) return null;
  const pNorm = normalizarTexto(nombreProducto);

  // Coincidencia exacta local
  if (mapaNormalizado.has(pNorm)) {
    return mapaNormalizado.get(pNorm).imagenUrl;
  }

  // Búsqueda aproximada local
  const palabras = pNorm.split(" ").filter((w) => w.length > 2);
  const localMatch = PRODUCTOS_BRAVO_REGULARES.find((p) => {
    const itemNorm = normalizarTexto(p.nombre);
    return palabras.every((w) => itemNorm.includes(w));
  });
  if (localMatch?.imagenUrl) {
    return localMatch.imagenUrl;
  }

  // Búsqueda en vivo en supermercadosrd.com
  try {
    const res = await fetch(`/api/supermercados/buscar?q=${encodeURIComponent(nombreProducto)}`);
    if (res.ok) {
      const data = await res.json();
      const primero = data?.productos?.[0];
      if (primero?.imagenUrl) {
        return primero.imagenUrl;
      }
    }
  } catch (_) {}

  return null;
}
