import { AppShell } from "./components/layout/AppShell";
import { BodyDiagramInput } from "./components/body-diagram/BodyDiagramInput";
import { ResultsView } from "./pages/ResultsView";
import { SetupView } from "./pages/SetupView";
import { TimelineView } from "./pages/TimelineView";

function App() {
  return (
    <AppShell
      title="JOS-3 Thermophysiologie-Simulator"
      tabs={[
        { value: "setup", label: "Setup", content: <SetupView /> },
        { value: "body", label: "Körper & Kleidung", content: <BodyDiagramInput /> },
        { value: "timeline", label: "Szenario-Timeline", content: <TimelineView /> },
        { value: "results", label: "Ausführen & Ergebnisse", content: <ResultsView /> },
      ]}
    />
  );
}

export default App;
