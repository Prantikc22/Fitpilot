import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from "react-native";
import { X, Calendar, Moon, CheckCircle, AlertCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { fonts, radius } from "@/src/lib/theme";

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

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CycleTracker({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [flow, setFlow] = useState<string>("none");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(28);

  const FLOW_LEVELS = [
    { id: "none", label: "None", color: colors.bgAlt },
    { id: "spotting", label: "Spotting", color: "#FFCDD2" },
    { id: "light", label: "Light", color: "#EF9A9A" },
    { id: "medium", label: "Medium", color: "#E57373" },
    { id: "heavy", label: "Heavy", color: "#C62828" },
  ];

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data } = await supabase
        .from("cycle_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(90);
      
      if (data) {
        setCycleData(data);
        const periodDays = data.filter((d: any) => d.flow && d.flow !== "none");
        if (periodDays.length > 0) {
          setLastPeriodStart(periodDays[0].date);
        }
      }
      
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
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Cycle Tracker</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Card variant="highlight" style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Moon color={colors.brand} size={20} />
                <Text style={[styles.overviewValue, { color: colors.text }]}>{currentPhase}</Text>
                <Text style={[styles.overviewLabel, { color: colors.textMute }]}>Current phase</Text>
              </View>
              {daysUntilNextPeriod !== null && (
                <View style={styles.overviewItem}>
                  <Calendar color={colors.terracotta} size={20} />
                  <Text style={[styles.overviewValue, { color: colors.text }]}>{daysUntilNextPeriod}</Text>
                  <Text style={[styles.overviewLabel, { color: colors.textMute }]}>Days until period</Text>
                </View>
              )}
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Log for {selectedDate}</Text>

          <Text style={[styles.label, { color: colors.text }]}>Flow level</Text>
          <View style={styles.flowRow}>
            {FLOW_LEVELS.map(level => (
              <Pressable
                key={level.id}
                style={[
                  styles.flowBtn,
                  { backgroundColor: level.color },
                  flow === level.id && { borderColor: colors.brand },
                ]}
                onPress={() => setFlow(level.id)}
              >
                <Text style={[styles.flowLabel, { color: colors.text }, flow === level.id && { color: colors.brand }]}>
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {SYMPTOMS.map((symptom, i) => {
              const selected = symptoms.includes(symptom.id);
              return (
                <Animated.View key={symptom.id} entering={FadeInDown.delay(i * 30).duration(200)}>
                  <Pressable
                    style={[
                      styles.symptomBtn, 
                      { backgroundColor: colors.bgAlt, borderColor: colors.border },
                      selected && { backgroundColor: colors.brandLight, borderColor: colors.brand }
                    ]}
                    onPress={() => toggleSymptom(symptom.id)}
                  >
                    <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                    <Text style={[styles.symptomLabel, { color: selected ? colors.brand : colors.text }]}>
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

          <Card style={{ marginTop: 24 }}>
            <View style={styles.tipsHeader}>
              <AlertCircle color={colors.warning} size={18} />
              <Text style={[styles.tipsTitle, { color: colors.text }]}>PCOS/PCOD Tips</Text>
            </View>
            <Text style={[styles.tipText, { color: colors.textMute }]}>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
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
  },
  overviewLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
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
  flowLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  symptomIcon: {
    fontSize: 16,
  },
  symptomLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
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
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 22,
  },
});
