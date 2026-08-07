import type { BodyName } from "../../lib/jos3-types";
import { TORSO_FRONT } from "./bodyShapes";
import { BodySilhouette } from "./BodySilhouette";

export function BodyFront(props: {
  selectedRegions: BodyName[];
  showLabels?: boolean;
  getFill: (name: BodyName) => string;
  getTooltip?: (name: BodyName) => string;
  onSelectRegion: (name: BodyName, additive: boolean) => void;
}) {
  return <BodySilhouette torso={TORSO_FRONT} viewLabel="Ansicht von vorne" {...props} />;
}
