export const CATEGORIES = [
  "Whiskey",
  "Vodka",
  "Rum",
  "Cocktails & Seltzers",
  "Wine",
  "Spirits",
  "Beer",
  "Tequila",
  "Mix Packs",
] as const;

export type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<string, Category> = {
  // Whiskey
  whiskey: "Whiskey",
  whisky: "Whiskey",
  "irish whiskey": "Whiskey",
  bourbon: "Whiskey",
  scotch: "Whiskey",
  // Vodka
  vodka: "Vodka",
  // Rum
  rum: "Rum",
  // Cocktails & Seltzers
  "cocktails & seltzers": "Cocktails & Seltzers",
  "cocktails and seltzers": "Cocktails & Seltzers",
  cocktails: "Cocktails & Seltzers",
  cocktail: "Cocktails & Seltzers",
  seltzer: "Cocktails & Seltzers",
  seltzers: "Cocktails & Seltzers",
  "hard seltzer": "Cocktails & Seltzers",
  // Wine
  wine: "Wine",
  wines: "Wine",
  "red wine": "Wine",
  "white wine": "Wine",
  rosé: "Wine",
  rose: "Wine",
  champagne: "Wine",
  prosecco: "Wine",
  // Spirits
  spirits: "Spirits",
  spirit: "Spirits",
  liqueur: "Spirits",
  liqueurs: "Spirits",
  brandy: "Spirits",
  cognac: "Spirits",
  gin: "Spirits",
  // Beer
  beer: "Beer",
  beers: "Beer",
  lager: "Beer",
  ale: "Beer",
  stout: "Beer",
  ipa: "Beer",
  // Tequila
  tequila: "Tequila",
  mezcal: "Tequila",
  // Mix Packs
  "mix packs": "Mix Packs",
  "mix pack": "Mix Packs",
  "variety pack": "Mix Packs",
  "mixed pack": "Mix Packs",
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
