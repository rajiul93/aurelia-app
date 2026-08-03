import { Ionicons } from "@react-native-vector-icons/ionicons";
import { usePathname, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatConversation } from "@/components/chat/chat-conversation";
import { ChatHeadIcon } from "@/components/chat/chat-head-icon";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useInstalledToursSearchDocuments } from "@/hooks/queries/use-installed-tours-search-documents";
import { useStrings } from "@/hooks/use-strings";
import { useTabBarHeight } from "@/hooks/use-tab-bar-height";
import { useTheme } from "@/hooks/use-theme";
import {
  shouldHideChatHead,
  tourIdFromPathname,
} from "@/lib/chat/current-tour-id";
import { answerQuestion } from "@/lib/knowledge/assistant";
import { useChatStore } from "@/store/chat-store";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { useLocaleStore } from "@/store/locale-store";
import { useRemoteConfig } from "@/store/release-config-store";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEAD_SIZE = 56;
const EDGE_MARGIN = Spacing.three;
const PANEL_HEIGHT_RATIO = 0.78;

export function FloatingChat() {
  const theme = useTheme();
  const { t } = useStrings();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const tabBarHeight = useTabBarHeight();
  const remote = useRemoteConfig();

  const open = useChatStore((state) => state.open);
  const messages = useChatStore((state) => state.messages);
  const openChat = useChatStore((state) => state.openChat);
  const closeChat = useChatStore((state) => state.closeChat);
  const appendMessages = useChatStore((state) => state.appendMessages);

  const language = useLocaleStore((state) => state.language);
  const pack = useKnowledgeStore((state) => state.pack);
  const installedByTourId = useInstalledToursStore(
    (state) => state.installedByTourId,
  );
  // Only loaded once the chat is opened — see the hook's note on cost.
  const { data: tourDocuments, isLoading } =
    useInstalledToursSearchDocuments(open);

  // The head rests above the tab bar on tab routes and just above the safe area
  // elsewhere. `bottom` is pinned to the lower of the two and the difference is
  // carried as an *animated* lift: setting `bottom` directly made the head jump
  // 62px the instant the router segments changed — mid-transition, unanimated.
  const onTabRoute = segments[0] === "(tabs)";
  const restingBottom = Math.max(insets.bottom, Spacing.two) + Spacing.three;
  const tabLift = onTabRoute ? tabBarHeight - Math.max(insets.bottom, Spacing.two) : 0;

  const maxX = SCREEN_WIDTH - HEAD_SIZE - EDGE_MARGIN * 2;
  const minY = -(SCREEN_HEIGHT - insets.top - HEAD_SIZE - restingBottom - tabLift);

  const translateX = useSharedValue(maxX);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const progress = useSharedValue(0);
  const lift = useSharedValue(tabLift);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 240 });
  }, [open, progress]);

  useEffect(() => {
    lift.value = withTiming(tabLift, { duration: 220 });
  }, [lift, tabLift]);

  // Rebuilt only when the drag bounds change — `usePathname`/`useSegments`
  // re-render this component on every navigation, and recreating three Gesture
  // objects per push is pure waste during the transition.
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        startX.value = translateX.value;
        // Clamped on pick-up: the drag range shifts with the tab-bar lift, so a
        // head parked near the top can be out of bounds by the time it is
        // grabbed on another route.
        startY.value = Math.max(minY, translateY.value);
      })
      .onUpdate((event) => {
        translateX.value = Math.min(
          maxX,
          Math.max(0, startX.value + event.translationX),
        );
        translateY.value = Math.min(
          0,
          Math.max(minY, startY.value + event.translationY),
        );
      })
      .onEnd(() => {
        // Snap to whichever side is nearer, like a real chat head parking.
        translateX.value = withSpring(translateX.value > maxX / 2 ? maxX : 0, {
          damping: 18,
          stiffness: 180,
        });
      });

    // Race, not Simultaneous: a drag must not also register as a tap.
    const tap = Gesture.Tap().onEnd((_event, success) => {
      if (success) {
        runOnJS(openChat)();
      }
    });

    return Gesture.Race(pan, tap);
    // Shared values are stable refs by contract and are deliberately not deps —
    // reanimated forbids mutating a value that was passed into the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxX, minY, openChat]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      // Clamped on read rather than written back, so the head stays in bounds
      // when the range shifts without mutating a value the gesture also owns.
      { translateY: Math.max(minY, translateY.value) - lift.value },
    ],
    opacity: 1 - progress.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SCREEN_HEIGHT }],
  }));

  const activeTourId = tourIdFromPathname(pathname);
  const documents = tourDocuments ?? [];
  const hasCorpus = Boolean(pack) || documents.length > 0;

  function handleSend(question: string) {
    const result = answerQuestion(
      question,
      language,
      pack,
      documents,
      activeTourId,
    );

    const reply = hasCorpus
      ? result.reply || t("assistant.noAnswer")
      : t("assistant.empty");

    const sourceTitle = result.sourceTourId
      ? installedByTourId[result.sourceTourId]?.title
      : null;

    appendMessages(
      [
        { id: `user-${Date.now()}`, role: "user", content: question },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: sourceTitle
            ? `${reply}\n\n${t("assistant.fromTour", { title: sourceTitle })}`
            : reply,
        },
      ],
      remote.maxChatHistory,
    );
  }

  if (shouldHideChatHead(pathname)) {
    return null;
  }

  const banner = !remote.enableOfflineChat
    ? t("assistant.disabled")
    : !isLoading && !hasCorpus
      ? t("assistant.noKnowledge")
      : null;

  return (
    <>
      <Animated.View
        pointerEvents={open ? "none" : "box-none"}
        style={[
          styles.headWrap,
          // Anchored left: translateX 0 is the left edge and maxX the right, so
          // the drag clamp and the edge snap share one coordinate system.
          { left: EDGE_MARGIN, bottom: restingBottom },
          headStyle,
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View
            accessibilityRole="button"
            accessibilityLabel={t("assistant.title")}
            style={[styles.head, { backgroundColor: theme.primary }]}
          >
            <ChatHeadIcon
              size={26}
              color={theme.primaryForeground}
              paused={open}
            />
          </View>
        </GestureDetector>
      </Animated.View>

      {/*
        Only mounted while open. Kept permanently mounted (merely translated
        offscreen) it rebuilt the whole conversation subtree on every
        navigation, since usePathname/useSegments re-render this component.
      */}
      {open ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeChat} />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              height: SCREEN_HEIGHT * PANEL_HEIGHT_RATIO,
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
            panelStyle,
          ]}
        >
          <View style={styles.grabHandleWrap}>
            <View
              style={[
                styles.grabHandle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
          </View>

          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderText}>
              <ThemedText type="subtitle">{t("assistant.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("assistant.subtitle")}
              </ThemedText>
            </View>
            <Pressable onPress={closeChat} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ChatConversation
            messages={messages}
            // Resolved here at render, not frozen in state, so it keeps following
            // a language change once the conversation has started.
            welcome={t("assistant.initialMessage")}
            banner={banner}
            isLoading={isLoading}
            canSend={remote.enableOfflineChat}
            onSend={handleSend}
          />
        </Animated.View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headWrap: {
    position: "absolute",
  },
  head: {
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.24,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  backdrop: {
    backgroundColor: "#000",
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: "hidden",
  },
  grabHandleWrap: {
    alignItems: "center",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  panelHeaderText: {
    flex: 1,
    gap: Spacing.one,
  },
});
