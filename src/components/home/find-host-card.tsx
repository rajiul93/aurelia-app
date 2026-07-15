import { useRouter } from "expo-router";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "@/components/themed-text";
import { GlassCard } from "@/components/ui/glass-card";

interface FindHostCardProps {
  tourId: string;
  delay?: number;
}

export function FindHostCard({ tourId, delay = 0 }: FindHostCardProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420).springify().damping(18)}
    >
      <Pressable
        onPress={() => router.push(`/find-host/${tourId}`)}
        style={{ opacity: 1 }}
      >
        <GlassCard>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: `${theme.primary}22`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="person" size={20} color={theme.primary} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </View>

          <ThemedText type="smallBold" style={{ marginBottom: 4 }}>
            👤 Find Your Host
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            Get help from an on-site host. View location, availability, and walking directions.
          </ThemedText>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}
