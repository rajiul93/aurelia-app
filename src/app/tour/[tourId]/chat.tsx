import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Spacing } from "@/constants/theme";
import { useInstalledTourSearchDocuments } from "@/hooks/queries/use-installed-tour-search";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import {
  formatKnowledgeReply,
  searchTourKnowledge,
} from "@/lib/bundle/knowledge-search";
import { useInstalledToursStore } from "@/store/installed-tours-store";
import { useLocaleStore } from "@/store/locale-store";
import { useRemoteConfig } from "@/store/release-config-store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_MESSAGE_ID = "welcome";

export default function TourChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const insets = useSafeAreaInsets();
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const language = useLocaleStore((state) => state.language);
  const installed = useInstalledToursStore(
    (state) => state.installedByTourId[tourId ?? ""] ?? null,
  );
  const searchLanguage =
    installed?.downloadPreferences?.contentLanguage ?? language;
  const searchAudience = installed?.downloadPreferences?.audience;
  const remote = useRemoteConfig();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: WELCOME_MESSAGE_ID,
      role: "assistant",
      content: t("chat.initialMessage"),
    };

    setMessages((current) => {
      if (current.length === 0) {
        return [welcomeMessage];
      }

      if (
        current.length === 1 &&
        current[0]?.id === WELCOME_MESSAGE_ID &&
        current[0].role === "assistant"
      ) {
        return [welcomeMessage];
      }

      return current;
    });
  }, [t]);

  const { data: documents = [], isLoading } =
    useInstalledTourSearchDocuments(tourId);

  const hasKnowledge = documents.length > 0;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSearching || !remote.enableOfflineChat) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSearching(true);
    scrollToBottom();

    const matches = searchTourKnowledge(
      documents,
      trimmed,
      searchLanguage,
      searchAudience,
    );
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: formatKnowledgeReply(trimmed, matches),
    };

    setMessages((current) =>
      [...current, assistantMessage].slice(-remote.maxChatHistory),
    );
    setIsSearching(false);
    scrollToBottom();
  }

  const composerBottomInset =
    keyboardHeight > 0 ? Spacing.two : Math.max(insets.bottom, Spacing.two);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View
          style={[
            styles.content,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
          ]}
        >
          <View style={styles.headerWrap}>
            <ScreenHeader
              title={t("chat.title")}
              subtitle={t("chat.subtitle")}
              onBack={() => router.back()}
            />
          </View>

          {!remote.enableOfflineChat ? (
            <View
              style={[
                styles.emptyBanner,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText type="small">{t("chat.disabled")}</ThemedText>
            </View>
          ) : null}

          {!isLoading && !hasKnowledge ? (
            <View
              style={[
                styles.emptyBanner,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText type="small">{t("chat.noKnowledge")}</ThemedText>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              onContentSizeChange={scrollToBottom}
            >
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.bubble,
                      isUser
                        ? [
                            styles.userBubble,
                            { backgroundColor: theme.primary },
                          ]
                        : [
                            styles.assistantBubble,
                            { backgroundColor: theme.backgroundElement },
                          ],
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: isUser ? theme.primaryForeground : theme.text,
                      }}
                    >
                      {message.content}
                    </ThemedText>
                  </View>
                );
              })}

              {isSearching ? (
                <View
                  style={[
                    styles.bubble,
                    styles.assistantBubble,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : null}
            </ScrollView>
          )}

          <View
            style={[
              styles.composer,
              {
                borderTopColor: theme.backgroundSelected,
                backgroundColor: theme.background,
                paddingBottom: composerBottomInset,
              },
            ]}
          >
            <TextInput
              editable={!isLoading && !isSearching && remote.enableOfflineChat}
              multiline
              placeholder={t("chat.placeholder")}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              textAlignVertical="top"
              value={input}
              onChangeText={setInput}
              onFocus={scrollToBottom}
              onSubmitEditing={() => void handleSend()}
            />
            <Pressable
              disabled={!input.trim() || isLoading || isSearching}
              onPress={() => void handleSend()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    !input.trim() || isLoading || isSearching ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="send" size={20} color={theme.primaryForeground} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  emptyBanner: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  assistantBubble: {
    alignSelf: "flex-start",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    fontFamily: Fonts.sansMedium,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
});
