import React, { useEffect, useState } from "react";
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider } from "firebase/auth";
import { LogIn, LogOut, ShieldAlert, Wallet, Copy, Check, ExternalLink, AlertTriangle, KeyRound, UserPlus } from "lucide-react";
import { auth, googleProvider, OWNER_EMAIL, setCachedAccessToken } from "../firebase";
import { SmartFinanceMark } from "./SmartFinanceLogo.jsx";

export function LoginScreen() {
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => {
    try {
      const savedError = sessionStorage.getItem("smart-finance-auth-error");
      if (savedError) {
        setError(savedError);
        sessionStorage.removeItem("smart-finance-auth-error");
      }
    } catch (e) {
      // sessionStorage no disponible, seguimos sin mostrar error previo
    }
  }, []);

  const handleCopyHost = () => {
    if (navigator.clipboard && currentHost) {
      navigator.clipboard.writeText(currentHost).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err) {
      setErrorCode(err.code);
      const fallbackCodes = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"];
      if (fallbackCodes.includes(err.code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (err2) {
          setError(err2.message || String(err2));
          setErrorCode(err2.code);
        }
      } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(err.message || String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      }
    } catch (err) {
      setErrorCode(err.code);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado. Intenta iniciar sesión.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("El método de registro con correo y contraseña no está habilitado en Firebase. Actívalo en la consola de Firebase.");
      } else {
        setError(err.message || String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const isUnauthorizedDomain =
    errorCode === "auth/unauthorized-domain" ||
    (error && error.includes("auth/unauthorized-domain"));

  const isOperationNotAllowed =
    errorCode === "auth/operation-not-allowed" ||
    (error && error.includes("auth/operation-not-allowed"));

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
          padding: "2.5rem 2rem",
          maxWidth: isUnauthorizedDomain || isOperationNotAllowed ? 440 : 360,
          width: "100%",
          textAlign: "center",
          transition: "max-width 0.2s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SmartFinanceMark size={48} />
        </div>
        <div className="despensa-tab-font" style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Smart<span style={{ color: "var(--sage)" }}>Finance</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 12 }}>
          Pequeños hábitos, grandes resultados
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 22, lineHeight: 1.5 }}>
          Gestiona tus cuentas, deudas, ahorros y presupuesto bajo un entorno privado e independiente.
        </div>

        {!showEmailLogin ? (
          <>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 500,
                background: "var(--ink)",
                color: "var(--paper)",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <LogIn size={15} />
              {loading ? "Conectando…" : "Continuar con Google"}
            </button>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setShowEmailLogin(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                O ingresar con correo y contraseña
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setShowEmailLogin(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "var(--sage)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ¿Eres nuevo? Crea tu cuenta individual gratis
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleEmailPasswordSubmit} style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                {isRegisterMode ? "Crear cuenta nueva" : "Iniciar sesión"}
              </span>
              <button
                type="button"
                onClick={() => setIsRegisterMode((m) => !m)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 11.5,
                  color: "var(--blue)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {isRegisterMode ? "¿Ya tienes cuenta? Ingresar" : "¿Nuevo? Crear cuenta"}
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                placeholder="ejemplo@correo.com"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 500,
                background: isRegisterMode ? "var(--sage)" : "var(--ink)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginBottom: 10,
              }}
            >
              {isRegisterMode ? <UserPlus size={15} /> : <KeyRound size={15} />}
              {loading ? "Procesando…" : isRegisterMode ? "Crear mi cuenta" : "Iniciar sesión"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setShowEmailLogin(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Volver a acceso con Google
              </button>
            </div>
          </form>
        )}

        {isUnauthorizedDomain ? (
          <div
            style={{
              marginTop: 18,
              textAlign: "left",
              background: "var(--amber-bg)",
              border: "1px solid var(--amber)",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 6, color: "#8a5800" }}>
              <AlertTriangle size={16} />
              ¿Por qué ocurre auth/unauthorized-domain?
            </div>
            <p style={{ margin: "0 0 10px", color: "var(--ink-soft)" }}>
              Tu dominio de GitHub Pages (<code>inelsonv.github.io</code>) ya está autorizado en Firebase. Pero este entorno en vivo se ejecuta en:
            </p>

            <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, color: "var(--ink-soft)" }}>
              Dominio de este entorno a autorizar:
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 10px",
                marginBottom: 12,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11.5,
                wordBreak: "break-all",
              }}
            >
              <span>{currentHost}</span>
              <button
                type="button"
                onClick={handleCopyHost}
                title="Copiar dominio"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: copied ? "var(--sage)" : "var(--ink-soft)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginLeft: 8,
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>

            <div style={{ fontWeight: 600, fontSize: 11.5, marginBottom: 6 }}>Para solucionarlo en Firebase Console (igual que hiciste con github.io):</div>
            <ol style={{ margin: "0 0 12px 18px", padding: 0, fontSize: 11.5, color: "var(--ink)" }}>
              <li style={{ marginBottom: 4 }}>
                Abre la{" "}
                <a
                  href="https://console.firebase.google.com/project/finance-6e127/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  Configuración de Firebase Auth
                  <ExternalLink size={11} />
                </a>
              </li>
              <li style={{ marginBottom: 4 }}>
                En <strong>Authorized domains</strong> (junto a <code>inelsonv.github.io</code> y <code>localhost</code>), haz clic en <strong>Add domain</strong>.
              </li>
              <li style={{ marginBottom: 4 }}>
                Pega el dominio copiado arriba (o <code>run.app</code>).
              </li>
              <li>Vuelve a pulsar <strong>Continuar con Google</strong>.</li>
            </ol>
          </div>
        ) : isOperationNotAllowed ? (
          <div
            style={{
              marginTop: 18,
              textAlign: "left",
              background: "var(--amber-bg)",
              border: "1px solid var(--amber)",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 6, color: "#8a5800" }}>
              <AlertTriangle size={16} />
              ¿Por qué ocurre auth/operation-not-allowed?
            </div>
            <p style={{ margin: "0 0 10px", color: "var(--ink-soft)" }}>
              Este error significa que el método de acceso para registrar cuentas con <strong>correo y contraseña</strong> (o cuentas de correo corporativas como <code>inelsonv@bellon.com.do</code>) aún no está habilitado en tu consola de Firebase (<code>finance-6e127</code>).
            </p>

            <div style={{ fontWeight: 600, fontSize: 11.5, marginBottom: 6 }}>
              Cómo habilitarlo en 2 clics (solo toma 30 segundos):
            </div>
            <ol style={{ margin: "0 0 12px 18px", padding: 0, fontSize: 11.5, color: "var(--ink)" }}>
              <li style={{ marginBottom: 4 }}>
                Abre{" "}
                <a
                  href="https://console.firebase.google.com/project/finance-6e127/authentication/providers"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  Métodos de acceso en Firebase Console
                  <ExternalLink size={11} />
                </a>
              </li>
              <li style={{ marginBottom: 4 }}>
                En la lista de proveedores, haz clic en <strong>Correo electrónico/contraseña</strong> (Email/Password).
              </li>
              <li style={{ marginBottom: 4 }}>
                Activa el interruptor <strong>Habilitar</strong> (primer switch) y pulsa <strong>Guardar</strong>.
              </li>
              <li>
                (Opcional): Si deseas permitir acceso con Google para cuentas corporativas de Google Workspace, asegúrate de que el proveedor <strong>Google</strong> también esté habilitado en esa misma pantalla.
              </li>
            </ol>

            <div style={{ textAlign: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setErrorCode(null);
                }}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 11.5,
                  cursor: "pointer",
                  color: "var(--ink)",
                }}
              >
                Entendido, reintentar
              </button>
            </div>
          </div>
        ) : error ? (
          <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--stamp)" }}>{error}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AccessDeniedScreen({ user }) {
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
          padding: "2.5rem 2rem",
          maxWidth: 340,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--stamp-bg)",
            color: "var(--stamp)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <ShieldAlert size={24} />
        </div>
        <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Sin acceso
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 20, lineHeight: 1.5 }}>
          La cuenta <strong style={{ color: "var(--ink)" }}>{user?.email}</strong> no tiene permiso para
          acceder en este momento.
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "10px 16px",
            fontSize: 13.5,
            fontWeight: 500,
            background: "var(--card)",
            color: "var(--ink-soft)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <LogOut size={15} /> Cerrar sesión e intentar con otra cuenta
        </button>
      </div>
    </div>
  );
}
