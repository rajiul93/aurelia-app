import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type PageBackgroundProps = {
  uri?: string | null;
  children: ReactNode;
  style?: ViewStyle;
  imagePosition?: "center" | "right";
  /** Applies a stronger dark scrim so foreground text can stay white. */
  darkOverlay?: boolean;
};

export function PageBackground({
  uri,
  children,
  style,
  imagePosition = "center",
  darkOverlay = false,
}: PageBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={imagePosition === "right" ? "right" : "center"}
          transition={200}
        />
      ) : null}

      {uri ? (
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
