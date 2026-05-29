import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, radius } from "@/src/lib/theme";

export default function Signup() {
  const router = useRouter();
  const { signUp, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    if (pwd.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), pwd);
    if (error) {
      setLoading(false);
      setErr(error);
      return;
    }
    // Try immediate sign-in (works when email confirmation is disabled)
    const r = await signIn(email.trim(), pwd);
    setLoading(false);
    if (r.error) {
      setErr("Account created. Check your email to confirm, then log in.");
    } else {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>Takes less than a minute.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            testID="signup-email"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={pwd}
            onChangeText={setPwd}
            placeholder="At least 6 characters"
            secureTextEntry
            placeholderTextColor={colors.textDim}
            style={styles.input}
            testID="signup-password"
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Button title="Create account" onPress={submit} loading={loading} testID="signup-submit" style={{ marginTop: 8 }} />
          <Button
            title="I already have an account"
            variant="outline"
            onPress={() => router.replace("/(auth)/login")}
            testID="signup-go-login"
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
