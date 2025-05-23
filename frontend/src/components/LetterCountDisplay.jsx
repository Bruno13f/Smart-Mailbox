import React from "react";

export default function LetterCountDisplay({ count }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 10,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 8,
        padding: "10px 18px",
        fontSize: "1.2em",
        fontWeight: 600,
        color: "#333",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      }}>
      Letters mailed: {count}
    </div>
  );
}
