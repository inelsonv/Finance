// Generador y despachador de reportes estructurados de quincena por Gmail API
import { getOrRequestGmailAccessToken, clearCachedGmailAccessToken } from "../firebase";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generarHtmlDashboardEmail({ periodo, items = [], totales = {}, resumenPorMetodo = [], diasCobro = [15, 30], userEmail = "iventuramena@gmail.com" }) {
  const nombreMes = MESES[(periodo?.month || 1) - 1];
  const quincenaLabel = periodo?.quincena === "Q1" ? "1ª Quincena (Días 1 - 15)" : "2ª Quincena (Días 16 - Fin de Mes)";
  const total = totales?.total || 0;
  const pagado = totales?.pagado || 0;
  const pendiente = totales?.pendiente || (total - pagado);
  const porcentajePagado = total > 0 ? Math.round((pagado / total) * 100) : 0;

  // Segmentación por categoría
  const categoriasMap = {};
  for (const it of items) {
    let cat = "Otros Gastos";
    if (it.esPrestamo) cat = "Préstamos y Financiamientos";
    else if (it.esTarjeta) cat = "Tarjetas de Crédito";
    else if (/^(combustible|gasolina)$/i.test(it.nombre?.trim() || "")) cat = "Combustible & Transporte";
    else if (it.clasificacion === "Fijo") cat = "Gastos Fijos & Esenciales";
    else if (it.clasificacion === "Variable") cat = "Gastos Variables Presupuestados";
    else if (it.nombre) cat = it.nombre;

    if (!categoriasMap[cat]) {
      categoriasMap[cat] = { total: 0, pagado: 0, items: [] };
    }
    categoriasMap[cat].total += it.monto || 0;
    if (it.bloqueadoPagado || it.pagado) categoriasMap[cat].pagado += it.monto || 0;
    categoriasMap[cat].items.push(it);
  }

  const resumenCategorias = Object.entries(categoriasMap).sort((a, b) => b[1].total - a[1].total);

  // Iconos para métodos
  const getMetodoIcon = (metodo) => {
    switch (metodo) {
      case "Transferencia": return "🏦";
      case "Efectivo": return "💵";
      case "Tarjeta": return "💳";
      case "Descuento Nómina": return "📑";
      default: return "⚡";
    }
  };

  const fechaHoyStr = new Date().toLocaleDateString("es-DO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard de Pagos - Smart Finance</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .email-container {
      max-width: 660px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #0b0f19;">
  <div class="email-container" style="max-width: 660px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
    
    <!-- ENCABEZADO TIPO DASHBOARD EJECUTIVO -->
    <div style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%); padding: 36px 32px 28px; text-align: left; color: #ffffff; border-bottom: 2px solid #3b82f6;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="display: inline-block; padding: 4px 12px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; margin-bottom: 12px;">
              📊 SMART FINANCE · REPORTE OFICIAL DE COBRO
            </div>
            <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
              Checklist de Pagos · ${quincenaLabel}
            </h1>
            <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 500;">
              Mes de ${nombreMes} ${periodo?.year} · Cobro programado (Días ${diasCobro.join(" y ")})
            </p>
          </td>
          <td align="right" valign="top" style="text-align: right;">
            <div style="background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #cbd5e1; display: inline-block; text-align: right;">
              <div>Destinatario:</div>
              <strong style="color: #ffffff;">${userEmail}</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- BARRA DE PROGRESO DE COBERTURA -->
      <div style="margin-top: 24px; background: rgba(255,255,255,0.08); padding: 14px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 12px; color: #cbd5e1; font-weight: 600;">Progreso de pagos completados:</td>
            <td align="right" style="font-size: 13px; color: #34d399; font-weight: 800;">${porcentajePagado}% cubierto</td>
          </tr>
        </table>
        <div style="margin-top: 8px; width: 100%; height: 8px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden;">
          <div style="width: ${porcentajePagado}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #34d399 100%);"></div>
        </div>
      </div>
    </div>

    <!-- CUERPO PRINCIPAL -->
    <div style="padding: 28px 28px 36px; background-color: #f8fafc;">
      
      <!-- TARJETAS KPIS -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <!-- KPI TOTAL -->
          <td width="32%" style="background: #ffffff; padding: 16px 14px; border-radius: 12px; border: 1px solid #e2e8f0; vertical-align: top; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">TOTAL COMPROMISOS</div>
            <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 6px;">${formatMoney(total)}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${items.length} pagos registrados</div>
          </td>
          <td width="2%"></td>
          <!-- KPI PAGADO -->
          <td width="32%" style="background: #ffffff; padding: 16px 14px; border-radius: 12px; border: 1px solid #bbf7d0; vertical-align: top; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #059669; letter-spacing: 0.5px;">PAGADO / CUBIERTO</div>
            <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 6px;">${formatMoney(pagado)}</div>
            <div style="font-size: 11px; color: #10b981; margin-top: 4px;">${porcentajePagado}% de la quincena</div>
          </td>
          <td width="2%"></td>
          <!-- KPI PENDIENTE -->
          <td width="32%" style="background: #ffffff; padding: 16px 14px; border-radius: 12px; border: 1px solid ${pendiente > 0 ? '#fecdd3' : '#e2e8f0'}; vertical-align: top; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${pendiente > 0 ? '#e11d48' : '#64748b'}; letter-spacing: 0.5px;">PENDIENTE POR PAGAR</div>
            <div style="font-size: 20px; font-weight: 800; color: ${pendiente > 0 ? '#e11d48' : '#0f172a'}; margin-top: 6px;">${formatMoney(pendiente)}</div>
            <div style="font-size: 11px; color: ${pendiente > 0 ? '#f43f5e' : '#94a3b8'}; margin-top: 4px;">Por disponer en cuentas</div>
          </td>
        </tr>
      </table>

      <!-- SECCIÓN 1: SEGMENTACIÓN POR MÉTODO DE PAGO -->
      <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          💳 Disposición de Fondos por Método de Pago
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
          Montos segmentados que necesitas tener listos en cada canal para cubrir tus compromisos pendientes:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
              <th align="left" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">MÉTODO</th>
              <th align="right" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">MONTO PENDIENTE</th>
              <th align="right" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">% DEL TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${resumenPorMetodo.length === 0 ? `
              <tr>
                <td colspan="3" align="center" style="padding: 16px; font-size: 12px; color: #059669; font-weight: 600;">
                  🎉 ¡Excelente! No tienes pagos pendientes por método en esta quincena.
                </td>
              </tr>
            ` : resumenPorMetodo.map(([metodo, monto]) => {
              const pct = pendiente > 0 ? Math.round((monto / pendiente) * 100) : 0;
              return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #1e293b;">
                  <span style="margin-right: 6px;">${getMetodoIcon(metodo)}</span> ${metodo}
                </td>
                <td align="right" style="padding: 10px 12px; font-size: 13px; font-weight: 800; color: #0f172a;">
                  ${formatMoney(monto)}
                </td>
                <td align="right" style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #3b82f6;">
                  ${pct}%
                </td>
              </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN 2: SEGMENTACIÓN POR CATEGORÍA -->
      <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          📁 Desglose por Categoría de Pago
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
          Distribución de compromisos según naturaleza del gasto:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
              <th align="left" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">CATEGORÍA / GRUPO</th>
              <th align="center" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">CANT. PAGOS</th>
              <th align="right" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">PRESUPUESTADO</th>
              <th align="right" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">PAGADO</th>
            </tr>
          </thead>
          <tbody>
            ${resumenCategorias.map(([cat, data]) => {
              const completado = data.pagado >= data.total && data.total > 0;
              return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #1e293b;">
                  ${cat}
                </td>
                <td align="center" style="padding: 10px 12px; font-size: 12px; color: #64748b;">
                  ${data.items.length}
                </td>
                <td align="right" style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #0f172a;">
                  ${formatMoney(data.total)}
                </td>
                <td align="right" style="padding: 10px 12px; font-size: 13px; font-weight: 800; color: ${completado ? '#059669' : '#d97706'};">
                  ${formatMoney(data.pagado)} ${completado ? '✅' : ''}
                </td>
              </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- SECCIÓN 3: TABLA DETALLADA DE COMPROMISOS (CHECKLIST) -->
      <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          📋 Detalle de Compromisos a Realizar
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
          Lista exhaustiva con el estado de cada pago para la quincena actual:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1; background: #0f172a; color: #ffffff;">
              <th align="center" style="padding: 10px 8px; font-size: 11px; font-weight: 700; border-top-left-radius: 8px;">ESTADO</th>
              <th align="left" style="padding: 10px 10px; font-size: 11px; font-weight: 700;">CONCEPTO</th>
              <th align="left" style="padding: 10px 10px; font-size: 11px; font-weight: 700;">MÉTODO</th>
              <th align="right" style="padding: 10px 10px; font-size: 11px; font-weight: 700; border-top-right-radius: 8px;">MONTO</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0 ? `
              <tr>
                <td colspan="4" align="center" style="padding: 24px; font-size: 13px; color: #64748b;">
                  No hay pagos presupuestados para este período.
                </td>
              </tr>
            ` : items.map((it, idx) => {
              const estaPagado = it.bloqueadoPagado || it.pagado;
              const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
              const metodo = it.metodo || it.metodoDefault || "Sin definir";
              return `
              <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                <td align="center" style="padding: 10px 8px; vertical-align: middle;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; background: ${estaPagado ? '#dcfce7' : '#fee2e2'}; color: ${estaPagado ? '#166534' : '#991b1b'};">
                    ${estaPagado ? '✅ PAGADO' : '⏳ PENDIENTE'}
                  </span>
                </td>
                <td style="padding: 10px 10px; font-size: 12px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                  <div>${it.nombre}</div>
                  ${it.fechaCuota ? `<div style="font-size: 10px; color: #64748b; font-weight: normal;">Fecha: ${it.fechaCuota}</div>` : ''}
                </td>
                <td style="padding: 10px 10px; font-size: 11px; font-weight: 600; color: #475569; vertical-align: middle;">
                  ${getMetodoIcon(metodo)} ${metodo}
                </td>
                <td align="right" style="padding: 10px 10px; font-size: 13px; font-weight: 800; color: ${estaPagado ? '#64748b' : '#0f172a'}; text-decoration: ${estaPagado ? 'line-through' : 'none'}; vertical-align: middle;">
                  ${formatMoney(it.monto)}
                </td>
              </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #e2e8f0; font-weight: 800;">
              <td colspan="3" align="right" style="padding: 10px 12px; font-size: 12px; color: #0f172a; text-transform: uppercase;">
                TOTAL COMPROMISOS:
              </td>
              <td align="right" style="padding: 10px 12px; font-size: 14px; color: #0f172a;">
                ${formatMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- AVISO DE RECORDATORIO -->
      <div style="margin-top: 24px; padding: 16px 20px; background: #eff6ff; border-radius: 10px; border-left: 4px solid #3b82f6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 12px; color: #1e40af; line-height: 1.5;">
              💡 <strong>Recomendación Patrimonial:</strong> Recuerda verificar que tus cuentas bancarias posean los fondos necesarios para transferencias y cargos recurrentes antes de las fechas límites para evitar cargos por mora o penalidades.
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- FOOTER DEL CORREO -->
    <div style="background-color: #0f172a; padding: 24px 32px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #1e293b;">
      <p style="margin: 0 0 6px 0; color: #94a3b8; font-weight: 600;">
        Smart Finance · Sistema Automatizado de Gestión Patrimonial
      </p>
      <p style="margin: 0 0 10px 0;">
        Generado automáticamente para ${userEmail} · Notificaciones configuradas para los días de cobro ${diasCobro.join(" y ")} de cada mes.
      </p>
      <p style="margin: 0; color: #475569;">
        Emitido el ${fechaHoyStr}
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function enviarReportePorGmail({ accessToken, to = "iventuramena@gmail.com", subject, htmlBody }) {
  let token = accessToken;
  if (!token) {
    token = await getOrRequestGmailAccessToken();
  }
  if (!token) {
    throw new Error("No hay token de acceso disponible para enviar el correo.");
  }

  // Creación del mensaje RFC 2822
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    htmlBody,
  ];

  const rawEmail = emailLines.join("\r\n");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(rawEmail);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Url = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  let directErrorMsg = null;

  // Intento 1: Llamada directa a Gmail API (Client-side)
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64Url }),
    });

    if (res.ok) {
      return await res.json();
    }

    const directErrData = await res.json().catch(() => ({}));
    directErrorMsg =
      directErrData?.error?.message ||
      (typeof directErrData?.error === "string" ? directErrData.error : "") ||
      `Error Gmail API HTTP ${res.status}`;
    console.warn("Fallo en envío directo a Gmail API:", res.status, directErrData);

    if (res.status === 401 || res.status === 403) {
      clearCachedGmailAccessToken();
    }
  } catch (directErr) {
    console.warn("Fallo de red en envío directo a Gmail API:", directErr);
    directErrorMsg = directErr.message || String(directErr);
  }

  // Intento 2: Proxy server-side pasando el token Bearer
  try {
    const serverRes = await fetch("/api/gmail/enviar-reporte", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, htmlBody }),
    });

    if (serverRes.ok) {
      return await serverRes.json();
    }

    const errorData = await serverRes.json().catch(() => ({}));
    if (serverRes.status === 401 || serverRes.status === 403) {
      clearCachedGmailAccessToken();
    }
    const finalMsg =
      errorData?.error ||
      directErrorMsg ||
      `Error al enviar correo (HTTP ${serverRes.status})`;
    throw new Error(finalMsg);
  } catch (proxyErr) {
    clearCachedGmailAccessToken();
    throw new Error(proxyErr.message || directErrorMsg || "Error al enviar correo vía Gmail");
  }
}
