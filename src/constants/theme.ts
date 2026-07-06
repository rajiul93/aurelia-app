/**
 * Shared theme tokens. Brand primary and Roboto live in src/theme/*.
 */

import "@/global.css";

import { Platform } from "react-native";

import { BrandColors } from "@/theme/colors";
import { Fonts as TypographyFonts } from "@/theme/typography";

export const Colors = {
  light: {
    text: "#1a1208",
    background: "#ffffff",
    backgroundElement: "#F5F0EA",
    backgroundSelected: "#EDE4D8",
    textSecondary: "#6B5E52",
    primary: BrandColors.primary,
    primaryForeground: BrandColors.primaryForeground,
  },
  dark: {
    text: "#ffffff",
    background: "#0c0a09",
    backgroundElement: "#1c1917",
    backgroundSelected: "#292524",
    textSecondary: "#a8a29e",
    primary: BrandColors.primary,
    primaryForeground: BrandColors.primaryForeground,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: TypographyFonts.sans,
  sansMedium: TypographyFonts.sansMedium,
  sansBold: TypographyFonts.sansBold,
  mono: Platform.select({
    ios: "ui-monospace",
    default: "monospace",
    web: "var(--font-mono)",
  }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
