import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, MessageCircle, Phone, Calendar, Check, Clock } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { ProLockCard } from "@/src/components/ProLockCard";
import { colors, fonts, radius } from "@/src/lib/theme";

const SLOTS = ["Tomorrow morning", "Tomorrow evening", "This weekend", "Next week"];

export default function Dietitian() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const isPro = (profile?.subscription_tier || "free") !== "free";
  const [slot, setSlot] = useState<string>(SLOTS[0]);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [consultId, setConsultId] = useState<string | null>(null);

  const submit = async () => {
    if (!session?.user) return;
    if (!topic.trim()) {
      Alert.alert("Add a topic", "Tell us what you'd like to discuss.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("dietitian_consults").insert({
        user_id: session.user.id,
        preferred_time: slot,
        topic: topic.trim(),
        notes: notes.trim(),
        status: "pending",
      }).select("id").single();

      if (error) throw error;
      setConsultId(data?.id || null);
      setDone(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Talk to a Dietitian</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {!isPro && (
            <View style={{ marginBottom: 16 }}>
              <ProLockCard
                title="1-on-1 chat & calls with a real nutritionist"
                description="Pro members get unlimited messaging and a monthly 30-min video consult with a certified dietitian."
                testID="dietitian-prolock"
              />
            </View>
          )}

          {done ? (
            <Card variant="highlight">
              <View style={{ alignItems: "center", padding: 8 }}>
                <View style={styles.checkCircle}>
                  <Check color="#fff" size={28} />
                </View>
                <Text style={styles.successTitle}>Request received</Text>
                <Text style={styles.successText}>
                  A qualified nutritionist will be assigned and reach out within 24 hours to confirm your {slot.toLowerCase()} consult.
                </Text>
                {consultId && (
                  <Text style={styles.consultIdText}>Booking ID: {consultId.slice(0, 8).toUpperCase()}</Text>
                )}
                <View style={styles.nextStepsCard}>
                  <Text style={styles.nextStepsTitle}>What happens next?</Text>
                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                    <Text style={styles.stepText}>Admin reviews your request</Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                    <Text style={styles.stepText}>A nutritionist will be assigned to you</Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                    <Text style={styles.stepText}>You receive confirmed time & phone number</Text>
                  </View>
                  <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
                    <Text style={styles.stepText}>Dietitian calls you at scheduled time</Text>
                  </View>
                </View>
                <Button title="Done" onPress={() => router.back()} size="md" style={{ marginTop: 16, paddingHorizontal: 28 }} />
              </View>
            </Card>
          ) : (
            <>
              <Card style={styles.heroCard}>
                <Text style={styles.hero}>Get expert guidance, personalized.</Text>
                <Text style={styles.heroSub}>
                  Pick a nutritionist and topic. They will message or call you back.
                </Text>
                <View style={styles.iconRow}>
                  <IconChip Icon={MessageCircle} label="Chat" />
                  <IconChip Icon={Phone} label="Call" />
                  <IconChip Icon={Calendar} label="Schedule" />
                </View>
              </Card>

              <Text style={[styles.label, { marginTop: 20 }]}>Our Expert Team</Text>
              <View style={styles.assignmentNote}>
                <Clock color={colors.brand} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentTitle}>A qualified nutritionist will be assigned</Text>
                  <Text style={styles.assignmentSub}>Based on your topic and schedule, we'll match you with the best available expert within 24 hours.</Text>
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Preferred time</Text>
              <View style={styles.slotRow}>
                {SLOTS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSlot(s)}
                    style={[styles.slot, slot === s && styles.slotActive]}
                    testID={`slot-${s}`}
                  >
                    <Text style={[styles.slotText, slot === s && { color: "#fff" }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Topic</Text>
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. PCOS-friendly diet, marathon nutrition…"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                testID="dietitian-topic"
              />

              <Text style={[styles.label, { marginTop: 12 }]}>Anything else?</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes about your goals, allergies, schedule…"
                placeholderTextColor={colors.textDim}
                style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
                multiline
                testID="dietitian-notes"
              />

              <Button
                title={isPro ? "Request consult" : "Upgrade to request consult"}
                onPress={isPro ? submit : () => router.push("/paywall")}
                loading={submitting}
                style={{ marginTop: 20 }}
                testID="dietitian-submit"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IconChip({ Icon, label }: { Icon: any; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon color={colors.brand} size={14} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20 },
  heroCard: { padding: 22 },
  hero: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  heroSub: { fontFamily: fonts.body, color: colors.textMute, marginTop: 6, lineHeight: 20 },
  iconRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontFamily: fonts.bodyMed, color: colors.brand, fontSize: 12 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },
  
  // Expert cards
  expertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.bgAlt,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  expertCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  expertAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgWarm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expertName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
  },
  expertTitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 2,
  },
  expertSpec: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.brand,
    marginTop: 4,
  },
  expertMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  expertRating: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.text,
  },
  expertConsults: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMute,
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
  radioOuterSelected: { borderColor: colors.brand },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bgAlt, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  slotActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  slotText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  input: { backgroundColor: colors.bgWarm, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: fonts.body, color: colors.text },
  
  checkCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: fonts.headingExt, fontSize: 20, color: colors.text, marginTop: 14 },
  successText: { fontFamily: fonts.body, color: colors.textMute, textAlign: "center", marginTop: 8, lineHeight: 20 },
  consultIdText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 8,
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  // Assignment note card
  assignmentNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.brandLight,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  assignmentTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.brand,
  },
  assignmentSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 4,
    lineHeight: 18,
  },
  nextStepsCard: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 16,
    width: "100%",
  },
  nextStepsTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.text,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: "#fff",
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    flex: 1,
  },
});
