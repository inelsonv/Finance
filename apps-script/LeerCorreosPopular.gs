/**
 * Lee correos de notificaciones@popularenlinea.com, extrae los datos de la
 * transacción, y los manda a la Cloud Function para registrar el gasto
 * automáticamente en Smart Finance.
 *
 * Alcance (decidido 2026-09-04): solo se registran transacciones de la
 * tarjeta terminada en 6011, tipo "Notificación de Consumo", estatus
 * Aprobada. Todo lo demás (otras tarjetas, declinadas/rechazadas,
 * transferencias, nómina, reversos, retiros Código Cash, depósitos, etc.)
 * se ignora y el hilo se marca como procesado para no reintentarlo.
 *
 * Límite por corrida (agregado 2026-09-04): Apps Script cancela cualquier
 * ejecución que pase de 6 minutos. Para no arriesgarnos a eso (sobre todo
 * si hay un backlog grande de correos sin procesar), cada corrida solo
 * revisa hasta MAX_HILOS_POR_CORRIDA hilos — el resto se procesa en la
 * siguiente corrida del disparador (cada 15 minutos), hasta ponerse al día.
 */

const WEBHOOK_URL = "https://us-central1-finance-6e127.cloudfunctions.net/registrarGastoDesdeCorreo";
const WEBHOOK_SECRET = "1e05c50fd42326089d78f910b3ea574420a67c5484a1ce5c79e4d906593c4186";
const LABEL_PROCESADO = "SmartFinance-Procesado";
const MAX_HILOS_POR_CORRIDA = 25;

function procesarCorreosPopular() {
  asegurarEtiqueta_();
  const label = GmailApp.getUserLabelByName(LABEL_PROCESADO);
  const hilos = GmailApp.search(
    'from:notificaciones@popularenlinea.com -label:"' + LABEL_PROCESADO + '"',
    0,
    MAX_HILOS_POR_CORRIDA
  );

  Logger.log(`Procesando ${hilos.length} hilo(s) esta corrida (tope: ${MAX_HILOS_POR_CORRIDA}).`);

  hilos.forEach((hilo) => {
    const mensajes = hilo.getMessages();
    let huboError = false;

    mensajes.forEach((msg) => {
      const texto = msg.getPlainBody();
      const asunto = msg.getSubject();
      const datos = interpretarCorreo_(texto, asunto);

      if (datos && datos.ignorar) {
        // Fuera de alcance (no es 6011 / no es consumo / no está aprobada):
        // no es error, se ignora y el hilo se etiqueta como procesado igual.
        return;
      }

      if (!datos) {
        Logger.log("No se pudo interpretar un correo de consumo 6011, se deja sin marcar: " + asunto);
        Logger.log("---- Texto completo de ese correo (para depurar) ----\n" + texto);
        huboError = true;
        return;
      }

      try {
        const respuesta = UrlFetchApp.fetch(WEBHOOK_URL, {
          method: "post",
          contentType: "application/json",
          headers: { "x-webhook-secret": WEBHOOK_SECRET },
          payload: JSON.stringify(datos),
          muteHttpExceptions: true,
        });
        const codigo = respuesta.getResponseCode();
        if (codigo !== 200) {
          Logger.log("Error del servidor (" + codigo + "): " + respuesta.getContentText());
          huboError = true;
        }
      } catch (err) {
        Logger.log("Error de red al llamar al webhook: " + err);
        huboError = true;
      }
    });

    if (!huboError) {
      hilo.addLabel(label);
    }
  });
}

function interpretarCorreo_(texto, asunto) {
  // Fuera de alcance: solo nos interesan correos de "Notificación de Consumo"
  if (!/consumo/i.test(asunto || "")) {
    return { ignorar: true };
  }

  const matchTarjeta = texto.match(/terminada en (\d{4})/i);
  const matchEstatus = texto.match(/\b(Aprobada|Rechazada|Declinada)\b/i);

  // Si ni siquiera se puede identificar tarjeta o estatus, sí es un error real
  // de parseo (formato inesperado en un correo de consumo) y se deja para revisar.
  if (!matchTarjeta || !matchEstatus) return null;

  // Fuera de alcance: no es la tarjeta 6011, o no está aprobada (declinada/rechazada)
  if (matchTarjeta[1] !== "6011") return { ignorar: true };
  if (!/^Aprobada$/i.test(matchEstatus[1])) return { ignorar: true };

  // Acepta US$ o RD$, y montos sin dígitos antes del punto (ej. US$.99)
  const matchMonto = texto.match(/(?:US\$|RD\$)\s*([\d,]*\.\d{2})/);
  const matchFecha = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!matchMonto || !matchFecha) return null;

  // Comercio = todo el texto entre el final de la fecha y el "Aprobada",
  // sin depender de que estén en la misma línea (soporta celdas con link,
  // como "CLARO P REC" + número de referencia con hipervínculo).
  const inicio = matchFecha.index + matchFecha[0].length;
  const fin = matchEstatus.index;
  let comercio = "";
  if (fin > inicio) {
    comercio = texto
      .slice(inicio, fin)
      .replace(/<[^>]*>/g, " ") // quita <https://...> de links
      .replace(/peso dominicano|d[oó]lar estadounidense/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const [, dd, mm, yyyy] = matchFecha;

  return {
    monto: parseFloat(matchMonto[1].replace(/,/g, "")),
    fecha: `${yyyy}-${mm}-${dd}`,
    comercio: comercio,
    ultimos4: matchTarjeta[1],
    estatus: matchEstatus[1],
  };
}

function asegurarEtiqueta_() {
  if (!GmailApp.getUserLabelByName(LABEL_PROCESADO)) {
    GmailApp.createLabel(LABEL_PROCESADO);
  }
}
