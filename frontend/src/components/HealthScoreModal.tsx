import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { colors, fonts } from "@/src/lib/theme";

type Breakdown = Record<string, number>;

const LABELS: Record<string, { label: string; max: number; help: string; action: string }> = {
  calorie_adherence: { label: "Calorie adherence", max: 30, help: "How close you stay to your daily calorie target without overshooting.", action: "📸 Log your meals to improve this" },
  protein_adherence: { label: "Protein intake", max: 25, help: "Hitting your daily protein target — key for losing fat, not muscle.", action: "🥚 Add eggs, paneer or chicken" },
  water: { label: "Hydration", max: 15, help: "Aim for ~2.5 L of water per day.", action: "💧 Tap +500ml on the dashboard" },
  steps: { label: "Steps", max: 15, help: "Aim for 8,000+ steps daily.", action: "🚶 Take a 15-min walk" },
  exercise: { label: "Exercise", max: 10, help: "Mark exercise done for a full 10 points.", action: "🧘 Try today's yoga flow" },
  weight_progress: { label: "Weight trend", max: 5, help: "Trending down? Full 5 points. Steady? 2 points.", action: "⚖️ Log your weight weekly" },
};

export function HealthScoreModal({
  visible,
  onClose,
  score,
  breakdown,
}: {
  visible: boolean;
  onClose: () => void;
  score: number;
  breakdown: Breakdown | null;
}) {
  const safe = breakdown || {};
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.bg} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Health Score</Text>
            <Text style={styles.subtitle}>How we calculate it</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <X color={colors.text} size={22} />
          </Pressable>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.bigScore}>{score}</Text>
          <Text style={styles.bigOf}>/100</Text>
        </View>
        <Text style={styles.intro}>
          Your score is a daily snapshot of habits proven to drive sustainable weight loss.
        </Text>

        <ScrollView style={{ marginTop: 12 }}>
          {Object.entries(LABELS).map(([key, { label, max, help, action }]) => {
            const v = Number(safe[key] || 0);
            const pct = Math.max(0, Math.min(100, (v / max) * 100));
            const needsImprovement = pct < 70;
            return (
              <View key={key} style={styles.row}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowScore}>
                    <Text style={styles.rowScoreVal}>{v.toFixed(0)}</Text>
                    <Text style={styles.rowScoreMax}> / {max}</Text>
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.help}>{help}</Text>
                {needsImprovement && (
                  <View style={styles.actionRow}>
                    <Text style={styles.actionText}>{action}</Text>
                    <Text style={styles.actionBonus}>+{Math.round(max - v)} pts</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.bgAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "85%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text },
  subtitle: { fontFamily: fonts.body, color: colors.textMute, fontSize: 13, marginTop: 2 },
  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: 16 },
  bigScore: { fontFamily: fonts.headingExt, fontSize: 64, color: colors.brand, letterSpacing: -2 },
  bigOf: { fontFamily: fonts.bodyMed, fontSize: 16, color: colors.textMute, marginLeft: 4 },
  intro: { fontFamily: fonts.body, color: colors.textMute, marginTop: 4, lineHeight: 20 },
  row: { paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  rowScore: { fontFamily: fonts.bodyMed, fontSize: 14 },
  rowScoreVal: { color: colors.text, fontFamily: fonts.bodySemi },
  rowScoreMax: { color: colors.textDim },
  track: { height: 6, backgroundColor: colors.brandLight, borderRadius: 4, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.brand },
  help: { fontFamily: fonts.body, color: colors.textMute, fontSize: 12, marginTop: 6, lineHeight: 17 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.brand,
    flex: 1,
  },
  actionBonus: {
    fontFamily: fonts.headingExt,
    fontSize: 12,
    color: colors.success,
  },
});
