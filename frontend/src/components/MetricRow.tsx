import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";

export function ProgressBar({
  value,
  max,
  color,
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const barColor = color || colors.brand;
  
  return (
    <View style={[styles.track, { height, backgroundColor: colors.brandLight }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor, height }]} />
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
  const { colors } = useTheme();
  
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowHeader}>
        <Text style={[styles.label, { color: colors.textMute }]}>{label}</Text>
        <Text style={[styles.numbers, { color: colors.text }]}>
          <Text style={[styles.num, { color: colors.text }]}>{Math.round(value)}</Text>
          <Text style={[styles.dim, { color: colors.textDim }]}>
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
  label: { fontFamily: fonts.bodyMed, fontSize: 14 },
  numbers: { fontFamily: fonts.bodyMed, fontSize: 14 },
  num: { fontFamily: fonts.bodySemi },
  dim: {},
  track: { borderRadius: 999, overflow: "hidden", width: "100%" },
  fill: { borderRadius: 999 },
});
