import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    detectedRef.current = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, err) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            onDetected(result.getText());
          }
          // los NotFoundException son normales (aún no encuentra nada en el frame), se ignoran
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(() => {
        setError("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
      });

    return () => {
      if (controlsRef.current) controlsRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <X size={18} />
      </button>

      {error ? (
        <div style={{ color: "#fff", textAlign: "center", maxWidth: 320, fontSize: 13.5, lineHeight: 1.6 }}>{error}</div>
      ) : (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: "2px solid var(--sage)" }}
          />
          <div style={{ color: "#fff", marginTop: 14, fontSize: 13 }}>Apunta la cámara al código de barras…</div>
        </>
      )}
    </div>
  );
}
