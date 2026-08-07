import { useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { BODY_NAMES } from "../../lib/bodyNames";
import type { BodyName, Segment } from "../../lib/jos3-types";
import { regionHasDivergentOverride, useEffectiveRegionSnapshot } from "../../lib/regionValues";
import { useScenarioStore } from "../../store/scenarioStore";
import { BodyBack } from "./BodyBack";
import { BodyFront } from "./BodyFront";
import { MultiRegionPanel } from "./MultiRegionPanel";
import { RegionPanel } from "./RegionPanel";
import { Card } from "../common/Card";

export function BodyDiagramInput({ segments, index }: { segments: Segment[]; index: number }) {
  const [view, setView] = useState<"front" | "back">("front");
  const selectedRegions = useScenarioStore((s) => s.selectedRegions);
  const selectRegion = useScenarioStore((s) => s.selectRegion);
  const toggleRegionSelection = useScenarioStore((s) => s.toggleRegionSelection);
  const selectAllRegions = useScenarioStore((s) => s.selectAllRegions);
  const clearRegionSelection = useScenarioStore((s) => s.clearRegionSelection);
  const segment = segments[index];
  const snapshot = useEffectiveRegionSnapshot(segments, index);

  if (!segment) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Lege zuerst ein Szenario-Segment an.
      </p>
    );
  }

  const isAllSelected = selectedRegions.length === BODY_NAMES.length;

  const handleSelectRegion = (name: BodyName, additive: boolean) => {
    if (additive) toggleRegionSelection(name);
    else selectRegion(name);
  };

  const getFill = (name: BodyName): string => {
    if (selectedRegions.includes(name)) {
      return "color-mix(in srgb, var(--series-1) 25%, var(--surface-1))";
    }
    if (regionHasDivergentOverride(snapshot, name)) {
      return "color-mix(in srgb, var(--series-4) 30%, var(--surface-1))";
    }
    return "var(--surface-1)";
  };

  const hint =
    selectedRegions.length === 0
      ? "Region anklicken, um sie zu bearbeiten — mit Umschalt/Strg-Klick mehrere auswählen."
      : isAllSelected
        ? "Alle Körperteile ausgewählt — Änderungen wirken auf das ganze Segment."
        : selectedRegions.length > 1
          ? `${selectedRegions.length} Körperteile ausgewählt — Änderungen wirken auf die Auswahl.`
          : "Region anklicken, um sie rechts zu bearbeiten.";

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
            <BodyFront selectedRegions={selectedRegions} getFill={getFill} onSelectRegion={handleSelectRegion} />
          ) : (
            <BodyBack selectedRegions={selectedRegions} getFill={getFill} onSelectRegion={handleSelectRegion} />
          )}
          <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={selectAllRegions}
              className="flex-1 rounded border py-1.5 text-xs font-medium"
              style={{
                borderColor: "var(--gridline)",
                background: isAllSelected ? "var(--series-1)" : "transparent",
                color: isAllSelected ? "white" : "var(--text-secondary)",
              }}
            >
              Alle Körperteile
            </button>
            {selectedRegions.length > 0 && (
              <button
                type="button"
                onClick={clearRegionSelection}
                className="rounded border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
              >
                Auswahl aufheben
              </button>
            )}
          </div>
        </Card>
        <Card>
          {selectedRegions.length > 1 ? (
            <MultiRegionPanel segments={segments} index={index} regions={selectedRegions} />
          ) : selectedRegions.length === 1 ? (
            <RegionPanel segments={segments} index={index} region={selectedRegions[0]} />
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
