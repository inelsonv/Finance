import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

const URL_FUNCION = "https://us-central1-finance-6e127.cloudfunctions.net/registrarGastoDesdeAtajo";

function CampoCopiable({ etiqueta, valor, nota }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(valor);
      } else {
        const ta = document.createElement("textarea");
        ta.value = valor;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // si el navegador bloquea el portapapeles, el texto sigue visible para copiarlo a mano
    }
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>{etiqueta}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <div
          className="despensa-mono"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "7px 10px",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 12,
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {valor}
        </div>
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${etiqueta}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 10px",
            fontSize: 12,
            fontWeight: 600,
            background: copiado ? "var(--sage)" : "transparent",
            color: copiado ? "#fff" : "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {copiado ? <Check size={13} /> : <Copy size={13} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      {nota && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.4 }}>{nota}</div>}
    </div>
  );
}

export default function ApplePayGuia() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
        Cada pago con Apple Pay se registra como gasto al instante. Funciona con un Atajo de iPhone
        (app Shortcuts) que llama a Smart Finance cuando haces una compra. Se configura una sola vez en
        cada iPhone y cada tarjeta. Las tarjetas que ya registra el correo de Banco Popular se omiten
        para no duplicar gastos.
      </div>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{
          padding: "7px 12px",
          fontSize: 12,
          fontWeight: 600,
          background: "var(--sage)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          marginBottom: abierto ? 14 : 0,
        }}
      >
        {abierto ? "Ocultar guía" : "Ver guía de configuración"}
      </button>

      {abierto && (
        <div>
          <ol style={{ fontSize: 12.5, lineHeight: 1.6, paddingLeft: 18, margin: "0 0 14px" }}>
            <li>Abre <strong>Shortcuts</strong> → pestaña <strong>Automation</strong> → <strong>+</strong>.</li>
            <li>
              Elige <strong>Transaction</strong> (en iOS 26 o posterior puede llamarse <strong>Wallet</strong>),
              selecciona la tarjeta y activa <strong>Run Immediately</strong>.
            </li>
            <li>Agrega la acción <strong>Get Contents of URL</strong> y llénala con los datos de abajo.</li>
            <li>
              Repite una automatización por cada tarjeta, cambiando solo los últimos 4 dígitos.
            </li>
          </ol>

          <CampoCopiable etiqueta="URL" valor={URL_FUNCION} />
          <CampoCopiable etiqueta="Method" valor="POST" />

          <div style={{ fontSize: 12.5, fontWeight: 600, margin: "14px 0 8px" }}>Headers</div>
          <CampoCopiable
            etiqueta="Header 1 — Key"
            valor="x-webhook-secret"
            nota="En Text va la clave del webhook. Por seguridad no se muestra aquí; es la misma que usa el Apps Script del correo (secreto EMAIL_WEBHOOK_SECRET en Firebase)."
          />
          <CampoCopiable etiqueta="Header 2 — Key" valor="Content-Type" />
          <CampoCopiable etiqueta="Header 2 — Text" valor="application/json" />

          <div style={{ fontSize: 12.5, fontWeight: 600, margin: "14px 0 8px" }}>
            Request Body (JSON, tres campos de tipo Text)
          </div>
          <CampoCopiable etiqueta="Campo 1 — Key" valor="monto" nota="En Text elige la variable Amount." />
          <CampoCopiable etiqueta="Campo 2 — Key" valor="comercio" nota="En Text elige la variable Merchant." />
          <CampoCopiable etiqueta="Campo 3 — Key" valor="ultimos4" nota="En Text escribe a mano los 4 dígitos de la tarjeta." />

          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 6 }}>
            La tarjeta debe estar registrada en la sección de tarjetas con esos mismos últimos 4 dígitos. Si
            Wallet no tiene datos móviles, el atajo falla fuera de Wi-Fi: revisa Settings → Apps → Wallet →
            Mobile Data.
          </div>
        </div>
      )}
    </div>
  );
}
