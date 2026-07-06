export const GUIDE_FEATURE_ICONS = {
  audio: "musical-notes",
  transcript: "document-text",
  images: "images",
  chat: "chatbubble-ellipses",
} as const;

export type GuideFeatureIcon =
  (typeof GUIDE_FEATURE_ICONS)[keyof typeof GUIDE_FEATURE_ICONS];
