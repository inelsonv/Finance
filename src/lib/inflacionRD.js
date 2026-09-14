// Obtiene la inflación anual (variación del IPC) más reciente disponible
// para República Dominicana, usando la API pública del Banco Mundial —
// gratis, sin clave, sin necesidad de backend propio.
export async function fetchInflacionRD() {
  const res = await fetch("https://api.worldbank.org/v2/country/DO/indicator/FP.CPI.TOTL.ZG?format=json&per_page=10");
  if (!res.ok) throw new Error("Respuesta no válida");
  const data = await res.json();
  // La API devuelve [metadata, [...años]] — algunos años recientes pueden
  // venir sin dato todavía (value: null), así que se busca el más reciente
  // que sí tenga valor.
  const serie = Array.isArray(data) ? data[1] : null;
  const reciente = (serie || []).find((d) => d.value != null);
  if (!reciente) throw new Error("Sin datos de inflación");
  return { valor: reciente.value, anio: reciente.date };
}
