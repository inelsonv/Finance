import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { setConfirmListener } from "../lib/confirm";

export default function ConfirmDialogHost() {
  const [pending, setPending] = useState(null); // { message, options, resolve }

  useEffect(() => {
    setConfirmListener((message, options) => {
      return new Promise((resolve) => {
        setPending({ message, options: options || {}, resolve });
      });
    });
    return () => setConfirmListener(null);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") resolver(false);
      if (e.key === "Enter") resolver(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (!pending) return null;

  const resolver = (result) => {
    pending.resolve(result);
    setPending(null);
  };

  const { message, options } = pending;
  const danger = options.danger !== false; // por defecto, tono de "eliminar"
  const confirmLabel = options.confirmLabel || (danger ? "Eliminar" : "Confirmar");
  const cancelLabel = options.cancelLabel || "Cancelar";

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
        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
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
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            autoFocus
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
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: danger ? "var(--stamp)" : "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
