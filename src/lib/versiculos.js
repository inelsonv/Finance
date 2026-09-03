// Lista de versículos para el versículo diario. Se elige uno al azar cada
// día (el mismo para todo ese día), y se guarda en Firestore para que no
// cambie si recargas la app varias veces el mismo día.
export const VERSICULOS = [
  { referencia: "Jeremías 29:11", texto: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis." },
  { referencia: "Filipenses 4:13", texto: "Todo lo puedo en Cristo que me fortalece." },
  { referencia: "Salmos 23:1", texto: "Jehová es mi pastor; nada me faltará." },
  { referencia: "Proverbios 3:5-6", texto: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas." },
  { referencia: "Isaías 41:10", texto: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia." },
  { referencia: "Salmos 37:4", texto: "Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón." },
  { referencia: "Romanos 8:28", texto: "Sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados." },
  { referencia: "Mateo 6:33", texto: "Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas." },
  { referencia: "Josué 1:9", texto: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas." },
  { referencia: "Salmos 46:1", texto: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones." },
  { referencia: "Proverbios 16:3", texto: "Encomienda a Jehová tus obras, y tus pensamientos serán afirmados." },
  { referencia: "2 Corintios 5:7", texto: "Porque por fe andamos, no por vista." },
  { referencia: "Salmos 121:1-2", texto: "Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro? Mi socorro viene de Jehová, que hizo los cielos y la tierra." },
  { referencia: "Filipenses 4:6-7", texto: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús." },
  { referencia: "Salmos 118:24", texto: "Este es el día que hizo Jehová; nos gozaremos y alegraremos en él." },
  { referencia: "Lamentaciones 3:22-23", texto: "Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad." },
  { referencia: "Salmos 34:18", texto: "Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu." },
  { referencia: "Gálatas 6:9", texto: "No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos." },
  { referencia: "Salmos 27:1", texto: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?" },
  { referencia: "Proverbios 22:29", texto: "¿Has visto hombre solícito en su trabajo? Delante de los reyes estará; no estará delante de los de baja condición." },
  { referencia: "Mateo 11:28", texto: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar." },
  { referencia: "Salmos 91:1-2", texto: "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente. Diré yo a Jehová: Esperanza mía, y castillo mío; mi Dios, en quien confiaré." },
  { referencia: "Nehemías 8:10", texto: "El gozo de Jehová es vuestra fuerza." },
  { referencia: "Colosenses 3:23", texto: "Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres." },
  { referencia: "Salmos 55:22", texto: "Echa sobre Jehová tu carga, y él te sustentará; no dejará para siempre caído al justo." },
  { referencia: "Santiago 1:5", texto: "Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente y sin reproche, y le será dada." },
  { referencia: "1 Pedro 5:7", texto: "Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros." },
  { referencia: "Salmos 143:8", texto: "Hazme oír por la mañana tu misericordia, porque en ti he confiado; hazme saber el camino por donde ande, porque a ti he elevado mi alma." },
  { referencia: "Deuteronomio 31:6", texto: "Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos, porque Jehová tu Dios es el que va contigo; no te dejará ni te desamparará." },
  { referencia: "Habacuc 3:19", texto: "Jehová el Señor es mi fortaleza, el cual hace mis pies como de ciervas, y en mis alturas me hace andar." },
];

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function fechaHoyStr(hoy = new Date()) {
  return `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}-${pad2(hoy.getDate())}`;
}

export function elegirVersiculoAlAzar() {
  const idx = Math.floor(Math.random() * VERSICULOS.length);
  return VERSICULOS[idx];
}

// Intenta obtener un versículo al azar desde una API pública en vivo
// (bolls.life, traducción RVR1960 en español, sin necesidad de clave). Si
// falla por cualquier razón (sin internet, CORS, el servicio caído, etc.),
// usa la lista local de respaldo — así el versículo diario nunca se rompe
// por completo, aunque la fuente en línea no esté disponible.
export async function obtenerVersiculoDelDia() {
  try {
    const res = await fetch("https://bolls.life/get-random-verse/RVR1960/");
    if (!res.ok) throw new Error(`Respuesta ${res.status}`);
    const data = await res.json();
    const texto = (data.text || "").replace(/<[^>]+>/g, "").trim();
    if (!texto) throw new Error("Respuesta sin texto");
    const referencia = `${data.book_name || ""} ${data.chapter || ""}:${data.verse || ""}`.trim();
    return { referencia, texto, fuente: "api" };
  } catch (err) {
    console.warn("No se pudo obtener el versículo desde la API en vivo, usando la lista local:", err);
    return { ...elegirVersiculoAlAzar(), fuente: "local" };
  }
}
