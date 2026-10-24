import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedCard } from "@/components/ui/Card";
import { ThemedButton } from "@/components/ui/Button";
import { colors, typography, spacing } from "@shared/index";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.md }}>
        <View style={{ flex: 1, justifyContent: "center", paddingTop: 60 }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 24,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 36 }}>🏠</Text>
            </View>
            <Text
              style={{
                fontSize: typography.fontSize["3xl"],
                fontWeight: typography.fontWeight.bold,
                color: colors.primary,
                textAlign: "center",
              }}
            >
              Basha Vhara Koto
            </Text>
            <Text
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.mutedForeground,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Trusted Rentals
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
            <ThemedCard
              padded
              elevated
              style={{ flex: 1, borderWidth: 1, borderColor: colors.primarySoft }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 20 }}>🏠</Text>
              </View>
              <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: 4 }}>
                I'm a Tenant
              </Text>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>
                Browse listings, save favorites, message landlords.
              </Text>
            </ThemedCard>

            <ThemedCard
              padded
              elevated
              style={{ flex: 1, borderWidth: 1, borderColor: colors.accentSoft }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 20 }}>🏢</Text>
              </View>
              <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: 4 }}>
                I'm a Landlord
              </Text>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>
                List properties, manage deals, receive payments.
              </Text>
            </ThemedCard>
          </View>

          <ThemedButton
            onPress={() => navigation.navigate("SignUp", { intendedRole: "tenant" })}
            fullWidth
            size="lg"
            style={{ marginBottom: 12 }}
          >
            Continue as Tenant
          </ThemedButton>

          <ThemedButton
            onPress={() => navigation.navigate("SignUp", { intendedRole: "landlord" })}
            fullWidth
            size="lg"
            variant="outline"
          >
            Continue as Landlord
          </ThemedButton>

          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginHorizontal: 16 }}>
              Already have an account?
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <ThemedButton
            onPress={() => navigation.navigate("SignIn", {})}
            fullWidth
            variant="ghost"
          >
            Sign In
          </ThemedButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
