/**
 * Lee correos de notificaciones@popularenlinea.com, extrae los datos de la
 * transacción, y los manda a la Cloud Function para registrar el gasto
 * automáticamente en Smart Finance.
 *
 * CONFIGURACIÓN (hacer una sola vez):
 * 1. Ve a https://script.google.com y crea un proyecto nuevo.
 * 2. Pega este código completo, reemplazando el que venga por defecto.
 * 3. Reemplaza WEBHOOK_URL y WEBHOOK_SECRET abajo con los valores reales
 *    (Claude te los da al terminar de configurar la Cloud Function).
 * 4. Ejecuta la función `procesarCorreosPopular` una vez manualmente
 *    (Google te pedirá autorizar el acceso a tu Gmail — es normal, es tu
 *    propio script leyendo tu propio correo).
 * 5. Ve al reloj (⏰ Activadores) a la izquierda → Agregar activador →
 *    elige "procesarCorreosPopular" → tipo de evento "Basado en tiempo" →
 *    "Cada 15 minutos" (o el intervalo que prefieras) → Guardar.
 */

const WEBHOOK_URL = "https://us-central1-finance-6e127.cloudfunctions.net/registrarGastoDesdeCorreo";
const WEBHOOK_SECRET = "PEGA_AQUI_EL_SECRETO"; // Claude te lo da al final
const LABEL_PROCESADO = "SmartFinance-Procesado";

function procesarCorreosPopular() {
  asegurarEtiqueta_();
  const label = GmailApp.getUserLabelByName(LABEL_PROCESADO);
  const hilos = GmailApp.search(
    'from:notificaciones@popularenlinea.com -label:"' + LABEL_PROCESADO + '"'
  );

  hilos.forEach((hilo) => {
    const mensajes = hilo.getMessages();
    let huboError = false;

    mensajes.forEach((msg) => {
      const texto = msg.getPlainBody();
      const datos = interpretarCorreo_(texto);
      if (!datos) {
        Logger.log("No se pudo interpretar un correo, se deja sin marcar: " + msg.getSubject());
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

    // Solo marca el hilo como procesado si TODOS sus mensajes se
    // interpretaron y enviaron sin error — así un fallo temporal no hace
    // que el correo se pierda para siempre.
    if (!huboError) {
      hilo.addLabel(label);
    }
  });
}

function interpretarCorreo_(texto) {
  const matchMonto = texto.match(/RD\$([\d,]+\.\d{2})/);
  const matchFecha = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const matchTarjeta = texto.match(/terminada en (\d{4})/i);
  const matchEstatus = texto.match(/(Aprobada|Rechazada|Declinada)/i);

  if (!matchMonto || !matchFecha || !matchTarjeta) return null;

  // Comercio: el texto entre la fecha y el estatus, en la misma línea de la
  // tabla de la transacción.
  let comercio = "";
  const lineaTransaccion = texto
    .split("\n")
    .find((linea) => linea.includes(matchMonto[0]) && matchFecha[0] && linea.includes(matchFecha[0]));
  if (lineaTransaccion) {
    const partes = lineaTransaccion.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
    // Busca el trozo que no sea el monto, la moneda, la fecha, ni el estatus.
    comercio = partes.find(
      (p) =>
        p !== matchMonto[0] &&
        p !== matchFecha[0] &&
        !/peso dominicano|d[oó]lar/i.test(p) &&
        !/^(Aprobada|Rechazada|Declinada)$/i.test(p)
    ) || "";
  }

  const [, dd, mm, yyyy] = matchFecha;
  const fechaISO = `${yyyy}-${mm}-${dd}`;

  return {
    monto: parseFloat(matchMonto[1].replace(/,/g, "")),
    fecha: fechaISO,
    comercio: comercio,
    ultimos4: matchTarjeta[1],
    estatus: matchEstatus ? matchEstatus[1] : "Aprobada",
  };
}

function asegurarEtiqueta_() {
  if (!GmailApp.getUserLabelByName(LABEL_PROCESADO)) {
    GmailApp.createLabel(LABEL_PROCESADO);
  }
}
