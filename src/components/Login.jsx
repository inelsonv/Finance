import React, { useEffect, useState } from "react";
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, signOut, GoogleAuthProvider } from "firebase/auth";
import { LogIn, LogOut, ShieldAlert, Wallet, Copy, Check, ExternalLink, AlertTriangle, KeyRound } from "lucide-react";
import { auth, googleProvider, ALLOWED_EMAIL, setCachedAccessToken } from "../firebase";

export function LoginScreen() {
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailInput, setEmailInput] = useState(ALLOWED_EMAIL);
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

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
    } catch (err) {
      setErrorCode(err.code);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const isUnauthorizedDomain =
    errorCode === "auth/unauthorized-domain" ||
    (error && error.includes("auth/unauthorized-domain"));

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
          maxWidth: isUnauthorizedDomain ? 440 : 360,
          width: "100%",
          textAlign: "center",
          transition: "max-width 0.2s ease",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--sage-bg)",
            color: "var(--sage)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Wallet size={24} />
        </div>
        <div className="despensa-tab-font" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          Smart Finance
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 20, lineHeight: 1.5 }}>
          Tus finanzas son privadas. Accede con tu cuenta ({ALLOWED_EMAIL}).
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

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowEmailLogin(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                O iniciar con contraseña (sin validar dominios)
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleEmailPasswordLogin} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
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
                placeholder="Contraseña de Firebase"
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
                background: "var(--ink)",
                color: "var(--paper)",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginBottom: 10,
              }}
            >
              <KeyRound size={15} />
              {loading ? "Iniciando…" : "Iniciar sesión con contraseña"}
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
          entrar a esta app. Solo <strong style={{ color: "var(--ink)" }}>{ALLOWED_EMAIL}</strong> puede
          acceder.
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
