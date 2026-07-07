import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { type ReactNode, useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { TAB_BAR_BASE_HEIGHT } from "@/hooks/use-tab-bar-height";
import { useTheme } from "@/hooks/use-theme";

/**
 * Real liquid glass on iOS 26; a themed translucent surface everywhere else so
 * the bar always renders with a glassy look.
 */
function GlassSurface({
  style,
  children,
}: {
  style: ViewStyle | ViewStyle[];
  children: ReactNode;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView style={style} glassEffectStyle="regular">
        {children}
      </GlassView>
    );
  }
  return <View style={style}>{children}</View>;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: "home", inactive: "home-outline" },
  explore: { active: "person-circle", inactive: "person-circle-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
  faq: { active: "help-circle", inactive: "help-circle-outline" },
  assistant: { active: "sparkles", inactive: "sparkles-outline" },
};

const BAR_HEIGHT = TAB_BAR_BASE_HEIGHT;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const liquidGlass = isLiquidGlassAvailable();

  const routes = state.routes;
  const tabWidthPct = 100 / routes.length;
  const indicator = useSharedValue(state.index);

  useEffect(() => {
    indicator.value = withTiming(state.index, { duration: 260 });
  }, [state.index, indicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicator.value * tabWidthPct}%`,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}
    >
      <GlassSurface
        style={[
          styles.bar,
          {
            backgroundColor: liquidGlass
              ? "transparent"
              : withAlpha(theme.backgroundElement, 0.92),
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indicator,
            { width: `${tabWidthPct}%` },
            indicatorStyle,
          ]}
        >
          <View
            style={[
              styles.indicatorPill,
              { backgroundColor: withAlpha(theme.primary, 0.16) },
            ]}
          />
        </Animated.View>

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
                color={focused ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="small"
                style={[
                  styles.label,
                  { color: focused ? theme.primary : theme.textSecondary },
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
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorPill: {
    width: 52,
    height: 40,
    borderRadius: 20,
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
