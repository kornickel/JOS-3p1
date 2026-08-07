import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${className}`}
      style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
    >
      {title && (
        <h3 className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
