import { toPng } from "html-to-image";
import { useEffect, useRef } from "react";
import { exportCsv, useSimulate } from "../lib/api";
import { useT } from "../lib/i18n";
import { useScenarioStore } from "../store/scenarioStore";
import { BodyDiagramResult } from "../components/body-diagram/BodyDiagramResult";
import { ResultsCharts } from "../components/results/ResultsCharts";
import { Card } from "../components/common/Card";

export function ResultsView() {
  const t = useT();
  const segments = useScenarioStore((s) => s.segments);
  const toSpec = useScenarioStore((s) => s.toSpec);
  const lastResult = useScenarioStore((s) => s.lastResult);
  const setLastResult = useScenarioStore((s) => s.setLastResult);
  const ensureAtLeastOneSegment = useScenarioStore((s) => s.ensureAtLeastOneSegment);
  const simulate = useSimulate();
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureAtLeastOneSegment();
  }, [ensureAtLeastOneSegment]);

  const run = () => {
    simulate.mutate(toSpec(), {
      onSuccess: (data) => setLastResult(data),
    });
  };

  const exportPng = async () => {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, {
      backgroundColor: getComputedStyle(document.body).getPropertyValue("--page-plane") || "#ffffff",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = t.results.exportPngFilename;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={segments.length === 0 || simulate.isPending}
            className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "var(--series-1)" }}
          >
            {simulate.isPending ? t.results.running : t.results.run}
          </button>
          {lastResult && (
            <>
              <button
                type="button"
                onClick={() => exportCsv(toSpec())}
                className="rounded border px-4 py-2 text-sm"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
              >
                {t.results.exportCsv}
              </button>
              <button
                type="button"
                onClick={exportPng}
                className="rounded border px-4 py-2 text-sm"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
              >
                {t.results.exportPng}
              </button>
            </>
          )}
          {segments.length === 0 && (
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t.results.noSegments}
            </span>
          )}
          {simulate.isError && (
            <span className="text-sm" style={{ color: "var(--status-critical)" }}>
              {t.results.errorPrefix}{(simulate.error as Error).message}
            </span>
          )}
        </div>
      </Card>
      {lastResult && (
        <div ref={exportRef} className="flex flex-col gap-4">
          <BodyDiagramResult result={lastResult} />
          <ResultsCharts result={lastResult} />
        </div>
      )}
    </div>
  );
}
