import { useEffect } from "react";
import { SegmentEditor } from "../components/timeline/SegmentEditor";
import { SegmentList } from "../components/timeline/SegmentList";
import { useScenarioStore } from "../store/scenarioStore";

export function TimelineView() {
  const segments = useScenarioStore((s) => s.segments);
  const selectedSegmentId = useScenarioStore((s) => s.selectedSegmentId);
  const ensureAtLeastOneSegment = useScenarioStore((s) => s.ensureAtLeastOneSegment);

  useEffect(() => {
    ensureAtLeastOneSegment();
  }, [ensureAtLeastOneSegment]);

  const segment = segments.find((s) => s.id === selectedSegmentId) ?? segments[0];

  return (
    <div className="grid grid-cols-[minmax(0,320px)_1fr] gap-6">
      <SegmentList />
      {segment && <SegmentEditor segment={segment} />}
    </div>
  );
}
