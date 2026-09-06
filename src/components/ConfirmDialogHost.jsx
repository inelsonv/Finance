import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { setConfirmListener } from "../lib/confirm";

export default function ConfirmDialogHost() {
  const [pending, setPending] = useState(null); // { message, options, resolve }
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setConfirmListener((message, options) => {
      return new Promise((resolve) => {
        setMotivo("");
        setPending({ message, options: options || {}, resolve });
      });
    });
    return () => setConfirmListener(null);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") resolver(false);
      if (e.key === "Enter" && !pending.options.requireReason) resolver(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (!pending) return null;

  const resolver = (result) => {
    // Si se exige un motivo, se resuelve con el texto escrito (string) en
    // vez de "true" — el llamador recibe el motivo directamente. Cancelar
    // sigue resolviendo "false"/null en ambos casos.
    if (result && pending.options.requireReason) {
      pending.resolve(motivo.trim());
    } else {
      pending.resolve(result ? true : false);
    }
    setPending(null);
  };

  const { message, options } = pending;
  const danger = options.danger !== false; // por defecto, tono de "eliminar"
  const confirmLabel = options.confirmLabel || (danger ? "Eliminar" : "Confirmar");
  const cancelLabel = options.cancelLabel || "Cancelar";
  const motivoVacio = options.requireReason && !motivo.trim();

  return (
    <div
      onClick={() => resolver(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 20,
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: options.requireReason ? 12 : 18, alignItems: "flex-start" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: danger ? "var(--stamp-bg)" : "var(--sage-bg)",
              color: danger ? "var(--stamp)" : "var(--sage)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={16} />
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5, paddingTop: 5 }}>{message}</div>
        </div>
        {options.requireReason && (
          <div style={{ marginBottom: 16 }}>
            <input
              autoFocus
              placeholder={options.reasonPlaceholder || "Escribe el motivo…"}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            autoFocus={!options.requireReason}
            onClick={() => resolver(false)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--paper)",
              color: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => resolver(true)}
            disabled={motivoVacio}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: motivoVacio ? "var(--line)" : danger ? "var(--stamp)" : "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: motivoVacio ? "not-allowed" : "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
