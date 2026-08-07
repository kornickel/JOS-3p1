import { BodyBuildForm } from "../components/setup/BodyBuildForm";
import { DerivedStatsPanel } from "../components/setup/DerivedStatsPanel";

export function PersonView() {
  return (
    <div className="flex flex-col gap-4">
      <BodyBuildForm />
      <DerivedStatsPanel />
    </div>
  );
}
