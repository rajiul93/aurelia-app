import { Ionicons } from "@react-native-vector-icons/ionicons";
import { usePathname, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
import {
  answerQuestion,
  type AssistantAnswer,
} from "@/lib/knowledge/assistant";
import { generateAnswer, type GenerationHandle } from "@/lib/knowledge/generate";
import { enqueueUnansweredQuestion } from "@/lib/unanswered-questions/queue";
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
  const streamingMessageId = useChatStore((state) => state.streamingMessageId);
  const startAssistantMessage = useChatStore(
    (state) => state.startAssistantMessage,
  );
  const appendToAssistantMessage = useChatStore(
    (state) => state.appendToAssistantMessage,
  );
  const finishAssistantMessage = useChatStore(
    (state) => state.finishAssistantMessage,
  );

  const language = useLocaleStore((state) => state.language);
  const pack = useKnowledgeStore((state) => state.pack);
  const installedByTourId = useInstalledToursStore(
    (state) => state.installedByTourId,
  );
  // Only loaded once the chat is opened — see the hook's note on cost.
  const { data: tourDocuments, isLoading } =
    useInstalledToursSearchDocuments(open);

  // Refs, not state: these are read inside an in-flight async handler, where a
  // re-rendered copy of the closure would see a stale value.
  const generationRef = useRef<GenerationHandle | null>(null);
  const stoppedRef = useRef(false);

  // An abandoned generation keeps the model burning CPU and battery in the
  // background — the one thing this app cannot afford mid-tour.
  useEffect(() => {
    return () => {
      generationRef.current?.stop();
      generationRef.current = null;
    };
  }, []);

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

  function withSourceFooter(reply: string, sourceTourId: string | null) {
    const sourceTitle = sourceTourId
      ? installedByTourId[sourceTourId]?.title
      : null;

    return sourceTitle
      ? `${reply}\n\n${t("assistant.fromTour", { title: sourceTitle })}`
      : reply;
  }

  /**
   * Render an `AssistantAnswer` as localized text.
   *
   * The search libs are pure and return intent rather than prose, so the
   * templates live here where `t()` is available — a name question with no body
   * sentence becomes "It is called {title}.", and a body sentence gets its
   * subject re-attached, because a sentence lifted out of a document loses what
   * "it" referred to.
   *
   * The title stays *outside* the sentence: Spanish and French need article and
   * gender agreement (el Coliseo vs la Basílica), so a slot inside the sentence
   * would produce broken grammar.
   */
  function composeReply(result: AssistantAnswer) {
    if (!result.reply) {
      return result.subject
        ? t("assistant.nameReply", { title: result.subject })
        : t("assistant.noAnswer");
    }

    return result.subject
      ? t("assistant.answerWithSubject", {
          title: result.subject,
          body: result.reply,
        })
      : result.reply;
  }

  /** The pre-existing keyword assistant. Every generative failure lands here. */
  function retrievalAnswer(question: string) {
    const result = answerQuestion(
      question,
      language,
      pack,
      documents,
      activeTourId,
    );

    // `hasSources: false` is the one deterministic "the corpus truly has
    // nothing" signal — generation itself only ever starts once
    // `retrievePassages` found at least one passage (see generate.ts), so
    // this is reached whether the LLM never ran or ran and then failed
    // mid-stream. Deliberately not scanning the *generated* reply text for a
    // refusal phrase: that would need matching English/Spanish/French
    // phrasing the model could word many different ways.
    if (!result.hasSources) {
      void enqueueUnansweredQuestion({
        question,
        language,
        tourId: activeTourId ?? "",
      });
    }

    // A greeting is not a knowledge gap and has no source, so it skips both the
    // enqueue above (via hasSources) and the tour footer below.
    if (result.kind === "greeting") {
      return t("assistant.greetingReply");
    }

    return withSourceFooter(
      composeReply(result),
      result.sourceTourId,
    );
  }

  async function handleSend(question: string) {
    appendMessages(
      [{ id: `user-${Date.now()}`, role: "user", content: question }],
      remote.maxChatHistory,
    );

    if (!hasCorpus) {
      appendMessages(
        [
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: t("assistant.empty"),
          },
        ],
        remote.maxChatHistory,
      );
      return;
    }

    const assistantId = `assistant-${Date.now()}`;
    startAssistantMessage(assistantId, remote.maxChatHistory);
    stoppedRef.current = false;

    const result = await generateAnswer({
      question,
      language,
      pack,
      tourDocuments: documents,
      preferredTourId: activeTourId,
      enabled: remote.enableOnDeviceLlm,
      onToken: (chunk) => appendToAssistantMessage(assistantId, chunk),
    });

    if (!result.started) {
      finishAssistantMessage(assistantId, retrievalAnswer(question));
      return;
    }

    generationRef.current = result.handle;
    const text = await result.handle.completion;
    generationRef.current = null;

    // Stopped by the user: keep whatever streamed in rather than replacing it,
    // since a partial answer is what they chose to look at.
    if (stoppedRef.current) {
      finishAssistantMessage(assistantId);
      return;
    }

    // null here means the model failed mid-stream, not that it was stopped —
    // so the retrieval answer replaces whatever half-sentence is on screen.
    if (text === null || text.length === 0) {
      finishAssistantMessage(assistantId, retrievalAnswer(question));
      return;
    }

    finishAssistantMessage(
      assistantId,
      withSourceFooter(text, result.handle.sourceTourId),
    );
  }

  const handleStop = useCallback(() => {
    stoppedRef.current = true;
    generationRef.current?.stop();
    generationRef.current = null;
  }, []);

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
            isBusy={streamingMessageId !== null}
            canSend={remote.enableOfflineChat}
            onSend={(question) => void handleSend(question)}
            onStop={handleStop}
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
