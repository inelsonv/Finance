import React, { useEffect, useState } from "react";
import { signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { LogIn, LogOut, ShieldAlert, Wallet } from "lucide-react";
import { auth, googleProvider, ALLOWED_EMAIL } from "../firebase";

export function LoginScreen() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const fallbackCodes = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"];
      if (fallbackCodes.includes(err.code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (err2) {
          setError(err2.message || String(err2));
        }
      } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(err.message || String(err));
      }
    } finally {
      setLoading(false);
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
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 24, lineHeight: 1.5 }}>
          Tus finanzas son privadas. Inicia sesión con Google para continuar.
        </div>

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

        {error && (
          <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--stamp)" }}>{error}</div>
        )}
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
