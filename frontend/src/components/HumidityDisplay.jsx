import React from "react";

export default function TemperatureDisplay({ humidity }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        right: 150,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 8,
        padding: "12px 20px",
        fontSize: 22,
        fontWeight: 600,
        color: "#333",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        zIndex: 10,
      }}
      aria-label="Current humidity">
      💧{" "}
      {humidity !== undefined && humidity !== null
        ? `${humidity}%`
        : "--"}
    </div>
  );
}
