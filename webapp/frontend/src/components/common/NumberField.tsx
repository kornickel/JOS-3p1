export function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label} {unit && <span style={{ color: "var(--text-muted)" }}>[{unit}]</span>}
      </span>
      <input
        type="number"
        className="rounded border px-2 py-1.5 text-sm outline-none focus:ring-2"
        style={{
          borderColor: "var(--gridline)",
          background: "var(--surface-1)",
          color: "var(--text-primary)",
        }}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
