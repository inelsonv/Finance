// Busca posibles portadas de un libro usando la API pública y gratuita de
// Open Library (openlibrary.org) — no requiere clave de API. Se llama
// directo desde el navegador porque Open Library permite CORS en su API de
// búsqueda. NOTA: esto no se pudo probar en vivo durante el desarrollo (sin
// acceso a internet en el entorno de build) — si falla, revisar consola.
export async function buscarPortadasLibro(titulo, autor) {
  const params = new URLSearchParams();
  if (titulo) params.set("title", titulo);
  if (autor) params.set("author", autor);
  params.set("limit", "6");

  const resp = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
  if (!resp.ok) throw new Error(`No se pudo buscar portadas (HTTP ${resp.status})`);
  const data = await resp.json();

  return (data.docs || [])
    .filter((d) => d.cover_i)
    .slice(0, 6)
    .map((d) => ({
      portadaUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
      titulo: d.title,
      autor: (d.author_name || [])[0] || "",
      anio: d.first_publish_year || null,
    }));
}
