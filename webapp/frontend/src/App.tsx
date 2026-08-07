import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { loadScenario } from "./lib/api";
import { PersonView } from "./pages/PersonView";
import { ResultsView } from "./pages/ResultsView";
import { SetupView } from "./pages/SetupView";
import { useScenarioStore } from "./store/scenarioStore";

const EXAMPLE_SCENARIO_NAME = "Mountain Hike Example";

function App() {
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);
  const activeTab = useScenarioStore((s) => s.activeTab);
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);
  const loadSpec = useScenarioStore((s) => s.loadSpec);
  const ensureAtLeastOneSegment = useScenarioStore((s) => s.ensureAtLeastOneSegment);

  useEffect(() => {
    if (attempted.current) return; // guards against StrictMode's double-invoke
    attempted.current = true;
    loadScenario(EXAMPLE_SCENARIO_NAME)
      .then(loadSpec)
      .catch(() => ensureAtLeastOneSegment())
      .finally(() => setReady(true));
  }, [loadSpec, ensureAtLeastOneSegment]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Lade Beispielszenario…
        </p>
      </div>
    );
  }

  return (
    <AppShell
      title="JOS-3 Thermophysiologie-Simulator"
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      tabs={[
        { value: "person", label: "Person", content: <PersonView /> },
        { value: "setup", label: "Setup", content: <SetupView /> },
        { value: "results", label: "Ausführen & Ergebnisse", content: <ResultsView /> },
      ]}
    />
  );
}

export default App;
