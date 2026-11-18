"use client";

import { useState, type ComponentProps } from "react";

export function PasswordInput({
  label = "password",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 8,
      }}
    >
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="app-chip"
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
