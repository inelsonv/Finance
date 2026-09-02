// Soporta hábitos diarios, semanales o mensuales. Cada frecuencia define su
// propio "periodo" (una fecha exacta, el lunes de la semana, o el mes) — el
// hábito se marca una vez por periodo, y la racha cuenta periodos
// consecutivos, no necesariamente días.

function pad(n) {
  return String(n).padStart(2, "0");
}

function inicioDeSemana(d) {
  // Lunes como primer día de la semana.
  const dia = d.getDay(); // 0=domingo, 1=lunes, ...
  const offset = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + offset);
  return lunes;
}

// Devuelve el identificador del periodo al que pertenece una fecha, según
// la frecuencia del hábito.
export function periodoDeFecha(frecuencia, fecha = new Date()) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  if (frecuencia === "Semanal") {
    const lunes = inicioDeSemana(d);
    return `${lunes.getFullYear()}-${pad(lunes.getMonth() + 1)}-${pad(lunes.getDate())}`;
  }
  if (frecuencia === "Mensual") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Devuelve el identificador del periodo INMEDIATAMENTE ANTERIOR al dado.
function periodoAnterior(frecuencia, periodoId) {
  if (frecuencia === "Semanal") {
    const [y, m, d] = periodoId.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);
    fecha.setDate(fecha.getDate() - 7);
    return periodoDeFecha("Semanal", fecha);
  }
  if (frecuencia === "Mensual") {
    const [y, m] = periodoId.split("-").map(Number);
    let year = y, month = m - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return `${year}-${pad(month)}`;
  }
  const [y, m, d] = periodoId.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  fecha.setDate(fecha.getDate() - 1);
  return periodoDeFecha("Diario", fecha);
}

// Calcula la racha de periodos consecutivos cumplidos, contando hacia atrás
// desde el periodo actual. Si el periodo actual aún no se ha marcado, la
// racha se cuenta desde el periodo anterior (no se rompe solo por no
// haberlo marcado aún dentro del periodo en curso).
export function calcularRachaHabito(periodosCompletados, frecuencia = "Diario", hoy = new Date()) {
  const set = new Set(periodosCompletados);
  let cursor = periodoDeFecha(frecuencia, hoy);
  if (!set.has(cursor)) {
    cursor = periodoAnterior(frecuencia, cursor);
  }
  let racha = 0;
  while (set.has(cursor)) {
    racha++;
    cursor = periodoAnterior(frecuencia, cursor);
  }
  return racha;
}

// Genera los últimos `cantidad` periodos (de más viejo a más nuevo,
// incluyendo el actual) con su ID y si estuvo completado, para pintar una
// mini tira de historial visual.
export function historialHabitoVisual(periodosCompletados, frecuencia = "Diario", hoy = new Date(), cantidad = 7) {
  const set = new Set(periodosCompletados);
  const actual = periodoDeFecha(frecuencia, hoy);
  const lista = [];
  let cursor = actual;
  for (let i = 0; i < cantidad; i++) {
    lista.unshift({ periodo: cursor, completado: set.has(cursor), esActual: cursor === actual });
    cursor = periodoAnterior(frecuencia, cursor);
  }
  return lista;
}
