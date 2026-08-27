import React, { useEffect, useState } from "react";
import { Sun, Moon, Mail, LineChart, User as UserIcon, LogOut, Check, HandCoins, PiggyBank } from "lucide-react";
import { watchNotifConfig, saveNotifConfig, watchAccionesConfig, saveAccionesConfig, watchDiezmoConfig, saveDiezmoConfig, watchAhorroAutoConfig, saveAhorroAutoConfig } from "../lib/db";
import { confirm } from "../lib/confirm";

export default function Configuracion({ theme, onToggleTheme, user, onSignOut }) {
  const [emailConfig, setEmailConfig] = useState(undefined);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);

  const [accionesConfig, setAccionesConfig] = useState(undefined);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  const [diezmoConfig, setDiezmoConfig] = useState(undefined);
  const [diezmoPorcentaje, setDiezmoPorcentaje] = useState("10");
  const [savingDiezmo, setSavingDiezmo] = useState(false);

  const [ahorroConfig, setAhorroConfig] = useState(undefined);
  const [ahorroPorcentaje, setAhorroPorcentaje] = useState("10");
  const [savingAhorro, setSavingAhorro] = useState(false);

  useEffect(() => {
    const unsub1 = watchNotifConfig(setEmailConfig, () => {});
    const unsub2 = watchAccionesConfig(setAccionesConfig, () => {});
    const unsub3 = watchDiezmoConfig(setDiezmoConfig, () => {});
    const unsub4 = watchAhorroAutoConfig(setAhorroConfig, () => {});
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  useEffect(() => {
    if (emailConfig?.email) setEmailInput(emailConfig.email);
  }, [emailConfig]);

  useEffect(() => {
    if (accionesConfig?.apiKey) setApiKeyInput(accionesConfig.apiKey);
  }, [accionesConfig]);

  useEffect(() => {
    if (diezmoConfig?.porcentaje != null) setDiezmoPorcentaje(String(diezmoConfig.porcentaje));
  }, [diezmoConfig]);

  useEffect(() => {
    if (ahorroConfig?.porcentaje != null) setAhorroPorcentaje(String(ahorroConfig.porcentaje));
  }, [ahorroConfig]);

  const handleSaveEmail = async () => {
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    try {
      await saveNotifConfig(emailInput.trim());
      setSavedEmail(true);
      setTimeout(() => setSavedEmail(false), 2000);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      await saveAccionesConfig(apiKeyInput.trim());
      setSavedKey(true);
      setTimeout(() => setSavedKey(false), 2000);
    } finally {
      setSavingKey(false);
    }
  };

  const handleToggleDiezmo = async () => {
    setSavingDiezmo(true);
    try {
      await saveDiezmoConfig({ activo: !diezmoConfig?.activo, porcentaje: parseFloat(diezmoPorcentaje) || 10 });
    } finally {
      setSavingDiezmo(false);
    }
  };

  const handleSaveDiezmoPorcentaje = async () => {
    setSavingDiezmo(true);
    try {
      await saveDiezmoConfig({ activo: !!diezmoConfig?.activo, porcentaje: parseFloat(diezmoPorcentaje) || 10 });
    } finally {
      setSavingDiezmo(false);
    }
  };

  const handleToggleAhorro = async () => {
    setSavingAhorro(true);
    try {
      await saveAhorroAutoConfig({
        activo: !ahorroConfig?.activo,
        porcentaje: parseFloat(ahorroPorcentaje) || 10,
        condicionadoADeuda: ahorroConfig?.condicionadoADeuda !== false,
      });
    } finally {
      setSavingAhorro(false);
    }
  };

  const handleSaveAhorroPorcentaje = async () => {
    setSavingAhorro(true);
    try {
      await saveAhorroAutoConfig({
        activo: !!ahorroConfig?.activo,
        porcentaje: parseFloat(ahorroPorcentaje) || 10,
        condicionadoADeuda: ahorroConfig?.condicionadoADeuda !== false,
      });
    } finally {
      setSavingAhorro(false);
    }
  };

  const handleToggleCondicionado = async () => {
    setSavingAhorro(true);
    try {
      await saveAhorroAutoConfig({
        activo: !!ahorroConfig?.activo,
        porcentaje: parseFloat(ahorroPorcentaje) || 10,
        condicionadoADeuda: !(ahorroConfig?.condicionadoADeuda !== false),
      });
    } finally {
      setSavingAhorro(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
      <Section icon={UserIcon} title="Cuenta">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || user.email}
              referrerPolicy="no-referrer"
              style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--line)", objectFit: "cover" }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            {user?.displayName && <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.displayName}</div>}
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            if (await confirm("¿Cerrar sesión?", { confirmLabel: "Cerrar sesión", danger: false })) onSignOut();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 500,
            background: "var(--stamp-bg)",
            color: "var(--stamp)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <LogOut size={13} /> Cerrar sesión
        </button>
      </Section>

      <Section icon={theme === "dark" ? Moon : Sun} title="Apariencia">
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
          Elige entre modo claro u oscuro para toda la app.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => theme !== "light" && onToggleTheme()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 8px",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: theme === "light" ? "var(--sage-bg)" : "var(--card)",
              color: theme === "light" ? "var(--sage)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <Sun size={14} /> Claro
          </button>
          <button
            onClick={() => theme !== "dark" && onToggleTheme()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 8px",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: theme === "dark" ? "var(--sage-bg)" : "var(--card)",
              color: theme === "dark" ? "var(--sage)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <Moon size={14} /> Oscuro
          </button>
        </div>
      </Section>

      <Section icon={Mail} title="Notificaciones por correo">
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.5 }}>
          Correo donde recibes el resumen diario de alertas (pagos, membresías, contratos, productos por
          agotarse). Requiere tener configurada la Cloud Function del aviso diario.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="tu@correo.com"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
          <button
            onClick={handleSaveEmail}
            disabled={savingEmail}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              background: savedEmail ? "var(--sage)" : "var(--ink)",
              color: savedEmail ? "#fff" : "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: savingEmail ? "not-allowed" : "pointer",
            }}
          >
            {savedEmail && <Check size={13} />}
            {savingEmail ? "Guardando…" : savedEmail ? "Guardado" : "Guardar"}
          </button>
        </div>
      </Section>

      <Section icon={LineChart} title="Precios de acciones">
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.5 }}>
          Clave de API de{" "}
          <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" style={{ color: "var(--sage)" }}>
            finnhub.io
          </a>{" "}
          (plan gratis) usada para mostrar precios en Inicio → Acciones.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Tu API key de Finnhub"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
          />
          <button
            onClick={handleSaveApiKey}
            disabled={savingKey}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              background: savedKey ? "var(--sage)" : "var(--ink)",
              color: savedKey ? "#fff" : "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: savingKey ? "not-allowed" : "pointer",
            }}
          >
            {savedKey && <Check size={13} />}
            {savingKey ? "Guardando…" : savedKey ? "Guardado" : "Guardar"}
          </button>
        </div>
      </Section>

      <Section icon={HandCoins} title="Diezmo automático">
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
          Si lo activas, se calcula un porcentaje de tu ingreso mensual neto y se suma automáticamente a Presupuesto
          mensual, repartido entre las dos quincenas.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: diezmoConfig?.activo ? 12 : 0, cursor: "pointer" }}>
          <input type="checkbox" checked={!!diezmoConfig?.activo} onChange={handleToggleDiezmo} disabled={savingDiezmo} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13 }}>Activar diezmo automático</span>
        </label>
        {diezmoConfig?.activo && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              className="despensa-mono"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={diezmoPorcentaje}
              onChange={(e) => setDiezmoPorcentaje(e.target.value)}
              onBlur={handleSaveDiezmoPorcentaje}
              style={{ width: 80, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>% del ingreso mensual</span>
          </div>
        )}
      </Section>

      <Section icon={PiggyBank} title="Modo Ahorro">
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
          Reserva un porcentaje de tu ingreso mensual neto como ahorro, sumado automáticamente a Presupuesto
          mensual, repartido entre las dos quincenas.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: ahorroConfig?.activo ? 10 : 0, cursor: "pointer" }}>
          <input type="checkbox" checked={!!ahorroConfig?.activo} onChange={handleToggleAhorro} disabled={savingAhorro} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: 13 }}>Activar Modo Ahorro</span>
        </label>
        {ahorroConfig?.activo && (
          <>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <input
                className="despensa-mono"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={ahorroPorcentaje}
                onChange={(e) => setAhorroPorcentaje(e.target.value)}
                onBlur={handleSaveAhorroPorcentaje}
                style={{ width: 80, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>% del ingreso mensual</span>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ahorroConfig?.condicionadoADeuda !== false}
                onChange={handleToggleCondicionado}
                disabled={savingAhorro}
                style={{ width: 16, height: 16, marginTop: 1 }}
              />
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                Priorizar gastos fijos y deudas primero: si tu nivel de endeudamiento está "Alto" o "Crítico"
                (más de 35% de tu ingreso comprometido), no aplicar el ahorro esa quincena.
              </span>
            </label>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon size={15} style={{ color: "var(--ink-soft)" }} />
        <span className="despensa-tab-font" style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
