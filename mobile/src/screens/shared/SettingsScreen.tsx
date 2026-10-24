import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedCard } from "@/components/ui/Card";
import { ThemedButton } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { colors, typography, spacing } from "@shared/index";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";

export function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={{ fontSize: typography.fontSize["2xl"], fontWeight: typography.fontWeight.bold, color: colors.foreground, marginBottom: 24 }}>
          Settings
        </Text>

        <ThemedCard style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: typography.fontWeight.medium }}>Dark Mode</Text>
            <ThemedButton
              onPress={toggleTheme}
              variant={isDark ? "primary" : "outline"}
              size="sm"
            >
              {isDark ? "On" : "Off"}
            </ThemedButton>
          </View>
        </ThemedCard>

        <ThemedCard style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: typography.fontWeight.medium }}>Notifications</Text>
            <Text style={{ color: colors.mutedForeground }}>Enabled</Text>
          </View>
        </ThemedCard>

        <ThemedCard style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: typography.fontWeight.medium }}>Biometric Lock</Text>
            <Text style={{ color: colors.mutedForeground }}>Available</Text>
          </View>
        </ThemedCard>

        <Divider />

        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>
            Basha Vhara Koto v1.0.0
          </Text>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 }}>
            Trusted Rentals in Bangladesh
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
