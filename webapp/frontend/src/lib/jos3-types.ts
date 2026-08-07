// TypeScript mirror of webapp/backend/app/schemas.py. Keep field names and
// shapes in lockstep with that file -- it is the source of truth for the
// wire contract.

export type BodyName =
  | "Head"
  | "Neck"
  | "Chest"
  | "Back"
  | "Pelvis"
  | "LShoulder"
  | "LArm"
  | "LHand"
  | "RShoulder"
  | "RArm"
  | "RHand"
  | "LThigh"
  | "LLeg"
  | "LFoot"
  | "RThigh"
  | "RLeg"
  | "RFoot";

export type RegionValue = number | Partial<Record<BodyName, number>>;

export interface ModelConfig {
  height: number;
  weight: number;
  fat: number;
  age: number;
  sex: "male" | "female";
  ci: number;
  bmr_equation: "harris-benedict" | "harris-benedict_origin" | "japanese" | "ganpule";
  bsa_equation: "dubois" | "takahira" | "fujimoto" | "kurazumi";
  ex_output: "all" | string[] | null;
  model_name: string;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  height: 1.72,
  weight: 74.43,
  fat: 15,
  age: 20,
  sex: "male",
  ci: 2.59,
  bmr_equation: "harris-benedict",
  bsa_equation: "dubois",
  ex_output: "all",
  model_name: "JOS3",
};

export interface RegionOverrides {
  Ta?: RegionValue;
  Tr?: RegionValue;
  To?: RegionValue;
  RH?: RegionValue;
  Va?: RegionValue;
  Icl?: RegionValue;
  Icl_evap_eff?: RegionValue;
  Icl_emissivity?: RegionValue;
  Icl_airperm?: RegionValue;
  Icl_waterabs?: RegionValue;
  release_tau?: RegionValue;
  max_storage?: RegionValue;
  setpt_cr?: RegionValue;
  setpt_sk?: RegionValue;
}

export interface GlobalOverrides {
  PAR?: number;
  posture?: "standing" | "sitting" | "lying";
  options?: Record<string, boolean | number>;
}

export interface Segment {
  id: string;
  label: string;
  dtime: number;
  times: number;
  globals: GlobalOverrides;
  regions: RegionOverrides;
}

export interface ScenarioSpec {
  model: ModelConfig;
  segments: Segment[];
}

export interface SegmentBound {
  id: string;
  label: string;
  start_step: number;
  end_step: number;
  start_seconds: number;
  end_seconds: number;
}

export interface SimulateResponse {
  results: Record<string, Array<number | string | null>>;
  segment_bounds: SegmentBound[];
  body_names: string[];
}

export interface ModelPreviewResponse {
  bsa: Record<string, number>;
  bsa_total: number;
  bsa_rate: number;
  bmr: number;
  setpt_cr: Record<string, number>;
  setpt_sk: Record<string, number>;
}

export interface InputParamMeta {
  unit: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface OutputParamMeta {
  ex_output: boolean;
  meaning: string;
  suffix: string | null;
  unit: string;
}

export interface EnumOption {
  value: string;
  label: string;
}

export interface OptionMeta {
  label: string;
  default: boolean;
}

export interface MetaResponse {
  body_names: BodyName[];
  output_params: Record<string, OutputParamMeta>;
  input_params: Record<string, InputParamMeta>;
  enums: Record<string, EnumOption[]>;
  options: Record<string, OptionMeta>;
}
