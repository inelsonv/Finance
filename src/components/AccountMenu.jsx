import React, { useEffect, useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";

export default function AccountMenu({ user, onSignOut, onOpenSettings }) {
  const [open, setOpen] = useState(false);
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
        style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
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
              if (window.confirm("¿Cerrar sesión?")) onSignOut();
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
    </div>
  );
}
