import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { type ReactNode, useEffect, useState } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { TAB_BAR_BASE_HEIGHT } from "@/hooks/use-tab-bar-height";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Apple-style glass surface for the bar:
 * - iOS 26+: real Liquid Glass via GlassView.
 * - Everywhere else (Android, older iOS): a real frosted blur of the content
 *   scrolling behind it via BlurView (dimezisBlurView gives live blur on
 *   Android).
 */
function GlassSurface({
  scheme,
  style,
  children,
  onLayout,
}: {
  scheme: "light" | "dark";
  style: ViewStyle | ViewStyle[];
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView style={style} glassEffectStyle="regular" onLayout={onLayout}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      tint={
        scheme === "dark"
          ? "systemChromeMaterialDark"
          : "systemChromeMaterialLight"
      }
      intensity={60}
      blurMethod="dimezisBlurView"
      style={style}
      onLayout={onLayout}
    >
      {children}
    </BlurView>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: "home", inactive: "home-outline" },
  explore: { active: "person-circle", inactive: "person-circle-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
  assistant: { active: "sparkles", inactive: "sparkles-outline" },
};

const BAR_HEIGHT = TAB_BAR_BASE_HEIGHT;
const PILL_INSET = 12;
const PILL_HEIGHT = BAR_HEIGHT - 14;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const liquidGlass = isLiquidGlassAvailable();

  const routes = state.routes;
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? barWidth / routes.length : 0;

  const translateX = useSharedValue(0);
  const initialized = useSharedValue(false);

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }
    const target = state.index * tabWidth;
    if (initialized.value) {
      // Smooth, lightly-damped settle — polished without a distracting bounce.
      translateX.value = withSpring(target, {
        dampingRatio: 0.82,
        duration: 420,
      });
    } else {
      // Place under the active tab on first measure without animating in.
      translateX.value = target;
      initialized.value = true;
    }
  }, [state.index, tabWidth, translateX, initialized]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}
    >
      <GlassSurface
        scheme={scheme}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            // Liquid Glass / BlurView provide the fill; keep only a faint tint
            // over the blur for legibility so the frosted effect shows through.
            backgroundColor: liquidGlass
              ? "transparent"
              : withAlpha(theme.backgroundElement, 0.2),
            borderColor: withAlpha(theme.text, 0.12),
          },
        ]}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: tabWidth }, indicatorStyle]}
          >
            <View
              style={[
                styles.indicatorPill,
                {
                  width: Math.max(tabWidth - PILL_INSET * 2, 0),
                  backgroundColor: theme.primary,
                },
                Platform.OS === "ios"
                  ? {
                      shadowColor: theme.primary,
                      shadowOpacity: 0.55,
                      shadowRadius: 9,
                      shadowOffset: { width: 0, height: 2 },
                    }
                  : null,
              ]}
            />
          </Animated.View>
        ) : null}

        {routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? {
            active: "ellipse",
            inactive: "ellipse-outline",
          };
          const activeColor = theme.primaryForeground;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
            >
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={22}
                color={focused ? activeColor : theme.textSecondary}
              />
              <ThemedText
                type={focused ? "smallBold" : "small"}
                style={[
                  styles.label,
                  { color: focused ? activeColor : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
  },
  bar: {
    flexDirection: "row",
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  indicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorPill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: BAR_HEIGHT,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
  },
});
