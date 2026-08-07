import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { loadScenario } from "./lib/api";
import { useT } from "./lib/i18n";
import { PersonView } from "./pages/PersonView";
import { ResultsView } from "./pages/ResultsView";
import { SetupView } from "./pages/SetupView";
import { useScenarioStore } from "./store/scenarioStore";

const EXAMPLE_SCENARIO_NAME = "Mountain Hike Example";

function App() {
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);
  const t = useT();
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
          {t.app.loading}
        </p>
      </div>
    );
  }

  return (
    <AppShell
      title={t.app.title}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      tabs={[
        { value: "person", label: t.app.tabPerson, content: <PersonView /> },
        { value: "setup", label: t.app.tabSetup, content: <SetupView /> },
        { value: "results", label: t.app.tabResults, content: <ResultsView /> },
      ]}
    />
  );
}

export default App;
