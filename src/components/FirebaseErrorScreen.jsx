import React, { useState } from "react";
import { LogOut, RefreshCw, Copy, Check, ExternalLink, ShieldAlert, KeyRound } from "lucide-react";
import { SmartFinanceMark } from "./SmartFinanceLogo.jsx";

const FIRESTORE_RULES_CODE = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function esPropietario() {
      return request.auth != null && (
        request.auth.token.email == "iventuramena@gmail.com" ||
        request.auth.token.email.lower() == "iventuramena@gmail.com"
      );
    }

    // Directorio de usuarios registrados
    match /usuariosRegistrados/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || esPropietario());
    }

    // Espacio de datos 100% aislado para cada usuario individual
    match /users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || esPropietario());
    }
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || esPropietario());
    }

    // Colecciones y documentos raíz: reservadas para el propietario original
    match /{document=**} {
      allow read, write: if esPropietario();
    }
  }
}`;

export default function FirebaseErrorScreen({ error, user, onRetry, onSignOut }) {
  const [copied, setCopied] = useState(false);
  const isPermissionError = /permission|permisos|denied|insufficient/i.test(error || "");

  const handleCopyRules = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(FIRESTORE_RULES_CODE).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "2rem",
          maxWidth: isPermissionError ? 560 : 420,
          width: "100%",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--stamp-bg)",
              color: "var(--stamp)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {isPermissionError
                ? "Reglas de Firestore pendientes para multi-usuario"
                : "No se pudo sincronizar con Firebase"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              Sesión iniciada con: <strong style={{ color: "var(--ink)" }}>{user?.email || "Usuario"}</strong>
            </div>
          </div>
        </div>

        {isPermissionError ? (
          <div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 14px" }}>
              Para que cuentas adicionales puedan usar Smart Finance con su propio espacio aislado e independiente,
              debes publicar las <strong>reglas multi-usuario</strong> en tu consola de Firebase (proyecto{" "}
              <code>finance-6e127</code>).
            </p>

            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>
                  Reglas de seguridad actualizadas (firestore.rules):
                </span>
                <button
                  type="button"
                  onClick={handleCopyRules}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 5,
                    border: "1px solid var(--line)",
                    background: copied ? "var(--sage-bg)" : "var(--card)",
                    color: copied ? "var(--sage)" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "¡Copiadas!" : "Copiar reglas"}
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  fontSize: 10.5,
                  lineHeight: 1.45,
                  color: "var(--ink-soft)",
                  maxHeight: 150,
                  overflowY: "auto",
                  background: "var(--card)",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {FIRESTORE_RULES_CODE}
              </pre>
            </div>

            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Pasos sencillos:</div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>
                  Abre{" "}
                  <a
                    href="https://console.firebase.google.com/project/finance-6e127/firestore/rules"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--blue)", textDecoration: "underline", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    Firestore &gt; Reglas en Firebase Console
                    <ExternalLink size={11} />
                  </a>
                </li>
                <li>Pega el código copiado y haz clic en <strong>Publicar</strong>.</li>
                <li>Vuelve aquí y pulsa <strong>Reintentar conexión</strong>.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--stamp-bg)",
              color: "var(--stamp)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12,
              marginBottom: 16,
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Reintentar conexión
          </button>

          <button
            type="button"
            onClick={onSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--card)",
              color: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
