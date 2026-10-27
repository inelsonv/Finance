// Detecta si el ciclo de facturación más reciente de una tarjeta (según su
// día de corte) ya superó el plazo de gracia sin haberse pagado, y en ese
// caso devuelve la clave de ese ciclo para poder aplicar interés/mora.

export function cicloVencidoParaTarjeta(tarjeta, hoy = new Date()) {
  if (!tarjeta.fechaCorte || !tarjeta.tasaTAE) return null;
  const diasGracia = tarjeta.diasGracia || 22;

  let year = hoy.getFullYear();
  let month = hoy.getMonth() + 1;

  // Revisa el corte de este mes y el del mes anterior — el primero cuyo
  // plazo de gracia ya venció es el ciclo a evaluar.
  for (let i = 0; i < 2; i++) {
    const diasEnMes = new Date(year, month, 0).getDate();
    const diaCorte = Math.min(tarjeta.fechaCorte, diasEnMes);
    const fechaCorte = new Date(year, month - 1, diaCorte);
    const fechaLimite = new Date(fechaCorte);
    fechaLimite.setDate(fechaLimite.getDate() + diasGracia);

    if (fechaLimite < hoy) {
      return { cicloKey: `${year}-${month}`, fechaCorte, fechaLimite };
    }

    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Calcula cuándo toca pagar un consumo hecho en una fecha específica, según
// el día de corte y los días de gracia de la tarjeta. Si el consumo cae
// antes (o el mismo día) del corte de ese mes, pertenece al ciclo que cierra
// ESE mes; si cae después, pertenece al ciclo que cierra el mes siguiente.
// fechaConsumo puede ser un string "YYYY-MM-DD" o un objeto Date.
export function calcularFechaPagoTarjeta(tarjeta, fechaConsumo) {
  if (!tarjeta.fechaCorte) return null;
  const diasGracia = tarjeta.diasGracia || 22;

  const consumo = typeof fechaConsumo === "string" ? new Date(fechaConsumo + "T00:00:00") : fechaConsumo;
  let year = consumo.getFullYear();
  let month = consumo.getMonth() + 1;

  const diasEnMesConsumo = new Date(year, month, 0).getDate();
  const diaCorteEsteMes = Math.min(tarjeta.fechaCorte, diasEnMesConsumo);
  const corteEsteMes = new Date(year, month - 1, diaCorteEsteMes);

  let cicloCierre;
  if (consumo <= corteEsteMes) {
    cicloCierre = corteEsteMes;
  } else {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const diasEnMesSiguiente = new Date(nextYear, nextMonth, 0).getDate();
    const diaCorteSiguiente = Math.min(tarjeta.fechaCorte, diasEnMesSiguiente);
    cicloCierre = new Date(nextYear, nextMonth - 1, diaCorteSiguiente);
  }

  const fechaPago = new Date(cicloCierre);
  fechaPago.setDate(fechaPago.getDate() + diasGracia);

  return { fechaCierreStr: toDateStr(cicloCierre), fechaPagoStr: toDateStr(fechaPago) };
}

// Si la tarjeta tiene una lista de categorías habilitadas configurada
// (categoriasHabilitadas es un array), solo esas categorías pueden usarse
// para pagar con ella. Si el campo es null/no está configurado, no hay
// restricción — cualquier categoría es válida (comportamiento por defecto,
// para no afectar tarjetas creadas antes de esta función).
export function categoriaPermitidaEnTarjeta(tarjeta, categoria) {
  if (!Array.isArray(tarjeta?.categoriasHabilitadas)) return true;
  return tarjeta.categoriasHabilitadas.includes(categoria);
}

