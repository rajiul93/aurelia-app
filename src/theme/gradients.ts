/** Gold gradient tokens from Aurelia design system. */
export const GoldGradientColors = ["#b87d3c", "#e1a566", "#ecc98a"] as const;

export const GoldGradientHorizontal = {
  colors: GoldGradientColors,
  start: { x: 0, y: 0.5 },
  end: { x: 1, y: 0.5 },
} as const;
