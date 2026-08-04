import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spacing } from "@/constants/theme";
import { useStrings } from "@/hooks/use-strings";
import { useTheme } from "@/hooks/use-theme";
import { getDeviceCapability } from "@/lib/llm/device-capability";
import { releaseLlamaContext } from "@/lib/llm/llama-runtime";
import {
  deleteInstalledModel,
  formatBytes,
  getModelStatus,
  startModelDownload,
  ModelDownloadError,
  type ModelDownloadHandle,
} from "@/lib/llm/model-manager";
import { useRemoteConfig } from "@/store/release-config-store";

/**
 * Lets the user fetch the on-device model that powers written answers.
 *
 * Deliberately opt-in rather than automatic: this is a ~0.5 GB transfer, and
 * pulling it silently would hit a visitor standing at the venue on mobile data.
 * Hidden entirely when the admin has not published a model or the device cannot
 * run one — an unusable control is worse than no control.
 */
export function AssistantModelPanel() {
  const theme = useTheme();
  const { t } = useStrings();
  const remote = useRemoteConfig();
  const capability = getDeviceCapability();

  const [status, setStatus] = useState(() => getModelStatus());
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const downloadRef = useRef<ModelDownloadHandle | null>(null);

  // An in-flight download holds a native task; leaving it running after the
  // screen is gone leaks it and keeps writing to disk with nothing watching.
  useEffect(() => {
    return () => downloadRef.current?.cancel();
  }, []);

  const messageForError = useCallback(
    (downloadError: unknown) => {
      if (downloadError instanceof ModelDownloadError) {
        switch (downloadError.code) {
          case "insufficient_space":
            return t("llm.errorSpace");
          case "size_mismatch":
          case "checksum_mismatch":
            return t("llm.errorChecksum");
          default:
            return t("llm.errorNetwork");
        }
      }

      return t("llm.errorNetwork");
    },
    [t],
  );

  async function handleDownload() {
    if (!remote.llmModelUrl) {
      return;
    }

    setError(null);
    setPercent(0);

    try {
      const handle = startModelDownload(
        {
          url: remote.llmModelUrl,
          sizeBytes: remote.llmModelSizeBytes,
          md5: remote.llmModelMd5,
        },
        (progress) => setPercent(progress.percent),
      );

      downloadRef.current = handle;
      setStatus({ state: "downloading", progress: { bytesWritten: 0, totalBytes: remote.llmModelSizeBytes, percent: 0 } });

      const installed = await handle.completion;
      downloadRef.current = null;

      setStatus(getModelStatus());

      if (!installed) {
        setPercent(0);
      }
    } catch (downloadError) {
      downloadRef.current = null;
      setError(messageForError(downloadError));
      setStatus(getModelStatus());
      setPercent(0);
    }
  }

  function handleDelete() {
    Alert.alert(t("llm.title"), t("llm.deleteConfirm"), [
      { text: t("storage.cancel"), style: "cancel" },
      {
        text: t("llm.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            // Release before unlinking: llama.cpp holds the file open, and
            // deleting underneath a live context crashes on the next token.
            await releaseLlamaContext();
            deleteInstalledModel();
            setStatus(getModelStatus());
            setPercent(0);
          })();
        },
      },
    ]);
  }

  // Nothing to offer: no model published, or a device that would OOM running it.
  if (!remote.llmModelUrl || remote.llmModelSizeBytes <= 0) {
    return null;
  }

  if (!capability.canRunModel) {
    return (
      <GlassCard style={styles.card}>
        <ThemedText type="smallBold">{t("llm.title")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("llm.unsupported")}
        </ThemedText>
      </GlassCard>
    );
  }

  const isDownloading = status.state === "downloading";
  const isReady = status.state === "ready";

  return (
    <GlassCard style={styles.card}>
      <ThemedText type="smallBold">{t("llm.title")}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t("llm.description")}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        {isDownloading
          ? t("llm.downloading", { percent })
          : isReady
            ? t("llm.ready", { size: formatBytes(status.sizeBytes) })
            : t("llm.notDownloaded", {
                size: formatBytes(remote.llmModelSizeBytes),
              })}
      </ThemedText>

      {isDownloading ? <ProgressBar value={percent} /> : null}

      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      {!isDownloading && !isReady ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {t("llm.wifiHint")}
          </ThemedText>
          <Pressable
            onPress={() => void handleDownload()}
            style={[styles.cta, { backgroundColor: theme.primary }]}
          >
            <Ionicons
              name="cloud-download-outline"
              size={16}
              color={theme.primaryForeground}
            />
            <ThemedText
              type="smallBold"
              style={{ color: theme.primaryForeground }}
            >
              {t("llm.download")}
            </ThemedText>
          </Pressable>
        </>
      ) : null}

      {isReady ? (
        <Pressable onPress={handleDelete} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={14} color="#dc2626" />
          <ThemedText type="smallBold" style={styles.errorText}>
            {t("llm.delete")}
          </ThemedText>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  errorText: {
    color: "#dc2626",
  },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  removeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
});
