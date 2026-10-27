// Consejos y proverbios financieros de autores reales, citas cortas y bien
// atribuidas (no pasajes largos de libros, para respetar derechos de autor).
// Se muestra uno distinto cada día, rotando de forma determinística según
// la fecha.

const CONSEJOS = [
  { texto: "El precio es lo que pagas. El valor es lo que recibes.", autor: "Warren Buffett" },
  { texto: "No ahorres lo que te queda después de gastar; gasta lo que te queda después de ahorrar.", autor: "Warren Buffett" },
  { texto: "Si no encuentras la manera de ganar dinero mientras duermes, trabajarás hasta que mueras.", autor: "Warren Buffett" },
  { texto: "El riesgo viene de no saber lo que estás haciendo.", autor: "Warren Buffett" },
  { texto: "Cuidado con los gastos pequeños; una pequeña gotera hunde un gran barco.", autor: "Benjamin Franklin" },
  { texto: "Un centavo ahorrado es un centavo ganado.", autor: "Benjamin Franklin" },
  { texto: "Invertir en conocimiento paga siempre el mejor interés.", autor: "Benjamin Franklin" },
  { texto: "Los ricos compran activos. Los pobres solo tienen gastos que creen que son activos.", autor: "Robert Kiyosaki" },
  { texto: "No se trata de cuánto dinero ganas, sino de cuánto conservas.", autor: "Robert Kiyosaki" },
  { texto: "Vive como nadie más quiere vivir hoy, para poder vivir como nadie más puede vivir mañana.", autor: "Dave Ramsey" },
  { texto: "Un presupuesto es decirle a tu dinero a dónde ir, en vez de preguntarte a dónde se fue.", autor: "Dave Ramsey" },
  { texto: "Entender el dinero es la clave de la independencia financiera.", autor: "Suze Orman" },
  { texto: "Nunca gastes tu dinero antes de haberlo ganado.", autor: "Thomas Jefferson" },
  { texto: "No es cuánto dinero ganas, sino cuánto dinero conservas, cómo trabaja para ti, y cuántas generaciones lo conservan.", autor: "Robert Kiyosaki" },
  { texto: "No pongas todos los huevos en la misma canasta.", autor: "Proverbio popular" },
  { texto: "El que guarda, siempre tiene.", autor: "Proverbio popular" },
  { texto: "Quien no arriesga, no gana; pero quien arriesga todo, puede perderlo todo.", autor: "Proverbio popular" },
  { texto: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.", autor: "Proverbio chino" },
  { texto: "Más vale un pájaro en mano que cien volando.", autor: "Proverbio popular" },
  { texto: "El dinero es un buen sirviente, pero un mal amo.", autor: "Francis Bacon" },
  { texto: "No trabajes por dinero; haz que el dinero trabaje para ti.", autor: "Robert Kiyosaki" },
  { texto: "La disciplina es el puente entre metas y logros.", autor: "Jim Rohn" },
  { texto: "No ahorres lo que sobra después de gastar; controla lo que gastas para que sobre.", autor: "John D. Rockefeller" },
  { texto: "Formales el hábito de ahorrar dinero mientras lo tienes; no esperes a tenerlo de sobra.", autor: "T.T. Munger" },
  { texto: "El interés compuesto es la octava maravilla del mundo. Quien lo entiende, lo gana; quien no, lo paga.", autor: "Atribuido a Albert Einstein" },
  { texto: "La riqueza consiste no en tener grandes posesiones, sino en tener pocas necesidades.", autor: "Epicteto" },
  { texto: "No es rico el que tiene más, sino el que necesita menos.", autor: "Proverbio popular" },
  { texto: "Gasta menos de lo que ganas, invierte la diferencia con sabiduría, y evita las deudas.", autor: "William Feather" },
  { texto: "El hombre rico no es el que tiene mucho, sino el que da mucho.", autor: "Erich Fromm" },
  { texto: "Cuenta tu dinero en tu casa, no en la calle.", autor: "Proverbio popular" },
];

export function obtenerConsejoDelDia(fecha = new Date()) {
  const dayOfYear = Math.floor((fecha - new Date(fecha.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const indice = dayOfYear % CONSEJOS.length;
  return CONSEJOS[indice];
}
