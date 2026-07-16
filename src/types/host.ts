export type HostTranslation = {
  language: "en" | "es" | "fr";
  bio: string;
};

export type Host = {
  id: string;
  tourId: string;
  name: string;
  role: string | null;
  photoMediaId: string | null;
  photoUrl: string | null;
  latitude: number;
  longitude: number;
  availableFrom: string | null;
  availableTo: string | null;
  isActive: boolean;
  isAvailableNow: boolean;
  sortOrder: number;
  translations: HostTranslation[];
  createdAt: string;
  updatedAt: string;
};

export type DirectionsRequest = {
  latitude: number;
  longitude: number;
};

export type DirectionsResponse = {
  distanceM: number;
  durationS: number;
  polyline: Array<{ lat: number; lng: number }>;
};
