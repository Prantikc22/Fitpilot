import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from "react-native";
import { X, Calendar, Droplets, Sun, Moon, TrendingUp, AlertCircle, CheckCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { colors, fonts, radius } from "@/src/lib/theme";

const SYMPTOMS = [
  { id: "cramps", label: "Cramps", icon: "😣" },
  { id: "bloating", label: "Bloating", icon: "🫄" },
  { id: "headache", label: "Headache", icon: "🤕" },
  { id: "fatigue", label: "Fatigue", icon: "😴" },
  { id: "mood_swings", label: "Mood swings", icon: "😤" },
  { id: "acne", label: "Acne", icon: "😔" },
  { id: "cravings", label: "Cravings", icon: "🍫" },
  { id: "breast_tenderness", label: "Tender breasts", icon: "💔" },
];

const FLOW_LEVELS = [
  { id: "none", label: "None", color: colors.bgAlt },
  { id: "spotting", label: "Spotting", color: "#FFCDD2" },
  { id: "light", label: "Light", color: "#EF9A9A" },
  { id: "medium", label: "Medium", color: "#E57373" },
  { id: "heavy", label: "Heavy", color: "#C62828" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CycleTracker({ visible, onClose }: Props) {
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [flow, setFlow] = useState<string>("none");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(28);

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      // Load recent cycle data
      const { data } = await supabase
        .from("cycle_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(90);
      
      if (data) {
        setCycleData(data);
        
        // Find last period start
        const periodDays = data.filter((d: any) => d.flow && d.flow !== "none");
        if (periodDays.length > 0) {
          setLastPeriodStart(periodDays[0].date);
        }
      }
      
      // Load today's entry if exists
      const { data: today } = await supabase
        .from("cycle_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("date", selectedDate)
        .maybeSingle();
      
      if (today) {
        setFlow(today.flow || "none");
        setSymptoms(today.symptoms || []);
      } else {
        setFlow("none");
        setSymptoms([]);
      }
    } catch (error: any) {
      // Table might not exist
      console.log("Cycle tracker: ", error.message);
    }
  }, [session?.user?.id, selectedDate]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const toggleSymptom = (symptomId: string) => {
    setSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const save = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    
    try {
      await supabase.from("cycle_logs").upsert({
        user_id: session.user.id,
        date: selectedDate,
        flow,
        symptoms,
      }, { onConflict: "user_id,date" });
      
      Alert.alert("Saved!", "Your cycle data has been logged.");
      await loadData();
    } catch (error: any) {
      Alert.alert("Error", "Couldn't save. The cycle tracking table may need to be set up.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate predictions
  const daysUntilNextPeriod = lastPeriodStart 
    ? Math.max(0, cycleLength - Math.floor((Date.now() - new Date(lastPeriodStart).getTime()) / 86400000))
    : null;

  const currentPhase = daysUntilNextPeriod !== null
    ? daysUntilNextPeriod > 14 ? "Menstrual" 
      : daysUntilNextPeriod > 7 ? "Follicular"
      : daysUntilNextPeriod > 0 ? "Luteal"
      : "Ovulation"
    : "Track to predict";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cycle Tracker</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Cycle Overview */}
          <Card variant="highlight" style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Moon color={colors.brand} size={20} />
                <Text style={styles.overviewValue}>{currentPhase}</Text>
                <Text style={styles.overviewLabel}>Current phase</Text>
              </View>
              {daysUntilNextPeriod !== null && (
                <View style={styles.overviewItem}>
                  <Calendar color={colors.terracotta} size={20} />
                  <Text style={styles.overviewValue}>{daysUntilNextPeriod}</Text>
                  <Text style={styles.overviewLabel}>Days until period</Text>
                </View>
              )}
            </View>
          </Card>

          {/* Date Selection */}
          <Text style={styles.sectionTitle}>Log for {selectedDate}</Text>

          {/* Flow Level */}
          <Text style={styles.label}>Flow level</Text>
          <View style={styles.flowRow}>
            {FLOW_LEVELS.map(level => (
              <Pressable
                key={level.id}
                style={[
                  styles.flowBtn,
                  { backgroundColor: level.color },
                  flow === level.id && styles.flowBtnActive,
                ]}
                onPress={() => setFlow(level.id)}
              >
                <Text style={[styles.flowLabel, flow === level.id && styles.flowLabelActive]}>
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Symptoms */}
          <Text style={styles.label}>Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {SYMPTOMS.map((symptom, i) => {
              const selected = symptoms.includes(symptom.id);
              return (
                <Animated.View key={symptom.id} entering={FadeInDown.delay(i * 30).duration(200)}>
                  <Pressable
                    style={[styles.symptomBtn, selected && styles.symptomBtnActive]}
                    onPress={() => toggleSymptom(symptom.id)}
                  >
                    <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                    <Text style={[styles.symptomLabel, selected && styles.symptomLabelActive]}>
                      {symptom.label}
                    </Text>
                    {selected && <CheckCircle color={colors.brand} size={14} />}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <Button
            title={saving ? "Saving..." : "Save Entry"}
            onPress={save}
            disabled={saving}
            style={{ marginTop: 24 }}
          />

          {/* PCOS Tips */}
          <Card style={{ marginTop: 24 }}>
            <View style={styles.tipsHeader}>
              <AlertCircle color={colors.warning} size={18} />
              <Text style={styles.tipsTitle}>PCOS/PCOD Tips</Text>
            </View>
            <Text style={styles.tipText}>
              • Track cycles to identify irregularities{"\n"}
              • Note symptoms to share with your doctor{"\n"}
              • Regular tracking helps manage hormone balance
            </Text>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
    color: colors.text,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  overviewCard: {
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  overviewItem: {
    alignItems: "center",
    gap: 6,
  },
  overviewValue: {
    fontFamily: fonts.headingExt,
    fontSize: 20,
    color: colors.text,
  },
  overviewLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
  },
  sectionTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  flowRow: {
    flexDirection: "row",
    gap: 8,
  },
  flowBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  flowBtnActive: {
    borderColor: colors.brand,
  },
  flowLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.text,
  },
  flowLabelActive: {
    color: colors.brand,
    fontFamily: fonts.bodySemi,
  },
  symptomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  symptomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomBtnActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  symptomIcon: {
    fontSize: 16,
  },
  symptomLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  symptomLabelActive: {
    color: colors.brand,
    fontFamily: fonts.bodyMed,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  tipsTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    lineHeight: 22,
  },
});
