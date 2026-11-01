import React, { useState } from "react";
import {
  X,
  Users,
  Heart,
  Share2,
  Check,
  Info,
  Trash2,
  UserPlus,
  ShieldCheck,
  Eye,
  Mail,
  Sparkles,
} from "lucide-react";
import { confirm } from "../lib/confirm";
import { compartirPresupuestoPlanDuo, desvincularPresupuestoCompartido } from "../lib/db";

export default function ModalCompartirPresupuesto({
  isOpen,
  onClose,
  user,
  isOwner,
  planActual,
  usuariosRegistrados = [],
  infoCompartido,
  onAbrirPlanes,
  onSeleccionarVistaCompartida,
}) {
  const [emailDestino, setEmailDestino] = useState("");
  const [nombreDestino, setNombreDestino] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const planId = planActual?.planId || "individual";
  const esPlanDuo = planId === "duo" || isOwner;
  const miembros = Array.isArray(planActual?.miembros) ? planActual.miembros : [];
  const parejaActual = miembros.find((m) => m.rol === "pareja" || m.rol === "miembro");

  const handleCompartir = async (e) => {
    if (e) e.preventDefault();
    const emailLimpio = emailDestino.trim().toLowerCase();
    if (!emailLimpio) {
      setErrorMsg("Ingresa el correo electrónico del usuario a quien deseas compartirle el presupuesto.");
      return;
    }
    if (emailLimpio === (user?.email || "").toLowerCase().trim()) {
      setErrorMsg("No puedes compartir el presupuesto contigo mismo.");
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    setMensajeExito(null);

    try {
      await compartirPresupuestoPlanDuo({
        emailDestino: emailLimpio,
        nombreDestino: nombreDestino.trim() || emailLimpio.split("@")[0],
        userTitular: user,
      });
      setEmailDestino("");
      setNombreDestino("");
      setMensajeExito(
        `¡Presupuesto compartido exitosamente con ${emailLimpio}! Si ese usuario tiene Plan Individual, ahora podrá ver tu presupuesto en tiempo real mientras conserva sus cuentas personales privadas.`
      );
    } catch (err) {
      setErrorMsg(err.message || "No se pudo compartir el presupuesto.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDesvincular = async (email) => {
    const seguro = await confirm(
      `¿Deseas revocar el acceso al presupuesto para ${email}? Ya no podrá visualizar este presupuesto.`,
      { confirmLabel: "Sí, revocar acceso", danger: true }
    );
    if (!seguro) return;

    setGuardando(true);
    setErrorMsg(null);
    setMensajeExito(null);

    try {
      await desvincularPresupuestoCompartido({ emailDestino: email, userTitular: user });
      setMensajeExito(`Se revocó el acceso al presupuesto para ${email}.`);
    } catch (err) {
      setErrorMsg(err.message || "No se pudo revocar el acceso.");
    } finally {
      setGuardando(false);
    }
  };

  // Sugerir otros usuarios registrados
  const sugerencias = (usuariosRegistrados || []).filter(
    (u) => (u.email || "").toLowerCase() !== (user?.email || "").toLowerCase()
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          maxWidth: 580,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line-soft)",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#8b5cf6",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(139, 92, 246, 0.35)",
              }}
            >
              <Share2 size={19} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Compartir Presupuesto (Plan Dúo)
                </h2>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: esPlanDuo ? "rgba(139, 92, 246, 0.18)" : "var(--sage-bg)",
                    color: esPlanDuo ? "#8b5cf6" : "var(--sage)",
                    border: `1px solid ${esPlanDuo ? "#8b5cf6" : "var(--sage)"}`,
                  }}
                >
                  {esPlanDuo ? "Plan Dúo" : "Plan Individual"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "3px 0 0" }}>
                Sincronización en tiempo real entre Plan Dúo y Plan Individual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensajes */}
        {mensajeExito && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--sage-bg)",
              color: "var(--sage)",
              border: "1px solid var(--sage)",
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={16} />
            <span>{mensajeExito}</span>
          </div>
        )}
        {errorMsg && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--stamp-bg)",
              color: "var(--stamp)",
              border: "1px solid var(--stamp)",
              fontSize: 12.5,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Info size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cuerpo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Caso 1: El usuario actual tiene Plan Dúo (o es Titular) */}
          {esPlanDuo ? (
            <>
              {/* Tarjeta explicativa sobre compatibilidad con Plan Individual */}
              <div
                style={{
                  background: "rgba(139, 92, 246, 0.06)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 12,
                }}
              >
                <ShieldCheck size={20} style={{ color: "#8b5cf6", flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
                  <strong>Compatibilidad Total con Plan Individual:</strong>
                  <br />
                  Puedes compartir tu presupuesto con cualquier usuario, <strong>incluso si tiene una cuenta con Plan Individual</strong>.
                  El usuario podrá ver tu presupuesto en tiempo real mientras que todas sus cuentas bancarias, tarjetas y registros personales se mantienen <strong>100% aislados y privados</strong>.
                </div>
              </div>

              {/* Si ya hay una pareja o usuario vinculado */}
              {parejaActual ? (
                <div
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Usuario vinculado actualmente
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "var(--sage)",
                      }}
                    >
                      ✓ Acceso Activo al Presupuesto
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#8b5cf6",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {(parejaActual.nombre || parejaActual.email || "P").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                          {parejaActual.nombre || "Usuario Invitado"}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                          {parejaActual.email}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDesvincular(parejaActual.email)}
                      disabled={guardando}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "var(--stamp-bg)",
                        color: "var(--stamp)",
                        border: "1px solid var(--stamp)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: guardando ? "not-allowed" : "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                      Revocar Acceso
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Formulario para compartir o cambiar usuario */}
              <form onSubmit={handleCompartir} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                  {parejaActual ? "Cambiar o invitar a otro usuario:" : "Compartir presupuesto con otro usuario:"}
                </span>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Correo electrónico del usuario:
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} />
                    <input
                      type="email"
                      value={emailDestino}
                      onChange={(e) => setEmailDestino(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px 9px 36px",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        background: "var(--paper)",
                        color: "var(--ink)",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {sugerencias.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                      Usuarios registrados sugeridos:
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {sugerencias.map((s) => (
                        <button
                          key={s.id || s.email}
                          type="button"
                          onClick={() => {
                            setEmailDestino(s.email || "");
                            if (s.displayName) setNombreDestino(s.displayName);
                          }}
                          style={{
                            padding: "4px 9px",
                            borderRadius: 14,
                            background: emailDestino.toLowerCase() === (s.email || "").toLowerCase() ? "#8b5cf6" : "var(--paper)",
                            color: emailDestino.toLowerCase() === (s.email || "").toLowerCase() ? "#fff" : "var(--ink)",
                            border: "1px solid var(--line)",
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {s.displayName ? `${s.displayName} (${s.email})` : s.email}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
                    Nombre o alias (opcional):
                  </label>
                  <input
                    type="text"
                    value={nombreDestino}
                    onChange={(e) => setNombreDestino(e.target.value)}
                    placeholder="Ej. Mi pareja, Esposa/o, Socio"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
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
                  disabled={guardando}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "11px 18px",
                    borderRadius: 10,
                    background: "#8b5cf6",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: guardando ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                    marginTop: 4,
                  }}
                >
                  <UserPlus size={16} />
                  {guardando ? "Vinculando..." : "Compartir Presupuesto"}
                </button>
              </form>
            </>
          ) : (
            /* Caso 2: El usuario actual tiene Plan Individual */
            <>
              {infoCompartido?.tieneAcceso ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "rgba(139, 92, 246, 0.08)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: 12,
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Eye size={18} style={{ color: "#8b5cf6" }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                        Tienes acceso al Presupuesto Plan Dúo
                      </span>
                    </div>

                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>
                      El titular <strong>{infoCompartido.titularEmail}</strong> te ha compartido su presupuesto familiar en tiempo real.
                      Tu cuenta conserva su <strong>Plan Individual</strong> gratuito y todos tus datos personales permanecen privados.
                    </p>

                    <button
                      onClick={() => {
                        onSeleccionarVistaCompartida && onSeleccionarVistaCompartida();
                        onClose();
                      }}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 8,
                        background: "#8b5cf6",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Eye size={15} />
                      Ver Presupuesto Compartido Ahora
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center", padding: "16px 8px" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(139, 92, 246, 0.1)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                    }}
                  >
                    <Heart size={24} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>
                      Comparte tus finanzas con el Plan Dúo
                    </h3>
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>
                      Actualmente tienes el <strong>Plan Individual</strong>. Para compartir tu presupuesto con tu pareja o familiares, puedes activar el Plan Dúo o pedirle a un usuario con Plan Dúo que te agregue.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onAbrirPlanes && onAbrirPlanes();
                    }}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 10,
                      background: "#8b5cf6",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                      alignSelf: "center",
                    }}
                  >
                    <Sparkles size={16} />
                    Ver Planes Disponibles
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
