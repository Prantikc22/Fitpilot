import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { colors, fonts, radius } from "@/src/lib/theme";

type Form = {
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other" | "";
  height_cm: string;
  current_weight_kg: string;
  goal_weight_kg: string;
  goal_deadline: string;
  activity_level: string;
  diet_pref: string;
  allergies: string;
  conditions: string;
  country: string;
  cuisine: string;
  budget_monthly: string;
  aggressiveness: string;
};

const STEPS: { title: string; subtitle?: string; field: keyof Form | "choice" | "summary"; choices?: { label: string; value: string }[]; placeholder?: string; keyboard?: "numeric" | "default"; multi?: keyof Form }[] = [
  { title: "What's your name?", subtitle: "We'll personalize your coaching.", field: "name", placeholder: "Your name" },
  { title: "How old are you?", field: "age", keyboard: "numeric", placeholder: "Years" },
  {
    title: "Gender",
    field: "choice",
    multi: "gender",
    choices: [
      { label: "Male", value: "Male" },
      { label: "Female", value: "Female" },
      { label: "Other", value: "Other" },
    ],
  },
  { title: "Your height (cm)", field: "height_cm", keyboard: "numeric", placeholder: "e.g. 172" },
  { title: "Your current weight (kg)", field: "current_weight_kg", keyboard: "numeric", placeholder: "e.g. 78" },
  { title: "Your goal weight (kg)", field: "goal_weight_kg", keyboard: "numeric", placeholder: "e.g. 70" },
  { title: "Goal deadline", subtitle: "When do you want to reach it? YYYY-MM-DD", field: "goal_deadline", placeholder: "2026-08-31" },
  {
    title: "Activity level",
    field: "choice",
    multi: "activity_level",
    choices: [
      { label: "Sedentary (little exercise)", value: "sedentary" },
      { label: "Light (1–3 days/week)", value: "light" },
      { label: "Moderate (3–5 days/week)", value: "moderate" },
      { label: "Active (6–7 days/week)", value: "active" },
      { label: "Very active (intense daily)", value: "very_active" },
    ],
  },
  {
    title: "Diet preference",
    field: "choice",
    multi: "diet_pref",
    choices: [
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Eggetarian", value: "eggetarian" },
      { label: "Non-Vegetarian", value: "non_vegetarian" },
      { label: "Vegan", value: "vegan" },
    ],
  },
  { title: "Any food allergies?", subtitle: "Comma-separated. Skip if none.", field: "allergies", placeholder: "peanuts, dairy" },
  { title: "Any medical conditions?", subtitle: "Comma-separated. Skip if none.", field: "conditions", placeholder: "diabetes, hypertension" },
  { title: "Country", field: "country", placeholder: "India" },
  { title: "Preferred cuisine", field: "cuisine", placeholder: "Indian, Mediterranean…" },
  { title: "Monthly food budget", subtitle: "Helps us plan affordable meals.", field: "budget_monthly", keyboard: "numeric", placeholder: "e.g. 8000" },
  {
    title: "How aggressively do you want to lose weight?",
    subtitle: "We never recommend unsafe weight loss.",
    field: "choice",
    multi: "aggressiveness",
    choices: [
      { label: "Balanced (≈0.4 kg/week)", value: "balanced" },
      { label: "Fast (≈0.6 kg/week)", value: "fast" },
      { label: "Aggressive (≈0.8 kg/week)", value: "aggressive" },
    ],
  },
  { title: "All set!", subtitle: "We'll build your plan now.", field: "summary" },
];

