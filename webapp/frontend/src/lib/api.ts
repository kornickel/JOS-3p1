import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MetaResponse,
  ModelConfig,
  ModelPreviewResponse,
  ScenarioSpec,
  SimulateResponse,
} from "./jos3-types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => request<MetaResponse>("/api/meta"),
    staleTime: Infinity,
  });
}

export function useModelPreview(config: ModelConfig) {
  return useQuery({
    queryKey: ["model-preview", config],
    queryFn: () =>
      request<ModelPreviewResponse>("/api/model/preview", {
        method: "POST",
        body: JSON.stringify(config),
      }),
  });
}

export function useSimulate() {
  return useMutation({
    mutationFn: (spec: ScenarioSpec) =>
      request<SimulateResponse>("/api/simulate", {
        method: "POST",
        body: JSON.stringify(spec),
      }),
  });
}

export async function exportCsv(spec: ScenarioSpec): Promise<void> {
  const res = await fetch("/api/export/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? "jos3-results.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ScenarioListEntry {
  name: string;
  saved_at: number;
}

export function useScenarioList() {
  return useQuery({
    queryKey: ["scenarios"],
    queryFn: () => request<ScenarioListEntry[]>("/api/scenarios"),
  });
}

export function useSaveScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, spec }: { name: string; spec: ScenarioSpec }) =>
      request(`/api/scenarios/${encodeURIComponent(name)}`, {
        method: "POST",
        body: JSON.stringify(spec),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });
}

export async function loadScenario(name: string): Promise<ScenarioSpec> {
  return request<ScenarioSpec>(`/api/scenarios/${encodeURIComponent(name)}`);
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request(`/api/scenarios/${encodeURIComponent(name)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });
}
