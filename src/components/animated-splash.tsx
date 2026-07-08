import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";

/** Matches the native splash background so there is never a colour flash. */
const SPLASH_BACKGROUND = "#0c0a09";
const FADE_DURATION = 450;
// Small delay lets the app paint its first frame under the overlay before the
// fade reveals it.
const FADE_DELAY = 120;
// Safety net: hide the native splash even if the image's onLoadEnd never fires.
const NATIVE_HIDE_TIMEOUT = 1500;

type AnimatedSplashProps = {
  /** Becomes true when all offline resources have finished loading. */
  ready: boolean;
};

/**
 * A full-screen, edge-to-edge splash overlay rendered in JS on top of the app.
 * It shows `splash-icon.png` scaled to cover the whole screen, hands off from
 * the native splash only once its own image has painted (so there is no gap or
 * flash), and fades out once the app is ready. Identical behaviour on Android
 * and iOS.
 */
export function AnimatedSplash({ ready }: AnimatedSplashProps) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [hidden, setHidden] = useState(false);
  const nativeHiddenRef = useRef(false);

  const hideNativeSplash = useCallback(() => {
    if (nativeHiddenRef.current) {
      return;
    }
    nativeHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      // Already hidden or unavailable — safe to ignore.
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(hideNativeSplash, NATIVE_HIDE_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [hideNativeSplash]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      delay: FADE_DELAY,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        setHidden(true);
      }
    });

    return () => animation.stop();
  }, [ready, opacity]);

  if (hidden) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={ready ? "none" : "auto"}
      style={[styles.container, { opacity }]}
    >
      <Image
        source={require("../../assets/images/splash-icon.png")}
        resizeMode="cover"
        style={styles.image}
        onLoadEnd={hideNativeSplash}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SPLASH_BACKGROUND,
    zIndex: 100,
    elevation: 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
