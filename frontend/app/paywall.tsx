import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Check, Crown, Sparkles, Zap, Star, Shield } from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useAuth } from "@/src/contexts/AuthContext";
import { Button } from "@/src/components/Button";
import { colors, fonts, radius } from "@/src/lib/theme";
import { initRevenueCat, presentPaywall, rcAvailable } from "@/src/lib/revenuecat";
import { supabase } from "@/src/lib/supabase";

const { width } = Dimensions.get("window");

// User's RevenueCat product identifiers
// Pro: $rc_monthly, $rc_annual
// Elite: yearly
// Offering: ofrng6c2ef1d942

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "",
    features: [
      "5 food scans per month",
      "Basic dashboard",
      "Weight tracking",
      "AI Coach (limited)",
    ],
    cta: "Current plan",
    primary: false,
    icon: Star,
    color: colors.textMute,
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: "299",
    period: "/month",
    features: [
      "Unlimited AI food scans",
      "Daily AI meal plans",
      "AI Coach chat - unlimited",
      "Weight predictions",
      "Weekly reports",
      "Yoga Studio access",
    ],
    cta: "Start Pro Monthly",
    primary: false,
    icon: Zap,
    color: colors.brand,
    rcProductId: "$rc_monthly",
  },
  {
    id: "pro_yearly",
    name: "Pro",
    price: "1,999",
    originalPrice: "3,588",
    period: "/year",
    features: [
      "Everything in Pro Monthly",
      "Save 44% vs monthly",
      "Priority AI responses",
      "Advanced analytics",
    ],
    cta: "Best Value - Go Yearly",
    primary: true,
    highlight: "🔥 Best Value",
    icon: Crown,
    color: "#FFD700",
    rcProductId: "$rc_annual",
  },
  {
    id: "elite",
    name: "Elite",
    price: "599",
    period: "/month",
    features: [
      "Everything in Pro",
      "1-on-1 Dietitian consults",
      "PCOS/PCOD programs",
      "Blood test integration",
      "Personal health coach",
      "VIP support",
    ],
    cta: "Go Elite",
    primary: false,
    icon: Shield,
    color: colors.terracotta,
    rcProductId: "yearly",
  },
];

