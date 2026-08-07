import { create } from "zustand";
import type {
  BodyName,
  GlobalOverrides,
  ModelConfig,
  RegionOverrides,
  ScenarioSpec,
  Segment,
  SimulateResponse,
} from "../lib/jos3-types";
import { DEFAULT_MODEL_CONFIG } from "../lib/jos3-types";

function newSegmentId(): string {
  return crypto.randomUUID();
}

export function makeDefaultSegment(label = "Segment 1"): Segment {
  return {
    id: newSegmentId(),
    label,
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
  selectedRegion: BodyName | null;
  lastResult: SimulateResponse | null;

  setModel: (patch: Partial<ModelConfig>) => void;
  ensureAtLeastOneSegment: () => void;
  addSegment: () => void;
  removeSegment: (id: string) => void;
  updateSegmentMeta: (id: string, patch: Partial<Pick<Segment, "label" | "dtime" | "times">>) => void;
  updateSegmentGlobals: (id: string, patch: GlobalOverrides) => void;
  updateSegmentRegions: (id: string, patch: RegionOverrides) => void;
  moveSegment: (id: string, direction: "up" | "down") => void;
  selectSegment: (id: string | null) => void;
  selectRegion: (name: BodyName | null) => void;
  loadSpec: (spec: ScenarioSpec) => void;
  toSpec: () => ScenarioSpec;
  setLastResult: (result: SimulateResponse | null) => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  model: { ...DEFAULT_MODEL_CONFIG },
  segments: [],
  selectedSegmentId: null,
  selectedRegion: null,
  lastResult: null,

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
    const seg = makeDefaultSegment(`Segment ${get().segments.length + 1}`);
    set((state) => ({ segments: [...state.segments, seg], selectedSegmentId: seg.id }));
  },

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
  selectRegion: (name) => set({ selectedRegion: name }),

  loadSpec: (spec) =>
    set({
      model: spec.model,
      segments: spec.segments,
      selectedSegmentId: spec.segments[0]?.id ?? null,
      selectedRegion: null,
      lastResult: null,
    }),

  toSpec: () => ({ model: get().model, segments: get().segments }),

  setLastResult: (result) => set({ lastResult: result }),
}));
