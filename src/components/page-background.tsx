import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { FALLBACK_BACKGROUND } from "@/lib/app-content/fallback-background";

type PageBackgroundProps = {
  uri?: string | null;
  children: ReactNode;
  style?: ViewStyle;
  imagePosition?: "center" | "right";
  /** Applies a stronger dark scrim so foreground text can stay white. */
  darkOverlay?: boolean;
  /** Render the image with no scrim/overlay at all. */
  noOverlay?: boolean;
};

export function PageBackground({
  uri,
  children,
  style,
  imagePosition = "center",
  darkOverlay = false,
  noOverlay = false,
}: PageBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/*
        Always renders: with no `uri` yet (fresh install, or before the
        app-content fetch lands) the bundled asset stands in, and it also serves
        as the placeholder underneath a remote photo that is still decoding — so
        there is never an empty frame when the splash lifts.
      */}
      <Image
        source={uri ? { uri } : FALLBACK_BACKGROUND}
        placeholder={FALLBACK_BACKGROUND}
        placeholderContentFit="cover"
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={imagePosition === "right" ? "right" : "center"}
        // Keep the decoded bitmap around: this image is mounted once at the
        // root, but a re-mount would otherwise decode from disk again.
        cachePolicy="memory-disk"
        transition={200}
      />

      {/*
        Scrims stay gated on `uri`. They exist to keep white text legible over
        the dark CMS photos; the bundled fallback is light, so darkening it
        would work against the very text it is meant to help.
      */}
      {uri && !noOverlay ? (
        darkOverlay ? (
          <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />
        ) : (
          <>
            <View style={[StyleSheet.absoluteFill, styles.verticalOverlay]} />
            <View style={[StyleSheet.absoluteFill, styles.sideOverlay]} />
          </>
        )
      ) : null}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  verticalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sideOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  darkOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  content: {
    flex: 1,
  },
});
