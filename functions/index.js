const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const ALLOWED_EMAIL = "iventuramena@gmail.com";
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

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

exports.avisoDiarioAlertas = onSchedule(
  { schedule: "every day 08:00", timeZone: "America/Santo_Domingo" },
  async () => {
    const configSnap = await db.collection("config").doc("notificaciones").get();
    const email = configSnap.exists ? configSnap.data().email : null;
    if (!email) {
      console.log("Sin correo configurado en config/notificaciones, no se envía nada.");
      return;
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

    const today = todayInfo();
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
