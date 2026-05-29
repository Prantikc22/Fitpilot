import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Users, Crown, Camera, Sparkles } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { colors, fonts } from "@/src/lib/theme";

export default function Admin() {
  const router = useRouter();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    onboardedUsers: 0,
    paidUsers: 0,
    scansThisMonth: 0,
    coachMessages: 0,
    mealPlans: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const iso = monthStart.toISOString();

      const [u, ob, paid, sc, cm, mp] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarded", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).neq("subscription_tier", "free"),
        supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("source", "ai_vision").gte("logged_at", iso),
        supabase.from("coach_messages").select("id", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("meal_plans").select("id", { count: "exact", head: true }).gte("generated_at", iso),
      ]);

      setStats({
        totalUsers: u.count || 0,
        onboardedUsers: ob.count || 0,
        paidUsers: paid.count || 0,
        scansThisMonth: sc.count || 0,
        coachMessages: cm.count || 0,
        mealPlans: mp.count || 0,
      });
      setLoaded(true);
    })();
  }, []);

  if (profile?.role !== "admin") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Card>
            <Text style={styles.deny}>This area is restricted to admins.</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: <Users color={colors.brand} size={18} /> },
    { label: "Onboarded", value: stats.onboardedUsers, icon: <Sparkles color={colors.brand} size={18} /> },
    { label: "Paid Users", value: stats.paidUsers, icon: <Crown color={colors.warning} size={18} /> },
    { label: "Scans (Month)", value: stats.scansThisMonth, icon: <Camera color={colors.terracotta} size={18} /> },
    { label: "Coach Messages (Month)", value: stats.coachMessages, icon: <Sparkles color={colors.info} size={18} /> },
    { label: "Meal Plans (Month)", value: stats.mealPlans, icon: <Sparkles color={colors.success} size={18} /> },
  ];

  // estimated revenue assuming 499/mo premium and 4999/yr pro split 50/50
  const estRevenue = Math.round(stats.paidUsers * 499 * 0.5 + (stats.paidUsers * 4999 * 0.5) / 12);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="dark">
          <Text style={[styles.label, { color: "rgba(255,255,255,0.7)" }]}>Estimated MRR</Text>
          <Text style={styles.revenue}>₹{estRevenue.toLocaleString()}</Text>
          <Text style={styles.revenueSub}>From {stats.paidUsers} paying users this period</Text>
        </Card>

        <View style={styles.grid}>
          {cards.map((c) => (
            <View key={c.label} style={styles.cell}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {c.icon}
                  <Text style={styles.label}>{c.label}</Text>
                </View>
                <Text style={styles.statVal}>{loaded ? c.value.toLocaleString() : "—"}</Text>
              </Card>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20, gap: 14 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7 },
  revenue: { fontFamily: fonts.headingExt, fontSize: 36, color: "#fff", marginTop: 8, letterSpacing: -1 },
  revenueSub: { fontFamily: fonts.body, color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "48%" },
  statVal: { fontFamily: fonts.headingExt, fontSize: 24, color: colors.text, marginTop: 8, letterSpacing: -0.5 },
  deny: { fontFamily: fonts.bodyMed, color: colors.textMute, padding: 20, textAlign: "center" },
});
