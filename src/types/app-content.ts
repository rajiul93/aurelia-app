export type AppContentBundle = {
  appContentVersion: number;
  language: string;
  strings: Record<string, string>;
  assets: Record<
    string,
    {
      url: string;
      timeOfDay: "MORNING" | "AFTERNOON" | "EVENING" | null;
      mimeType: string;
    }
  >;
};
