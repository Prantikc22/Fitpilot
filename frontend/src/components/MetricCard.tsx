import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/src/lib/theme";
import { Card } from "./Card";

export function MetricCard({
  label,
  value,
  unit,
  hint,
  testID,
  highlight,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  testID?: string;
  highlight?: boolean;
}) {
  return (
    <Card testID={testID} variant={highlight ? "highlight" : "default"} style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, minWidth: 0 },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.textMute,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  value: { fontFamily: fonts.headingExt, fontSize: 26, color: colors.text, letterSpacing: -0.5 },
  unit: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.textMute, marginLeft: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, marginTop: 4 },
});
