import type { BodyName } from "../../lib/jos3-types";
import { SHARED_REGIONS, VIEW_BOX, type RegionShape } from "./bodyShapes";
import { BodyRegion } from "./BodyRegion";

export function BodySilhouette({
  torso,
  viewLabel,
  selectedRegion,
  showLabels = true,
  getFill,
  getTooltip,
  onSelectRegion,
}: {
  torso: RegionShape;
  viewLabel: string;
  selectedRegion: BodyName | null;
  showLabels?: boolean;
  getFill: (name: BodyName) => string;
  getTooltip?: (name: BodyName) => string;
  onSelectRegion: (name: BodyName) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={VIEW_BOX} className="w-full max-w-[220px]" role="img" aria-label={viewLabel}>
        {/* limbs first (background layer), then torso, then head on top */}
        {SHARED_REGIONS.map((shape) => (
          <BodyRegion
            key={shape.name}
            shape={shape}
            fill={getFill(shape.name)}
            selected={selectedRegion === shape.name}
            showLabel={showLabels}
            tooltip={getTooltip?.(shape.name)}
            onSelect={() => onSelectRegion(shape.name)}
          />
        ))}
        <BodyRegion
          shape={torso}
          fill={getFill(torso.name)}
          selected={selectedRegion === torso.name}
          showLabel={showLabels}
          tooltip={getTooltip?.(torso.name)}
          onSelect={() => onSelectRegion(torso.name)}
        />
      </svg>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {viewLabel}
      </span>
    </div>
  );
}
