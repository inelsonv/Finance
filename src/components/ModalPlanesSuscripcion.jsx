import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Users,
  Heart,
  Crown,
  Sparkles,
  UserPlus,
  Trash2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Mail,
  User,
  Info,
} from "lucide-react";
import { confirm } from "../lib/confirm";
import {
  PLANES_DISPONIBLES,
  cambiarPlanSuscripcion,
  asociarParejaPlanDuo,
  desvincularParejaPlanDuo,
} from "../lib/db";

export default function ModalPlanesSuscripcion({
  isOpen,
  onClose,
  user,
  isOwner,
  planActual,
  usuariosRegistrados = [],
}) {
  const [tabActivo, setTabActivo] = useState("planes"); // "planes" | "miembros"
  const [guardando, setGuardando] = useState(false);
  const [emailPareja, setEmailPareja] = useState("");
  const [nombrePareja, setNombrePareja] = useState("");
  const [mensajeExito, setMensajeExito] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const planId = planActual?.planId || "individual";
  const esPlanDuo = planId === "duo";
  const esPlanFamiliar = planId === "familiar";
  const miembros = Array.isArray(planActual?.miembros) ? planActual.miembros : [];
  const parejaActual = miembros.find((m) => m.rol === "pareja" || m.rol === "miembro");

  // Si ya es Plan Dúo, por defecto abrir en la pestaña de miembros si viene a asociar
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setMensajeExito(null);
      if (esPlanDuo) {
        setTabActivo("miembros");
      } else {
        setTabActivo("planes");
      }
    }
  }, [isOpen, esPlanDuo]);

  if (!isOpen) return null;

  const handleCambiarPlan = async (nuevoPlanId) => {
    setGuardando(true);
    setErrorMsg(null);
    setMensajeExito(null);
    try {
      await cambiarPlanSuscripcion({ planId: nuevoPlanId, user });
      setMensajeExito(`¡Te has cambiado al ${PLANES_DISPONIBLES.find((p) => p.id === nuevoPlanId)?.nombre || nuevoPlanId} exitosamente!`);
      if (nuevoPlanId === "duo") {
        setTabActivo("miembros");
      }
    } catch (err) {
      setErrorMsg(err.message || "Error al cambiar de plan.");
    } finally {
      setGuardando(false);
    }
  };

  const handleAsociarPareja = async (e) => {
    if (e) e.preventDefault();
    if (!emailPareja.trim()) {
      setErrorMsg("Por favor escribe el correo de tu pareja.");
      return;
    }
    setGuardando(true);
    setErrorMsg(null);
    setMensajeExito(null);
    try {
      await asociarParejaPlanDuo({
        emailPareja: emailPareja.trim(),
        nombrePareja: nombrePareja.trim() || "Pareja",
        userTitular: user,
      });
      setEmailPareja("");
      setNombrePareja("");
      setMensajeExito("¡Pareja asociada exitosamente a tu Plan Dúo! Ahora pueden compartir el espacio financiero.");
    } catch (err) {
      setErrorMsg(err.message || "No se pudo asociar a la pareja.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDesvincularPareja = async (email) => {
    const seguro = await confirm(
      `¿Deseas desvincular a ${email} de tu Plan Dúo? Ya no tendrá acceso al espacio financiero compartido.`,
      { confirmLabel: "Sí, desvincular", danger: true }
    );
    if (!seguro) return;

    setGuardando(true);
    setErrorMsg(null);
    try {
      await desvincularParejaPlanDuo({ emailPareja: email, userTitular: user });
      setMensajeExito("Pareja desvinculada del Plan Dúo.");
    } catch (err) {
      setErrorMsg(err.message || "No se pudo desvincular a la pareja.");
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar usuarios del directorio para sugerencias (excluyendo al usuario actual)
  const usuariosSugeridos = (usuariosRegistrados || []).filter(
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
        zIndex: 350,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line-soft)",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)",
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
              <Heart size={20} fill="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Planes de Cuenta & Plan Dúo
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
                  {esPlanDuo ? "Plan Dúo Activo ✨" : esPlanFamiliar ? "Plan Familiar Activo" : "Plan Individual"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "3px 0 0" }}>
                Comparte tus finanzas, presupuestos y metas de ahorro en pareja
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

        {/* Pestañas de navegación */}
        <div
          style={{
            display: "flex",
            padding: "8px 16px 0",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--card)",
            gap: 8,
          }}
        >
          <button
            onClick={() => setTabActivo("planes")}
            style={{
              padding: "9px 14px",
              border: "none",
              background: "transparent",
              borderBottom: tabActivo === "planes" ? "2px solid #8b5cf6" : "2px solid transparent",
              color: tabActivo === "planes" ? "#8b5cf6" : "var(--ink-soft)",
              fontWeight: tabActivo === "planes" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={15} /> Planes Disponibles
          </button>
          <button
            onClick={() => setTabActivo("miembros")}
            style={{
              padding: "9px 14px",
              border: "none",
              background: "transparent",
              borderBottom: tabActivo === "miembros" ? "2px solid #8b5cf6" : "2px solid transparent",
              color: tabActivo === "miembros" ? "#8b5cf6" : "var(--ink-soft)",
              fontWeight: tabActivo === "miembros" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={15} />
            Miembros & Pareja
            {esPlanDuo && (
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: parejaActual ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: parejaActual ? "var(--sage)" : "var(--amber)",
                  fontWeight: 700,
                }}
              >
                {parejaActual ? "2/2" : "1/2 cupos"}
              </span>
            )}
          </button>
        </div>

        {/* Mensajes de retroalimentación */}
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

        {/* Contenido del tab */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {tabActivo === "planes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.45 }}>
                Selecciona tu plan preferido. Puedes probar el <strong>Plan Dúo</strong> de inmediato para asociar a tu pareja y sincronizar sus finanzas familiares.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {PLANES_DISPONIBLES.map((plan) => {
                  const esActual = plan.id === planId;
                  const esDuo = plan.id === "duo";

                  return (
                    <div
                      key={plan.id}
                      style={{
                        borderRadius: 12,
                        border: esActual ? `2px solid ${plan.color}` : "1px solid var(--line)",
                        background: esActual ? (esDuo ? "rgba(139, 92, 246, 0.04)" : "var(--paper)") : "var(--card)",
                        padding: "16px 18px",
                        position: "relative",
                        transition: "all 0.18s ease",
                      }}
                    >
                      {esDuo && (
                        <div
                          style={{
                            position: "absolute",
                            top: -10,
                            right: 16,
                            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: 12,
                            letterSpacing: "0.02em",
                            boxShadow: "0 2px 6px rgba(139, 92, 246, 0.3)",
                          }}
                        >
                          ⭐ RECOMENDADO PARA PAREJAS
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                              {plan.nombre}
                            </h3>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: plan.bg,
                                color: plan.color,
                                border: `1px solid ${plan.color}`,
                              }}
                            >
                              {plan.badge}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 10px", lineHeight: 1.4 }}>
                            {plan.descripcion}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                            {plan.precio}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                            {plan.periodo}
                          </div>
                        </div>
                      </div>

                      {/* Lista de características */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "6px 12px",
                          margin: "12px 0 14px",
                          paddingTop: 10,
                          borderTop: "1px dashed var(--line-soft)",
                        }}
                      >
                        {plan.caracteristicas.map((carac, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--ink)" }}>
                            <Check size={13} style={{ color: plan.color, flexShrink: 0 }} />
                            <span>{carac}</span>
                          </div>
                        ))}
                      </div>

                      {/* Botón de acción */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
                        {esActual ? (
                          <button
                            disabled
                            style={{
                              padding: "7px 16px",
                              borderRadius: 8,
                              background: plan.bg,
                              color: plan.color,
                              border: `1px solid ${plan.color}`,
                              fontSize: 12.5,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              cursor: "default",
                            }}
                          >
                            <Check size={14} /> Plan Activo
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCambiarPlan(plan.id)}
                            disabled={guardando}
                            style={{
                              padding: "7px 18px",
                              borderRadius: 8,
                              background: esDuo ? "linear-gradient(135deg, #8b5cf6, #7c3aed)" : "var(--ink)",
                              color: "#fff",
                              border: "none",
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: guardando ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: esDuo ? "0 2px 8px rgba(139, 92, 246, 0.3)" : "none",
                            }}
                          >
                            {guardando ? (
                              <RefreshCw size={14} className="despensa-spin" />
                            ) : (
                              <>
                                Cambiar a {plan.nombre} <ArrowRight size={14} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tabActivo === "miembros" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!esPlanDuo ? (
                /* Advertencia si aún no ha cambiado al plan Duo */
                <div
                  style={{
                    background: "rgba(139, 92, 246, 0.08)",
                    border: "1.5px dashed #8b5cf6",
                    borderRadius: 12,
                    padding: "20px 18px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#8b5cf6",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <Heart size={22} fill="#fff" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
                    Activa el Plan Dúo para agregar a tu pareja
                  </h3>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", maxWidth: 440, margin: "0 auto 16px", lineHeight: 1.45 }}>
                    Actualmente estás en el <strong>Plan Individual</strong> (1 solo usuario). Al cambiar al Plan Dúo desbloqueas el segundo cupo para que tu pareja pueda entrar y administrar juntos las finanzas.
                  </p>
                  <button
                    onClick={() => handleCambiarPlan("duo")}
                    disabled={guardando}
                    style={{
                      padding: "9px 22px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      color: "#fff",
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: guardando ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 3px 12px rgba(139, 92, 246, 0.35)",
                    }}
                  >
                    {guardando ? <RefreshCw size={14} className="despensa-spin" /> : <Sparkles size={15} />}
                    Cambiar al Plan Dúo ahora
                  </button>
                </div>
              ) : (
                /* Vista completa de gestión de miembros para el Plan Dúo */
                <>
                  {/* Resumen de cupos */}
                  <div
                    style={{
                      background: "var(--card-subtle, rgba(0,0,0,0.02))",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Heart size={15} style={{ color: "#8b5cf6" }} fill="#8b5cf6" />
                        Cupos del Plan Dúo:
                        <span style={{ color: "#8b5cf6" }}>
                          {parejaActual ? "2 de 2 usuarios ocupados" : "1 de 2 usuarios (1 disponible)"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                        Ambos usuarios comparten las cuentas bancarias, gastos y presupuestos en tiempo real.
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: parejaActual ? "var(--sage-bg)" : "rgba(245, 158, 11, 0.15)",
                          color: parejaActual ? "var(--sage)" : "var(--amber)",
                          border: `1px solid ${parejaActual ? "var(--sage)" : "var(--amber)"}`,
                        }}
                      >
                        {parejaActual ? "✓ Pareja Conectada" : "Esperando Pareja"}
                      </span>
                    </div>
                  </div>

                  {/* Miembros actuales */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Miembros del Plan ({miembros.length})
                    </div>

                    {/* Tarjeta del Titular */}
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        background: "var(--paper)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--amber-bg)",
                            color: "var(--amber)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--amber)",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          <Crown size={16} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                              {user?.displayName || "Titular"}
                            </span>
                            <span style={{ fontSize: 9.5, fontWeight: 700, background: "var(--amber)", color: "#fff", padding: "1px 6px", borderRadius: 4 }}>
                              Titular / Administrador
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--sage)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <ShieldCheck size={14} /> Activo
                      </div>
                    </div>

                    {/* Tarjeta de la Pareja (si ya está asociada) */}
                    {parejaActual ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1.5px solid #8b5cf6",
                          background: "rgba(139, 92, 246, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
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
                              fontSize: 13,
                            }}
                          >
                            <Heart size={16} fill="#fff" />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                                {parejaActual.nombre || "Pareja"}
                              </span>
                              <span style={{ fontSize: 9.5, fontWeight: 700, background: "#8b5cf6", color: "#fff", padding: "1px 6px", borderRadius: 4 }}>
                                Pareja Vinculada
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                              {parejaActual.email}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--sage)", fontWeight: 600 }}>
                            Acceso compartido activo
                          </span>
                          <button
                            onClick={() => handleDesvincularPareja(parejaActual.email)}
                            disabled={guardando}
                            title="Desvincular pareja"
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "1px solid var(--stamp)",
                              background: "transparent",
                              color: "var(--stamp)",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: guardando ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Trash2 size={12} /> Desvincular
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Formulario para asociar pareja si aún no hay una vinculada */}
                  {!parejaActual ? (
                    <div
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: "16px 18px",
                        marginTop: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <UserPlus size={16} style={{ color: "#8b5cf6" }} />
                        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                          Asociar Pareja o Segundo Usuario
                        </h4>
                      </div>

                      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.45 }}>
                        Ingresa el correo electrónico con el que tu pareja inicia sesión en Smart Finance. Al asociarla, quedará vinculada automáticamente a tu espacio.
                      </p>

                      <form onSubmit={handleAsociarPareja} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>
                            Correo de tu pareja:
                          </label>
                          <div style={{ position: "relative" }}>
                            <Mail
                              size={15}
                              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }}
                            />
                            <input
                              type="email"
                              value={emailPareja}
                              onChange={(e) => setEmailPareja(e.target.value)}
                              placeholder="ej: pareja@gmail.com o correo corporativo"
                              required
                              style={{
                                width: "100%",
                                padding: "8px 10px 8px 32px",
                                borderRadius: 8,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                color: "var(--ink)",
                                fontSize: 13,
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>
                            Nombre o Apodo (Opcional):
                          </label>
                          <div style={{ position: "relative" }}>
                            <User
                              size={15}
                              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }}
                            />
                            <input
                              type="text"
                              value={nombrePareja}
                              onChange={(e) => setNombrePareja(e.target.value)}
                              placeholder="ej: Mi Esposa, Laura, Carlos..."
                              style={{
                                width: "100%",
                                padding: "8px 10px 8px 32px",
                                borderRadius: 8,
                                border: "1px solid var(--line)",
                                background: "var(--card)",
                                color: "var(--ink)",
                                fontSize: 13,
                              }}
                            />
                          </div>
                        </div>

                        {/* Botón de vincular */}
                        <button
                          type="submit"
                          disabled={guardando || !emailPareja.trim()}
                          style={{
                            marginTop: 6,
                            padding: "9px 18px",
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                            color: "#fff",
                            border: "none",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: guardando ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                          }}
                        >
                          {guardando ? (
                            <RefreshCw size={15} className="despensa-spin" />
                          ) : (
                            <>
                              <Heart size={15} fill="#fff" /> Vincular Pareja al Plan Dúo
                            </>
                          )}
                        </button>
                      </form>

                      {/* Sugerencias rápidas de usuarios registrados */}
                      {usuariosSugeridos.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed var(--line-soft)" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8 }}>
                            O selecciona un usuario registrado:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {usuariosSugeridos.slice(0, 3).map((u) => (
                              <button
                                key={u.id || u.uid}
                                type="button"
                                onClick={() => {
                                  setEmailPareja(u.email || "");
                                  setNombrePareja(u.displayName || "");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 10px",
                                  borderRadius: 7,
                                  border: "1px solid var(--line-soft)",
                                  background: "var(--paper)",
                                  color: "var(--ink)",
                                  fontSize: 12,
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <span>
                                  <strong>{u.displayName || "Usuario"}</strong> ({u.email})
                                </span>
                                <span style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600 }}>
                                  Usar correo →
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Guía explicativa del ciclo */}
                  <div
                    style={{
                      background: "rgba(139, 92, 246, 0.04)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>
                      💡 ¿Cómo funciona el ciclo para tu pareja?
                    </strong>
                    1. Tú la asocias aquí ingresando su correo.
                    <br />
                    2. Cuando ella entra o inicia sesión en Smart Finance con ese correo, el sistema la reconoce como tu pareja del Plan Dúo.
                    <br />
                    3. Ambos verán y sincronizarán el mismo panel, cuentas bancarias, deudas, presupuesto y metas juntos.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--card)",
          }}
        >
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
            Smart Finance · Planes y Finanzas en Pareja
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
