import * as RadixSlider from "@radix-ui/react-slider";

export function TimeScrubber({
  index,
  maxIndex,
  timeLabel,
  onChange,
}: {
  index: number;
  maxIndex: number;
  timeLabel: string;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span style={{ color: "var(--text-secondary)" }}>Zeitpunkt</span>
        <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
          {timeLabel}
        </span>
      </div>
      <RadixSlider.Root
        className="relative flex h-4 w-full touch-none items-center select-none"
        min={0}
        max={maxIndex}
        step={1}
        value={[index]}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="relative h-1 grow rounded-full" style={{ background: "var(--gridline)" }}>
          <RadixSlider.Range className="absolute h-full rounded-full" style={{ background: "var(--series-1)" }} />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className="block h-4 w-4 rounded-full shadow focus:outline-none focus:ring-2"
          style={{ background: "var(--series-1)" }}
          aria-label="Zeitpunkt"
        />
      </RadixSlider.Root>
    </div>
  );
}
