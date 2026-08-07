import { create } from "zustand";
import type {
  ActivityInput,
  BodyName,
  GlobalOverrides,
  ModelConfig,
  RegionOverrides,
  ScenarioSpec,
  Segment,
  SimulateResponse,
} from "../lib/jos3-types";
import { DEFAULT_MODEL_CONFIG } from "../lib/jos3-types";
import { BODY_NAMES } from "../lib/bodyNames";
import { dictionaries } from "../lib/i18n";
import { useLanguageStore } from "./languageStore";

function newSegmentId(): string {
  return crypto.randomUUID();
}

// Store actions run outside React's render phase, so the active language is
// read imperatively off the language store rather than via the useT() hook.
function currentDictionary() {
  return dictionaries[useLanguageStore.getState().language];
}

/** Drops explicit `null` values from a shallow object, converting them to
 * absent keys. The rest of this codebase treats "unset" as "key absent"
 * (see regionValues.ts/globalValues.ts's inheritance logic), but a
 * ScenarioSpec loaded from outside the app -- a saved/backend scenario, or
 * a user-imported JSON file -- can legitimately contain an explicit `null`
 * for every field Pydantic considers Optional and unset (its default JSON
 * serialization, unless the writer used exclude_none). Sanitizing at this
 * one entry point (loadSpec) means the rest of the app never has to
 * distinguish `null` from `undefined`. */
function stripNulls<T extends object>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

function sanitizeSegment(segment: Segment): Segment {
  const globals = stripNulls(segment.globals);
  const clean: Segment = {
    ...segment,
    regions: stripNulls(segment.regions),
    globals: globals.options ? { ...globals, options: stripNulls(globals.options) } : globals,
  };
  // Same "absent, not null" convention as above -- an externally written
  // spec may carry `activity: null` for a segment that never had one.
  if (clean.activity == null) delete clean.activity;
  return clean;
}

function sanitizeScenarioSpec(spec: ScenarioSpec): ScenarioSpec {
  return { ...spec, segments: spec.segments.map(sanitizeSegment) };
}

export function makeDefaultSegment(label?: string): Segment {
  return {
    id: newSegmentId(),
    label: label ?? currentDictionary().scenarioStore.defaultSegmentLabel,
    dtime: 60,
    times: 60,
    globals: {},
    regions: {},
  };
}

interface ScenarioState {
  model: ModelConfig;
  segments: Segment[];
  selectedSegmentId: string | null;
  selectedRegions: BodyName[];
  lastResult: SimulateResponse | null;
  activeTab: string;

  setModel: (patch: Partial<ModelConfig>) => void;
  ensureAtLeastOneSegment: () => void;
  addSegment: () => void;
  duplicateSegment: (id: string) => void;
  removeSegment: (id: string) => void;
  updateSegmentMeta: (id: string, patch: Partial<Pick<Segment, "label" | "dtime" | "times">>) => void;
  updateSegmentActivity: (id: string, activity: ActivityInput | undefined) => void;
  updateSegmentGlobals: (id: string, patch: GlobalOverrides) => void;
  updateSegmentRegions: (id: string, patch: RegionOverrides) => void;
  moveSegment: (id: string, direction: "up" | "down") => void;
  selectSegment: (id: string | null) => void;
  selectRegion: (name: BodyName) => void;
  toggleRegionSelection: (name: BodyName) => void;
  selectAllRegions: () => void;
  clearRegionSelection: () => void;
  setActiveTab: (value: string) => void;
  loadSpec: (spec: ScenarioSpec) => void;
  toSpec: () => ScenarioSpec;
  setLastResult: (result: SimulateResponse | null) => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  model: { ...DEFAULT_MODEL_CONFIG },
  segments: [],
  selectedSegmentId: null,
  selectedRegions: [],
  lastResult: null,
  activeTab: "setup",

  setModel: (patch) => set((state) => ({ model: { ...state.model, ...patch } })),

  ensureAtLeastOneSegment: () => {
    if (get().segments.length === 0) {
      const seg = makeDefaultSegment();
      set({ segments: [seg], selectedSegmentId: seg.id });
    } else if (get().selectedSegmentId === null) {
      set({ selectedSegmentId: get().segments[0].id });
    }
  },

  addSegment: () => {
    const seg = makeDefaultSegment(currentDictionary().scenarioStore.segmentN(get().segments.length + 1));
    set((state) => ({ segments: [...state.segments, seg], selectedSegmentId: seg.id }));
  },

  duplicateSegment: (id) =>
    set((state) => {
      const index = state.segments.findIndex((s) => s.id === id);
      if (index < 0) return {};
      const original = state.segments[index];
      const copy: Segment = {
        ...original,
        id: newSegmentId(),
        label: currentDictionary().scenarioStore.copySuffix(original.label),
        activity: original.activity ? { ...original.activity } : undefined,
        globals: {
          ...original.globals,
          options: original.globals.options ? { ...original.globals.options } : undefined,
        },
        regions: Object.fromEntries(
          Object.entries(original.regions).map(([key, value]) => [
            key,
            typeof value === "object" && value !== null ? { ...value } : value,
          ])
        ) as RegionOverrides,
      };
      const segments = [...state.segments.slice(0, index + 1), copy, ...state.segments.slice(index + 1)];
      return { segments, selectedSegmentId: copy.id };
    }),

  removeSegment: (id) =>
    set((state) => {
      const segments = state.segments.filter((s) => s.id !== id);
      const selectedSegmentId =
        state.selectedSegmentId === id ? (segments[0]?.id ?? null) : state.selectedSegmentId;
      return { segments, selectedSegmentId };
    }),

  updateSegmentMeta: (id, patch) =>
    set((state) => ({
      segments: state.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  updateSegmentActivity: (id, activity) =>
    set((state) => ({
      segments: state.segments.map((s) => (s.id === id ? { ...s, activity } : s)),
    })),

  updateSegmentGlobals: (id, patch) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, globals: { ...s.globals, ...patch } } : s
      ),
    })),

  updateSegmentRegions: (id, patch) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, regions: { ...s.regions, ...patch } } : s
      ),
    })),

  moveSegment: (id, direction) =>
    set((state) => {
      const index = state.segments.findIndex((s) => s.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= state.segments.length) return {};
      const segments = [...state.segments];
      [segments[index], segments[target]] = [segments[target], segments[index]];
      return { segments };
    }),

  selectSegment: (id) => set({ selectedSegmentId: id }),
  selectRegion: (name) => set({ selectedRegions: [name] }),
  toggleRegionSelection: (name) =>
    set((state) => ({
      selectedRegions: state.selectedRegions.includes(name)
        ? state.selectedRegions.filter((n) => n !== name)
        : [...state.selectedRegions, name],
    })),
  selectAllRegions: () => set({ selectedRegions: [...BODY_NAMES] }),
  clearRegionSelection: () => set({ selectedRegions: [] }),
  setActiveTab: (value) => set({ activeTab: value }),

  loadSpec: (spec) => {
    const clean = sanitizeScenarioSpec(spec);
    set({
      model: clean.model,
      segments: clean.segments,
      selectedSegmentId: clean.segments[0]?.id ?? null,
      selectedRegions: [],
      lastResult: null,
    });
  },

  toSpec: () => ({ model: get().model, segments: get().segments }),

  setLastResult: (result) => set({ lastResult: result }),
}));
