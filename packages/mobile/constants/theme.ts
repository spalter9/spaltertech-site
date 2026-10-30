import { Platform } from "react-native";

/**
 * App color tokens (Aurora palette, mirrors the web app). Recolor these to brand the app — every screen and component
 * reads from here via `useColors()` (see `hooks/use-colors.ts`), so changing a
 * value here updates the whole app in both light and dark mode.
 *
 * The token names mirror the web app's design tokens (`packages/web/src/web/styles.css`)
 * so the two platforms share one vocabulary: `background`, `foreground`, `card`,
 * `primary`, `muted`, `border`, etc. Values are plain hex/rgba strings — React
 * Native's StyleSheet does not support CSS color functions like `oklch()`.
 */
const aurora = {
  background: "#060A14",
  foreground: "#EEF2FB",
  card: "#0C1322",
  cardForeground: "#EEF2FB",
  primary: "#6D8BFF",
  primaryForeground: "#04101F",
  secondary: "#121C33",
  secondaryForeground: "#EEF2FB",
  muted: "#121C33",
  mutedForeground: "#8893AB",
  accent: "#8FE9FF",
  accentForeground: "#04101F",
  border: "#1A2540",
  destructive: "#F0616D",
  success: "#34D399",
  warning: "#F5C451",
  violet: "#8F5BFF",
  deep: "#3A4FD6",
} as const;

/** The brand is dark-first "Aurora" — both schemes use the same palette. */
export const Colors = {
  light: aurora,
  dark: aurora,
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];

/**
 * Platform-appropriate font families. Use for `fontFamily` in styles, or load a
 * custom font with `useFonts` from `expo-font` and reference it here.
 */
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
    mono: "'SF Mono', 'Roboto Mono', monospace",
  },
});
