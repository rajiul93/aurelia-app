export type EntitledVersions = {
  tourBundleVersion: number;
  mediaVersion: number;
  aiKnowledgeVersion: number;
  routeVersion: number;
};

export type InstalledVersions = EntitledVersions;

export function isUpdateAvailable(
  installed: InstalledVersions,
  entitled: EntitledVersions,
) {
  return (
    entitled.tourBundleVersion > installed.tourBundleVersion ||
    entitled.mediaVersion > installed.mediaVersion ||
    entitled.aiKnowledgeVersion > installed.aiKnowledgeVersion ||
    entitled.routeVersion > installed.routeVersion
  );
}
