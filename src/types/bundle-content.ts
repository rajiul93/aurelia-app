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
  floor: number;
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

export type BundleContent = {
  tour: BundleTour;
  route: BundleRoute | null;
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
