// Consejos financieros breves, de redacción propia (para no depender de citas
// textuales de libros con derechos de autor). Se muestra uno distinto cada
// día, rotando de forma determinística según la fecha.

const CONSEJOS = [
  "Antes de comprar algo que no es urgente, espera 24 horas. Si al día siguiente lo sigues queriendo igual, cómpralo con calma.",
  "Un presupuesto no es una jaula, es un mapa: te dice a dónde va tu dinero antes de que se vaya solo.",
  "Paga primero tu ahorro, como si fuera una factura más — no lo que sobra al final del mes.",
  "La deuda con mayor tasa de interés es la que más rápido crece en tu contra. Atácala primero si puedes.",
  "Tener un fondo de emergencia no es pesimismo, es paz mental comprada por adelantado.",
  "Cada peso que gastas hoy es un peso que no está trabajando para ti mañana.",
  "Comparar tu progreso financiero con el de otros solo te distrae de tu propio plan.",
  "Un ingreso más alto no resuelve un problema de gastos — ese problema crece contigo si no lo atiendes.",
  "Automatiza lo que puedas: ahorro, pagos, inversión. La disciplina es más fácil cuando no depende de tu fuerza de voluntad diaria.",
  "El interés compuesto premia la paciencia, no la prisa.",
  "Revisar tus gastos una vez a la semana toma minutos, pero evita sorpresas de fin de mes.",
  "Comprar algo en oferta que no necesitabas sigue siendo gastar, no ahorrar.",
  "Una meta financiera sin fecha es solo un deseo. Ponle un número y una fecha.",
  "Diversificar no es solo para inversiones grandes — aplica también a tus fuentes de ingreso.",
  "El mejor momento para empezar a ahorrar fue hace años. El segundo mejor momento es hoy.",
  "Gastar por impulso rara vez se siente tan bien como se ve en el momento de decidir.",
  "Cancelar una deuda pequeña primero te da algo más valioso que dinero: motivación para seguir.",
  "No necesitas ser rico para empezar a invertir — necesitas empezar para eventualmente serlo.",
  "Cada suscripción que no usas es dinero que decides seguir regalando cada mes.",
  "Un gasto hormiga diario de RD$100 son casi RD$3,000 al mes sin que lo notes.",
  "Pagar solo el mínimo de la tarjeta es la forma más cara de comprar tiempo.",
  "Tu patrimonio neto importa más que tu salario — es lo que de verdad mide tu progreso.",
  "Negociar tu salario o tarifa una vez puede valer más que años de recortar gastos pequeños.",
  "El dinero que no ves (retenido automáticamente para ahorro) es el que de verdad se acumula.",
  "Antes de un préstamo nuevo, pregúntate: ¿esto genera valor o solo genera cuota?",
  "Llevar un registro de gastos cambia cómo gastas, incluso antes de analizar los números.",
  "El seguro no es un gasto perdido — es el precio de transferirle el riesgo grande a alguien más.",
  "Ahorrar sin un propósito claro se siente como sacrificio. Ahorrar para algo específico se siente como progreso.",
  "Cuidado con el estilo de vida que sube al mismo ritmo que tus ingresos — así nunca alcanzas para adelante.",
  "La educación financiera no es un lujo, es la herramienta más barata que existe para evitar errores caros.",
];

export function obtenerConsejoDelDia(fecha = new Date()) {
  const dayOfYear = Math.floor((fecha - new Date(fecha.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const indice = dayOfYear % CONSEJOS.length;
  return CONSEJOS[indice];
}
