import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";

export function BMIBar({ bmi, height = 8 }: { bmi: number; height?: number }) {
  const { colors } = useTheme();
  // Position the marker between 12 and 40 BMI
  const min = 12, max = 40;
  const pct = Math.max(0, Math.min(100, ((bmi - min) / (max - min)) * 100));
  return (
    <View>
      <View style={[styles.barTrack, { height }]}>
        <View style={[styles.seg, { backgroundColor: colors.info, flex: 18.5 - min }]} />
        <View style={[styles.seg, { backgroundColor: colors.success, flex: 25 - 18.5 }]} />
        <View style={[styles.seg, { backgroundColor: colors.warning, flex: 30 - 25 }]} />
        <View style={[styles.seg, { backgroundColor: colors.terracotta, flex: max - 30 }]} />
      </View>
      <View style={[styles.marker, { left: `${pct}%`, backgroundColor: colors.text }]} />
    </View>
  );
}

export function BMICard({ weightKg, heightCm }: { weightKg: number; heightCm: number }) {
  const { colors } = useTheme();
  
  const bmi = useMemo(() => {
    if (!weightKg || !heightCm) return 0;
    const m = heightCm / 100;
    return weightKg / (m * m);
  }, [weightKg, heightCm]);

  const { label, color } = useMemo(() => {
    const b = bmi || 22;
    if (b < 18.5) return { label: "Underweight", color: colors.info };
    if (b < 25) return { label: "Healthy", color: colors.success };
    if (b < 30) return { label: "Overweight", color: colors.warning };
    return { label: "Obese", color: colors.terracotta };
  }, [bmi, colors]);

  return (
    <View style={[styles.card, { backgroundColor: colors.bgAlt, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textMute }]}>BMI</Text>
        <View style={[styles.pill, { backgroundColor: color + "20" }]}>
          <Text style={[styles.pillText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.text }]}>{bmi ? bmi.toFixed(1) : "—"}</Text>
        <Text style={[styles.unit, { color: colors.textMute }]}>kg/m²</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <BMIBar bmi={bmi || 22} />
      </View>
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleText, { color: colors.textDim }]}>18.5</Text>
        <Text style={[styles.scaleText, { color: colors.textDim }]}>25</Text>
        <Text style={[styles.scaleText, { color: colors.textDim }]}>30</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, borderWidth: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  valueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  value: { fontFamily: fonts.headingExt, fontSize: 32, letterSpacing: -0.8 },
  unit: { fontFamily: fonts.bodyMed, fontSize: 13, marginLeft: 6 },
  barTrack: { flexDirection: "row", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  seg: { height: "100%" },
  marker: { position: "absolute", top: -2, width: 4, height: 14, borderRadius: 2, marginLeft: -2 },
  scaleRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: "18%", marginTop: 6 },
  scaleText: { fontFamily: fonts.bodyMed, fontSize: 10 },
});
