import React from "react";

export default function MailButton({ onClick, disabled }) {
  return (
    <button
      style={{
        position: "absolute",
        zIndex: 10,
        top: 20,
        left: 20,
        padding: "10px 20px",
        fontSize: "1.1em",
      }}
      onClick={onClick}
      disabled={disabled}>
      Mail Letter
    </button>
  );
}
