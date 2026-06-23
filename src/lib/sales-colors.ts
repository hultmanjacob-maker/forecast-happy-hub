// 8 colors that harmonize with the Emerald Prestige palette.
// Each entry exports a strong "solid" (background) and a soft tint, plus a contrasting foreground.

export type SalesColor = {
  solid: string; // hex
  soft: string; // hex, low-alpha tint
  fg: string; // hex foreground for solid bg
  name: string;
};

export const SALES_COLORS: SalesColor[] = [
  { name: "Emerald", solid: "#0d7a5f", soft: "#d6ece3", fg: "#ffffff" },
  { name: "Gold",    solid: "#b8902f", soft: "#f5e9c8", fg: "#1a1a1a" },
  { name: "Copper",  solid: "#b85c2a", soft: "#f5dac5", fg: "#ffffff" },
  { name: "Sage",    solid: "#5f8a6a", soft: "#dee9e0", fg: "#ffffff" },
  { name: "Rust",    solid: "#a83a3a", soft: "#f1cfcf", fg: "#ffffff" },
  { name: "Plum",    solid: "#6e3f6b", soft: "#e3d3e2", fg: "#ffffff" },
  { name: "Teal",    solid: "#2a7a85", soft: "#cfe6e9", fg: "#ffffff" },
  { name: "Ochre",   solid: "#8a6b1e", soft: "#ece1bf", fg: "#ffffff" },
];

export function getSalesColor(index: number | null | undefined): SalesColor {
  const i = ((index ?? 0) % SALES_COLORS.length + SALES_COLORS.length) % SALES_COLORS.length;
  return SALES_COLORS[i];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
