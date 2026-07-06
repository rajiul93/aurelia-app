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

type FootprintOverlayProps = {
  screenX: number;
  screenY: number;
  bearing: number;
  moving: boolean;
  width: number;
  height: number;
};

function buildFootprintPath() {
  const path = Skia.Path.Make();
  path.addOval({ x: -8, y: -12, width: 16, height: 20 });
  path.addOval({ x: 10, y: 4, width: 14, height: 18 });
  return path;
}

const footprintPath = buildFootprintPath();
const POSITION_ANIMATION_MS = 260;

export function FootprintOverlay({
  screenX,
  screenY,
  bearing,
  moving,
  width,
  height,
}: FootprintOverlayProps) {
  const pulse = useSharedValue(1);
  const animatedX = useSharedValue(screenX);
  const animatedY = useSharedValue(screenY);
  const animatedBearing = useSharedValue(bearing);

  useEffect(() => {
    animatedX.value = withTiming(screenX, {
      duration: POSITION_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    animatedY.value = withTiming(screenY, {
      duration: POSITION_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    animatedBearing.value = withTiming(bearing, {
      duration: POSITION_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedBearing, animatedX, animatedY, bearing, screenX, screenY]);

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
      { translateX: animatedX.value - 18 },
      { translateY: animatedY.value - 18 },
      { rotate: `${animatedBearing.value - 90}deg` },
      { scale: pulse.value },
    ],
  }));

  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.overlay, { width, height }]}>
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
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  footprint: {
    position: "absolute",
    width: 36,
    height: 36,
  },
  canvas: {
    width: 36,
    height: 36,
  },
});
