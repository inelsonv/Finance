/**
 * Utilidades para notificaciones de pagos de préstamos vía WhatsApp.
 */

/**
 * Normaliza un número telefónico para la API de WhatsApp (wa.me).
 * Elimina caracteres no numéricos y asegura el código de país.
 * Para República Dominicana y Norteamérica (10 dígitos empezando con 809, 829, 849 o estándar),
 * antepone el código de país 1.
 */
export function formatWhatsappPhone(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";
  // 10 dígitos (ej. 8095551234 -> 18095551234)
  if (digits.length === 10) {
    digits = "1" + digits;
  }
  return digits;
}

/**
 * Genera el texto del mensaje formal de comprobante de pago para WhatsApp.
 */
export function generarMensajePagoPrestamo({
  entidadNombre,
  prestamoNumero,
  monto,
  fecha,
  metodoPago,
}) {
  const nombreEntidad = entidadNombre ? `*${entidadNombre}*` : "su entidad";
  const numPrestamo = prestamoNumero ? `*${prestamoNumero}*` : "préstamo";
  const montoTexto = typeof monto === "number"
    ? `*RD$ ${monto.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
    : `*${monto}*`;
  const metodoTexto = metodoPago ? ` mediante *${metodoPago}*` : "";
  const fechaTexto = fecha || new Date().toISOString().slice(0, 10);

  return (
    `Hola ${nombreEntidad},\n\n` +
    `Le notificamos que se ha registrado el pago de la cuota del préstamo ${numPrestamo} ` +
    `por un monto de ${montoTexto}${metodoTexto} en fecha *${fechaTexto}*.\n\n` +
    `Comprobante generado automáticamente desde Smart Finance. ¡Muchas gracias!`
  );
}

/**
 * Abre el enlace de WhatsApp con el mensaje estructurado.
 * Retorna la URL y un estado indicando si se generó con éxito.
 */
export function abrirNotificacionWhatsapp({
  telefono,
  entidadNombre,
  prestamoNumero,
  monto,
  fecha,
  metodoPago,
}) {
  const cleanPhone = formatWhatsappPhone(telefono);
  if (!cleanPhone) {
    return { exito: false, motivo: "sin_telefono", url: null };
  }

  const mensaje = generarMensajePagoPrestamo({
    entidadNombre,
    prestamoNumero,
    monto,
    fecha,
    metodoPago,
  });

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;

  let ventanaAbierta = false;
  try {
    const win = window.open(url, "_blank");
    if (win) {
      ventanaAbierta = true;
    }
  } catch (err) {
    console.warn("No se pudo abrir automáticamente la ventana de WhatsApp:", err);
  }

  return {
    exito: true,
    abierto: ventanaAbierta,
    url,
    telefonoFormateado: cleanPhone,
    mensaje,
  };
}
