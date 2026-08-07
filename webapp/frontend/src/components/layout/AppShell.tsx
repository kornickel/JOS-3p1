import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { ScenarioBar } from "./ScenarioBar";

export interface TabDef {
  value: string;
  label: string;
  content: ReactNode;
}

export function AppShell({ title, tabs }: { title: string; tabs: TabDef[] }) {
  return (
    <div className="min-h-screen">
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4"
        style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
      >
        <h1 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        <ScenarioBar />
      </header>
      <Tabs.Root defaultValue={tabs[0]?.value} className="flex flex-col">
        <Tabs.List
          className="flex gap-1 border-b px-6"
          style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
        >
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="cursor-pointer border-b-2 px-4 py-3 text-sm font-medium outline-none"
              style={{
                borderColor: "transparent",
                color: "var(--text-secondary)",
              }}
              data-tab-trigger
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value} className="mx-auto w-full max-w-6xl p-6">
            {tab.content}
          </Tabs.Content>
        ))}
      </Tabs.Root>
      <style>{`
        [data-tab-trigger][data-state="active"] {
          color: var(--text-primary) !important;
          border-color: var(--series-1) !important;
        }
        [data-tab-trigger]:hover {
          color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
