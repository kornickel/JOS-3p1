import * as RadixSlider from "@radix-ui/react-slider";

export function Slider({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
          {value.toFixed(step < 1 ? 2 : 0)} {unit && <span style={{ color: "var(--text-muted)" }}>{unit}</span>}
        </span>
      </div>
      <RadixSlider.Root
        className="relative flex h-4 w-full touch-none items-center select-none"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track
          className="relative h-1 grow rounded-full"
          style={{ background: "var(--gridline)" }}
        >
          <RadixSlider.Range
            className="absolute h-full rounded-full"
            style={{ background: "var(--series-1)" }}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="block h-4 w-4 rounded-full shadow focus:outline-none focus:ring-2"
          style={{ background: "var(--series-1)" }}
          aria-label={label}
        />
      </RadixSlider.Root>
    </div>
  );
}
