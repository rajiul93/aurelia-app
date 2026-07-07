import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useRequestOtp, useVerifyOtp } from "@/hooks/mutations/use-auth";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "@/lib/api-error";

type SignInFormProps = {
  onSignedIn?: () => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SignInForm({ onSignedIn }: SignInFormProps) {
  const theme = useTheme();
  const { t } = useStrings();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const isPending = requestOtp.isPending || verifyOtp.isPending;
  const activeError = requestOtp.error ?? verifyOtp.error;

  async function handleSendCode() {
    if (!isValidEmail(trimmedEmail)) {
      return;
    }

    requestOtp.reset();
    verifyOtp.reset();
    setDevCode(null);
    setDevHint(null);

    const response = await requestOtp.mutateAsync(trimmedEmail);
    setDevCode(response.data.devCode ?? null);
    setDevHint(response.data.devHint ?? null);
    setStep("code");
  }

  async function handleVerify() {
    if (code.trim().length < 6) {
      return;
    }

    await verifyOtp.mutateAsync({ email: trimmedEmail, code: code.trim() });
    setCode("");
    setStep("email");
    setDevCode(null);
    setDevHint(null);
    onSignedIn?.();
  }

  function handleChangeEmail() {
    verifyOtp.reset();
    setCode("");
    setDevCode(null);
    setDevHint(null);
    setStep("email");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText type="smallBold" style={styles.wrapText}>
          {t("auth.verifyEmail")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.wrapText}>
          {t("auth.verifyEmailHint")}
        </ThemedText>

        {step === "email" ? (
          <View style={styles.fieldRow}>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isPending}
              keyboardType="email-address"
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              returnKeyType="send"
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => void handleSendCode()}
            />
            <Pressable
              disabled={!isValidEmail(trimmedEmail) || isPending}
              onPress={() => void handleSendCode()}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    !isValidEmail(trimmedEmail) || isPending ? 0.5 : 1,
                },
              ]}
            >
              {requestOtp.isPending ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.primaryForeground }}
                >
                  {t("auth.sendCode")}
                </ThemedText>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.codeStep}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.wrapText}>
              {t("auth.codeSentTo", { email: trimmedEmail })}
            </ThemedText>

            <TextInput
              autoComplete="one-time-code"
              editable={!isPending}
              keyboardType="number-pad"
              maxLength={6}
              placeholder={t("auth.codePlaceholder")}
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[
                styles.codeInput,
                {
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
              onSubmitEditing={() => void handleVerify()}
            />

            <View style={styles.codeActions}>
              <Pressable
                disabled={isPending}
                onPress={handleChangeEmail}
                style={styles.textButton}
              >
                <ThemedText type="linkPrimary">{t("auth.changeEmail")}</ThemedText>
              </Pressable>

              <Pressable
                disabled={code.trim().length < 6 || isPending}
                onPress={() => void handleVerify()}
                style={[
                  styles.verifyButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: code.trim().length < 6 || isPending ? 0.5 : 1,
                  },
                ]}
              >
                {verifyOtp.isPending ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.primaryForeground }}
                  >
                    {t("auth.verify")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {activeError ? (
          <ThemedText type="small" style={[styles.errorText, styles.wrapText]}>
            {getApiErrorMessage(activeError)}
          </ThemedText>
        ) : null}

        {devHint ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.wrapText}
          >
            {t("auth.devHint", { hint: devHint })}
          </ThemedText>
        ) : null}

        {devCode ? (
          <ThemedText type="small" themeColor="primary" style={styles.wrapText}>
            {t("auth.devCode", { code: devCode })}
          </ThemedText>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  input: {
    flex: 1,
    height: FIELD_HEIGHT,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    textAlignVertical: "center",
  },
  iconButton: {
    minWidth: 76,
    height: FIELD_HEIGHT,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  codeStep: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: "center",
  },
  codeActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  textButton: {
    paddingVertical: Spacing.one,
  },
  verifyButton: {
    minWidth: 96,
    height: FIELD_HEIGHT,
    borderRadius: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  errorText: {
    color: "#dc2626",
  },
});
