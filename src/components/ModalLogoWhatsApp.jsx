import React, { useRef, useState } from "react";
import { Download, X, Eye, Check, ShieldCheck, Sparkles, Smartphone } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppGroupButton.jsx";

export default function ModalLogoWhatsApp({ isOpen, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [previewMode, setPreviewMode] = useState("circular"); // "circular" | "squircle"
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadPng = async (resolution = 1024) => {
    try {
      setDownloading(true);
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d");

      // Cargar SVG a imagen
      const img = new Image();
      const svgRes = await fetch("/logo-perfil-whatsapp.svg");
      const svgText = await svgRes.text();
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.clearRect(0, 0, resolution, resolution);
        ctx.drawImage(img, 0, 0, resolution, resolution);
        URL.revokeObjectURL(url);

        const a = document.createElement("a");
        a.download = `smart-finance-logo-perfil-${resolution}x${resolution}.png`;
        a.href = canvas.toDataURL("image/png");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloading(false);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 3000);
      };

      img.onerror = () => {
        // Fallback: descargar directo el archivo PNG si existe
        const a = document.createElement("a");
        a.download = "smart-finance-logo-perfil.png";
        a.href = "/logo-perfil-whatsapp.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
      };

      img.src = url;
    } catch (e) {
      console.error("Error generando PNG del logo:", e);
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, 94vw)",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          boxShadow: "0 24px 48px rgba(0,0,0,0.36)",
          padding: "24px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WhatsAppIcon size={20} color="#25D366" />
            </div>
            <div>
              <h2 className="despensa-tab-font" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
                Foto de Perfil del Grupo
              </h2>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Logo oficial de Smart Finance en alta definición
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Selector de modo de vista previa */}
        <div
          style={{
            display: "flex",
            background: "var(--paper)",
            padding: 3,
            borderRadius: 10,
            border: "1px solid var(--line)",
            alignSelf: "center",
          }}
        >
          <button
            onClick={() => setPreviewMode("circular")}
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: previewMode === "circular" ? "var(--card)" : "transparent",
              color: previewMode === "circular" ? "var(--sage)" : "var(--ink-soft)",
              boxShadow: previewMode === "circular" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Círculo WhatsApp
          </button>
          <button
            onClick={() => setPreviewMode("squircle")}
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: previewMode === "squircle" ? "var(--card)" : "transparent",
              color: previewMode === "squircle" ? "var(--sage)" : "var(--ink-soft)",
              boxShadow: previewMode === "squircle" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Cuadrado Completo
          </button>
        </div>

        {/* Contenedor de Vista Previa */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 0",
            background: "radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0.12) 100%)",
            borderRadius: 16,
            border: "1px dashed var(--line)",
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: previewMode === "circular" ? "50%" : 28,
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(0,0,0,0.45), 0 0 0 3px rgba(37,211,102,0.3)",
              position: "relative",
              transition: "border-radius 0.25s ease",
            }}
          >
            <img
              src="/logo-perfil-whatsapp.svg"
              alt="Logo Smart Finance Perfil WhatsApp"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 12 }}>
            {previewMode === "circular"
              ? "✓ Centrado y calibrado exactamente para el recorte circular de WhatsApp"
              : "Formato cuadrado 1024 × 1024 px"}
          </span>
        </div>

        {/* Botones de descarga */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={() => handleDownloadPng(1024)}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 18px",
              background: "#25D366",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: downloading ? "wait" : "pointer",
              boxShadow: "0 3px 10px rgba(37,211,102,0.35)",
              transition: "transform 0.15s ease",
            }}
          >
            {downloaded ? <Check size={18} /> : <Download size={18} />}
            <span>{downloading ? "Generando PNG…" : downloaded ? "¡Descargado exitosamente!" : "Descargar Imagen PNG (1024 × 1024)"}</span>
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="/logo-perfil-whatsapp.svg"
              download="smart-finance-logo.svg"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 12px",
                background: "var(--paper)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              <Download size={14} /> Descargar Vector SVG
            </a>
            <a
              href="/logo-perfil-whatsapp.svg"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 12px",
                background: "var(--paper)",
                color: "var(--ink-soft)",
                border: "1px solid var(--line)",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Abrir imagen en pestaña nueva"
            >
              <Eye size={14} /> Ver
            </a>
          </div>
        </div>

        {/* Instrucciones breves para WhatsApp */}
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line-soft)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11.5,
            color: "var(--ink-soft)",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: "var(--ink)" }}>¿Cómo colocarlo en WhatsApp?</strong>
          <ol style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            <li>Descarga la imagen con el botón verde.</li>
            <li>Abre el grupo en WhatsApp y toca el nombre arriba.</li>
            <li>Toca la foto de perfil &gt; <em>Editar</em> &gt; <em>Galería</em>.</li>
            <li>Selecciona la imagen descargada y guarda los cambios.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
