export type CatalogFloor = {
  id: string;
  floorNo: number;
  name: string;
  coverUrl: string | null;
  stopCount: number;
};

export type CatalogTour = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  language: string;
  /** Per-floor teasers for Home locked cards before the tour is downloaded. */
  floors?: CatalogFloor[];
};
