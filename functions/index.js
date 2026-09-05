const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const ALLOWED_EMAIL = "iventuramena@gmail.com";
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
const emailWebhookSecret = defineSecret("EMAIL_WEBHOOK_SECRET");

const UMBRAL_DIAS = 7;

function todayInfo() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function ymPrefix(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function diasHasta(diaPago, today) {
  const { year, month, day } = today;
  const daysInThisMonth = new Date(year, month, 0).getDate();
  const targetDay = Math.min(diaPago, daysInThisMonth);
  let diff = targetDay - day;
  if (diff < 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const nextTargetDay = Math.min(diaPago, daysInNextMonth);
    const msPerDay = 24 * 60 * 60 * 1000;
    diff = Math.round(
      (new Date(nextYear, nextMonth - 1, nextTargetDay) - new Date(year, month - 1, day)) / msPerDay
    );
  }
  return diff;
}

function yaPagadoEsteMes(movimientos, category, idField, id, today) {
  const prefix = ymPrefix(today.year, today.month);
  return movimientos.some((m) => m.category === category && m[idField] === id && (m.date || "").startsWith(prefix));
}

function diasRestantesProducto(p, today) {
  if (!p.seguimiento || !p.fechaInicio || !p.consumoDiario) return null;
  const inicio = new Date(p.fechaInicio + "T00:00:00");
  const hoy = new Date(today.year, today.month - 1, today.day);
  const diasTranscurridos = Math.floor((hoy - inicio) / 86400000);
  const unidadesConsumidas = diasTranscurridos * p.consumoDiario;
  const unidadesRestantes = (p.unidadesDisponibles || 0) - unidadesConsumidas;
  return Math.floor(unidadesRestantes / p.consumoDiario);
}

async function getAll(collectionName) {
  const snap = await db.collection(collectionName).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function construirNotificaciones({ prestamos, tarjetas, membresias, contratos, productos, movimientos, today }) {
  const list = [];

  for (const p of prestamos) {
    if (p.estado !== "Activo" || !p.fechaInicio) continue;
    const diaPago = parseInt(p.fechaInicio.split("-")[2], 10);
    if (!diaPago) continue;
    if (yaPagadoEsteMes(movimientos, "Pago de préstamo", "prestamoId", p.id, today)) continue;
    const dias = diasHasta(diaPago, today);
    if (dias <= UMBRAL_DIAS) {
      list.push({ titulo: `Cuota de préstamo ${p.numero}`, subtitulo: p.entidadName || "Sin entidad", dias });
    }
  }

  for (const t of tarjetas) {
    if (t.estado !== "Activa" || !t.fechaPago) continue;
    if (yaPagadoEsteMes(movimientos, "Pago de tarjeta", "tarjetaId", t.id, today)) continue;
    const dias = diasHasta(t.fechaPago, today);
    if (dias <= UMBRAL_DIAS) {
      list.push({ titulo: `Pago de tarjeta ${t.nombre}`, subtitulo: t.entidadName || "Sin entidad", dias });
    }
  }

  for (const m of membresias) {
    if (m.estado !== "Activa" || !m.diaPago) continue;
    if (yaPagadoEsteMes(movimientos, "Pago de membresía", "membresiaId", m.id, today)) continue;
    const dias = diasHasta(m.diaPago, today);
    if (dias <= UMBRAL_DIAS) {
      list.push({ titulo: `Renovación de ${m.nombre}`, subtitulo: m.tipo || "Membresía", dias });
    }
  }

  for (const c of contratos) {
    if (c.estado !== "Activo" || !c.diaPago) continue;
    if (yaPagadoEsteMes(movimientos, "Pago de servicio", "contratoId", c.id, today)) continue;
    const dias = diasHasta(c.diaPago, today);
    if (dias <= UMBRAL_DIAS) {
      list.push({ titulo: `Pago de ${c.nombre}`, subtitulo: c.tipo || "Contrato", dias });
    }
  }

  for (const p of productos) {
    const dias = diasRestantesProducto(p, today);
    if (dias == null) continue;
    if (dias <= (p.diasAviso ?? 5)) {
      list.push({
        titulo: dias <= 0 ? `Se acabó: ${p.name}` : `Se acaba pronto: ${p.name}`,
        subtitulo: p.entidadName || p.category || "Producto",
        dias,
      });
    }
  }

  return list.sort((a, b) => a.dias - b.dias);
}

function etiquetaDias(dias) {
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function construirHtml(notificaciones) {
  const filas = notificaciones
    .map(
      (n) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;">
          <div style="font-weight:600;color:#26241f;font-size:14px;">${n.titulo}</div>
          <div style="color:#6f6a5e;font-size:12px;">${n.subtitulo}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;text-align:right;">
          <span style="background:${n.dias <= 1 ? "#fbefe9" : "#fbf1de"};color:${n.dias <= 1 ? "#a23e2e" : "#b8892b"};padding:3px 10px;border-radius:14px;font-size:12px;font-weight:600;">
            ${etiquetaDias(n.dias)}
          </span>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#26241f;">Tus alertas de Smart Finance</h2>
      <p style="color:#6f6a5e;font-size:13px;">Esto es lo que tienes por vencer en los próximos ${UMBRAL_DIAS} días:</p>
      <table style="width:100%;border-collapse:collapse;background:#fffefc;border:1px solid #e5ded0;border-radius:8px;">
        ${filas}
      </table>
      <p style="color:#a39b86;font-size:11px;margin-top:16px;">
        Abre tu app para más detalles: https://inelsonv.github.io/Finance/
      </p>
    </div>`;
}

function formatMoneyMail(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Un cobro cerca de fin de mes es para pagar la primera quincena del mes
// SIGUIENTE; un cobro a mitad de mes es para pagar la segunda quincena de ESE
// MISMO mes (misma regla que usa la app en el frontend).
function periodoObjetivoParaCobro(diaOcurrencia, today) {
  if (diaOcurrencia <= 15) {
    return { year: today.year, month: today.month, quincena: "Q2" };
  }
  let month = today.month + 1;
  let year = today.year;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return { year, month, quincena: "Q1" };
}

function celdaPrestamoQuincena(prestamo, year, month) {
  if (!prestamo.fechaInicio || !prestamo.cuota || !prestamo.plazo) return null;
  const [sy, sm, sd] = prestamo.fechaInicio.split("-").map(Number);
  if (!sy || !sm) return null;
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return null;
  const offset = (year - sy) * 12 + (month - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  if (!activo) return null;
  return sd && sd > 15 ? "Q2" : "Q1";
}

async function construirItemsChecklist(periodo) {
  const [categoriasGasto, presupuestoSnap, prestamos] = await Promise.all([
    getAll("categoriasGasto"),
    db.collection("presupuestos").doc(String(periodo.year)).get(),
    getAll("prestamos"),
  ]);
  const presupuesto = presupuestoSnap.exists ? presupuestoSnap.data() : {};

  const items = [];

  for (const c of categoriasGasto) {
    const val = presupuesto?.[c.nombre]?.[String(periodo.month)]?.[periodo.quincena];
    if (typeof val === "number" && val > 0) {
      items.push({ nombre: c.nombre, monto: val });
    }
  }

  for (const p of prestamos) {
    if (p.estado !== "Activo") continue;
    if (p.frecuenciaCuota === "Personalizado") {
      for (const cuota of p.cuotasPersonalizadas || []) {
        if (!cuota.fecha || !cuota.monto) continue;
        const [cy, cm, cd] = cuota.fecha.split("-").map(Number);
        if (cy !== periodo.year || cm !== periodo.month) continue;
        const q = cd && cd > 15 ? "Q2" : "Q1";
        if (q !== periodo.quincena) continue;
        items.push({ nombre: `Préstamo ${p.numero} (${cuota.fecha.split("-").reverse().slice(0, 2).join("/")})`, monto: cuota.monto });
      }
      continue;
    }
    const q = celdaPrestamoQuincena(p, periodo.year, periodo.month);
    if (q === periodo.quincena) {
      items.push({ nombre: `Préstamo ${p.numero}`, monto: p.cuota });
    }
  }

  return items.sort((a, b) => b.monto - a.monto);
}

function construirHtmlChecklist(fuenteNombre, periodo, items, total) {
  const nombreMes = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ][periodo.month - 1];
  const link = `https://inelsonv.github.io/Finance/?tab=checklist-pagos&year=${periodo.year}&month=${periodo.month}&quincena=${periodo.quincena}`;

  const filas = items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;color:#26241f;font-size:14px;">${it.nombre}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;text-align:right;font-weight:600;color:#26241f;font-size:14px;">${formatMoneyMail(it.monto)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#26241f;">💰 Hoy es tu día de cobro (${fuenteNombre})</h2>
      <p style="color:#6f6a5e;font-size:13px;">
        Esto es lo que tienes presupuestado para la ${periodo.quincena === "Q1" ? "primera" : "segunda"} quincena de ${nombreMes}:
      </p>
      ${
        items.length === 0
          ? `<p style="color:#6f6a5e;font-size:13px;">Todavía no tienes nada presupuestado para esa quincena.</p>`
          : `<table style="width:100%;border-collapse:collapse;background:#fffefc;border:1px solid #e5ded0;border-radius:8px;">
              ${filas}
              <tr>
                <td style="padding:12px;font-weight:700;color:#26241f;">Total</td>
                <td style="padding:12px;text-align:right;font-weight:700;color:#26241f;">${formatMoneyMail(total)}</td>
              </tr>
            </table>`
      }
      <p style="margin-top:20px;">
        <a href="${link}" style="background:#5b7a5b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
          Abrir checklist de esta quincena
        </a>
      </p>
    </div>`;
}

// Mes anterior al indicado en "today" (para el resumen que se envía el día 1
// de cada mes, resumiendo el mes que acaba de terminar).
function mesAnterior(today) {
  let month = today.month - 1;
  let year = today.year;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return { year, month };
}

function rangoFechasMes(year, month) {
  const pad = (n) => String(n).padStart(2, "0");
  const diasEnMes = new Date(year, month, 0).getDate();
  return { desde: `${year}-${pad(month)}-01`, hasta: `${year}-${pad(month)}-${pad(diasEnMes)}` };
}

async function construirResumenMensual(year, month) {
  const [categoriasGasto, presupuestoSnap, prestamos, movimientos, puntosHistorial] = await Promise.all([
    getAll("categoriasGasto"),
    db.collection("presupuestos").doc(String(year)).get(),
    getAll("prestamos"),
    getAll("movimientos"),
    getAll("puntosHistorial"),
  ]);
  const presupuesto = presupuestoSnap.exists ? presupuestoSnap.data() : {};
  const { desde, hasta } = rangoFechasMes(year, month);

  let presupuestado = 0;
  for (const c of categoriasGasto) {
    for (const q of ["Q1", "Q2"]) {
      const val = presupuesto?.[c.nombre]?.[String(month)]?.[q];
      if (typeof val === "number") presupuestado += val;
    }
  }
  for (const p of prestamos) {
    if (p.estado !== "Activo") continue;
    if (p.frecuenciaCuota === "Personalizado") {
      for (const cuota of p.cuotasPersonalizadas || []) {
        if (!cuota.fecha || !cuota.monto) continue;
        if (cuota.fecha >= desde && cuota.fecha <= hasta) presupuestado += Number(cuota.monto) || 0;
      }
      continue;
    }
    const q = celdaPrestamoQuincena(p, year, month);
    if (q) presupuestado += Number(p.cuota) || 0;
  }

  let gastado = 0;
  for (const m of movimientos) {
    if (m.type !== "Gasto") continue;
    if (!m.date || m.date < desde || m.date > hasta) continue;
    gastado += Number(m.amount) || 0;
  }

  let puntosGanadosMes = 0;
  for (const ph of puntosHistorial) {
    if (!ph.fecha || ph.fecha < desde || ph.fecha > hasta) continue;
    if (ph.puntos > 0) puntosGanadosMes += ph.puntos;
  }

  const puntosSnap = await db.collection("config").doc("puntos").get();
  const puntosTotal = puntosSnap.exists ? puntosSnap.data().total || 0 : 0;

  return { presupuestado, gastado, puntosGanadosMes, puntosTotal };
}

function construirHtmlResumenMensual(year, month, resumen) {
  const nombreMes = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ][month - 1];
  const { presupuestado, gastado, puntosGanadosMes, puntosTotal } = resumen;
  const exitoso = presupuestado > 0 && gastado <= presupuestado;
  const diferencia = presupuestado - gastado;
  const link = `https://inelsonv.github.io/Finance/?tab=presupuesto-mensual`;

  const mensajeEstado =
    presupuestado <= 0
      ? { titulo: "Sin presupuesto configurado", color: "#6f6a5e", detalle: "No tenías montos presupuestados este mes, así que no se puede evaluar." }
      : exitoso
      ? { titulo: "✅ ¡Mes exitoso!", color: "#5b7a5b", detalle: `Te mantuviste dentro de tu presupuesto, con ${formatMoneyMail(diferencia)} de margen.` }
      : { titulo: "⚠️ Te excediste este mes", color: "#a23e2e", detalle: `Gastaste ${formatMoneyMail(Math.abs(diferencia))} más de lo presupuestado.` };

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#26241f;">📊 Resumen de ${nombreMes} ${year}</h2>

      <div style="background:${mensajeEstado.color}1a;border:1px solid ${mensajeEstado.color};border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;color:${mensajeEstado.color};font-size:15px;margin-bottom:4px;">${mensajeEstado.titulo}</div>
        <div style="color:#6f6a5e;font-size:13px;">${mensajeEstado.detalle}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;background:#fffefc;border:1px solid #e5ded0;border-radius:8px;margin-bottom:16px;">
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;color:#6f6a5e;font-size:13px;">Presupuestado</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;text-align:right;font-weight:600;color:#26241f;font-size:14px;">${formatMoneyMail(presupuestado)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;color:#6f6a5e;font-size:13px;">Gastado</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5ded0;text-align:right;font-weight:600;color:#26241f;font-size:14px;">${formatMoneyMail(gastado)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6f6a5e;font-size:13px;">🏆 Puntos ganados este mes</td>
          <td style="padding:10px 12px;text-align:right;font-weight:600;color:#b8892b;font-size:14px;">+${Math.round(puntosGanadosMes)}</td>
        </tr>
      </table>

      <p style="color:#6f6a5e;font-size:13px;">
        Tienes <strong style="color:#b8892b;">$${Math.round(puntosTotal)}</strong> puntos disponibles en total para canjear.
      </p>

      <p style="margin-top:16px;">
        <a href="${link}" style="background:#5b7a5b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
          Ver Presupuesto mensual
        </a>
      </p>
    </div>`;
}

exports.avisoDiarioAlertas = onSchedule(
  { schedule: "every day 08:00", timeZone: "America/Santo_Domingo" },
  async () => {
    const today = todayInfo();

    // El correo destino es el mismo que configuras en la app, en
    // Configuración → Notificaciones por correo. Ahí puedes cambiarlo cuando
    // quieras (ej. a tu Gmail personal), sin necesidad de tocar código.
    const configSnap = await db.collection("config").doc("notificaciones").get();
    const email = configSnap.exists ? configSnap.data().email : null;
    if (!email) {
      console.log("Sin correo configurado en config/notificaciones, no se envía nada.");
      return;
    }

    // El día 1 de cada mes, envía el resumen financiero del mes que acaba de
    // terminar (comportamiento del presupuesto y puntos ganados).
    if (today.day === 1) {
      const { year: yearAnterior, month: monthAnterior } = mesAnterior(today);
      const resumen = await construirResumenMensual(yearAnterior, monthAnterior);
      const nombreMesAnterior = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ][monthAnterior - 1];

      await db.collection("mail").add({
        to: [email],
        message: {
          subject: `Smart Finance: resumen de ${nombreMesAnterior}`,
          html: construirHtmlResumenMensual(yearAnterior, monthAnterior, resumen),
        },
      });
      console.log(`Correo de resumen mensual encolado para ${email} (${nombreMesAnterior} ${yearAnterior}).`);
    }

    const [prestamos, tarjetas, membresias, contratos, productos, movimientos, fuentesIngreso] = await Promise.all([
      getAll("prestamos"),
      getAll("tarjetas"),
      getAll("membresias"),
      getAll("contratos"),
      getAll("productos"),
      getAll("movimientos"),
      getAll("fuentesIngreso"),
    ]);

    const notificaciones = construirNotificaciones({ prestamos, tarjetas, membresias, contratos, productos, movimientos, today });

    if (notificaciones.length > 0) {
      await db.collection("mail").add({
        to: [email],
        message: {
          subject: `Smart Finance: ${notificaciones.length} alerta${notificaciones.length !== 1 ? "s" : ""} pendiente${notificaciones.length !== 1 ? "s" : ""}`,
          html: construirHtml(notificaciones),
        },
      });
      console.log(`Correo de alertas encolado para ${email} con ${notificaciones.length} notificaciones.`);
    } else {
      console.log("No hay alertas pendientes hoy.");
    }

    // Revisa si hoy es exactamente el día de cobro de alguna fuente de ingreso
    // activa, y si es así, envía el checklist de la quincena correspondiente.
    for (const f of fuentesIngreso) {
      if (f.estado !== "Activo" || !f.diaPago) continue;
      const diasDelMes = (f.diaPago.match(/\d+/g) || []).map(Number).filter((d) => d >= 1 && d <= 31);
      const esHoyDiaDeCobro = diasDelMes.includes(today.day);
      if (!esHoyDiaDeCobro) continue;

      const periodo = periodoObjetivoParaCobro(today.day, today);
      const items = await construirItemsChecklist(periodo);
      const total = items.reduce((s, it) => s + it.monto, 0);

      await db.collection("mail").add({
        to: [email],
        message: {
          subject: `Smart Finance: hoy es tu día de cobro (${f.nombre})`,
          html: construirHtmlChecklist(f.nombre, periodo, items, total),
        },
      });
      console.log(`Correo de día de cobro encolado para ${email} (${f.nombre}), quincena ${periodo.quincena} de ${periodo.month}/${periodo.year}.`);
    }
  }
);

// Lee una foto de factura/recibo con IA y devuelve los productos y precios
// encontrados en formato estructurado, para que el usuario los revise antes
// de guardarlos en Catálogo y Movimientos.
exports.escanearFactura = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  if (!request.auth || request.auth.token.email !== ALLOWED_EMAIL) {
    throw new HttpsError("permission-denied", "No autorizado");
  }

  const { imageBase64, mediaType } = request.data || {};
  if (!imageBase64 || !mediaType) {
    throw new HttpsError("invalid-argument", "Falta la imagen de la factura");
  }

  const prompt =
    'Lee esta factura o recibo de compra y responde ÚNICAMENTE con un JSON válido (sin texto adicional, ' +
    "sin bloques de código markdown) con exactamente esta forma: " +
    '{"tienda": string o null, "fecha": "YYYY-MM-DD" o null, "items": ' +
    '[{"nombre": string, "precio": number, "cantidad": number}], "total": number o null}. ' +
    "Los precios y el total deben ser números (sin símbolo de moneda). Si no puedes leer algo, usa null. " +
    "Ignora líneas que no sean productos (impuestos, descuentos, subtotales) — esas ya están incluidas en el total.";

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicApiKey.value(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    throw new HttpsError("internal", "No se pudo contactar el servicio de IA: " + err.message);
  }

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new HttpsError("internal", data?.error?.message || `Error de la API de Anthropic (HTTP ${resp.status})`);
  }

  const textBlock = (data.content || []).find((c) => c.type === "text");
  const rawText = textBlock?.text || "";

  let parsed;
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new HttpsError("internal", "No se pudo interpretar la respuesta de la IA. Intenta con una foto más clara.");
  }

  if (!Array.isArray(parsed.items)) parsed.items = [];
  return parsed;
});

// Extrae nombre, precio e imagen de un producto a partir de la URL de su
// página en una tienda en línea. Se hace en el servidor (no en el
// navegador) porque casi ningún sitio permite que otra página lea su
// contenido directamente (CORS). Primero intenta leer metadatos estándar
// (Open Graph, JSON-LD) — rápido y gratis. Si no encuentra nada útil, usa
// la IA como respaldo para interpretar el HTML crudo.
function extraerConMetadatos(html) {
  const resultado = { nombre: null, precio: null, imagenUrl: null };

  // Open Graph / Twitter Card
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const ogPrice = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) resultado.nombre = ogTitle[1];
  if (ogImage) resultado.imagenUrl = ogImage[1];
  else if (twitterImage) resultado.imagenUrl = twitterImage[1];
  if (ogPrice) resultado.precio = parseFloat(ogPrice[1]);

  // itemprop="price" / data-price, otro patrón común en tiendas
  if (!resultado.precio) {
    const itempropPrice = html.match(/itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i) || html.match(/data-price=["']([\d.,]+)["']/i);
    if (itempropPrice) resultado.precio = parseFloat(itempropPrice[1].replace(/,/g, ""));
  }

  // JSON-LD (schema.org Product) — suele ser la fuente más confiable
  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      let data = JSON.parse(m[1]);
      if (Array.isArray(data)) data = data.find((d) => d["@type"] === "Product") || data[0];
      if (data && data["@graph"]) data = data["@graph"].find((d) => d["@type"] === "Product") || data;
      if (data && (data["@type"] === "Product" || data.name)) {
        if (!resultado.nombre && data.name) resultado.nombre = data.name;
        if (!resultado.imagenUrl && data.image) resultado.imagenUrl = Array.isArray(data.image) ? data.image[0] : data.image;
        const oferta = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (!resultado.precio && oferta?.price) resultado.precio = parseFloat(oferta.price);
      }
    } catch (err) {
      // JSON-LD mal formado, se ignora y se sigue con el siguiente bloque
    }
  }

  return resultado;
}

// Junta las URLs de imagen candidatas de la página (todas las etiquetas
// <img>), descartando las que claramente son íconos/logos por su nombre de
// archivo, para dárselas a la IA como opciones entre las que elegir la foto
// principal del producto.
function candidatosDeImagen(html, baseUrl) {
  const candidatos = [];
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    let src = m[1];
    if (!src || src.startsWith("data:")) continue;
    if (/logo|icon|sprite|favicon|placeholder/i.test(src)) continue;
    try {
      src = new URL(src, baseUrl).href;
    } catch (err) {
      continue;
    }
    if (!candidatos.includes(src)) candidatos.push(src);
    if (candidatos.length >= 15) break;
  }
  return candidatos;
}

exports.extraerProductoDeUrl = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  if (!request.auth || request.auth.token.email !== ALLOWED_EMAIL) {
    throw new HttpsError("permission-denied", "No autorizado");
  }
  const { url } = request.data || {};
  if (!url) throw new HttpsError("invalid-argument", "Falta la URL del producto");

  let html;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SmartFinanceBot/1.0)" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    html = await resp.text();
  } catch (err) {
    throw new HttpsError("internal", "No se pudo abrir esa página: " + err.message);
  }

  let resultado = extraerConMetadatos(html);

  // Si los metadatos estándar no dieron nombre, precio, o imagen, se intenta
  // con IA como respaldo — mandándole el texto visible de la página y, si
  // sigue faltando la imagen, una lista de fotos candidatas para que elija
  // cuál es la principal del producto.
  if (!resultado.nombre || !resultado.precio || !resultado.imagenUrl) {
    const textoPlano = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const candidatosImagen = resultado.imagenUrl ? [] : candidatosDeImagen(html, url);
    const bloqueImagenes =
      candidatosImagen.length > 0
        ? `\n\nEstas son las URLs de imágenes encontradas en la página — si alguna es claramente la foto principal del producto, inclúyela como "imagenUrl" (copiada exacta, tal cual aparece aquí). Si ninguna parece ser del producto, pon null:\n${candidatosImagen.join("\n")}`
        : "";

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicApiKey.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `Este es el texto visible de la página de un producto de una tienda en línea. Extrae el nombre del producto y su precio en pesos dominicanos (solo el número, sin símbolo). Responde SOLO con JSON, sin explicación ni markdown: {"nombre": "...", "precio": 123.45, "imagenUrl": "..."}. Si no encuentras alguno de los campos, pon null en ese campo.\n\nTexto de la página:\n${textoPlano}${bloqueImagenes}`,
            },
          ],
        }),
      });
      const data = await resp.json();
      const textBlock = (data.content || []).find((c) => c.type === "text");
      const clean = (textBlock?.text || "").replace(/```json|```/g, "").trim();
      const parsedIA = JSON.parse(clean);
      resultado = {
        nombre: resultado.nombre || parsedIA.nombre || null,
        precio: resultado.precio || parsedIA.precio || null,
        imagenUrl: resultado.imagenUrl || parsedIA.imagenUrl || null,
      };
    } catch (err) {
      // Si falla el respaldo de IA, se devuelve lo que sí se pudo sacar de
      // los metadatos (puede ser parcial o vacío).
    }
  }

  return resultado;
});

// ---- Registrar gasto automáticamente desde un correo de notificación ----
// Pensado para recibir datos ya interpretados (monto, fecha, comercio,
// últimos 4 dígitos) desde un Google Apps Script que lee el Gmail del
// usuario y detecta correos de notificaciones@popularenlinea.com. No usa
// autenticación de Firebase (Apps Script no puede hacerlo fácilmente) —
// en su lugar, exige un secreto compartido que solo el script conoce.

function calcularFechaPagoTarjetaServer(tarjeta, fechaConsumoStr) {
  if (!tarjeta.fechaCorte) return null;
  const diasGracia = tarjeta.diasGracia || 22;
  const consumo = new Date(fechaConsumoStr + "T00:00:00");
  const year = consumo.getFullYear();
  const month = consumo.getMonth() + 1;

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
  const pad2 = (n) => String(n).padStart(2, "0");
  const toStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return toStr(fechaPago);
}

exports.registrarGastoDesdeCorreo = onRequest({ secrets: [emailWebhookSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  if (req.get("x-webhook-secret") !== emailWebhookSecret.value()) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { monto, fecha, comercio, ultimos4, estatus } = req.body || {};
  if (!monto || !fecha || !ultimos4) {
    res.status(400).json({ error: "Faltan datos (monto, fecha o últimos4)" });
    return;
  }

  // Respeta el interruptor configurado desde la app — si está apagado, no
  // se registra nada, aunque el Apps Script siga llamando cada 15 min.
  const configSnap = await db.collection("config").doc("integracionCorreo").get();
  const config = configSnap.exists() ? configSnap.data() : { activo: true, tarjetas: [] };
  const actualizarEstado = async (extra) => {
    await db
      .collection("estado")
      .doc("integracionCorreo")
      .set({ ultimaEjecucion: new Date(), ...extra }, { merge: true });
  };

  if (config.activo === false) {
    await actualizarEstado({ ultimoResultado: "inactivo" });
    res.status(200).json({ ok: true, omitido: true, motivo: "Integración desactivada desde la app" });
    return;
  }
  if (Array.isArray(config.tarjetas) && config.tarjetas.length > 0 && !config.tarjetas.includes(String(ultimos4))) {
    await actualizarEstado({ ultimoResultado: `tarjeta ${ultimos4} no está en la lista configurada` });
    res.status(200).json({ ok: true, omitido: true, motivo: `Tarjeta ${ultimos4} no está habilitada en la configuración` });
    return;
  }

  if (estatus && !/aprobada/i.test(estatus)) {
    await actualizarEstado({ ultimoResultado: "transacción no aprobada" });
    res.status(200).json({ ok: true, omitido: true, motivo: "Transacción no aprobada, no se registró" });
    return;
  }

  try {
    const tarjetasSnap = await db.collection("tarjetas").where("ultimos4", "==", String(ultimos4)).limit(1).get();
    if (tarjetasSnap.empty) {
      await actualizarEstado({ ultimoResultado: `tarjeta ${ultimos4} no encontrada`, errores: FieldValue.increment(1) });
      res.status(404).json({ error: `No se encontró ninguna tarjeta terminada en ${ultimos4}` });
      return;
    }
    const tarjetaDoc = tarjetasSnap.docs[0];
    const tarjeta = tarjetaDoc.data();

    // Protección contra duplicados: si el mismo correo se procesa dos
    // veces, no se crea el gasto otra vez.
    const idDeterministico = `correo_${ultimos4}_${fecha}_${monto}_${(comercio || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 30)}`;
    const yaExisteSnap = await db.collection("movimientos").where("idOrigenCorreo", "==", idDeterministico).limit(1).get();
    if (!yaExisteSnap.empty) {
      await actualizarEstado({ ultimoResultado: "duplicado (ya existía)" });
      res.status(200).json({ ok: true, duplicado: true });
      return;
    }

    const fechaPagoTarjeta = calcularFechaPagoTarjetaServer(tarjeta, fecha);

    const movRef = await db.collection("movimientos").add({
      type: "Gasto",
      category: "Otros Gastos",
      amount: Number(monto),
      description: comercio || "",
      date: fecha,
      clasificacion: "Variable",
      metodoPago: "Tarjeta de crédito",
      tarjetaId: tarjetaDoc.id,
      tarjetaNombre: tarjeta.nombre || "",
      monedaTarjeta: "RDS",
      fechaPagoTarjeta,
      pagado: false,
      idOrigenCorreo: idDeterministico,
      origenAutomatico: "correo-popular",
      createdAt: new Date(),
    });

    await db.collection("puntosHistorial").add({
      motivo: `Gasto detectado automáticamente: ${comercio || "compra"}`,
      puntos: 10,
      tipo: "registro",
      movimientoId: movRef.id,
      fecha,
      createdAt: new Date(),
    });
    await db.collection("config").doc("puntos").set({ total: FieldValue.increment(10) }, { merge: true });

    await actualizarEstado({
      ultimoResultado: `registrado: ${comercio || "compra"} (${monto})`,
      correosRegistrados: FieldValue.increment(1),
    });
    res.status(200).json({ ok: true, movimientoId: movRef.id, fechaPagoTarjeta });
  } catch (err) {
    console.error("Error registrando gasto desde correo:", err);
    await actualizarEstado({ ultimoResultado: "error: " + (err.message || String(err)), errores: FieldValue.increment(1) }).catch(() => {});
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ---- Asistente conversacional de finanzas ----
// Recibe la pregunta del usuario más un resumen compacto de sus datos
// financieros reales (armado del lado del cliente, no se manda todo el
// historial crudo por costo/tokens), y responde con Claude basándose SOLO
// en ese resumen. Mantiene un historial corto de la conversación para dar
// contexto de seguimiento, pero no persiste nada en el servidor.
// Nota: se fuerza un pequeño cambio aquí para que el próximo deploy
// realmente actualice esta función (y con eso, vuelva a verificar/otorgar
// el acceso al secreto ANTHROPIC_API_KEY) en vez de saltarla por "sin
// cambios detectados".
exports.preguntarAsistente = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  if (!request.auth || request.auth.token.email !== ALLOWED_EMAIL) {
    throw new HttpsError("permission-denied", "No autorizado");
  }
  const { pregunta, resumen, historial } = request.data || {};
  if (!pregunta || !resumen) {
    throw new HttpsError("invalid-argument", "Falta la pregunta o el resumen financiero");
  }

  const systemPrompt = `Eres el asistente financiero personal dentro de Smart Finance, una app de finanzas personales para una persona en República Dominicana. Respondes preguntas SOLO basándote en el resumen de datos que se te da a continuación — nunca inventes cifras que no estén ahí. Si algo no está en el resumen, dilo claramente en vez de adivinar. Sé conciso (2-4 oraciones normalmente, más solo si piden detalle). Usa RD$ para los montos. No repitas disclaimers de "no soy asesor financiero" a menos que la pregunta sea sobre una decisión de inversión importante. Habla en español, con un tono cercano pero directo.

Resumen de datos financieros actuales del usuario:
${JSON.stringify(resumen, null, 2)}`;

  const mensajes = [...(Array.isArray(historial) ? historial : []), { role: "user", content: pregunta }];

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicApiKey.value(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        system: systemPrompt,
        messages: mensajes,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new HttpsError("internal", data?.error?.message || `Error de la API de Anthropic (HTTP ${resp.status})`);
    }
    const textBlock = (data.content || []).find((c) => c.type === "text");
    return { respuesta: textBlock?.text || "No obtuve una respuesta clara, intenta de nuevo." };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || String(err));
  }
});
