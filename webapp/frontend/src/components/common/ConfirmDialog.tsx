import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Übernehmen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "color-mix(in srgb, black 45%, transparent)" }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-lg border p-5 shadow-lg"
        style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="confirm-dialog-title" className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </h4>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--series-1)", color: "white" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
