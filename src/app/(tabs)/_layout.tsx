import { View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { AppDrawer } from "@/components/navigation/app-drawer";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppTabs />
      <AppDrawer />
    </View>
  );
}
