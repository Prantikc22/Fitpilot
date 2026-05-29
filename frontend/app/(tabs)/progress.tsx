import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Droplets, Footprints, Moon, Dumbbell, Plus, Sparkles } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { WeightChart, Point } from "@/src/components/WeightChart";
import { colors, fonts, radius } from "@/src/lib/theme";

export default function Progress() {
  const { session, profile } = useAuth();
  const [weights, setWeights] = useState<Point[]>([]);
  const [habit, setHabit] = useState<{ water_ml: number; steps: number; sleep_hours: number; exercise_done: boolean }>({
    water_ml: 0,
    steps: 0,
    sleep_hours: 0,
    exercise_done: false,
  });
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const todayDate = () => new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;
    const [{ data: wl }, { data: h }] = await Promise.all([
      supabase
        .from("weight_logs")
        .select("weight_kg,logged_at")
        .eq("user_id", userId)
        .order("logged_at", { ascending: true })
        .limit(90),
      supabase.from("habits").select("*").eq("user_id", userId).eq("date", todayDate()).maybeSingle(),
    ]);
    setWeights((wl || []).map((w: any) => ({ date: w.logged_at, weight: Number(w.weight_kg) })));
    if (h) {
      setHabit({
        water_ml: h.water_ml || 0,
        steps: h.steps || 0,
        sleep_hours: Number(h.sleep_hours) || 0,
        exercise_done: !!h.exercise_done,
      });
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upsertHabit = async (patch: Partial<typeof habit>) => {
    if (!session?.user) return;
    const next = { ...habit, ...patch };
    setHabit(next);
    await supabase.from("habits").upsert({
      user_id: session.user.id,
      date: todayDate(),
      ...next,
    });
  };

  const logWeight = async () => {
    if (!session?.user) return;
    const v = Number(weightInput);
    if (!v || v < 20 || v > 400) {
      Alert.alert("Invalid weight", "Enter a value between 20 and 400 kg.");
      return;
    }
    await supabase.from("weight_logs").insert({ user_id: session.user.id, weight_kg: v });
    await supabase.from("profiles").update({ current_weight_kg: v }).eq("id", session.user.id);
    setWeightOpen(false);
    setWeightInput("");
    await load();
  };

  const generateReport = async () => {
    if (!profile || weights.length < 2) {
      Alert.alert("Not enough data", "Log your weight a few more times to unlock weekly reports.");
      return;
    }
    setReportLoading(true);
    try {
      const recent = weights.slice(-7);
      const weightLost = recent[0].weight - recent[recent.length - 1].weight;
      const r = await api.weeklyReport({
        profile,
        weight_lost_kg: Number(weightLost.toFixed(2)),
        avg_calories: profile.daily_calorie_target || 0,
        avg_protein: profile.daily_protein_target || 0,
        health_scores: [],
      });
      setReport(r);
    } catch (e: any) {
      Alert.alert("Couldn't generate", e.message || "Try later.");
    } finally {
      setReportLoading(false);
    }
  };

  // Predictions
  const lastW = weights.length ? weights[weights.length - 1].weight : profile?.current_weight_kg || 0;
  const aggr = profile?.aggressiveness || "balanced";
  const perWeek = aggr === "aggressive" ? 0.8 : aggr === "fast" ? 0.6 : 0.4;
  const pred = (days: number) => {
    const goal = profile?.goal_weight_kg || lastW;
    const v = lastW - (perWeek / 7) * days;
    return Math.max(goal, v);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Progress</Text>

        <Card style={{ marginTop: 12 }} testID="weight-card">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.h3}>Weight history</Text>
            <Pressable style={styles.smallBtn} onPress={() => setWeightOpen(true)} testID="add-weight">
              <Plus color={colors.brand} size={14} />
              <Text style={styles.smallBtnText}>Log weight</Text>
            </Pressable>
          </View>
          <WeightChart points={weights} goal={profile?.goal_weight_kg} />
        </Card>

        <Card style={{ marginTop: 16 }} testID="prediction-card">
          <Text style={styles.h3}>Forecast</Text>
          <View style={styles.predRow}>
            <PredCol label="Today" value={`${lastW.toFixed(1)} kg`} />
            <PredCol label="30 days" value={`${pred(30).toFixed(1)} kg`} />
            <PredCol label="60 days" value={`${pred(60).toFixed(1)} kg`} />
            <PredCol label="90 days" value={`${pred(90).toFixed(1)} kg`} />
          </View>
          <Text style={styles.predHint}>
            Based on your {aggr} pace target (~{perWeek} kg/week).
          </Text>
        </Card>

        <Card style={{ marginTop: 16 }} testID="habits-card">
          <Text style={styles.h3}>Today's habits</Text>
          <HabitRow
            icon={<Droplets color={colors.info} size={18} />}
            label="Water"
            value={`${habit.water_ml} ml`}
            onMinus={() => upsertHabit({ water_ml: Math.max(0, habit.water_ml - 250) })}
            onPlus={() => upsertHabit({ water_ml: habit.water_ml + 250 })}
            unit="+250"
          />
          <HabitRow
            icon={<Footprints color={colors.success} size={18} />}
            label="Steps"
            value={habit.steps.toLocaleString()}
            onMinus={() => upsertHabit({ steps: Math.max(0, habit.steps - 1000) })}
            onPlus={() => upsertHabit({ steps: habit.steps + 1000 })}
            unit="+1k"
          />
          <HabitRow
            icon={<Moon color={colors.terracotta} size={18} />}
            label="Sleep"
            value={`${habit.sleep_hours.toFixed(1)} h`}
            onMinus={() => upsertHabit({ sleep_hours: Math.max(0, habit.sleep_hours - 0.5) })}
            onPlus={() => upsertHabit({ sleep_hours: habit.sleep_hours + 0.5 })}
            unit="+30m"
          />
          <Pressable
            style={[styles.exerciseToggle, habit.exercise_done && styles.exerciseDone]}
            onPress={() => upsertHabit({ exercise_done: !habit.exercise_done })}
            testID="habit-exercise"
          >
            <Dumbbell color={habit.exercise_done ? "#fff" : colors.brand} size={18} />
            <Text style={[styles.exerciseText, habit.exercise_done && { color: "#fff" }]}>
              {habit.exercise_done ? "Exercise done ✓" : "Mark exercise done"}
            </Text>
          </Pressable>
        </Card>

        <Card variant="dark" style={{ marginTop: 16 }} testID="weekly-report-card">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles color="#fff" size={16} />
            <Text style={[styles.label, { color: "rgba(255,255,255,0.7)" }]}>Weekly Report</Text>
          </View>
          {report ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={styles.reportHighlight}>{report.highlight}</Text>
              {report.wins?.length ? (
                <Text style={styles.reportLine}>✅ {report.wins.join(", ")}</Text>
              ) : null}
              {report.improvements?.length ? (
                <Text style={styles.reportLine}>🎯 {report.improvements.join(", ")}</Text>
              ) : null}
              {report.next_week_focus ? (
                <Text style={styles.reportLine}>Next week: {report.next_week_focus}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.cardSub, { color: "rgba(255,255,255,0.8)" }]}>
              Get an AI-generated summary of your week.
            </Text>
          )}
          <Button
            title={report ? "Refresh report" : "Generate weekly report"}
            onPress={generateReport}
            loading={reportLoading}
            size="md"
            variant="outline"
            style={{ marginTop: 12, backgroundColor: "#fff", borderColor: "#fff" }}
            testID="weekly-report-btn"
          />
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={weightOpen} transparent animationType="fade" onRequestClose={() => setWeightOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setWeightOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.h2}>Log weight</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              placeholder="kg"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoFocus
              testID="weight-input"
            />
            <Button title="Save" onPress={logWeight} testID="weight-save" style={{ marginTop: 8 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function HabitRow({
  icon,
  label,
  value,
  onMinus,
  onPlus,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  unit: string;
}) {
  return (
    <View style={styles.habitRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {icon}
        <Text style={styles.habitLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={styles.habitValue}>{value}</Text>
        <Pressable onPress={onMinus} style={styles.iconBtn} testID={`habit-${label}-minus`}>
          <Text style={styles.iconBtnText}>−</Text>
        </Pressable>
        <Pressable onPress={onPlus} style={styles.iconBtn} testID={`habit-${label}-plus`}>
          <Text style={styles.iconBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PredCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.predLabel}>{label}</Text>
      <Text style={styles.predValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20 },
  h1: { fontFamily: fonts.headingExt, fontSize: 28, color: colors.text, letterSpacing: -0.8 },
  h2: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text, marginBottom: 8 },
  h3: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: 8 },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.textMute,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  cardSub: { fontFamily: fonts.body, color: colors.textMute, marginTop: 6 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.brandLight, borderRadius: 999 },
  smallBtnText: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: 12 },
  predRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
  predLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase" },
  predValue: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text, marginTop: 4, letterSpacing: -0.4 },
  predHint: { fontFamily: fonts.body, color: colors.textDim, marginTop: 12, fontSize: 12 },
  habitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  habitLabel: { fontFamily: fonts.bodySemi, color: colors.text, fontSize: 15 },
  habitValue: { fontFamily: fonts.bodyMed, color: colors.textMute, fontSize: 13, minWidth: 60, textAlign: "right" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  iconBtnText: { color: colors.brand, fontFamily: fonts.headingExt, fontSize: 18 },
  exerciseToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: colors.brandLight, marginTop: 12 },
  exerciseDone: { backgroundColor: colors.brand },
  exerciseText: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: 14 },
  reportHighlight: { color: "#fff", fontFamily: fonts.headingExt, fontSize: 16, lineHeight: 22 },
  reportLine: { color: "rgba(255,255,255,0.9)", fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: colors.bgAlt, padding: 24, borderRadius: 24, width: "100%", maxWidth: 360 },
  input: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: fonts.bodyMed,
    color: colors.text,
    marginTop: 4,
  },
});
