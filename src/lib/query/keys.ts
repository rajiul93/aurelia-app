export const queryKeys = {
  catalog: {
    all: ["catalog"] as const,
    tours: (language: string) =>
      [...queryKeys.catalog.all, "tours", language] as const,
  },
  appContent: {
    all: ["app-content"] as const,
    detail: (language: string) =>
      [...queryKeys.appContent.all, language] as const,
  },
  entitlements: {
    all: ["entitlements"] as const,
    me: ["entitlements", "me"] as const,
  },
  versions: {
    all: ["versions"] as const,
  },
  installedTour: {
    all: ["installed-tour"] as const,
    /** Stable per tour — do not include bundleId or cache busts on every hydrate. */
    detail: (tourId: string) =>
      [...queryKeys.installedTour.all, tourId] as const,
    search: (tourId: string) =>
      [...queryKeys.installedTour.all, tourId, "search"] as const,
  },
  storage: {
    summary: ["storage", "summary"] as const,
  },
  subscriptions: {
    all: ["subscriptions"] as const,
    config: ["subscriptions", "config"] as const,
    purchase: (id: string) =>
      [...queryKeys.subscriptions.all, "purchase", id] as const,
  },
} as const;
