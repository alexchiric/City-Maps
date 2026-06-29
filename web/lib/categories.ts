// Mirrors the 7 livability categories in ../../livability/config.py — keep in sync.

export type Category =
  | "education"
  | "health"
  | "green"
  | "groceries"
  | "transit"
  | "culture"
  | "services";

export const CATEGORIES: Category[] = [
  "education",
  "health",
  "green",
  "groceries",
  "transit",
  "culture",
  "services",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  education: "Education",
  health: "Health",
  green: "Green space",
  groceries: "Groceries",
  transit: "Transit",
  culture: "Culture",
  services: "Services",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  education: "#2563eb",
  health: "#dc2626",
  green: "#16a34a",
  groceries: "#ea580c",
  transit: "#7c3aed",
  culture: "#db2777",
  services: "#0891b2",
};
