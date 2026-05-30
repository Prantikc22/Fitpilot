import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Crown, LogOut, Shield, Sparkles, User as UserIcon, Stethoscope, Heart, Moon, Sun, Monitor, Calendar, Droplets } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, ThemeMode, lightColors, ColorTheme } from "@/src/contexts/ThemeContext";
import { Card } from "@/src/components/Card";
import { fonts, radius } from "@/src/lib/theme";
import { initRevenueCat, isProUser, presentCustomerCenter, rcAvailable } from "@/src/lib/revenuecat";
import { supabase } from "@/src/lib/supabase";

type Booking = {
  id: string;
  type: "blood_test" | "dietitian";
  status: string;
  created_at: string;
  scheduled_date?: string;
  topic?: string;
};

export default function Profile() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { mode, setMode, colors } = useTheme();
  const [pro, setPro] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      if (session?.user?.id) {
        await initRevenueCat(session.user.id);
        setPro(await isProUser());
        loadBookings();
      }
    })();
  }, [session?.user?.id]);

  const loadBookings = async () => {
    if (!session?.user?.id) return;
    
    // Load dietitian consults
    const { data: consults } = await supabase
      .from("dietitian_consults")
      .select("id, status, created_at, confirmed_time, topic")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    
    // Load blood test bookings
    const { data: bloodTests } = await supabase
      .from("blood_test_bookings")
      .select("id, status, created_at, scheduled_date")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    
    const allBookings: Booking[] = [
      ...(consults || []).map(c => ({
        id: c.id,
        type: "dietitian" as const,
        status: c.status,
        created_at: c.created_at,
        scheduled_date: c.confirmed_time,
        topic: c.topic,
      })),
      ...(bloodTests || []).map(b => ({
        id: b.id,
        type: "blood_test" as const,
        status: b.status,
        created_at: b.created_at,
        scheduled_date: b.scheduled_date,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setBookings(allBookings.slice(0, 5));
  };

  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  const ThemeModeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.h1, { color: colors.text }]}>Profile</Text>

        <Card style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={[styles.avatar, { backgroundColor: colors.brandLight }]}>
            <UserIcon color={colors.brand} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{profile.name || "You"}</Text>
            <Text style={[styles.email, { color: colors.textMute }]}>{profile.email}</Text>
          </View>
          {(pro || profile.subscription_tier !== "free") && (
            <View style={[styles.proBadge, { backgroundColor: colors.sand }]}>
              <Crown color={colors.warning} size={12} />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          )}
        </Card>

        <Card variant="highlight" style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Sparkles color={colors.brand} size={14} />
            <Text style={[styles.label, { color: colors.textMute }]}>Your plan</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <Stat label="Calories" value={`${profile.daily_calorie_target || 0}`} colors={colors} />
            <Stat label="Protein" value={`${profile.daily_protein_target || 0}g`} colors={colors} />
            <Stat label="Goal" value={`${profile.goal_weight_kg || 0}kg`} colors={colors} />
          </View>
        </Card>

        {/* Upcoming Appointments Section */}
        {bookings.length > 0 && (
          <Section title="Your Bookings" colors={colors}>
            {bookings.map((booking) => (
              <View key={booking.id} style={[styles.bookingRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.bookingIcon, { backgroundColor: booking.type === "blood_test" ? colors.terracotta + "15" : colors.brandLight }]}>
                  {booking.type === "blood_test" ? (
                    <Droplets size={16} color={colors.terracotta} />
                  ) : (
                    <Stethoscope size={16} color={colors.brand} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookingTitle, { color: colors.text }]}>
                    {booking.type === "blood_test" ? "Blood Test" : "Nutritionist Consult"}
                  </Text>
                  <Text style={[styles.bookingSub, { color: colors.textMute }]}>
                    {booking.scheduled_date 
                      ? new Date(booking.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "Pending confirmation"}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: booking.status === "confirmed" ? colors.success + "20" : 
                                   booking.status === "completed" ? colors.textMute + "20" : 
                                   colors.warning + "20" 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: booking.status === "confirmed" ? colors.success : 
                           booking.status === "completed" ? colors.textMute : 
                           colors.warning 
                  }]}>
                    {booking.status === "pending" ? "Pending" : 
                     booking.status === "confirmed" ? "Confirmed" : 
                     booking.status === "completed" ? "Done" : booking.status}
                  </Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        <Section title="Appearance" colors={colors}>
          <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <ThemeModeIcon size={18} color={colors.brand} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
                <Text style={[styles.rowSub, { color: colors.textMute }]}>
                  {mode === "system" ? "Follow system" : mode === "dark" ? "Dark mode" : "Light mode"}
                </Text>
              </View>
            </View>
            <View style={styles.themePicker}>
              {(["light", "system", "dark"] as ThemeMode[]).map((m) => {
                const Icon = m === "dark" ? Moon : m === "light" ? Sun : Monitor;
                const isActive = mode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={[
                      styles.themeOption,
                      { backgroundColor: isActive ? colors.brand : colors.bgAlt, borderColor: colors.border },
                    ]}
                    testID={`theme-${m}`}
                  >
                    <Icon size={14} color={isActive ? "#fff" : colors.textMute} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title="Premium" colors={colors}>
          <Row
            label="Talk to a Dietitian"
            sub={pro || profile.subscription_tier !== "free" ? "Chat or schedule a 1-on-1 consult" : "Unlock real human nutritionists with Pro"}
            onPress={() => router.push("/dietitian")}
            testID="profile-dietitian"
            icon={<Stethoscope size={18} color={colors.brand} />}
            colors={colors}
          />
          <Row
            label="Book Blood Test"
            sub="₹999 home collection with AI insights"
            onPress={() => router.push("/blood-tests")}
            testID="profile-blood-test"
            icon={<Droplets size={18} color={colors.terracotta} />}
            colors={colors}
          />
          <Row
            label="Connect Health"
            sub="Apple Health, Google Fit, Fitbit & food delivery"
            onPress={() => router.push("/health-sync")}
            testID="profile-health-sync"
            icon={<Heart size={18} color={colors.terracotta} />}
            colors={colors}
          />
        </Section>

        <Section title="Subscription" colors={colors}>
          <Row
            label={pro ? "Manage subscription" : "Upgrade to Leanly Pro"}
            sub={pro ? "Manage or cancel anytime" : "Unlimited scans, AI coach, weekly reports"}
            onPress={() => (pro ? presentCustomerCenter() : router.push("/paywall"))}
            testID="profile-subscription"
            colors={colors}
          />
        </Section>

        {isAdmin && (
          <Section title="Admin" colors={colors}>
            <Row label="Admin Dashboard" sub="Users, metrics, AI usage" onPress={() => router.push("/admin")} testID="profile-admin" icon={<Shield size={18} color={colors.brand} />} colors={colors} />
          </Section>
        )}

        <Section title="Account" colors={colors}>
          <Row label="Restart onboarding" sub="Update your goals & preferences" onPress={() => router.push("/onboarding")} testID="profile-reonboard" colors={colors} />
          <Row label="Sign out" onPress={() => signOut()} testID="profile-signout" icon={<LogOut size={18} color={colors.error} />} danger colors={colors} />
        </Section>

        {!rcAvailable && (
          <Text style={[styles.devNote, { backgroundColor: colors.bgWarm, color: colors.textMute }]}>
            Note: In-app purchases are available in development & production builds (not Expo Go).
          </Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ColorTheme }) {
  return (
    <View>
      <Text style={[styles.statLabel, { color: colors.textMute }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ColorTheme }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.section, { color: colors.textMute }]}>{title}</Text>
      <Card style={{ padding: 0, overflow: "hidden" }}>{children}</Card>
    </View>
  );
}

function Row({
  label,
  sub,
  onPress,
  testID,
  icon,
  danger,
  colors,
}: {
  label: string;
  sub?: string;
  onPress?: () => void;
  testID?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  colors: ColorTheme;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.textMute }]}>{sub}</Text> : null}
      </View>
      {icon ? icon : <ChevronRight size={18} color={colors.textDim} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  h1: { fontFamily: fonts.headingExt, fontSize: 28, letterSpacing: -0.8 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.headingExt, fontSize: 18 },
  email: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  proBadgeText: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#7A4A1F", textTransform: "uppercase", letterSpacing: 0.5 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 },
  statLabel: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase" },
  statValue: { fontFamily: fonts.headingExt, fontSize: 18, marginTop: 4 },
  section: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8, marginLeft: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
  rowSub: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  devNote: { marginTop: 20, padding: 14, borderRadius: 14, fontSize: 12, fontFamily: fonts.body },
  // Theme picker styles
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themePicker: {
    flexDirection: "row",
    gap: 8,
  },
  themeOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  // Booking styles
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  bookingSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    textTransform: "capitalize",
  },
});
