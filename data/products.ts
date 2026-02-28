export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  reviews: number;
  category: string;
  image: ReturnType<typeof require>;
  description: string;
  volume: string;
  abv: string;
  tags: string[];
  isFeatured?: boolean;
}

export const CATEGORIES = ["All", "Beers", "Whiskey", "Wine", "Vodka", "Rum"];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Hennessy VS",
    brand: "Hennessy",
    price: 42.99,
    rating: 4.9,
    reviews: 1284,
    category: "Whiskey",
    image: require("@/assets/images/hennessy.png"),
    description:
      "A timeless blend of eaux-de-vie from four natural crus of the Cognac region. Smooth and rich, with lively fruity notes and a slightly oaky finish. Crafted by eight generations of the Fillioux family.",
    volume: "750ml",
    abv: "40%",
    tags: ["Cognac", "French", "Classic"],
    isFeatured: true,
  },
  {
    id: "2",
    name: "Don Julio 1942",
    brand: "Don Julio",
    price: 169.99,
    rating: 4.8,
    reviews: 892,
    category: "Vodka",
    image: require("@/assets/images/donjulio.png"),
    description:
      "A handcrafted luxury tequila aged for a minimum of two and a half years in American white-oak barrels. Notes of rich caramel, roasted agave, and sweet vanilla create an extraordinarily smooth finish.",
    volume: "750ml",
    abv: "38%",
    tags: ["Tequila", "Aged", "Ultra Premium"],
    isFeatured: true,
  },
  {
    id: "3",
    name: "Johnnie Walker Blue",
    brand: "Johnnie Walker",
    price: 219.99,
    rating: 4.9,
    reviews: 2103,
    category: "Whiskey",
    image: require("@/assets/images/johnniewalker.png"),
    description:
      "Rare whiskies drawn from Scotland's most iconic distilleries, including some that are now silent. An extraordinary depth of character with dark fruit, honey, and a mesmerizing long smoky finish.",
    volume: "750ml",
    abv: "40%",
    tags: ["Scotch", "Rare", "Blended"],
    isFeatured: true,
  },
  {
    id: "4",
    name: "Plantation XO",
    brand: "Plantation",
    price: 58.99,
    rating: 4.7,
    reviews: 631,
    category: "Rum",
    image: require("@/assets/images/rum.png"),
    description:
      "A masterfully crafted rum aged in the tropical warmth of Barbados, then finished in French cognac barrels in Cognac. Rich mahogany tones with flavors of dried fruit, cinnamon, and dark chocolate.",
    volume: "700ml",
    abv: "40%",
    tags: ["Dark Rum", "Caribbean", "Aged"],
  },
  {
    id: "5",
    name: "Belvedere Pure",
    brand: "Belvedere",
    price: 39.99,
    rating: 4.6,
    reviews: 1147,
    category: "Vodka",
    image: require("@/assets/images/vodka.png"),
    description:
      "Poland's finest super-premium vodka crafted from 100% Dankowskie Rye grain and pure artesian water. Distilled four times for exceptional smoothness with a creamy, full-bodied character.",
    volume: "750ml",
    abv: "40%",
    tags: ["Polish", "Rye", "Ultra Pure"],
  },
  {
    id: "6",
    name: "Opus One 2019",
    brand: "Opus One",
    price: 349.99,
    rating: 5.0,
    reviews: 418,
    category: "Wine",
    image: require("@/assets/images/wine.png"),
    description:
      "A joint venture between the Mondavi and Rothschild families, Opus One is one of Napa Valley's most iconic wines. The 2019 vintage is extraordinary: rich garnet in color with aromas of black currant, plum, and dark cherry.",
    volume: "750ml",
    abv: "14.5%",
    tags: ["Napa Valley", "Bordeaux Blend", "Collector"],
  },
];
