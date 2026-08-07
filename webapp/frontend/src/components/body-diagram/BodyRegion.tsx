import type { KeyboardEvent, MouseEvent } from "react";
import type { RegionShape } from "./bodyShapes";
import { shapeCenter } from "./bodyShapes";
import { bodyLabel, inlineLabel } from "../../lib/bodyNames";

export function BodyRegion({
  shape,
  fill,
  selected,
  showLabel,
  tooltip,
  onSelect,
}: {
  shape: RegionShape;
  fill: string;
  selected: boolean;
  showLabel: boolean;
  tooltip?: string;
  // `additive` is true when the click/keypress carried Shift or Ctrl/Cmd --
  // the caller adds/removes this region from the selection instead of
  // replacing it.
  onSelect: (additive: boolean) => void;
}) {
  const common = {
    "data-region": shape.name,
    fill,
    stroke: selected ? "var(--series-1)" : "var(--border-ring)",
    strokeWidth: selected ? 2 : 1,
    onClick: (e: MouseEvent) => onSelect(e.shiftKey || e.ctrlKey || e.metaKey),
    role: "button" as const,
    tabIndex: 0,
    "aria-label": bodyLabel(shape.name),
    style: { cursor: "pointer", outline: "none" },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
      }
    },
  };

  const center = shapeCenter(shape);

  return (
    <g>
      <title>{tooltip ?? bodyLabel(shape.name)}</title>
      {shape.kind === "circle" && <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />}
      {shape.kind === "ellipse" && (
        <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />
      )}
      {shape.kind === "rect" && (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          {...common}
        />
      )}
      {showLabel && (
        <text
          x={center.x}
          y={center.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          pointerEvents="none"
          style={{ fill: "var(--text-primary)", opacity: 0.65 }}
        >
          {inlineLabel(shape.name)}
        </text>
      )}
    </g>
  );
}
