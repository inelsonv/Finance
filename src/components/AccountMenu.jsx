import React, { useEffect, useRef, useState } from "react";
import { LogOut, Settings, Smartphone, X } from "lucide-react";
import { confirm } from "../lib/confirm";

const APP_URL = "https://inelsonv.github.io/Finance/";

export default function AccountMenu({ user, onSignOut, onOpenSettings, synced }) {
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user?.photoURL) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={user.displayName || user.email}
        style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", position: "relative" }}
      >
        <img
          src={user.photoURL}
          alt={user.displayName || user.email}
          referrerPolicy="no-referrer"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: open ? "2px solid var(--sage)" : "1px solid var(--line)",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <span
          title={synced === null ? "Conectando…" : synced ? "Sincronizado" : "Sin conexión"}
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: synced === null ? "var(--amber)" : synced ? "var(--sage)" : "var(--stamp)",
            border: "2px solid var(--paper)",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(220px, calc(100vw - 24px))",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)" }}>
            {user.displayName && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.displayName}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              color: "var(--ink)",
              textAlign: "left",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <Settings size={14} /> Configuración
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setShowQr(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              color: "var(--ink)",
              textAlign: "left",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <Smartphone size={14} /> Vincular dispositivo
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              if (await confirm("¿Cerrar sesión?", { confirmLabel: "Cerrar sesión", danger: false })) onSignOut();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              color: "var(--stamp)",
              textAlign: "left",
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      )}

      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 24,
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowQr(false)}
              style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>

            <Smartphone size={22} style={{ color: "var(--sage)", marginBottom: 8 }} />
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Vincula tu celular</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
              Escanea este código con la cámara de tu celular para abrir Smart Finance en el móvil, y luego inicia
              sesión con la misma cuenta de Google. Todo se sincroniza automáticamente.
            </div>

            <div style={{ display: "inline-block", padding: 10, background: "#fff", borderRadius: 10 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APP_URL)}`}
                alt="Código QR para abrir Smart Finance"
                width={200}
                height={200}
                style={{ display: "block" }}
              />
            </div>

            <div className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 12, wordBreak: "break-all" }}>
              {APP_URL}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
