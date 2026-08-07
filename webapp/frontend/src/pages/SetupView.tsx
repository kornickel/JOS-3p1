import { useEffect } from "react";
import { BodyDiagramInput } from "../components/body-diagram/BodyDiagramInput";
import { SegmentEditor } from "../components/timeline/SegmentEditor";
import { SegmentList } from "../components/timeline/SegmentList";
import { useScenarioStore } from "../store/scenarioStore";

export function SetupView() {
  const segments = useScenarioStore((s) => s.segments);
  const selectedSegmentId = useScenarioStore((s) => s.selectedSegmentId);
  const ensureAtLeastOneSegment = useScenarioStore((s) => s.ensureAtLeastOneSegment);

  useEffect(() => {
    ensureAtLeastOneSegment();
  }, [ensureAtLeastOneSegment]);

  const rawIndex = segments.findIndex((s) => s.id === selectedSegmentId);
  const index = rawIndex >= 0 ? rawIndex : 0;

  return (
    <div className="grid grid-cols-[minmax(0,320px)_1fr] gap-6">
      <SegmentList />
      {segments[index] && (
        <div className="flex flex-col gap-4">
          <SegmentEditor segments={segments} index={index} />
          <BodyDiagramInput segments={segments} index={index} />
        </div>
      )}
    </div>
  );
}
