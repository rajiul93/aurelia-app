import type { AudienceType } from "@/constants/audiences";
import type { AppLanguage } from "@/store/locale-store";

export type BundleTranslation = {
  language: AppLanguage;
  audience: AudienceType;
  title: string;
  shortDesc?: string;
  description?: string;
  descriptionText?: string;
  descriptionHtml?: string;
  question?: string;
  answerText?: string;
};

export type BundleMedia = {
  id: string;
  url: string;
  thumbnail?: string | null;
};

export type BundleSpotMedia = {
  id: string;
  type: string;
  sortOrder: number;
  language: AppLanguage;
  audience: AudienceType;
  includedInQuickTour: boolean;
  url: string;
  thumbnail: string | null;
};

export type BundleSpotFaq = {
  id: string;
  sortOrder: number;
  translations: BundleTranslation[];
};

export type BundleSpot = {
  id: string;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
  /** The floor's number. Bundles built before floors carried ids only have this. */
  floor: number;
  /** Absent in bundles installed before the server started emitting it. */
  floorId?: string;
  includedInQuickTour: boolean;
  translations: Array<{
    language: AppLanguage;
    audience: AudienceType;
    title: string;
    shortDesc: string;
    descriptionText: string;
    descriptionHtml: string;
  }>;
  medias: BundleSpotMedia[];
  faqs: BundleSpotFaq[];
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type BundleRouteEdge = {
  id: string;
  fromSpotId: string;
  toSpotId: string;
  sortOrder: number;
  footprintGeo?: GeoPoint[] | null;
};

export type BundleNavigationMeta = {
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  hasCompleteFootprints: boolean;
  hasCompleteCoordinates: boolean;
};

export type BundleRoute = {
  id: string;
  edges: BundleRouteEdge[];
};

export type BundleFloorTranslation = {
  language: AppLanguage;
  audience: AudienceType;
  name: string;
};

export type BundleFloor = {
  id: string;
  floorNo: number;
  mapTileUrl?: string | null;
  route: BundleRoute | null;
  /** Both absent in bundles installed before the server started emitting them. */
  translations?: BundleFloorTranslation[];
  coverUrl?: string | null;
};

export type BundleTour = {
  id: string;
  slug: string;
  title?: string;
  description?: string;
  translations: Array<{
    language: AppLanguage;
    audience: AudienceType;
    title: string;
    description: string;
  }>;
  spots: BundleSpot[];
  coverMedia?: BundleMedia | null;
};

export type BundleAiKnowledgeTranslation = {
  language: AppLanguage;
  audience: AudienceType;
  title: string;
  content: string;
  keywords: string;
};

export type BundleAiKnowledge = {
  id: string;
  spotId: string | null;
  sortOrder: number;
  translations: BundleAiKnowledgeTranslation[];
};

/**
 * Bundle content supports both v1 (single route) and v2 (per-floor routes)
 * v1: Has `route` at top level (flat structure)
 * v2: Has `floors` array, each with its own `route`
 */
export type BundleContent = {
  tour: BundleTour;
  // v1 bundle format (deprecated, for backward compatibility)
  route?: BundleRoute | null;
  // v2 bundle format (multi-floor)
  floors?: BundleFloor[];
  navigation?: BundleNavigationMeta;
  aiKnowledge?: BundleAiKnowledge[];
  versions: {
    tourBundleVersion: number;
    mediaVersion: number;
    aiKnowledgeVersion: number;
    routeVersion: number;
  };
};

export type SearchDocument = {
  id: string;
  language: string;
  audience: AudienceType;
  type: "tour" | "spot" | "spot_faq" | "ai_knowledge";
  tourId: string;
  spotId: string | null;
  title: string;
  body: string;
  keywords: string;
};
