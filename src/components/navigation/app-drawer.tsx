import { Ionicons } from "@react-native-vector-icons/ionicons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useKnowledgePages } from "@/hooks/use-knowledge";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { useDrawerStore } from "@/store/drawer-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export function AppDrawer() {
  const theme = useTheme();
  const { t } = useStrings();
  const router = useRouter();
  const open = useDrawerStore((state) => state.open);
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const pages = useKnowledgePages();

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 240 });
  }, [open, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * DRAWER_WIDTH }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const infoPages = pages.filter((page) => page.category === "INFO_PAGE");
  const legalPages = pages.filter((page) => page.category === "LEGAL");
  const appVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

  function goToPage(key: string) {
    closeDrawer();
    router.push(`/pages/${key}`);
  }

  function goToFaq() {
    closeDrawer();
    router.push("/faq");
  }

  function renderSection(
    label: string,
    items: typeof pages,
  ) {
    if (items.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          {label}
        </ThemedText>
        {items.map((page) => (
          <Pressable
            key={page.key}
            onPress={() => goToPage(page.key)}
            style={styles.row}
          >
            <Ionicons
              name={(page.icon as IoniconName) ?? "document-text-outline"}
              size={20}
              color={theme.primary}
            />
            <ThemedText type="small" style={styles.rowLabel}>
              {page.title}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? "auto" : "none"}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { width: DRAWER_WIDTH, backgroundColor: theme.background },
          panelStyle,
        ]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{t("drawer.menu")}</ThemedText>
            <Pressable onPress={closeDrawer} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Pressable onPress={goToFaq} style={styles.row}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={theme.primary}
                />
                <ThemedText type="small" style={styles.rowLabel}>
                  {t("faqScreen.title")}
                </ThemedText>
              </Pressable>
            </View>
            {renderSection(t("drawer.information"), infoPages)}
            {renderSection(t("drawer.legal"), legalPages)}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t("drawer.appVersion", { version: appVersion })}
            </ThemedText>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
