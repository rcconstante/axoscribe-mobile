import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Mic, UploadCloud, HardDrive } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";
import { HistoryDrawerProvider } from "@/src/HistoryDrawer";

function TabItem({
  icon,
  label,
  focused,
}: {
  icon: React.ReactNode;
  label: string;
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.tabPill,
        focused && { backgroundColor: colors.primary },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primaryForeground : colors.tabBarInactive },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const tabBottom =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 16) + 8
      : Math.max(insets.bottom, 8) + 10;

  return (
    <HistoryDrawerProvider>
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: tabBottom,
          left: 0,
          right: 0,
          marginHorizontal: 24,
          backgroundColor: colors.tabBar,
          borderRadius: 32,
          height: 64,
          borderTopWidth: 0,
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 20,
          elevation: 12,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          height: 64,
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarIconStyle: {
          width: "100%",
          height: 64,
          flex: 1,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={
                <UploadCloud
                  size={20}
                  color={
                    focused ? colors.primaryForeground : colors.tabBarInactive
                  }
                />
              }
              label="Upload"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={
                <Mic
                  size={20}
                  color={
                    focused ? colors.primaryForeground : colors.tabBarInactive
                  }
                />
              }
              label="Record"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="models"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={
                <HardDrive
                  size={20}
                  color={
                    focused ? colors.primaryForeground : colors.tabBarInactive
                  }
                />
              }
              label="Models"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
    </HistoryDrawerProvider>
  );
}

const styles = StyleSheet.create({
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    minWidth: 72,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});