export default function Paywall() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [selectedTier, setSelectedTier] = useState("pro_yearly");

  useEffect(() => {
    if (session?.user?.id) initRevenueCat(session.user.id);
  }, [session?.user?.id]);

  const subscribe = async (tierId: string) => {
    setBusy(true);
    
    // Map tier to subscription level for DB
    const tierMap: Record<string, string> = {
      pro_monthly: "pro",
      pro_yearly: "pro",
      elite: "elite",
    };
    const dbTier = tierMap[tierId] || "free";
    
    if (rcAvailable) {
      const r = await presentPaywall();
      if (r === "purchased") {
        await supabase
          .from("profiles")
          .update({ subscription_tier: dbTier })
          .eq("id", session!.user.id);
        await refreshProfile();
        Alert.alert(
          "🎉 Welcome to Leanly " + dbTier.toUpperCase() + "!",
          "Your subscription is now active. Enjoy unlimited access!"
        );
        router.back();
      } else if (r === "error") {
        Alert.alert("Couldn't complete purchase", "Please try again.");
      }
    } else {
      // Sandbox path for preview / Expo Go
      await supabase
        .from("profiles")
        .update({ subscription_tier: dbTier })
        .eq("id", session!.user.id);
      await refreshProfile();
      Alert.alert(
        "Preview Mode",
        `RevenueCat purchases only work in a real build. We've activated ${dbTier.toUpperCase()} for testing.`
      );
      router.back();
    }
    setBusy(false);
  };

  const currentTier = profile?.subscription_tier || "free";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable
        onPress={() => router.back()}
        style={styles.closeBtn}
        hitSlop={10}
        testID="paywall-close"
      >
        <X color="#fff" size={22} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.hero}>
          <View style={styles.crownWrap}>
            <Crown color={colors.sand} size={32} />
          </View>
          <Text style={styles.title}>Upgrade Your Health Journey</Text>
          <Text style={styles.subtitle}>
            Unlimited scans • AI coaching • Personalized plans
          </Text>
        </Animated.View>

        {/* Tier Cards */}
        {TIERS.filter((t) => t.id !== "free").map((t, index) => {
          const isCurrent = 
            (currentTier === "pro" && (t.id === "pro_monthly" || t.id === "pro_yearly")) ||
            (currentTier === "elite" && t.id === "elite");
          const isSelected = selectedTier === t.id;
          const IconComponent = t.icon;

          return (
            <Animated.View
              key={t.id}
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <Pressable
                onPress={() => setSelectedTier(t.id)}
                style={[
                  styles.tierCard,
                  t.primary && styles.tierPrimary,
                  isSelected && styles.tierSelected,
                ]}
              >
                {t.highlight && (
                  <View style={styles.popular}>
                    <Text style={styles.popularText}>{t.highlight}</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <View style={[styles.tierIcon, { backgroundColor: t.color + "20" }]}>
                    <IconComponent color={t.color} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierName, t.primary && { color: "#fff" }]}>
                      {t.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                      <Text style={[styles.tierPrice, t.primary && { color: "#fff" }]}>
                        ₹{t.price}
                      </Text>
                      <Text
                        style={[
                          styles.tierPeriod,
                          t.primary && { color: "rgba(255,255,255,0.7)" },
                        ]}
                      >
                        {t.period}
                      </Text>
                      {t.originalPrice && (
                        <Text style={styles.originalPrice}>₹{t.originalPrice}</Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>

                <View style={styles.featuresGrid}>
                  {t.features.slice(0, 4).map((f) => (
                    <View key={f} style={styles.featureItem}>
                      <Check
                        size={14}
                        color={t.primary ? "#fff" : colors.success}
                      />
                      <Text
                        style={[
                          styles.feat,
                          t.primary && { color: "rgba(255,255,255,0.9)" },
                        ]}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>

                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Subscribe Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Button
            title={
              TIERS.find((t) => t.id === selectedTier)?.cta || "Continue"
            }
            onPress={() => subscribe(selectedTier)}
            loading={busy}
            style={styles.subscribeBtn}
            testID="subscribe-btn"
          />
        </Animated.View>

        {/* Free tier option */}
        <Pressable onPress={() => router.back()} testID="continue-free">
          <Text style={styles.skipText}>Continue with Free</Text>
        </Pressable>

        <Text style={styles.legal}>
          {rcAvailable
            ? "Subscriptions auto-renew. Cancel anytime from your account settings."
            : "Note: Real billing is enabled only in standalone iOS/Android builds via RevenueCat."}
        </Text>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustBadge}>
            <Shield color={colors.sand} size={14} />
            <Text style={styles.trustText}>Secure</Text>
          </View>
          <View style={styles.trustBadge}>
            <Sparkles color={colors.sand} size={14} />
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand },
  closeBtn: { position: "absolute", top: 60, right: 16, zIndex: 10 },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  hero: { alignItems: "center", marginTop: 8, marginBottom: 24, paddingHorizontal: 12 },
  crownWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 26,
    color: "#fff",
    textAlign: "center",
    marginTop: 16,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  tierCard: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.xl,
    padding: 18,
    marginTop: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tierPrimary: {
    backgroundColor: "#1F3A2B",
    borderColor: colors.sand,
  },
  tierSelected: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  popular: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  popularText: {
    color: "#7A4A1F",
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tierName: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    color: colors.text,
  },
  tierPrice: {
    fontFamily: fonts.headingExt,
    fontSize: 24,
    color: colors.text,
  },
  tierPeriod: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.textMute,
  },
  originalPrice: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    textDecorationLine: "line-through",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.brand,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  featuresGrid: {
    marginTop: 14,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feat: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 13,
  },
  currentBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.brand,
    textTransform: "uppercase",
  },
  subscribeBtn: {
    marginTop: 24,
  },
  skipText: {
    fontFamily: fonts.bodyMed,
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
  legal: {
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 16,
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustText: {
    fontFamily: fonts.bodyMed,
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
});
