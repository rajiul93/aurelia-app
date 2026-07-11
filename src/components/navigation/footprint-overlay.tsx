import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type FootprintMarkerProps = {
  bearing: number;
  moving: boolean;
};

function buildFootprintPath() {
  const path = Skia.Path.Make();
  path.addOval({ x: -8, y: -12, width: 16, height: 20 });
  path.addOval({ x: 10, y: 4, width: 14, height: 18 });
  return path;
}

const footprintPath = buildFootprintPath();

/**
 * Animated footprint icon meant to live inside a MapLibre `<Marker>` at the
 * user's coordinates. Keeping it in a marker avoids Android GLSurfaceView
 * layering issues and removes fragile lat/lng → screen projection retries.
 */
export function FootprintMarker({ bearing, moving }: FootprintMarkerProps) {
  const pulse = useSharedValue(1);
  const animatedBearing = useSharedValue(bearing);

  useEffect(() => {
    animatedBearing.value = withTiming(bearing, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedBearing, bearing]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(moving ? 1.1 : 1.04, {
          duration: moving ? 360 : 800,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: moving ? 360 : 800,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [moving, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${animatedBearing.value - 90}deg` },
      { scale: pulse.value },
    ],
  }));

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.footprint, animatedStyle]}>
        <Canvas style={styles.canvas}>
          <Group>
            <Path
              path={footprintPath}
              color="rgba(225, 165, 102, 0.96)"
              style="fill"
            />
          </Group>
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  footprint: {
    width: 36,
    height: 36,
  },
  canvas: {
    width: 36,
    height: 36,
  },
});
