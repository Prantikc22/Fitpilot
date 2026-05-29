import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Check, Crown } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { colors, fonts, radius } from "@/src/lib/theme";
import { initRevenueCat, presentPaywall, rcAvailable } from "@/src/lib/revenuecat";
import { supabase } from "@/src/lib/supabase";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "/forever",
    features: ["5 food scans per month", "Basic dashboard", "Weight tracking"],
    cta: "Current plan",
    primary: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "499",
    period: "/month",
    features: [
      "Unlimited AI food scans",
      "Daily AI meal plans",
      "AI Coach chat",
      "Weight predictions",
      "Weekly reports",
    ],
    cta: "Start Premium",
    primary: true,
    highlight: "Most Popular",
  },
  {
    id: "pro",
    name: "Pro",
    price: "4999",
    period: "/year",
    features: [
      "Everything in Premium",
      "Advanced progress analytics",
      "Priority AI responses",
      "Save 17% vs monthly",
    ],
    cta: "Go Pro yearly",
    primary: false,
  },
];

export default function Paywall() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.user?.id) initRevenueCat(session.user.id);
  }, [session?.user?.id]);

  const subscribe = async (tier: "premium" | "pro") => {
    setBusy(true);
    if (rcAvailable) {
      const r = await presentPaywall();
      if (r === "purchased") {
        await supabase
          .from("profiles")
          .update({ subscription_tier: tier })
          .eq("id", session!.user.id);
        await refreshProfile();
        Alert.alert("Welcome to Leanly " + tier.toUpperCase(), "Your subscription is active.");
        router.back();
      } else if (r === "error") {
        Alert.alert("Couldn't complete purchase", "Please try again.");
      }
    } else {
      // Sandbox path for preview / Expo Go — flip flag without charging.
      await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", session!.user.id);
      await refreshProfile();
      Alert.alert(
        "Preview mode",
        "RevenueCat purchases only work in a real build. We've activated " + tier.toUpperCase() + " for testing.",
      );
      router.back();
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10} testID="paywall-close">
        <X color="#fff" size={22} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.crownWrap}>
            <Crown color={colors.sand} size={28} />
          </View>
          <Text style={styles.title}>Reach your goal faster with Leanly Pro</Text>
          <Text style={styles.subtitle}>
            Unlimited AI scans, personalized meal plans, weekly reports — all in one place.
          </Text>
        </View>

        {TIERS.map((t) => {
          const current = (profile?.subscription_tier || "free") === t.id;
          return (
            <View key={t.id} style={[styles.tierCard, t.primary && styles.tierPrimary]}>
              {t.highlight && (
                <View style={styles.popular}>
                  <Text style={styles.popularText}>{t.highlight}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={[styles.tierName, t.primary && { color: "#fff" }]}>{t.name}</Text>
                <Text style={[styles.tierPrice, t.primary && { color: "#fff" }]}>
                  ₹{t.price}
                  <Text style={[styles.tierPeriod, t.primary && { color: "rgba(255,255,255,0.7)" }]}>{t.period}</Text>
                </Text>
              </View>
              <View style={{ marginTop: 12, gap: 8 }}>
                {t.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Check size={16} color={t.primary ? "#fff" : colors.success} />
                    <Text style={[styles.feat, t.primary && { color: "rgba(255,255,255,0.9)" }]}>{f}</Text>
                  </View>
                ))}
              </View>
              {t.id !== "free" && (
                <Button
                  title={current ? "Active" : t.cta}
                  onPress={() => subscribe(t.id as "premium" | "pro")}
                  loading={busy}
                  disabled={current}
                  size="md"
                  variant={t.primary ? "secondary" : "primary"}
                  style={{ marginTop: 14, backgroundColor: t.primary ? "#fff" : colors.brand }}
                  testID={`subscribe-${t.id}`}
                />
              )}
              {t.id === "free" && current && (
                <View style={{ marginTop: 14, alignItems: "center" }}>
                  <Text style={styles.currentText}>Current plan</Text>
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.legal}>
          {rcAvailable
            ? "Subscriptions auto-renew. Cancel anytime from your account."
            : "Note: Real billing is enabled only in standalone iOS/Android builds via RevenueCat."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand },
  closeBtn: { position: "absolute", top: 60, right: 16, zIndex: 10 },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 32 },
  hero: { alignItems: "center", marginTop: 8, marginBottom: 24, paddingHorizontal: 12 },
  crownWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.headingExt, fontSize: 26, color: "#fff", textAlign: "center", marginTop: 16, letterSpacing: -0.8, lineHeight: 32 },
  subtitle: { fontFamily: fonts.body, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 10, fontSize: 15, lineHeight: 22 },
  tierCard: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.xl,
    padding: 20,
    marginTop: 14,
  },
  tierPrimary: { backgroundColor: "#1F3A2B", borderColor: colors.sand, borderWidth: 1 },
  popular: { position: "absolute", top: -10, alignSelf: "center", backgroundColor: colors.sand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  popularText: { color: "#7A4A1F", fontFamily: fonts.bodySemi, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  tierName: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text },
  tierPrice: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text },
  tierPeriod: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.textMute },
  feat: { fontFamily: fonts.body, color: colors.text, fontSize: 14 },
  currentText: { fontFamily: fonts.bodyMed, color: colors.textMute, fontSize: 13 },
  legal: { fontFamily: fonts.body, color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 },
});
