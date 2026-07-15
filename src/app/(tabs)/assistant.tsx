import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HamburgerButton } from "@/components/navigation/hamburger-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Spacing } from "@/constants/theme";
import { answerQuestion } from "@/lib/knowledge/assistant";
import { useStrings } from "@/hooks/use-strings";
import { useTabBarHeight } from "@/hooks/use-tab-bar-height";
import { useTheme } from "@/hooks/use-theme";
import { useLocaleStore } from "@/store/locale-store";
import { useKnowledgeStore } from "@/store/knowledge-store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_ID = "welcome";

export default function AssistantScreen() {
  const theme = useTheme();
  const { t } = useStrings();
  const tabBarHeight = useTabBarHeight();
  const language = useLocaleStore((state) => state.language);
  const pack = useKnowledgeStore((state) => state.pack);
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: WELCOME_ID, role: "assistant", content: t("assistant.initialMessage") },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
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

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isThinking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);
    scrollToBottom();

    const result = answerQuestion(trimmed, language, pack);
    const reply = result.reply || t("assistant.noAnswer");

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: pack ? reply : t("assistant.empty"),
    };
    setMessages((current) => [...current, assistantMessage]);
    setIsThinking(false);
    scrollToBottom();
  }

  const keyboardOpen = keyboardHeight > 0;
  // Clear the floating tab bar when the keyboard is closed; sit directly above
  // the keyboard when it is open (the tab bar is hidden behind it).
  const contentBottomInset = keyboardOpen ? keyboardHeight : tabBarHeight;

  return (
    <ThemedView transparent style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.content, { paddingBottom: contentBottomInset }]}>
          <View style={styles.header}>
            <HamburgerButton />
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{t("assistant.title")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("assistant.subtitle")}
              </ThemedText>
            </View>
          </View>

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
                      ? [styles.userBubble, { backgroundColor: theme.primary }]
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
          </ScrollView>

          <View
            style={[
              styles.composer,
              {
                borderTopColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
          >
            <TextInput
              editable={!isThinking}
              multiline
              placeholder={t("assistant.placeholder")}
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
              onSubmitEditing={handleSend}
            />
            <Pressable
              disabled={!input.trim() || isThinking}
              onPress={handleSend}
              style={[
                styles.sendButton,
                {
                  backgroundColor: theme.primary,
                  opacity: !input.trim() || isThinking ? 0.5 : 1,
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
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  headerText: { flex: 1, gap: Spacing.one },
  messages: { flex: 1 },
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
  userBubble: { alignSelf: "flex-end" },
  assistantBubble: { alignSelf: "flex-start" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
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
