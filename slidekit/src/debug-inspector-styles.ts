// Debug Inspector — Color constants and HTML helpers

/** Color-mapped element type keys used in the debug overlay. */
export type DebugElementType =
  | "text" | "image" | "rect" | "rule"
  | "group" | "vstack" | "hstack"
  | "connector" | "panel";

export const TYPE_COLORS: Record<DebugElementType, string> = {
  text:      "rgba(66, 133, 244, 0.3)",   // blue
  image:     "rgba(52, 168, 83, 0.3)",     // green
  rect:      "rgba(251, 188, 4, 0.3)",     // orange
  rule:      "rgba(234, 67, 53, 0.3)",     // red
  group:     "rgba(124, 92, 191, 0.3)",    // purple
  vstack:    "rgba(124, 92, 191, 0.3)",    // purple
  hstack:    "rgba(124, 92, 191, 0.3)",    // purple
  connector: "rgba(0, 188, 212, 0.3)",     // teal
  panel:     "rgba(124, 92, 191, 0.3)",    // purple
};

export const TYPE_BORDER_COLORS: Record<DebugElementType, string> = {
  text:      "rgba(66, 133, 244, 0.8)",
  image:     "rgba(52, 168, 83, 0.8)",
  rect:      "rgba(251, 188, 4, 0.8)",
  rule:      "rgba(234, 67, 53, 0.8)",
  group:     "rgba(124, 92, 191, 0.8)",
  vstack:    "rgba(124, 92, 191, 0.8)",
  hstack:    "rgba(124, 92, 191, 0.8)",
  connector: "rgba(0, 188, 212, 0.8)",
  panel:     "rgba(124, 92, 191, 0.8)",
};

/** Solid badge colors for provenance sources. */
export const PROVENANCE_COLORS: Record<string, string> = {
  authored:   "#34a853",  // green
  constraint: "#ff8c32",  // orange
  stack:      "#a078ff",  // purple
  measured:   "#4285f4",  // blue
  transform:  "#fbc02d",  // yellow
  default:    "#999",     // gray
};

/** Solid badge colors for element types. */
export const TYPE_BADGE_COLORS: Record<string, string> = {
  el:        "#4285f4",
  text:      "#4285f4",
  image:     "#34a853",
  rect:      "#fbc004",
  rule:      "#ea4335",
  group:     "#7c5cbf",
  vstack:    "#7c5cbf",
  hstack:    "#7c5cbf",
  connector: "#00bcd4",
  panel:     "#7c5cbf",
};

/** Escape HTML special characters. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a colored badge span. */
export function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;background:${color};color:#fff;margin-left:4px;">${escapeHtml(text)}</span>`;
}