export default function Onboarding() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    name: "",
    age: "",
    gender: "",
    height_cm: "",
    current_weight_kg: "",
    goal_weight_kg: "",
    goal_deadline: "",
    activity_level: "",
    diet_pref: "",
    allergies: "",
    conditions: "",
    country: "",
    cuisine: "",
    budget_monthly: "",
    aggressiveness: "balanced",
  });

  const current = STEPS[step];
  const progress = (step + 1) / STEPS.length;

  const canNext = useMemo(() => {
    if (current.field === "summary") return true;
    if (current.field === "choice") {
      return !!form[current.multi as keyof Form];
    }
    if (current.field === "allergies" || current.field === "conditions") return true;
    return String(form[current.field as keyof Form] || "").trim().length > 0;
  }, [current, form]);

  const onNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    // submit
    if (!session?.user) return;
    setSubmitting(true);
    try {
      // compute targets
      const t = await api.computeTargets({
        age: Number(form.age),
        gender: form.gender || "Other",
        height_cm: Number(form.height_cm),
        current_weight_kg: Number(form.current_weight_kg),
        goal_weight_kg: Number(form.goal_weight_kg),
        activity_level: form.activity_level || "moderate",
        aggressiveness: form.aggressiveness || "balanced",
      });
      const payload = {
        id: session.user.id,
        email: session.user.email,
        name: form.name,
        age: Number(form.age) || null,
        gender: form.gender || null,
        height_cm: Number(form.height_cm) || null,
        current_weight_kg: Number(form.current_weight_kg) || null,
        goal_weight_kg: Number(form.goal_weight_kg) || null,
        goal_deadline: form.goal_deadline || null,
        activity_level: form.activity_level || null,
        diet_pref: form.diet_pref || null,
        allergies: form.allergies ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        conditions: form.conditions ? form.conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
        country: form.country || null,
        cuisine: form.cuisine || null,
        budget_monthly: Number(form.budget_monthly) || null,
        aggressiveness: form.aggressiveness,
        daily_calorie_target: t.daily_calorie_target,
        daily_protein_target: t.daily_protein_target,
        onboarded: true,
      };
      await supabase.from("profiles").upsert(payload);
      // seed weight log
      if (Number(form.current_weight_kg)) {
        await supabase.from("weight_logs").insert({
          user_id: session.user.id,
          weight_kg: Number(form.current_weight_kg),
        });
      }
      await refreshProfile();
      router.replace("/(tabs)");
    } catch (e: any) {
      console.warn(e);
      setSubmitting(false);
    }
  };

  const setVal = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{current.title}</Text>
          {current.subtitle ? <Text style={styles.subtitle}>{current.subtitle}</Text> : null}

          {current.field === "choice" && current.choices ? (
            <View style={{ gap: 10, marginTop: 24 }}>
              {current.choices.map((c) => {
                const selected = form[current.multi as keyof Form] === c.value;
                return (
                  <Pressable
                    key={c.value}
                    testID={`onb-choice-${c.value}`}
                    onPress={() => setVal(current.multi as keyof Form, c.value)}
                    style={[styles.pill, selected && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextActive]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : current.field === "summary" ? (
            <View style={styles.summary}>
              <Text style={styles.summaryHi}>Hi {form.name || "there"} 👋</Text>
              <Text style={styles.summaryText}>
                We'll build your personalized plan based on your goals. You'll get a daily calorie target,
                protein target, and a meal plan tailored to your cuisine and budget.
              </Text>
            </View>
          ) : (
            <TextInput
              key={current.field as string}
              value={String(form[current.field as keyof Form] || "")}
              onChangeText={(t) => setVal(current.field as keyof Form, t)}
              placeholder={current.placeholder}
              placeholderTextColor={colors.textDim}
              keyboardType={current.keyboard || "default"}
              style={styles.input}
              autoFocus
              testID={`onb-input-${current.field}`}
            />
          )}
        </ScrollView>
        <View style={styles.footer}>
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={styles.back} testID="onb-back">
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}
          <Button
            title={step === STEPS.length - 1 ? "Build my plan" : "Continue"}
            onPress={onNext}
            loading={submitting}
            disabled={!canNext}
            testID="onb-next"
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  progressTrack: { height: 4, backgroundColor: colors.brandLight, marginHorizontal: 24, borderRadius: 2, marginTop: 8 },
  progressFill: { height: 4, backgroundColor: colors.brand, borderRadius: 2 },
  scroll: { padding: 24, paddingTop: 36, paddingBottom: 24 },
  title: { fontFamily: fonts.headingExt, fontSize: 30, color: colors.text, letterSpacing: -1, lineHeight: 36 },
  subtitle: { fontFamily: fonts.body, color: colors.textMute, fontSize: 16, marginTop: 8 },
  input: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: fonts.bodyMed,
    color: colors.text,
    marginTop: 24,
  },
  pill: {
    backgroundColor: colors.bgAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { fontFamily: fonts.bodyMed, fontSize: 15, color: colors.text },
  pillTextActive: { color: colors.textInv, fontFamily: fonts.bodySemi },
  summary: { backgroundColor: colors.brandLight, borderRadius: radius.xl, padding: 20, marginTop: 24 },
  summaryHi: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.brand },
  summaryText: { fontFamily: fonts.body, color: colors.textMute, marginTop: 8, lineHeight: 22 },
  footer: { flexDirection: "row", gap: 12, padding: 24, paddingTop: 0 },
  back: { alignItems: "center", justifyContent: "center", paddingHorizontal: 18, minHeight: 56 },
  backText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textMute },
});
