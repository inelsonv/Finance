const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

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

exports.avisoDiarioAlertas = onSchedule(
  { schedule: "every day 08:00", timeZone: "America/Santo_Domingo" },
  async () => {
    const configSnap = await db.collection("config").doc("notificaciones").get();
    const email = configSnap.exists ? configSnap.data().email : null;
    if (!email) {
      console.log("Sin correo configurado en config/notificaciones, no se envía nada.");
      return;
    }

    const [prestamos, tarjetas, membresias, contratos, productos, movimientos] = await Promise.all([
      getAll("prestamos"),
      getAll("tarjetas"),
      getAll("membresias"),
      getAll("contratos"),
      getAll("productos"),
      getAll("movimientos"),
    ]);

    const today = todayInfo();
    const notificaciones = construirNotificaciones({ prestamos, tarjetas, membresias, contratos, productos, movimientos, today });

    if (notificaciones.length === 0) {
      console.log("No hay alertas pendientes hoy, no se envía correo.");
      return;
    }

    await db.collection("mail").add({
      to: [email],
      message: {
        subject: `Smart Finance: ${notificaciones.length} alerta${notificaciones.length !== 1 ? "s" : ""} pendiente${notificaciones.length !== 1 ? "s" : ""}`,
        html: construirHtml(notificaciones),
      },
    });

    console.log(`Correo de alertas encolado para ${email} con ${notificaciones.length} notificaciones.`);
  }
);
