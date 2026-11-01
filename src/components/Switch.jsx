import React from "react";

export default function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: checked ? "var(--sage)" : "var(--line)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.2s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}
