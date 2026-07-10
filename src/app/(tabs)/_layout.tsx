import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, type } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.canvasDark }, headerTintColor: colors.onDark,
      headerShadowVisible: false,
      tabBarStyle: { backgroundColor: colors.canvasDark, borderTopColor: colors.hairlineOnDark },
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: type.navLink,
      sceneStyle: { backgroundColor: colors.canvasDark },
    }}>
      <Tabs.Screen name="index" options={{ title: '종목', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: '일정', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="checks" options={{ title: '점검', tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
