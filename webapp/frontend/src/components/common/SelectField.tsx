import type { EnumOption } from "../../lib/jos3-types";

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: EnumOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <select
        className="rounded border px-2 py-1.5 text-sm outline-none focus:ring-2"
        style={{
          borderColor: "var(--gridline)",
          background: "var(--surface-1)",
          color: "var(--text-primary)",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
