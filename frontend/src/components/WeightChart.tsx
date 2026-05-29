import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Line, G } from "react-native-svg";
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  withDelay,
  withSpring,
  FadeIn,
  FadeInDown,
  Easing,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { colors, fonts } from "@/src/lib/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Point = { date: string; weight: number };

export function WeightChart({ points, height = 180, goal }: { points: Point[]; height?: number; goal?: number | null }) {
  const w = 320;
  const padX = 40;
  const padY = 28;
  
  // Animation values
  const pathProgress = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);
  const chartScale = useSharedValue(0.95);

  useEffect(() => {
    // Reset and animate
    pathProgress.value = 0;
    dotsOpacity.value = 0;
    chartScale.value = 0.95;
    
    pathProgress.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
    dotsOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    chartScale.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, [points]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chartScale.value }],
    opacity: interpolate(chartScale.value, [0.95, 1], [0, 1]),
  }));

  const { path, dots, minV, maxV, areaPath, yLabels } = useMemo(() => {
    if (!points.length) return { path: "", dots: [], minV: 0, maxV: 0, areaPath: "", yLabels: [] };
    
    // Filter out invalid points
    const validPoints = points.filter(p => p.weight > 0 && !isNaN(p.weight));
    if (!validPoints.length) return { path: "", dots: [], minV: 0, maxV: 0, areaPath: "", yLabels: [] };
    
    const ys = validPoints.map((p) => p.weight);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    
    if (goal != null && goal > 0) {
      min = Math.min(min, goal);
      max = Math.max(max, goal);
    }
    
    // CRITICAL FIX: Better Y-axis scaling to prevent straight line
    const range = max - min;
    
    if (range < 0.5) {
      // Very small range - expand significantly to show variation
      const mid = (max + min) / 2;
      min = mid - 2;
      max = mid + 2;
    } else if (range < 2) {
      // Small range - expand to at least 4kg visible
      const mid = (max + min) / 2;
      min = mid - 2;
      max = mid + 2;
    } else if (range < 5) {
      // Medium range - add 20% padding
      const padding = range * 0.25;
      min -= padding;
      max += padding;
    } else {
      // Large range - add 10% padding
      const padding = range * 0.15;
      min -= padding;
      max += padding;
    }
    
    // Round to nice values
    min = Math.floor(min * 2) / 2;
    max = Math.ceil(max * 2) / 2;
    
    const finalRange = max - min;
    const xStep = (w - padX * 2) / Math.max(1, validPoints.length - 1);
    const yScale = (v: number) => padY + (height - padY * 2) * (1 - (v - min) / finalRange);
    const coords = validPoints.map((p, i) => ({ x: padX + xStep * i, y: yScale(p.weight), weight: p.weight, date: p.date }));
    
    // Create smooth curved path using bezier curves
    let d = "";
    if (coords.length === 1) {
      // Single point - just show a dot, no path
      d = "";
    } else {
      // Use catmull-rom to bezier conversion for smooth curves
      d = coords
        .map((c, i) => {
          if (i === 0) return `M${c.x.toFixed(1)},${c.y.toFixed(1)}`;
          
          const prev = coords[i - 1];
          
          // Simple smooth line with control points
          const cpX = (prev.x + c.x) / 2;
          const cpY1 = prev.y;
          const cpY2 = c.y;
          
          return `C${cpX.toFixed(1)},${cpY1.toFixed(1)} ${cpX.toFixed(1)},${cpY2.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
        })
        .join(" ");
    }
    
    // Create area path for gradient fill
    let area = "";
    if (coords.length > 1) {
      const lastCoord = coords[coords.length - 1];
      const firstCoord = coords[0];
      area = d + ` L${lastCoord.x.toFixed(1)},${height - padY} L${firstCoord.x.toFixed(1)},${height - padY} Z`;
    }
    
    // Generate Y-axis labels (3-4 labels)
    const labelCount = 4;
    const labels: { value: number; y: number }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const value = min + (finalRange * i) / (labelCount - 1);
      labels.push({ value, y: yScale(value) });
    }
    
    return { path: d, dots: coords, minV: min, maxV: max, areaPath: area, yLabels: labels };
  }, [points, goal, height]);

  if (!points.length || !dots.length) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Log your weight to see your trend</Text>
        <Text style={styles.emptyHint}>Tap Profile → Log Weight to start tracking</Text>
      </Animated.View>
    );
  }

  const goalY =
    goal != null && maxV !== minV
      ? padY + (height - padY * 2) * (1 - (goal - minV) / (maxV - minV))
      : null;

  // Calculate weight change for display
  const weightChange = dots.length > 1 
    ? dots[dots.length - 1].weight - dots[0].weight 
    : 0;
  const changeText = weightChange !== 0 
    ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` 
    : "—";
  const changeColor = weightChange < 0 ? colors.success : weightChange > 0 ? colors.terracotta : colors.textMute;

  return (
    <Animated.View entering={FadeInDown.springify().damping(15)} style={containerStyle}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <LinearGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.success} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="0.15" />
            <Stop offset="1" stopColor={colors.brand} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {/* Y-axis labels and grid lines */}
        <G opacity={0.4}>
          {yLabels.map((label, i) => (
            <G key={i}>
              <Line
                x1={padX}
                y1={label.y}
                x2={w - padX / 2}
                y2={label.y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            </G>
          ))}
        </G>
        
        {/* Goal line */}
        {goalY != null && goalY > padY && goalY < height - padY && (
          <G>
            <Path 
              d={`M${padX},${goalY} L${w - padX / 2},${goalY}`} 
              stroke={colors.terracotta} 
              strokeDasharray="6 4" 
              strokeWidth={2} 
              opacity={0.7}
            />
          </G>
        )}
        
        {/* Area fill under the line */}
        {areaPath && (
          <Path 
            d={areaPath} 
            fill="url(#gradArea)" 
          />
        )}
        
        {/* Main line */}
        {path && (
          <Path 
            d={path} 
            stroke="url(#gradLine)" 
            strokeWidth={3} 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}
        
        {/* Data points */}
        {dots.map((d, i) => (
          <G key={i}>
            {/* Outer glow for last point */}
            {i === dots.length - 1 && (
              <Circle 
                cx={d.x} 
                cy={d.y} 
                r={12} 
                fill={colors.brand}
                opacity={0.15}
              />
            )}
            <Circle 
              cx={d.x} 
              cy={d.y} 
              r={i === dots.length - 1 ? 7 : 4} 
              fill={i === dots.length - 1 ? colors.brand : "#fff"}
              stroke={colors.brand}
              strokeWidth={i === dots.length - 1 ? 3 : 2}
            />
          </G>
        ))}
      </Svg>
      
      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        {yLabels.map((label, i) => (
          <Text key={i} style={[styles.yLabel, { top: label.y - 6 }]}>
            {label.value.toFixed(1)}
          </Text>
        ))}
      </View>
      
      {/* Stats footer */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{dots[dots.length - 1]?.weight.toFixed(1)} kg</Text>
        </View>
        {goal && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={[styles.statValue, { color: colors.terracotta }]}>{goal.toFixed(1)} kg</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Change</Text>
          <Text style={[styles.statValue, { color: changeColor }]}>{changeText}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Entries</Text>
          <Text style={styles.statValue}>{dots.length}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", backgroundColor: colors.bgWarm, borderRadius: 16, padding: 20 },
  emptyText: { fontFamily: fonts.bodySemi, color: colors.textMute, fontSize: 14 },
  emptyHint: { fontFamily: fonts.body, color: colors.textDim, fontSize: 12, marginTop: 4 },
  yAxisLabels: { 
    position: "absolute", 
    left: 0, 
    top: 0, 
    bottom: 0,
    width: 36,
  },
  yLabel: { 
    position: "absolute",
    left: 0,
    fontFamily: fonts.bodyMed, 
    fontSize: 10, 
    color: colors.textMute,
  },
  statsRow: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: colors.border,
  },
  stat: { alignItems: "center" },
  statLabel: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.headingExt, fontSize: 15, color: colors.text, marginTop: 2 },
});
