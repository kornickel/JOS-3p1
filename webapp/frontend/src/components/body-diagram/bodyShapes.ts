import type { BodyName } from "../../lib/jos3-types";

export type RegionShape =
  | { name: BodyName; kind: "circle"; cx: number; cy: number; r: number; labelDx?: number; labelDy?: number }
  | { name: BodyName; kind: "rect"; x: number; y: number; width: number; height: number; rx: number }
  | { name: BodyName; kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

export const VIEW_BOX = "0 0 200 430";

// The 15 regions shared between front and back view (same geometry, same
// position in both artboards) -- only the torso panel differs (Chest vs.
// Back), see TORSO_FRONT/TORSO_BACK below. One geometry source of truth,
// two compositions (BodyFront.tsx / BodyBack.tsx).
export const SHARED_REGIONS: RegionShape[] = [
  { name: "Head", kind: "circle", cx: 100, cy: 32, r: 24 },
  { name: "Neck", kind: "rect", x: 90, y: 54, width: 20, height: 16, rx: 4 },
  { name: "Pelvis", kind: "rect", x: 72, y: 158, width: 56, height: 46, rx: 10 },

  { name: "LShoulder", kind: "circle", cx: 58, cy: 82, r: 15 },
  { name: "LArm", kind: "rect", x: 46, y: 96, width: 22, height: 78, rx: 11 },
  { name: "LHand", kind: "circle", cx: 57, cy: 188, r: 13 },

  { name: "RShoulder", kind: "circle", cx: 142, cy: 82, r: 15 },
  { name: "RArm", kind: "rect", x: 132, y: 96, width: 22, height: 78, rx: 11 },
  { name: "RHand", kind: "circle", cx: 143, cy: 188, r: 13 },

  { name: "LThigh", kind: "rect", x: 74, y: 204, width: 24, height: 96, rx: 11 },
  { name: "LLeg", kind: "rect", x: 76, y: 304, width: 20, height: 88, rx: 9 },
  { name: "LFoot", kind: "ellipse", cx: 88, cy: 404, rx: 16, ry: 9 },

  { name: "RThigh", kind: "rect", x: 102, y: 204, width: 24, height: 96, rx: 11 },
  { name: "RLeg", kind: "rect", x: 104, y: 304, width: 20, height: 88, rx: 9 },
  { name: "RFoot", kind: "ellipse", cx: 112, cy: 404, rx: 16, ry: 9 },
];

export const TORSO_FRONT: RegionShape = {
  name: "Chest",
  kind: "rect",
  x: 68,
  y: 68,
  width: 64,
  height: 92,
  rx: 14,
};

export const TORSO_BACK: RegionShape = {
  name: "Back",
  kind: "rect",
  x: 68,
  y: 68,
  width: 64,
  height: 92,
  rx: 14,
};

export function shapeCenter(shape: RegionShape): { x: number; y: number } {
  if (shape.kind === "circle" || shape.kind === "ellipse") return { x: shape.cx, y: shape.cy };
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
}
