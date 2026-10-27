import React from "react";

export const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/K2nxsuYtkgoF31esgpEv6a";

export function WhatsAppIcon({ size = 18, color = "currentColor", style = {} }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Botón para unirse al grupo de WhatsApp
 * Variantes soportadas: "header", "sidebar", "banner", "menu-item"
 */
export default function WhatsAppGroupButton({
  variant = "header",
  collapsed = false,
  onClick,
  style = {},
  className = "",
}) {
  if (variant === "header") {
    return (
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Unirse al grupo de WhatsApp"
        aria-label="Unirse al grupo de WhatsApp"
        onClick={onClick}
        className={`despensa-whatsapp-btn ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 11px",
          fontSize: 12.5,
          fontWeight: 600,
          background: "#25D366",
          color: "#ffffff",
          borderRadius: 20,
          textDecoration: "none",
          boxShadow: "0 1px 3px rgba(37,211,102,0.35)",
          flexShrink: 0,
          transition: "transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease",
          ...style,
        }}
      >
        <WhatsAppIcon size={15} color="#ffffff" />
        <span className="despensa-desktop-only" style={{ letterSpacing: "-0.01em" }}>
          Unirse al grupo
        </span>
      </a>
    );
  }

  if (variant === "sidebar") {
    return (
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Unirse a nuestro grupo de WhatsApp"
        aria-label="Unirse al grupo de WhatsApp"
        onClick={onClick}
        className={`despensa-sidebar-whatsapp ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: "auto",
          padding: collapsed ? "10px 4px" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 10,
          background: "linear-gradient(135deg, rgba(37,211,102,0.14) 0%, rgba(37,211,102,0.06) 100%)",
          border: "1px solid rgba(37,211,102,0.35)",
          color: "var(--ink)",
          textDecoration: "none",
          transition: "all 0.18s ease",
          flexShrink: 0,
          ...style,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 5px rgba(37,211,102,0.35)",
          }}
        >
          <WhatsAppIcon size={16} color="#ffffff" />
        </div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, overflow: "hidden" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#128C7E", letterSpacing: "-0.01em" }}>
              Grupo WhatsApp
            </span>
            <span style={{ fontSize: 10.5, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
              Únete a la comunidad
            </span>
          </div>
        )}
      </a>
    );
  }

  if (variant === "menu-item") {
    return (
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        title="Unirse al grupo de WhatsApp"
        className={`despensa-menu-item-whatsapp ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          background: "rgba(37,211,102,0.08)",
          border: "none",
          borderBottom: "1px solid var(--line-soft)",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#128C7E",
          textDecoration: "none",
          textAlign: "left",
          transition: "background 0.15s ease",
          ...style,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <WhatsAppIcon size={13} color="#ffffff" />
        </div>
        <span>Unirse al grupo de WhatsApp</span>
      </a>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`despensa-whatsapp-card ${className}`}
        style={{
          background: "linear-gradient(135deg, rgba(37,211,102,0.12) 0%, rgba(18,140,126,0.05) 100%)",
          border: "1px solid rgba(37,211,102,0.32)",
          borderRadius: 12,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200, flex: 1 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(37,211,102,0.35)",
            }}
          >
            <WhatsAppIcon size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              Comunidad en WhatsApp
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              Comparte experiencias, trucos y mantente al día con las novedades.
            </div>
          </div>
        </div>
        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "#25D366",
            color: "#ffffff",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(37,211,102,0.3)",
            flexShrink: 0,
          }}
        >
          <WhatsAppIcon size={15} color="#ffffff" />
          Unirse ahora
        </a>
      </div>
    );
  }

  return null;
}
