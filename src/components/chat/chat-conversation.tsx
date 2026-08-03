import { Ionicons } from "@react-native-vector-icons/ionicons";
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

import { ThemedText } from "@/components/themed-text";
import { Fonts, Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import type { ChatMessage } from "@/store/chat-store";

type ChatConversationProps = {
  messages: ChatMessage[];
  /** Rendered above the thread; resolved by the caller at render time. */
  welcome: string;
  banner?: string | null;
  isLoading?: boolean;
  isBusy?: boolean;
  canSend: boolean;
  onSend: (question: string) => void;
};

/**
 * The message thread and composer. Extracted because the Assistant tab and the
 * in-tour chat screen each carried their own byte-identical copy of this markup
 * before they were merged into the floating chat.
 */
export function ChatConversation({
  messages,
  welcome,
  banner,
  isLoading = false,
  isBusy = false,
  canSend,
  onSend,
}: ChatConversationProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
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
    if (!trimmed || isBusy || !canSend) {
      return;
    }

    setInput("");
    onSend(trimmed);
    scrollToBottom();
  }

  const sendDisabled = !input.trim() || isBusy || !canSend;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
      ]}
    >
      {banner ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <ThemedText type="small">{banner}</ThemedText>
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
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onContentSizeChange={scrollToBottom}
        >
          <View
            style={[
              styles.bubble,
              styles.assistantBubble,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.text }}>
              {welcome}
            </ThemedText>
          </View>

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
      )}

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
          editable={!isLoading && !isBusy && canSend}
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
          disabled={sendDisabled}
          onPress={handleSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: theme.primary,
              opacity: sendDisabled ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="send" size={20} color={theme.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
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
