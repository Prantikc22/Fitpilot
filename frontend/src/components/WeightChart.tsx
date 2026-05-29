import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, fonts } from "@/src/lib/theme";

export type Point = { date: string; weight: number };

export function WeightChart({ points, height = 160, goal }: { points: Point[]; height?: number; goal?: number | null }) {
  const w = 320;
  const padX = 16;
  const padY = 24;

  const { path, dots, minV, maxV, lastY } = useMemo(() => {
    if (!points.length) return { path: "", dots: [], minV: 0, maxV: 0, lastY: 0 };
    const ys = points.map((p) => p.weight);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (goal != null) {
      min = Math.min(min, goal);
      max = Math.max(max, goal);
    }
  if (max - min < 1.5) {
      // ensure a visible slope even if weight history is flat — center the value in the band
      const mid = (max + min) / 2;
      min = mid - 1.5;
      max = mid + 1.5;
    }
    const xStep = (w - padX * 2) / Math.max(1, points.length - 1);
    const yScale = (v: number) => padY + (height - padY * 2) * (1 - (v - min) / (max - min));
    const coords = points.map((p, i) => ({ x: padX + xStep * i, y: yScale(p.weight) }));
    const d = coords
      .map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`))
      .join(" ");
    return { path: d, dots: coords, minV: min, maxV: max, lastY: coords[coords.length - 1]?.y || 0 };
  }, [points, goal, height]);

  if (!points.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Log your weight to see your trend</Text>
      </View>
    );
  }

  const goalY =
    goal != null && maxV !== minV
      ? padY + (height - padY * 2) * (1 - (goal - minV) / (maxV - minV))
      : null;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <LinearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.brandSoft} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {goalY != null && (
          <Path d={`M${padX},${goalY} L${w - padX},${goalY}`} stroke={colors.terracotta} strokeDasharray="4 4" strokeWidth={1.5} />
        )}
        <Path d={path} stroke="url(#gradLine)" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={i === dots.length - 1 ? 5 : 3} fill={colors.brand} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14 },
});
