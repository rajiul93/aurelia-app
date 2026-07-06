import type { AudienceType } from "@/constants/audiences";
import type { DownloadMode } from "@/constants/download-mode";
import type { AppLanguage } from "@/store/locale-store";

export type TourDownloadPreferences = {
  audience: AudienceType;
  contentLanguage: AppLanguage;
  downloadMode: DownloadMode;
};
