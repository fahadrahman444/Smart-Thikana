import React, { useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedButton } from "@/components/ui/Button";
import { ThemedInput } from "@/components/ui/Input";
import { colors, typography, spacing, borderRadius } from "@shared/index";
import { getSupabaseClient } from "@shared/api/client";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "SignUp">;
type Route = RouteProp<AuthStackParamList, "SignUp">;

export function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"tenant" | "landlord">(
    route.params?.intendedRole || "tenant"
  );
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, intended_role: selectedRole },
        },
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (data.user) {
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: selectedRole });
        await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.md, justifyContent: "center" }}>
        <Text
          style={{
            fontSize: typography.fontSize["2xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.foreground,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Create Account
        </Text>
        <Text
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.mutedForeground,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Join Basha Vhara Koto today
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => setSelectedRole("tenant")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: borderRadius.md,
              borderWidth: 2,
              borderColor: selectedRole === "tenant" ? colors.primary : colors.border,
              backgroundColor: selectedRole === "tenant" ? colors.primarySoft : "transparent",
            }}
          >
            <Text style={{ fontSize: 16 }}>🏠</Text>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: selectedRole === "tenant" ? colors.primary : colors.foreground,
              }}
            >
              Tenant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedRole("landlord")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: borderRadius.md,
              borderWidth: 2,
              borderColor: selectedRole === "landlord" ? colors.accent : colors.border,
              backgroundColor: selectedRole === "landlord" ? colors.accentSoft : "transparent",
            }}
          >
            <Text style={{ fontSize: 16 }}>🏢</Text>
            <Text
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: selectedRole === "landlord" ? colors.accent : colors.foreground,
              }}
            >
              Landlord
            </Text>
          </TouchableOpacity>
        </View>

        <ThemedInput label="Full Name" value={name} onChangeText={setName} placeholder="Your name" />
        <ThemedInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <ThemedInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
        />

        <ThemedButton onPress={handleSignUp} fullWidth size="lg" loading={loading} style={{ marginBottom: 16 }}>
          Create Account
        </ThemedButton>

        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginHorizontal: 16 }}>
            OR
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <ThemedButton
          onPress={async () => {
            try {
              const supabase = getSupabaseClient();
              await supabase.auth.signInWithOAuth({ provider: "google" });
            } catch {}
          }}
          fullWidth
          variant="outline"
          style={{ marginBottom: 24 }}
        >
          Continue with Google
        </ThemedButton>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>
            Already have an account?
          </Text>
          <ThemedButton onPress={() => navigation.navigate("SignIn", {})} variant="ghost" size="sm">
            Sign In
          </ThemedButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
