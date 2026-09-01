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
