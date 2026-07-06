import { Directory, Paths } from "expo-file-system";

const APP_ROOT = "aurelia";
const TOURS_ROOT = "tours";

export function getToursRootDirectory() {
  return new Directory(Paths.document, APP_ROOT, TOURS_ROOT);
}

export function getInstalledTourDirectory(tourId: string) {
  return new Directory(getToursRootDirectory(), tourId);
}
