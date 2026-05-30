import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Crown, Lock } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";

export function ProLockCard({
  title,
  description,
  testID,
}: {
  title: string;
  description: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/paywall")} style={[styles.card, { backgroundColor: colors.brand }]} testID={testID}>
      <View style={styles.icon}>
        <Crown color={colors.sand} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Lock color="#fff" size={12} />
          <Text style={[styles.kicker, { color: colors.sand }]}>Leanly Pro</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
        <View style={styles.cta}>
          <Text style={[styles.ctaText, { color: colors.brand }]}>Unlock — start trial</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: "#fff", marginTop: 4, letterSpacing: -0.4 },
  desc: { fontFamily: fonts.body, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 18, marginTop: 4 },
  cta: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignSelf: "flex-start", marginTop: 12 },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
