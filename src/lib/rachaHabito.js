// Calcula la racha de días consecutivos que un hábito lleva cumplido,
// contando hacia atrás desde hoy. Si hoy todavía no se ha marcado, la racha
// se cuenta desde ayer (no se rompe solo por no haberlo marcado aún hoy).
export function calcularRachaHabito(fechasCompletadas, hoy = new Date()) {
  const set = new Set(fechasCompletadas);
  const pad = (n) => String(n).padStart(2, "0");
  const fechaStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const cursor = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (!set.has(fechaStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let racha = 0;
  while (set.has(fechaStr(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

// Genera los últimos `cantidad` días (de más viejo a más nuevo, incluyendo
// hoy) con su fecha "YYYY-MM-DD" y si estuvo completado, para pintar una
// mini tira de historial visual.
export function historialHabitoVisual(fechasCompletadas, hoy = new Date(), cantidad = 7) {
  const set = new Set(fechasCompletadas);
  const pad = (n) => String(n).padStart(2, "0");
  const fechaStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const lista = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    d.setDate(d.getDate() - i);
    const fecha = fechaStr(d);
    lista.push({ fecha, completado: set.has(fecha), esHoy: i === 0 });
  }
  return lista;
}
