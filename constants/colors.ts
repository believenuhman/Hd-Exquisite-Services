// Brand palette: HD XQUISITE LIQUORS
// Primary: deep black | Gold | Magenta accent

const GOLD_START = "#D4901A";
const GOLD_END = "#F5C842";
const GOLD_ACCENT = "#E4A12B";
const GOLD_DIM = "#9A6E1A";
const MAGENTA = "#C91E8C";
const MAGENTA_DIM = "#9B1569";
const BLACK = "#09090C";
const CARD_LIGHT = "#FFFFFF";
const CARD_DARK = "#121212";
const CARD_BORDER = "rgba(228,161,43,0.15)";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_DARK = "#1C1A18";
const TEXT_SECONDARY = "rgba(255,255,255,0.52)";
const TEXT_GOLD = "#E4A12B";

export const Colors = {
  background: BLACK,
  card: CARD_DARK,
  cardLight: CARD_LIGHT,
  cardBorder: CARD_BORDER,
  textPrimary: TEXT_PRIMARY,
  textDark: TEXT_DARK,
  textSecondary: TEXT_SECONDARY,
  textGold: TEXT_GOLD,
  goldStart: GOLD_START,
  goldEnd: GOLD_END,
  goldAccent: GOLD_ACCENT,
  goldDim: GOLD_DIM,
  magenta: MAGENTA,
  magentaDim: MAGENTA_DIM,
  tabBarBg: "#0C0B10",
  tabBarBorder: "rgba(228,161,43,0.18)",
  inputBg: "rgba(255,255,255,0.06)",
  white: "#FFFFFF",
  danger: "#FF4D4D",
};

export default {
  light: {
    text: TEXT_PRIMARY,
    background: BLACK,
    tint: GOLD_ACCENT,
    tabIconDefault: "rgba(255,255,255,0.32)",
    tabIconSelected: GOLD_ACCENT,
  },
};
