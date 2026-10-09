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
 * Busca productos de Bravo / supermercadosrd.com por texto.
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

  // Unifica resultados sin duplicados de imagen o nombre
  const vistos = new Set();
  const unificados = [];

  for (const item of [...coincidenciasLocales, ...enVivo]) {
    const clave = normalizarTexto(item.nombre);
    if (!vistos.has(clave) && item.imagenUrl) {
      vistos.add(clave);
      unificados.push(item);
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
