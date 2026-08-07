import type { BodyName } from "../../lib/jos3-types";
import { useT } from "../../lib/i18n";
import { TORSO_BACK } from "./bodyShapes";
import { BodySilhouette } from "./BodySilhouette";

export function BodyBack(props: {
  selectedRegions: BodyName[];
  showLabels?: boolean;
  getFill: (name: BodyName) => string;
  getTooltip?: (name: BodyName) => string;
  onSelectRegion: (name: BodyName, additive: boolean) => void;
}) {
  const t = useT();
  return <BodySilhouette torso={TORSO_BACK} viewLabel={t.bodyView.back} {...props} />;
}
