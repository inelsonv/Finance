// Calcula la racha de quincenas consecutivas "cumplidas" a partir del
// Checklist de pagos: una quincena cuenta como cumplida si tiene al menos un
// ítem registrado y TODOS están marcados como pagados.

export function periodoActual(hoy = new Date()) {
  const year = hoy.getFullYear();
  const month = hoy.getMonth() + 1;
  const quincena = hoy.getDate() > 15 ? "Q2" : "Q1";
  return { year, month, quincena };
}

export function periodoAnterior({ year, month, quincena }) {
  if (quincena === "Q2") return { year, month, quincena: "Q1" };
  let m = month - 1;
  let y = year;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return { year: y, month: m, quincena: "Q2" };
}

export function periodoKey(p) {
  return `${p.year}-${p.month}-${p.quincena}`;
}

export function quincenaCumplida(checklist) {
  const items = checklist?.items;
  if (!items) return false;
  const keys = Object.keys(items);
  if (keys.length === 0) return false;
  return keys.every((k) => items[k]?.pagado === true);
}

// Cuenta cuántas quincenas consecutivas (empezando justo antes de la actual,
// hacia atrás) están cumplidas. La quincena actual no cuenta para la racha
// mientras esté en curso — solo se suma una vez que ya pasó y se cumplió.
export function calcularRacha(checklistPorPeriodo, hoy = new Date()) {
  let cursor = periodoAnterior(periodoActual(hoy));
  let racha = 0;
  for (let i = 0; i < 52; i++) {
    const key = periodoKey(cursor);
    if (quincenaCumplida(checklistPorPeriodo?.[key])) {
      racha++;
      cursor = periodoAnterior(cursor);
    } else {
      break;
    }
  }
  return racha;
}

// Genera la lista visual de las últimas `cantidad` quincenas (de más vieja a
// más nueva), incluyendo la actual (marcada como "en curso").
export function historialRachaVisual(checklistPorPeriodo, hoy = new Date(), cantidad = 8) {
  const actual = periodoActual(hoy);
  const lista = [];
  let cursor = actual;
  for (let i = 0; i < cantidad; i++) {
    const key = periodoKey(cursor);
    const esActual = i === 0;
    lista.unshift({
      key,
      periodo: cursor,
      esActual,
      cumplida: esActual ? null : quincenaCumplida(checklistPorPeriodo?.[key]),
    });
    cursor = periodoAnterior(cursor);
  }
  return lista;
}
