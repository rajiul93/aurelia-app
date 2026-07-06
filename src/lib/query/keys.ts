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
    detail: (tourId: string, bundleId?: string) =>
      [...queryKeys.installedTour.all, tourId, bundleId ?? "none"] as const,
    search: (tourId: string, bundleId?: string) =>
      [
        ...queryKeys.installedTour.all,
        tourId,
        "search",
        bundleId ?? "none",
      ] as const,
  },
  storage: {
    summary: ["storage", "summary"] as const,
  },
} as const;
