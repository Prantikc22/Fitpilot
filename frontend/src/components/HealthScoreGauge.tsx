import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts } from "@/src/lib/theme";

export function HealthScoreGauge({ value, label = "Health Score" }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = useMemo(() => {
    if (v >= 75) return colors.success;
    if (v >= 50) return colors.warning;
    return colors.terracotta;
  }, [v]);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.brandLight} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.value} testID="health-score-value">
          {v}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  value: { fontFamily: fonts.headingExt, fontSize: 36, color: colors.text, letterSpacing: -1 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6 },
});
