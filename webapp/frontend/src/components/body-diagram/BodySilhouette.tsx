import type { BodyName } from "../../lib/jos3-types";
import { SHARED_REGIONS, VIEW_BOX, type RegionShape } from "./bodyShapes";
import { BodyRegion } from "./BodyRegion";

export function BodySilhouette({
  torso,
  viewLabel,
  selectedRegions,
  showLabels = true,
  getFill,
  getTooltip,
  onSelectRegion,
}: {
  torso: RegionShape;
  viewLabel: string;
  selectedRegions: BodyName[];
  showLabels?: boolean;
  getFill: (name: BodyName) => string;
  getTooltip?: (name: BodyName) => string;
  onSelectRegion: (name: BodyName, additive: boolean) => void;
}) {
  const isSelected = (name: BodyName) => selectedRegions.includes(name);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={VIEW_BOX} className="w-full max-w-[220px]" role="img" aria-label={viewLabel}>
        {/* limbs first (background layer), then torso, then head on top */}
        {SHARED_REGIONS.map((shape) => (
          <BodyRegion
            key={shape.name}
            shape={shape}
            fill={getFill(shape.name)}
            selected={isSelected(shape.name)}
            showLabel={showLabels}
            tooltip={getTooltip?.(shape.name)}
            onSelect={(additive) => onSelectRegion(shape.name, additive)}
          />
        ))}
        <BodyRegion
          shape={torso}
          fill={getFill(torso.name)}
          selected={isSelected(torso.name)}
          showLabel={showLabels}
          tooltip={getTooltip?.(torso.name)}
          onSelect={(additive) => onSelectRegion(torso.name, additive)}
        />
      </svg>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {viewLabel}
      </span>
    </div>
  );
}
