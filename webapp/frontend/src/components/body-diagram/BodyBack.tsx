import type { BodyName } from "../../lib/jos3-types";
import { TORSO_BACK } from "./bodyShapes";
import { BodySilhouette } from "./BodySilhouette";

export function BodyBack(props: {
  selectedRegions: BodyName[];
  showLabels?: boolean;
  getFill: (name: BodyName) => string;
  getTooltip?: (name: BodyName) => string;
  onSelectRegion: (name: BodyName, additive: boolean) => void;
}) {
  return <BodySilhouette torso={TORSO_BACK} viewLabel="Ansicht von hinten" {...props} />;
}
