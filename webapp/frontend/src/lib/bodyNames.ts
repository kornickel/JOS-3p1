import type { BodyName } from "./jos3-types";
import type { Language } from "./i18n";

// Mirrors jos3.matrix.BODY_NAMES exactly (order matters -- it's the same
// index order the backend uses to build per-region arrays).
export const BODY_NAMES: BodyName[] = [
  "Head", "Neck", "Chest", "Back", "Pelvis",
  "LShoulder", "LArm", "LHand",
  "RShoulder", "RArm", "RHand",
  "LThigh", "LLeg", "LFoot",
  "RThigh", "RLeg", "RFoot",
];

export const FRONT_BODY_NAMES: BodyName[] = BODY_NAMES.filter((n) => n !== "Back");
export const BACK_BODY_NAMES: BodyName[] = BODY_NAMES.filter((n) => n !== "Chest");

const SHORT_LABELS: Record<Language, Record<BodyName, string>> = {
  en: {
    Head: "Head",
    Neck: "Neck",
    Chest: "Chest",
    Back: "Back",
    Pelvis: "Pelvis",
    LShoulder: "L. Shoulder",
    LArm: "L. Arm",
    LHand: "L. Hand",
    RShoulder: "R. Shoulder",
    RArm: "R. Arm",
    RHand: "R. Hand",
    LThigh: "L. Thigh",
    LLeg: "L. Lower Leg",
    LFoot: "L. Foot",
    RThigh: "R. Thigh",
    RLeg: "R. Lower Leg",
    RFoot: "R. Foot",
  },
  de: {
    Head: "Kopf",
    Neck: "Nacken",
    Chest: "Brust",
    Back: "Rücken",
    Pelvis: "Becken",
    LShoulder: "L. Schulter",
    LArm: "L. Arm",
    LHand: "L. Hand",
    RShoulder: "R. Schulter",
    RArm: "R. Arm",
    RHand: "R. Hand",
    LThigh: "L. Oberschenkel",
    LLeg: "L. Unterschenkel",
    LFoot: "L. Fuß",
    RThigh: "R. Oberschenkel",
    RLeg: "R. Unterschenkel",
    RFoot: "R. Fuß",
  },
};

export function bodyLabel(name: BodyName, language: Language): string {
  return SHORT_LABELS[language][name];
}

// Compact labels drawn directly on the diagram. The narrow, closely-spaced
// paired limbs (arm/thigh/leg/foot) only get an "L"/"R" letter -- a full
// word there is wider than the shape itself and bleeds into its mirror
// twin's label. Head/neck/torso/pelvis have enough room for a real word.
// The full name is always available via bodyLabel() (RegionPanel title,
// aria-label, and the native SVG <title> hover tooltip).
const INLINE_LABELS: Record<Language, Record<BodyName, string>> = {
  en: {
    Head: "Head",
    Neck: "Neck",
    Chest: "Chest",
    Back: "Back",
    Pelvis: "Pelvis",
    LShoulder: "L",
    LArm: "L",
    LHand: "L",
    RShoulder: "R",
    RArm: "R",
    RHand: "R",
    LThigh: "L",
    LLeg: "L",
    LFoot: "L",
    RThigh: "R",
    RLeg: "R",
    RFoot: "R",
  },
  de: {
    Head: "Kopf",
    Neck: "Nacken",
    Chest: "Brust",
    Back: "Rücken",
    Pelvis: "Becken",
    LShoulder: "L",
    LArm: "L",
    LHand: "L",
    RShoulder: "R",
    RArm: "R",
    RHand: "R",
    LThigh: "L",
    LLeg: "L",
    LFoot: "L",
    RThigh: "R",
    RLeg: "R",
    RFoot: "R",
  },
};

export function inlineLabel(name: BodyName, language: Language): string {
  return INLINE_LABELS[language][name];
}
