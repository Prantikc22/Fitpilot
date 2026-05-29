import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, radius } from "@/src/lib/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), pwd);
    setLoading(false);
    if (error) setErr(error);
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Continue your journey with Leanly.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            testID="login-email"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor={colors.textDim}
            style={styles.input}
            testID="login-password"
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Button title="Log in" onPress={submit} loading={loading} testID="login-submit" style={{ marginTop: 8 }} />
          <Button
            title="Create an account instead"
            variant="outline"
            onPress={() => router.replace("/(auth)/signup")}
            testID="login-go-signup"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 24, gap: 8 },
  title: { fontFamily: fonts.headingExt, fontSize: 32, color: colors.text, letterSpacing: -1, marginTop: 16 },
  sub: { fontFamily: fonts.body, color: colors.textMute, fontSize: 16, marginBottom: 16 },
  label: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.textMute, marginTop: 12 },
  input: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    marginTop: 6,
  },
  err: { fontFamily: fonts.bodyMed, color: colors.error, marginTop: 8 },
});
