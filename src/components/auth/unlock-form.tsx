import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Spacing } from "@/constants/theme";
import { useUnlockTour } from "@/hooks/mutations/use-auth";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "@/lib/api-error";

type UnlockFormProps = {
  /**
   * Called after a successful unlock. When set, the form does not navigate —
   * the caller owns the next screen (e.g. subscribe checkout). When omitted,
   * the app goes to Home automatically.
   */
  onUnlocked?: () => void;
};

/** Enough digits to be a phone number at all; the server does the real matching. */
function hasEnoughDigits(phone: string) {
  return phone.replace(/\D/g, "").length >= 6;
}

/**
 * The buyer's way in: the phone number and 4-digit PIN the seller sent them by
 * hand. One step — there is nothing to send and wait for, unlike the old OTP.
 */
export function UnlockForm({ onUnlocked }: UnlockFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useStrings();
  const unlock = useUnlockTour();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit = hasEnoughDigits(phone) && pin.length === 4;

  async function handleUnlock() {
    if (!canSubmit || unlock.isPending) {
      return;
    }

    try {
      await unlock.mutateAsync({ phone: phone.trim(), pin });
      setPin("");

      if (onUnlocked) {
        onUnlocked();
        return;
      }

      router.replace("/");
    } catch {
      // Error is rendered from unlock.error below.
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <GlassCard>
        <ThemedText type="smallBold" style={styles.wrapText}>
          {t("auth.unlockTitle")}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.wrapText}
        >
          {t("auth.unlockHint")}
        </ThemedText>

        <TextInput
          autoComplete="tel"
          autoCorrect={false}
          editable={!unlock.isPending}
          keyboardType="phone-pad"
          placeholder={t("auth.phonePlaceholder")}
          placeholderTextColor={theme.textSecondary}
          returnKeyType="next"
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.backgroundSelected,
              backgroundColor: theme.background,
            },
          ]}
          value={phone}
          onChangeText={setPhone}
        />

        <TextInput
          autoComplete="off"
          editable={!unlock.isPending}
          keyboardType="number-pad"
          maxLength={4}
          placeholder={t("auth.pinPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          secureTextEntry
          style={[
            styles.pinInput,
            {
              color: theme.text,
              borderColor: theme.backgroundSelected,
              backgroundColor: theme.background,
            },
          ]}
          value={pin}
          onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
          onSubmitEditing={() => void handleUnlock()}
        />

        <Pressable
          disabled={!canSubmit || unlock.isPending}
          onPress={() => void handleUnlock()}
          style={[
            styles.unlockButton,
            {
              backgroundColor: theme.primary,
              opacity: !canSubmit || unlock.isPending ? 0.5 : 1,
            },
          ]}
        >
          {unlock.isPending ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name="lock-open-outline"
                size={18}
                color={theme.primaryForeground}
              />
              <ThemedText
                type="smallBold"
                style={{ color: theme.primaryForeground }}
              >
                {t("auth.unlock")}
              </ThemedText>
            </>
          )}
        </Pressable>

        {/*
          The server says the same thing for a wrong PIN and an unknown number,
          and spells out a lockout, an expiry, or a full device list — so show it
          verbatim rather than inventing our own wording.
        */}
        {unlock.error ? (
          <ThemedText type="small" style={[styles.errorText, styles.wrapText]}>
            {getApiErrorMessage(unlock.error)}
          </ThemedText>
        ) : null}
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  wrapText: {
    flexShrink: 1,
    alignSelf: "stretch",
  },
  input: {
    height: FIELD_HEIGHT,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    textAlignVertical: "center",
    marginTop: Spacing.one,
  },
  pinInput: {
    height: FIELD_HEIGHT,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: "center",
  },
  unlockButton: {
    height: FIELD_HEIGHT,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  errorText: {
    color: "#dc2626",
  },
});
