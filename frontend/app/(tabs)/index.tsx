import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Sparkles, Plus, TrendingDown, Flame, Droplets, ChevronRight, Target, Zap, CheckCircle } from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withSpring, withDelay } from "react-native-reanimated";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, lightColors } from "@/src/contexts/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { Card } from "@/src/components/Card";
import { MetricCard } from "@/src/components/MetricCard";
import { MetricRow } from "@/src/components/MetricRow";
import { HealthScoreGauge } from "@/src/components/HealthScoreGauge";
import { HealthScoreModal } from "@/src/components/HealthScoreModal";
import { BMICard } from "@/src/components/BMICard";
import { MarkdownText } from "@/src/components/MarkdownText";
import { WeightChart, Point } from "@/src/components/WeightChart";
import { DailyMotivationModal } from "@/src/components/DailyMotivation";
import { StreakBadge } from "@/src/components/StreakBadge";
import { StreakCelebration } from "@/src/components/StreakCelebration";
import { AchievementBadges } from "@/src/components/AchievementBadges";
import { CycleTracker } from "@/src/components/CycleTracker";
import { DailyWinCard } from "@/src/components/DailyWinCard";
import { fonts, radius } from "@/src/lib/theme";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Home() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [todayCals, setTodayCals] = useState(0);
  const [todayPro, setTodayPro] = useState(0);
  const [weights, setWeights] = useState<Point[]>([]);
  const [habit, setHabit] = useState<{ water_ml: number; steps: number; exercise_done: boolean } | null>(null);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFat, setTodayFat] = useState(0);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number> | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [prevStreak, setPrevStreak] = useState(0);
  const [showMotivation, setShowMotivation] = useState(true);
  const [showCycleTracker, setShowCycleTracker] = useState(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Determine if user is female (for cycle tracker visibility)
  const isFemale = profile?.gender?.toLowerCase() === "female";

  // Calculate streak from habits
  const loadStreak = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data: habitData } = await supabase
        .from("habits")
        .select("date, exercise_done")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(60);
      
      if (habitData && habitData.length > 0) {
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get dates where user logged something
        const activeDates = habitData
          .filter((h: any) => h.exercise_done)
          .map((h: any) => h.date);
        
        for (let i = 0; i < 60; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().slice(0, 10);
          
          if (activeDates.includes(checkDateStr)) {
            currentStreak++;
          } else if (i > 0) {
            break;
          }
        }
        // Check if streak increased - trigger celebration
        if (currentStreak > prevStreak && currentStreak >= 3) {
          setShowStreakCelebration(true);
        }
        setPrevStreak(currentStreak);
        setStreak(currentStreak);
      }
    } catch (error) {
      console.log("Error loading streak:", error);
    }
  }, [session?.user?.id, prevStreak]);

  const load = useCallback(async () => {
    if (!session?.user || !profile) return;
    const userId = session.user.id;
    const todayISO = startOfTodayISO();
    const todayDate = new Date().toISOString().slice(0, 10);

    const [{ data: foods }, { data: wl }, { data: h }] = await Promise.all([
      supabase.from("food_logs").select("calories,protein,carbs,fat").eq("user_id", userId).gte("logged_at", todayISO),
      supabase
        .from("weight_logs")
        .select("weight_kg,logged_at")
        .eq("user_id", userId)
        .order("logged_at", { ascending: true })
        .limit(60),
      supabase.from("habits").select("*").eq("user_id", userId).eq("date", todayDate).maybeSingle(),
    ]);

    const cals = (foods || []).reduce((s, f: any) => s + (Number(f.calories) || 0), 0);
    const pro = (foods || []).reduce((s, f: any) => s + (Number(f.protein) || 0), 0);
    const carbs = (foods || []).reduce((s, f: any) => s + (Number(f.carbs) || 0), 0);
    const fat = (foods || []).reduce((s, f: any) => s + (Number(f.fat) || 0), 0);
    setTodayCals(cals);
    setTodayPro(pro);
    setTodayCarbs(carbs);
    setTodayFat(fat);
    setHabit(h ? { water_ml: h.water_ml || 0, steps: h.steps || 0, exercise_done: !!h.exercise_done } : null);
    setWeights(
      (wl || []).map((w: any) => ({ date: w.logged_at, weight: Number(w.weight_kg) })),
    );

    // Health score
    try {
      const trend =
        wl && wl.length >= 2 ? Number(wl[wl.length - 1].weight_kg) - Number(wl[0].weight_kg) : 0;
      const s = await api.healthScore({
        calorie_target: profile.daily_calorie_target || 2000,
        calories_today: cals,
        protein_target: profile.daily_protein_target || 100,
        protein_today: pro,
        water_ml: h?.water_ml || 0,
        steps: h?.steps || 0,
        exercise_done: !!h?.exercise_done,
        weight_trend_kg_week: trend,
      });
      setScore(s.score);
      setScoreBreakdown(s.breakdown as any);
    } catch {}

    // Generate today's coach note using the freshly-computed numbers
    setAiLoading(true);
    try {
      const r = await api.coachMessage({
        profile,
        today_calories: cals,
        today_protein: pro,
      });
      setAiSummary(r.reply);
    } catch {
    } finally {
      setAiLoading(false);
    }
  }, [session?.user?.id, profile?.daily_calorie_target, profile?.daily_protein_target]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadStreak();
    }, [load, loadStreak]),
  );

  useEffect(() => {
    // no-op kept for future hooks
  }, [profile?.id]);

  const bumpWater = useCallback(
    async (delta: number) => {
      if (!session?.user) return;
      const todayDate = new Date().toISOString().slice(0, 10);
      const current = habit?.water_ml || 0;
      const next = { ...(habit || { steps: 0, exercise_done: false }), water_ml: Math.max(0, current + delta) };
      setHabit(next as any);
      await supabase.from("habits").upsert({
        user_id: session.user.id,
        date: todayDate,
        water_ml: next.water_ml,
        steps: (habit as any)?.steps || 0,
        exercise_done: !!(habit as any)?.exercise_done,
      });
    },
    [session?.user?.id, habit],
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const remaining = (profile.current_weight_kg || 0) - (profile.goal_weight_kg || 0);
  const latestWeight = weights.length ? weights[weights.length - 1].weight : profile.current_weight_kg || 0;

  // Estimate projected date
  const projected = (() => {
    const aggr = profile.aggressiveness || "balanced";
    const per = aggr === "aggressive" ? 0.8 : aggr === "fast" ? 0.6 : 0.4;
    const left = latestWeight - (profile.goal_weight_kg || latestWeight);
    if (left <= 0 || per <= 0) return null;
    const weeks = left / per;
    const days = Math.round(weeks * 7);
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    return { days, dateStr: dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) };
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: colors.textMute }]}>Hi {profile.name || "there"}</Text>
            <Text style={[styles.headline, { color: colors.text }]}>Let's stay on track today.</Text>
          </View>
          <StreakBadge streak={streak} compact />
        </View>

        <Pressable onPress={() => setScoreOpen(true)} testID="health-score-card">
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <HealthScoreGauge value={score} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Today · tap for details</Text>
              <Text style={styles.cardTitle}>Health Score</Text>
              <Text style={styles.cardSub}>
                Calorie + protein adherence, hydration, steps, exercise and weight trend.
              </Text>
            </View>
          </Card>
        </Pressable>

        {aiLoading ? (
          <Card variant="dark" testID="ai-loading-card" style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.cardLabel, { color: "rgba(255,255,255,0.7)" }]}>Getting your coaching tip...</Text>
            </View>
          </Card>
        ) : aiSummary ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card variant="dark" testID="ai-summary-card" style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Sparkles color="#fff" size={16} />
                <Text style={[styles.cardLabel, { color: "rgba(255,255,255,0.7)" }]}>Today's Coach Note</Text>
              </View>
              <MarkdownText dark>{aiSummary}</MarkdownText>
            </Card>
          </Animated.View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <BMICard
            weightKg={latestWeight || profile.current_weight_kg || 0}
            heightCm={profile.height_cm || 0}
          />
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <MetricCard
              testID="metric-current-weight"
              label="Current"
              value={(latestWeight || 0).toFixed(1)}
              unit="kg"
              hint={`Goal ${(profile.goal_weight_kg || 0).toFixed(1)} kg`}
            />
          </View>
          <View style={styles.gridCol}>
            <MetricCard
              testID="metric-remaining"
              label="To go"
              value={Math.max(0, remaining).toFixed(1)}
              unit="kg"
              hint={projected ? `in ${projected.days} days` : "set a goal"}
            />
          </View>
        </View>

        <Card style={{ marginTop: 16 }} testID="macros-card">
          <Text style={styles.cardTitle}>Today's intake</Text>
          <MetricRow
            label="Calories"
            value={todayCals}
            total={profile.daily_calorie_target || 2000}
            unit="kcal"
            testID="row-calories"
          />
          <MetricRow
            label="Protein"
            value={todayPro}
            total={profile.daily_protein_target || 100}
            unit="g"
            color={colors.terracotta}
            testID="row-protein"
          />
          <MetricRow
            label="Carbs"
            value={todayCarbs}
            total={Math.round((profile.daily_calorie_target || 2000) * 0.45 / 4)}
            unit="g"
            color={colors.warning}
            testID="row-carbs"
          />
          <MetricRow
            label="Fat"
            value={todayFat}
            total={Math.round((profile.daily_calorie_target || 2000) * 0.28 / 9)}
            unit="g"
            color={colors.info}
            testID="row-fat"
          />
        </Card>

        <Card style={{ marginTop: 16 }} testID="water-card">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.cardLabel}>Hydration</Text>
              <Text style={styles.cardTitle}>{habit?.water_ml || 0} ml today</Text>
              <Text style={styles.cardSub}>Goal: 2,500 ml</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable style={styles.waterBtn} onPress={() => bumpWater(250)} testID="water-add-250">
                <Text style={styles.waterBtnText}>+250</Text>
              </Pressable>
              <Pressable style={styles.waterBtn} onPress={() => bumpWater(500)} testID="water-add-500">
                <Text style={styles.waterBtnText}>+500</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Achievement Badges */}
        <AchievementBadges 
          earned={streak >= 30 ? ["streak_30", "streak_14", "streak_7", "streak_3"] 
            : streak >= 14 ? ["streak_14", "streak_7", "streak_3"]
            : streak >= 7 ? ["streak_7", "streak_3"]
            : streak >= 3 ? ["streak_3"]
            : []}
        />

        {/* Daily Win Card - Gamified encouragement */}
        <View style={{ marginTop: 16 }}>
          <DailyWinCard
            todayCalories={todayCals}
            todayProtein={todayPro}
            calorieTarget={profile.daily_calorie_target || 2000}
            proteinTarget={profile.daily_protein_target || 100}
            waterMl={habit?.water_ml || 0}
            steps={habit?.steps || 0}
            exerciseDone={!!habit?.exercise_done}
            streak={streak}
          />
        </View>

        {/* Blood Test Booking - Prominent CTA Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Pressable 
            style={[styles.bloodTestCard, { backgroundColor: colors.bgAlt, borderColor: colors.terracotta + "30" }]} 
            onPress={() => router.push("/blood-tests")}
            testID="home-blood-test"
          >
            <View style={[styles.bloodTestIconWrap, { backgroundColor: colors.terracotta + "15" }]}>
              <Droplets color={colors.terracotta} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bloodTestTitle, { color: colors.text }]}>Book Blood Tests</Text>
              <Text style={[styles.bloodTestSub, { color: colors.textMute }]}>Home collection • AI insights • 24hr reports</Text>
            </View>
            <View style={[styles.bloodTestBadge, { backgroundColor: colors.terracotta + "20" }]}>
              <Text style={[styles.bloodTestBadgeText, { color: colors.terracotta }]}>₹999</Text>
            </View>
            <ChevronRight color={colors.textMute} size={20} />
          </Pressable>
        </Animated.View>

        <View style={styles.shortcutRow}>
          <Pressable style={[styles.shortcut, { backgroundColor: colors.bgAlt }]} onPress={() => router.push("/dietitian")} testID="home-dietitian">
            <Text style={styles.shortcutIcon}>👩‍⚕️</Text>
            <Text style={[styles.shortcutText, { color: colors.textMute }]}>Talk to a Dietitian</Text>
          </Pressable>
          {/* Only show Cycle Tracker for female users */}
          {isFemale && (
            <Pressable style={[styles.shortcut, { backgroundColor: colors.bgAlt }]} onPress={() => setShowCycleTracker(true)} testID="home-cycle">
              <Text style={styles.shortcutIcon}>🩸</Text>
              <Text style={[styles.shortcutText, { color: colors.textMute }]}>Cycle Tracker</Text>
            </Pressable>
          )}
          <Pressable style={[styles.shortcut, { backgroundColor: colors.bgAlt }]} onPress={() => router.push("/yoga")} testID="home-yoga">
            <Text style={styles.shortcutIcon}>🧘</Text>
            <Text style={[styles.shortcutText, { color: colors.textMute }]}>Yoga (Pro)</Text>
          </Pressable>
        </View>

        <Card style={{ marginTop: 16 }} testID="weight-trend-card">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TrendingDown color={colors.brand} size={18} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Weight trend</Text>
          </View>
          <WeightChart points={weights} goal={profile.goal_weight_kg} />
          {projected && (
          <Text style={[styles.proj, { color: colors.textMute }]}>
              Projected to reach {profile.goal_weight_kg} kg by {projected.dateStr}
            </Text>
          )}
        </Card>

        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <MetricCard
              testID="metric-steps"
              label="Steps"
              value={(habit?.steps || 0).toLocaleString()}
              hint="Auto-sync from fitness app only"
            />
          </View>
          <View style={styles.gridCol}>
            <MetricCard
              testID="metric-water-summary"
              label="Water"
              value={`${((habit?.water_ml || 0) / 1000).toFixed(1)} L`}
              hint={`${Math.max(0, 2500 - (habit?.water_ml || 0))} ml to goal`}
            />
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.fabRow}>
        <Pressable style={[styles.fab, styles.fabPrimary, { backgroundColor: colors.brand }]} onPress={() => router.push("/scan")} testID="fab-scan">
          <Camera color="#fff" size={20} />
          <Text style={styles.fabText}>Scan food</Text>
        </Pressable>
        <Pressable style={[styles.fab, styles.fabSecondary, { backgroundColor: colors.bgAlt, borderColor: colors.border }]} onPress={() => router.push("/(tabs)/log")} testID="fab-log">
          <Plus color={colors.brand} size={20} />
          <Text style={[styles.fabText, { color: colors.brand }]}>Log</Text>
        </Pressable>
      </View>

      <HealthScoreModal
        visible={scoreOpen}
        onClose={() => setScoreOpen(false)}
        score={score}
        breakdown={scoreBreakdown}
      />

      {showMotivation && (
        <DailyMotivationModal
          streak={streak}
          healthScore={score}
          userName={profile?.name || undefined}
          onClose={() => setShowMotivation(false)}
        />
      )}

      {/* Streak Celebration Animation */}
      <StreakCelebration
        streak={streak}
        visible={showStreakCelebration}
        onClose={() => setShowStreakCelebration(false)}
      />

      {/* Cycle Tracker - only rendered if female */}
      {isFemale && (
        <CycleTracker
          visible={showCycleTracker}
          onClose={() => setShowCycleTracker(false)}
        />
      )}
    </SafeAreaView>
  );
}

