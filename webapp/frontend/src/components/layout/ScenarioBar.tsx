import { useRef, useState } from "react";
import { loadScenario, useDeleteScenario, useSaveScenario, useScenarioList } from "../../lib/api";
import { useScenarioStore } from "../../store/scenarioStore";

export function ScenarioBar() {
  const [name, setName] = useState("mein-szenario");
  const toSpec = useScenarioStore((s) => s.toSpec);
  const loadSpec = useScenarioStore((s) => s.loadSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: scenarios } = useScenarioList();
  const saveScenario = useSaveScenario();
  const deleteScenario = useDeleteScenario();

  const save = () => {
    if (!name.trim()) return;
    saveScenario.mutate({ name: name.trim(), spec: toSpec() });
  };

  const load = async (scenarioName: string) => {
    if (!scenarioName) return;
    const spec = await loadScenario(scenarioName);
    loadSpec(spec);
    setName(scenarioName);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(toSpec(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.trim() || "jos3-szenario"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    loadSpec(JSON.parse(text));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Szenario-Name"
        className="w-40 rounded border px-2 py-1 text-sm outline-none"
        style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-primary)" }}
      />
      <button
        type="button"
        onClick={save}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: "var(--gridline)", color: "var(--series-1)" }}
      >
        Speichern
      </button>
      <select
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
        value=""
        onChange={(e) => load(e.target.value)}
      >
        <option value="">Gespeicherte Szenarien laden…</option>
        {scenarios?.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
      {scenarios && scenarios.length > 0 && (
        <button
          type="button"
          onClick={() => deleteScenario.mutate(name)}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--gridline)", color: "var(--status-critical)" }}
        >
          Löschen
        </button>
      )}
      <span className="mx-1" style={{ color: "var(--gridline)" }}>
        |
      </span>
      <button
        type="button"
        onClick={downloadJson}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
      >
        Als Datei sichern
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded border px-2 py-1 text-xs"
        style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
      >
        Datei laden…
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importJson(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
