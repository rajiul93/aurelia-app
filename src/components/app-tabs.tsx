import { Tabs } from "expo-router/js-tabs";

import { GlassTabBar } from "@/components/navigation/glass-tab-bar";
import { useStrings } from "@/hooks/use-strings";

export default function AppTabs() {
  const { t } = useStrings();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
      <Tabs.Screen name="explore" options={{ title: t("tabs.account") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
      <Tabs.Screen name="assistant" options={{ title: t("tabs.assistant") }} />
    </Tabs>
  );
}
