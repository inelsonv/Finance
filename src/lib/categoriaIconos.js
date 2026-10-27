// Adivina un ícono razonable para una categoría de gasto según palabras
// clave en su nombre (las categorías son personalizadas por el usuario, no
// una lista fija, así que esto es una heurística, no un mapeo exacto).
// Devuelve el NOMBRE del ícono (string) — cada pantalla que lo use decide
// cómo renderizarlo con su propio set de íconos importados.

const REGLAS = [
  { palabras: ["combustible", "gasolina"], icono: "fuel" },
  { palabras: ["estacionamiento", "parqueo"], icono: "parking" },
  { palabras: ["almuerzo", "comida", "alimentacion", "alimentación", "restaurante", "cena", "desayuno"], icono: "utensils" },
  { palabras: ["cafe", "café"], icono: "coffee" },
  { palabras: ["gym", "gimnasio", "ejercicio"], icono: "dumbbell" },
  { palabras: ["diezmo", "iglesia", "ofrenda"], icono: "church" },
  { palabras: ["mantenimiento"], icono: "wrench" },
  { palabras: ["lavado", "vehiculo", "vehículo", "carro", "mecanico", "mecánico", "taller"], icono: "car" },
  { palabras: ["prestamo", "préstamo", "deuda", "banco"], icono: "landmark" },
  { palabras: ["pelo", "corte", "barberia", "barbería", "salon", "salón"], icono: "scissors" },
  { palabras: ["salud", "bienestar", "medico", "médico", "doctor", "clinica", "clínica"], icono: "heartpulse" },
  { palabras: ["odontolog", "dentista", "dental"], icono: "stethoscope" },
  { palabras: ["medicina", "farmacia", "pastilla"], icono: "pill" },
  { palabras: ["suscripcion", "suscripción", "streaming", "netflix"], icono: "repeat" },
  { palabras: ["tarjeta", "credito", "crédito"], icono: "creditcard" },
  { palabras: ["telefono", "teléfono", "celular", "internet", "wifi"], icono: "wifi" },
  { palabras: ["casa", "alquiler", "renta", "hogar"], icono: "home" },
  { palabras: ["compra", "ropa", "tienda"], icono: "shoppingbag" },
  { palabras: ["ropa", "vestimenta"], icono: "shirt" },
  { palabras: ["colegio", "escuela", "universidad", "estudio", "educacion", "educación"], icono: "graduationcap" },
  { palabras: ["bebe", "bebé", "niño", "niña", "hijo", "hija"], icono: "baby" },
  { palabras: ["mascota", "perro", "gato", "veterinario"], icono: "dog" },
  { palabras: ["regalo", "cumpleaños"], icono: "gift" },
  { palabras: ["viaje", "vuelo", "avion", "avión"], icono: "plane" },
  { palabras: ["transporte", "guagua", "autobus", "autobús", "uber", "taxi"], icono: "bus" },
  { palabras: ["musica", "música", "concierto"], icono: "music" },
  { palabras: ["cine", "pelicula", "película"], icono: "film" },
  { palabras: ["juego", "videojuego"], icono: "gamepad" },
  { palabras: ["libro", "lectura"], icono: "book" },
];

function normalizar(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos
}

export function iconoParaCategoria(nombreCategoria) {
  const n = normalizar(nombreCategoria);
  for (const regla of REGLAS) {
    if (regla.palabras.some((p) => n.includes(normalizar(p)))) {
      return regla.icono;
    }
  }
  return "receipt"; // ícono genérico de respaldo
}
