import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary ha capturado un error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            margin: "2rem auto",
            maxWidth: 600,
            padding: "2rem",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "var(--stamp-bg)",
              color: "var(--stamp)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
            Ocurrió un problema al cargar esta sección
          </h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
            {this.state.error?.message || "Error inesperado al renderizar el componente."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={this.handleReset}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
            <button
              onClick={() => {
                if ("caches" in window) {
                  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => {
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--paper)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Recargar y limpiar caché
            </button>
            {this.props.onGoHome && (
              <button
                onClick={this.props.onGoHome}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Home size={14} />
                Ir a Inicio
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
