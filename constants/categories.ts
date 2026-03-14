export const CATEGORIES = [
  "Whiskey",
  "Vodka",
  "Rum",
  "Cocktails & Seltzers",
  "Wine",
  "Spirits",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<string, Category> = {
  whiskey: "Whiskey",
  whisky: "Whiskey",
  vodka: "Vodka",
  rum: "Rum",
  "cocktails & seltzers": "Cocktails & Seltzers",
  "cocktails and seltzers": "Cocktails & Seltzers",
  cocktails: "Cocktails & Seltzers",
  cocktail: "Cocktails & Seltzers",
  seltzer: "Cocktails & Seltzers",
  seltzers: "Cocktails & Seltzers",
  wine: "Wine",
  wines: "Wine",
  spirits: "Spirits",
  spirit: "Spirits",
};

export function normalizeCategory(raw: string): Category | null {
  return CATEGORY_MAP[raw.toLowerCase().trim()] ?? null;
}

export function productMatchesCategory(
  productCategory: string,
  activeCategory: string
): boolean {
  const normalized = normalizeCategory(productCategory);
  return normalized === activeCategory;
}
