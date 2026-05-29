import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/src/lib/theme";

function classify(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: colors.info };
  if (bmi < 25) return { label: "Healthy", color: colors.success };
  if (bmi < 30) return { label: "Overweight", color: colors.warning };
  return { label: "Obese", color: colors.terracotta };
}

export function BMIBar({ bmi, height = 8 }: { bmi: number; height?: number }) {
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
      <View style={[styles.marker, { left: `${pct}%` }]} />
    </View>
  );
}

export function BMICard({ weightKg, heightCm }: { weightKg: number; heightCm: number }) {
  const bmi = useMemo(() => {
    if (!weightKg || !heightCm) return 0;
    const m = heightCm / 100;
    return weightKg / (m * m);
  }, [weightKg, heightCm]);
  const { label, color } = classify(bmi || 22);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>BMI</Text>
        <View style={[styles.pill, { backgroundColor: color + "20" }]}>
          <Text style={[styles.pillText, { color }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{bmi ? bmi.toFixed(1) : "—"}</Text>
        <Text style={styles.unit}>kg/m²</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <BMIBar bmi={bmi || 22} />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>18.5</Text>
        <Text style={styles.scaleText}>25</Text>
        <Text style={styles.scaleText}>30</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgAlt, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  valueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  value: { fontFamily: fonts.headingExt, fontSize: 32, color: colors.text, letterSpacing: -0.8 },
  unit: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.textMute, marginLeft: 6 },
  barTrack: { flexDirection: "row", borderRadius: 4, overflow: "hidden", marginTop: 4 },
  seg: { height: "100%" },
  marker: { position: "absolute", top: -2, width: 4, height: 14, backgroundColor: colors.text, borderRadius: 2, marginLeft: -2 },
  scaleRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: "18%", marginTop: 6 },
  scaleText: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textDim },
});
