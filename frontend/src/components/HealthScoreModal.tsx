import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";

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
  const { colors } = useTheme();
  const safe = breakdown || {};
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.bg} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.bgAlt }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Your Health Score</Text>
            <Text style={[styles.subtitle, { color: colors.textMute }]}>How we calculate it</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <X color={colors.text} size={22} />
          </Pressable>
        </View>

        <View style={styles.scoreRow}>
          <Text style={[styles.bigScore, { color: colors.brand }]}>{score}</Text>
          <Text style={[styles.bigOf, { color: colors.textMute }]}>/100</Text>
        </View>
        <Text style={[styles.intro, { color: colors.textMute }]}>
          Your score is a daily snapshot of habits proven to drive sustainable weight loss.
        </Text>

        <ScrollView style={{ marginTop: 12 }}>
          {Object.entries(LABELS).map(([key, { label, max, help, action }]) => {
            const v = Number(safe[key] || 0);
            const pct = Math.max(0, Math.min(100, (v / max) * 100));
            const needsImprovement = pct < 70;
            return (
              <View key={key} style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={styles.rowScore}>
                    <Text style={[styles.rowScoreVal, { color: colors.text }]}>{v.toFixed(0)}</Text>
                    <Text style={[styles.rowScoreMax, { color: colors.textDim }]}> / {max}</Text>
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.brandLight }]}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.brand }]} />
                </View>
                <Text style={[styles.help, { color: colors.textMute }]}>{help}</Text>
                {needsImprovement && (
                  <View style={[styles.actionRow, { backgroundColor: colors.brandLight }]}>
                    <Text style={[styles.actionText, { color: colors.brand }]}>{action}</Text>
                    <Text style={[styles.actionBonus, { color: colors.success }]}>+{Math.round(max - v)} pts</Text>
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
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "85%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: fonts.headingExt, fontSize: 22 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: 16 },
  bigScore: { fontFamily: fonts.headingExt, fontSize: 64, letterSpacing: -2 },
  bigOf: { fontFamily: fonts.bodyMed, fontSize: 16, marginLeft: 4 },
  intro: { fontFamily: fonts.body, marginTop: 4, lineHeight: 20 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  rowScore: { fontFamily: fonts.bodyMed, fontSize: 14 },
  rowScoreVal: { fontFamily: fonts.bodySemi },
  rowScoreMax: {},
  track: { height: 6, borderRadius: 4, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%" },
  help: { fontFamily: fonts.body, fontSize: 12, marginTop: 6, lineHeight: 17 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    flex: 1,
  },
  actionBonus: {
    fontFamily: fonts.headingExt,
    fontSize: 12,
  },
});
