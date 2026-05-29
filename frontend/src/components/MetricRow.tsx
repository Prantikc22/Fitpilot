import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/src/lib/theme";

export function ProgressBar({
  value,
  max,
  color = colors.brand,
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <View style={[styles.track, { height, backgroundColor: colors.brandLight }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

export function MetricRow({
  label,
  value,
  total,
  unit,
  color,
  testID,
}: {
  label: string;
  value: number;
  total: number;
  unit: string;
  color?: string;
  testID?: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.numbers}>
          <Text style={styles.num}>{Math.round(value)}</Text>
          <Text style={styles.dim}>
            {" / "}
            {Math.round(total)} {unit}
          </Text>
        </Text>
      </View>
      <ProgressBar value={value} max={total} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 8 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.textMute },
  numbers: { fontFamily: fonts.bodyMed, fontSize: 14 },
  num: { color: colors.text, fontFamily: fonts.bodySemi },
  dim: { color: colors.textDim },
  track: { borderRadius: 999, overflow: "hidden", width: "100%" },
  fill: { borderRadius: 999 },
});
