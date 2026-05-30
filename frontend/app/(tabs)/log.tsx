import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Trash2, Sparkles, Camera } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, lightColors } from "@/src/contexts/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { api, MealPlan } from "@/src/lib/api";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { MealPlanView } from "@/src/components/MealPlanView";
import { NutritionistAnimation } from "@/src/components/NutritionistAnimation";
import { ProLockCard } from "@/src/components/ProLockCard";
import { checkAndIncrement } from "@/src/lib/limits";
import { fonts, radius } from "@/src/lib/theme";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = (typeof MEALS)[number];

type LogRow = {
  id: string;
  meal_type: Meal;
  items: any;
  calories: number;
  protein: number;
  logged_at: string;
};

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function LogScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [addOpen, setAddOpen] = useState<Meal | null>(null);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("food_logs")
      .select("id,meal_type,items,calories,protein,logged_at")
      .eq("user_id", session.user.id)
      .gte("logged_at", startOfDayISO())
      .order("logged_at", { ascending: true });
    setRows((data || []) as LogRow[]);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const generatePlan = async () => {
    if (!profile || !session?.user) return;
    // Gate: AI meal plan is a Pro feature; allow up to free_ai_gens for taste
    const limit = await checkAndIncrement(session.user.id, "ai");
    if (!limit.allowed) {
      Alert.alert(
        "Monthly limit reached",
        "Upgrade to Leanly Pro for plans tailored daily, unlimited.",
        [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/paywall") },
        ],
      );
      return;
    }
    setPlanLoading(true);
    // Run animation alongside the API call — wait for the longer of the two
    const animationMin = new Promise((r) => setTimeout(r, 12000));
    try {
      const [p] = await Promise.all([api.mealPlan({ profile }), animationMin]);
      setPlan(p);
    } catch (e: any) {
      Alert.alert("Couldn't generate plan", e.message || "Try again later.");
    } finally {
      setPlanLoading(false);
    }
  };

  const improvePlan = async () => {
    if (!plan || !profile || !session?.user) return;
    const limit = await checkAndIncrement(session.user.id, "ai");
    if (!limit.allowed) {
      Alert.alert("Monthly limit reached", "Upgrade to Pro for unlimited refinements.", [
        { text: "Later", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/paywall") },
      ]);
      return;
    }
    Alert.prompt?.(
      "Tell the nutritionist",
      "What should we change? e.g. 'more protein', 'no dairy', 'lighter dinner'.",
      async (feedback) => {
        if (!feedback?.trim()) return;
        setPlanLoading(true);
        const min = new Promise((r) => setTimeout(r, 8000));
        try {
          const [p] = await Promise.all([
            api.improveMealPlan({ profile, current_plan: plan, feedback }),
            min,
          ]);
          setPlan(p);
        } catch (e: any) {
          Alert.alert("Couldn't refine", e.message || "Try again later.");
        } finally {
          setPlanLoading(false);
        }
      },
    );
  };

  const addItem = async () => {
    if (!session?.user || !addOpen) return;
    if (!name.trim() || !Number(cal)) {
      Alert.alert("Missing info", "Enter at least a name and calories.");
      return;
    }
    setSaving(true);
    await supabase.from("food_logs").insert({
      user_id: session.user.id,
      meal_type: addOpen,
      items: [{ name: name.trim(), calories: Number(cal), protein: Number(pro) || 0 }],
      calories: Number(cal),
      protein: Number(pro) || 0,
      source: "manual",
    });
    setSaving(false);
    setAddOpen(null);
    setName("");
    setCal("");
    setPro("");
    await load();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("food_logs").delete().eq("id", id);
    await load();
  };

  const grouped = MEALS.map((m) => ({
    meal: m,
    items: rows.filter((r) => r.meal_type === m),
  }));

  const totalCal = rows.reduce((s, r) => s + (Number(r.calories) || 0), 0);
  const target = profile?.daily_calorie_target || 2000;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.h1, { color: colors.text }]}>Food Log</Text>
        <Text style={[styles.sub, { color: colors.textMute }]}>
          {Math.round(totalCal)} / {target} kcal today
        </Text>

        <Card variant="highlight" style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles color={colors.brand} size={16} />
                <Text style={[styles.label, { color: colors.textMute }]}>Personalized Plan</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {plan ? "Today's plan" : "Get a plan tailored to you"}
              </Text>
            </View>
            <Button
              title={plan ? "Refresh" : "Generate"}
              variant="primary"
              size="md"
              loading={planLoading}
              onPress={generatePlan}
              testID="generate-plan-btn"
              style={{ minHeight: 40, paddingHorizontal: 18 }}
            />
          </View>
          {plan ? (
            <View style={{ marginTop: 14 }}>
              <MealPlanView plan={plan} onImprove={improvePlan} />
            </View>
          ) : null}
        </Card>

        {grouped.map(({ meal, items }) => {
          const sum = items.reduce((s, r) => s + (Number(r.calories) || 0), 0);
          return (
            <View key={meal} style={{ marginTop: 16 }}>
              <View style={styles.mealHead}>
                <Text style={[styles.mealTitle, { color: colors.text }]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                <Text style={[styles.mealKcal, { color: colors.textMute }]}>{Math.round(sum)} kcal</Text>
              </View>
              <Card style={{ padding: 12 }}>
                {items.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textDim }]}>Nothing logged yet</Text>
                ) : (
                  items.map((r) => {
                    const first = Array.isArray(r.items) ? r.items[0] : null;
                    const nm = first?.name || "Item";
                    return (
                      <View key={r.id} style={[styles.item, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: colors.text }]}>{nm}</Text>
                          <Text style={[styles.itemMacros, { color: colors.textMute }]}>
                            {Math.round(r.calories)} kcal · {Math.round(r.protein)}g protein
                          </Text>
                        </View>
                        <Pressable onPress={() => deleteItem(r.id)} hitSlop={8} testID={`del-${r.id}`}>
                          <Trash2 color={colors.textDim} size={18} />
                        </Pressable>
                      </View>
                    );
                  })
                )}
                <Pressable style={styles.addBtn} onPress={() => setAddOpen(meal)} testID={`add-${meal}`}>
                  <Plus color={colors.brand} size={16} />
                  <Text style={[styles.addBtnText, { color: colors.brand }]}>Add to {meal}</Text>
                </Pressable>
              </Card>
            </View>
          );
        })}

        <Pressable onPress={() => router.push("/scan")} style={[styles.scanCta, { backgroundColor: colors.brand }]} testID="open-scan">
          <Camera color="#fff" size={18} />
          <Text style={styles.scanCtaText}>Scan a meal with AI</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddOpen(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.bgAlt }]}>
            <Text style={[styles.h2, { color: colors.text }]}>Add to {addOpen}</Text>
            <Text style={[styles.label, { color: colors.textMute }]}>Food</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Greek yogurt" placeholderTextColor={colors.textDim} style={[styles.input, { backgroundColor: colors.bgWarm, color: colors.text }]} testID="manual-name" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMute }]}>Calories</Text>
                <TextInput value={cal} onChangeText={setCal} placeholder="kcal" placeholderTextColor={colors.textDim} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bgWarm, color: colors.text }]} testID="manual-cal" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMute }]}>Protein (g)</Text>
                <TextInput value={pro} onChangeText={setPro} placeholder="g" placeholderTextColor={colors.textDim} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bgWarm, color: colors.text }]} testID="manual-pro" />
              </View>
            </View>
            <Button title="Save" onPress={addItem} loading={saving} testID="manual-save" style={{ marginTop: 12 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <NutritionistAnimation visible={planLoading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20 },
  h1: { fontFamily: fonts.headingExt, fontSize: 28, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.body, marginTop: 4 },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: 17, marginTop: 2 },
  planRow: { backgroundColor: "rgba(255,255,255,0.5)", padding: 12, borderRadius: 14 },
  planMeal: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 },
  planName: { fontFamily: fonts.bodySemi, fontSize: 15, marginTop: 2 },
  planMacros: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  tip: { fontFamily: fonts.body, fontSize: 13, marginTop: 6, fontStyle: "italic" },
  mealHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, paddingHorizontal: 4 },
  mealTitle: { fontFamily: fonts.heading, fontSize: 18 },
  mealKcal: { fontFamily: fonts.bodyMed, fontSize: 13 },
  empty: { fontFamily: fonts.body, padding: 8 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  itemName: { fontFamily: fonts.bodySemi, fontSize: 15 },
  itemMacros: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, justifyContent: "center" },
  addBtnText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 24,
  },
  scanCtaText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 15 },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 8 },
  h2: { fontFamily: fonts.headingExt, fontSize: 22, marginBottom: 12, textTransform: "capitalize" },
  input: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    marginTop: 4,
    marginBottom: 4,
  },
});
