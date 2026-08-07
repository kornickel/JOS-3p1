import { useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { BodyName, Segment } from "../../lib/jos3-types";
import { regionHasDivergentOverride, useEffectiveRegionSnapshot } from "../../lib/regionValues";
import { useScenarioStore } from "../../store/scenarioStore";
import { BodyBack } from "./BodyBack";
import { BodyFront } from "./BodyFront";
import { RegionPanel } from "./RegionPanel";
import { Card } from "../common/Card";

export function BodyDiagramInput({ segments, index }: { segments: Segment[]; index: number }) {
  const [view, setView] = useState<"front" | "back">("front");
  const selectedRegion = useScenarioStore((s) => s.selectedRegion);
  const selectRegion = useScenarioStore((s) => s.selectRegion);
  const segment = segments[index];
  const snapshot = useEffectiveRegionSnapshot(segments, index);

  if (!segment) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Lege zuerst ein Szenario-Segment an.
      </p>
    );
  }

  const getFill = (name: BodyName): string => {
    if (name === selectedRegion) return "color-mix(in srgb, var(--series-1) 25%, var(--surface-1))";
    if (regionHasDivergentOverride(snapshot, name)) {
      return "color-mix(in srgb, var(--series-4) 30%, var(--surface-1))";
    }
    return "var(--surface-1)";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,260px)_1fr] gap-6">
        <Card>
          <div className="mb-3 flex justify-center">
            <ToggleGroup.Root
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as "front" | "back")}
              className="inline-flex rounded border"
              style={{ borderColor: "var(--gridline)" }}
            >
              {(["front", "back"] as const).map((v) => (
                <ToggleGroup.Item
                  key={v}
                  value={v}
                  className="px-3 py-1 text-xs"
                  style={{
                    background: view === v ? "var(--series-1)" : "transparent",
                    color: view === v ? "white" : "var(--text-secondary)",
                  }}
                >
                  {v === "front" ? "Vorne" : "Hinten"}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </div>
          {view === "front" ? (
            <BodyFront selectedRegion={selectedRegion} getFill={getFill} onSelectRegion={selectRegion} />
          ) : (
            <BodyBack selectedRegion={selectedRegion} getFill={getFill} onSelectRegion={selectRegion} />
          )}
          <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Region anklicken, um sie rechts zu bearbeiten.
          </p>
        </Card>
        <Card>
          {selectedRegion ? (
            <RegionPanel segments={segments} index={index} region={selectedRegion} />
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Wähle links eine Körperregion aus, um ihre Parameter für das Segment „{segment.label}“ zu
              bearbeiten.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
