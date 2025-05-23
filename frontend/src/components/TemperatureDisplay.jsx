import React from "react";

export default function TemperatureDisplay({ temperature }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        right: 20,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 8,
        padding: "12px 20px",
        fontSize: 22,
        fontWeight: 600,
        color: "#333",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        zIndex: 10,
      }}
      aria-label="Current temperature">
      🌡️{" "}
      {temperature !== undefined && temperature !== null
        ? `${temperature}°C`
        : "--"}
    </div>
  );
}