// StyleSheet uses lightColors as base - dynamic colors applied inline via useTheme()
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bg },
  scroll: { padding: 20, gap: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  hello: { fontFamily: fonts.bodyMed, fontSize: 14, color: lightColors.textMute },
  headline: { fontFamily: fonts.headingExt, fontSize: 26, color: lightColors.text, letterSpacing: -0.8, marginTop: 4 },
  title: { fontFamily: fonts.headingExt, fontSize: 22, padding: 20 },
  cardLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: lightColors.textMute, textTransform: "uppercase", letterSpacing: 0.7 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: lightColors.text, marginTop: 2 },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: lightColors.textMute, marginTop: 4, lineHeight: 18 },
  aiText: { fontFamily: fonts.body, color: "#fff", fontSize: 15, lineHeight: 22 },
  grid: { flexDirection: "row", gap: 12, marginTop: 16 },
  gridCol: { flex: 1 },
  proj: { fontFamily: fonts.bodyMed, color: lightColors.brand, fontSize: 13, marginTop: 12 },
  fabRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 10,
  },
  fab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPrimary: { backgroundColor: lightColors.brand },
  fabSecondary: { backgroundColor: lightColors.brandLight },
  fabText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 15 },
  waterBtn: { backgroundColor: lightColors.brandLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  waterBtnText: { fontFamily: fonts.bodySemi, color: lightColors.brand, fontSize: 14 },
  shortcutRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  shortcut: { flex: 1, backgroundColor: lightColors.bgAlt, borderRadius: 16, padding: 12, alignItems: "center", gap: 6 },
  shortcutIcon: { fontSize: 22 },
  shortcutText: { fontFamily: fonts.bodyMed, fontSize: 11, color: lightColors.textMute, textAlign: "center" },
  // Blood Test Card Styles
  bloodTestCard: {
    marginTop: 16,
    backgroundColor: lightColors.bgAlt,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: lightColors.terracotta + "30",
  },
  bloodTestIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: lightColors.terracotta + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  bloodTestTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: lightColors.text,
  },
  bloodTestSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: lightColors.textMute,
    marginTop: 2,
  },
  bloodTestBadge: {
    backgroundColor: lightColors.terracotta + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bloodTestBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: lightColors.terracotta,
  },
});
