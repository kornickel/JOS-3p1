import { BodyBuildForm } from "../components/setup/BodyBuildForm";
import { DerivedStatsPanel } from "../components/setup/DerivedStatsPanel";

export function SetupView() {
  return (
    <div className="flex flex-col gap-4">
      <BodyBuildForm />
      <DerivedStatsPanel />
    </div>
  );
}
