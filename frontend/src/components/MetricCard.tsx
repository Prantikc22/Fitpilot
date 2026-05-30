import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";
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
  const { colors } = useTheme();
  
  return (
    <Card testID={testID} variant={highlight ? "highlight" : "default"} style={styles.card}>
      <Text style={[styles.label, { color: colors.textMute }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: colors.textMute }]}>{unit}</Text> : null}
      </View>
      {hint ? <Text style={[styles.hint, { color: colors.textDim }]}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, minWidth: 0 },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  value: { fontFamily: fonts.headingExt, fontSize: 26, letterSpacing: -0.5 },
  unit: { fontFamily: fonts.bodyMed, fontSize: 14, marginLeft: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
});
