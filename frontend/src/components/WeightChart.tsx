import React, { useMemo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  withDelay,
  FadeIn,
  Easing 
} from "react-native-reanimated";
import { colors, fonts } from "@/src/lib/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Point = { date: string; weight: number };

export function WeightChart({ points, height = 160, goal }: { points: Point[]; height?: number; goal?: number | null }) {
  const w = 320;
  const padX = 16;
  const padY = 24;
  
  // Animation values
  const pathProgress = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);

  useEffect(() => {
    // Reset and animate
    pathProgress.value = 0;
    dotsOpacity.value = 0;
    
    pathProgress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    dotsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, [points]);

  const { path, dots, minV, maxV, areaPath } = useMemo(() => {
    if (!points.length) return { path: "", dots: [], minV: 0, maxV: 0, areaPath: "" };
    const ys = points.map((p) => p.weight);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (goal != null) {
      min = Math.min(min, goal);
      max = Math.max(max, goal);
    }
    
    // IMPROVED: Better Y-axis scaling - ensure at least 3kg visible range
    const range = max - min;
    if (range < 3) {
      const mid = (max + min) / 2;
      min = mid - 1.5;
      max = mid + 1.5;
    } else {
      // Add 10% padding above and below
      const padding = range * 0.1;
      min -= padding;
      max += padding;
    }
    
    const xStep = (w - padX * 2) / Math.max(1, points.length - 1);
    const yScale = (v: number) => padY + (height - padY * 2) * (1 - (v - min) / (max - min));
    const coords = points.map((p, i) => ({ x: padX + xStep * i, y: yScale(p.weight), weight: p.weight }));
    
    // Create smooth curved path using bezier curves
    let d = "";
    if (coords.length === 1) {
      // Single point - just show a dot
      d = `M${coords[0].x},${coords[0].y}`;
    } else {
      // Use smooth curved line
      d = coords
        .map((c, i) => {
          if (i === 0) return `M${c.x},${c.y}`;
          // Quadratic bezier for smooth curves
          const prev = coords[i - 1];
          const cpX = (prev.x + c.x) / 2;
          return `Q${cpX},${prev.y} ${cpX},${(prev.y + c.y) / 2} T${c.x},${c.y}`;
        })
        .join(" ");
    }
    
    // Create area path for gradient fill
    const lastCoord = coords[coords.length - 1];
    const firstCoord = coords[0];
    const area = d + ` L${lastCoord.x},${height - padY} L${firstCoord.x},${height - padY} Z`;
    
    return { path: d, dots: coords, minV: min, maxV: max, areaPath: area };
  }, [points, goal, height]);

  if (!points.length) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Log your weight to see your trend</Text>
      </Animated.View>
    );
  }

  const goalY =
    goal != null && maxV !== minV
      ? padY + (height - padY * 2) * (1 - (goal - minV) / (maxV - minV))
      : null;

  // Calculate weight change for display
  const weightChange = points.length > 1 
    ? points[points.length - 1].weight - points[0].weight 
    : 0;
  const changeText = weightChange !== 0 
    ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` 
    : "";
  const changeColor = weightChange < 0 ? colors.brand : weightChange > 0 ? colors.terracotta : colors.textMute;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      {/* Weight range labels */}
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeText}>{maxV.toFixed(1)} kg</Text>
        <Text style={styles.rangeText}>{minV.toFixed(1)} kg</Text>
      </View>
      
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <LinearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.brandSoft} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="0.2" />
            <Stop offset="1" stopColor={colors.brand} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {/* Goal line */}
        {goalY != null && (
          <Path 
            d={`M${padX},${goalY} L${w - padX},${goalY}`} 
            stroke={colors.terracotta} 
            strokeDasharray="6 4" 
            strokeWidth={1.5} 
            opacity={0.7}
          />
        )}
        
        {/* Area fill under the line */}
        <Path 
          d={areaPath} 
          fill="url(#gradArea)" 
        />
        
        {/* Main line */}
        <Path 
          d={path} 
          stroke="url(#gradLine)" 
          strokeWidth={3} 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Data points */}
        {dots.map((d, i) => (
          <Circle 
            key={i} 
            cx={d.x} 
            cy={d.y} 
            r={i === dots.length - 1 ? 6 : 4} 
            fill={i === dots.length - 1 ? colors.brand : "#fff"}
            stroke={colors.brand}
            strokeWidth={2}
          />
        ))}
        
        {/* Current weight label on last point */}
        {dots.length > 0 && (
          <>
            <Circle 
              cx={dots[dots.length - 1].x} 
              cy={dots[dots.length - 1].y} 
              r={10} 
              fill={colors.brand}
              opacity={0.2}
            />
          </>
        )}
      </Svg>
      
      {/* Stats footer */}
      <View style={styles.statsRow}>
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
        {changeText && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Change</Text>
            <Text style={[styles.statValue, { color: changeColor }]}>{changeText}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textDim, fontSize: 14 },
  rangeLabels: { 
    position: "absolute", 
    left: 0, 
    top: 20, 
    bottom: 20, 
    justifyContent: "space-between",
    zIndex: 1,
  },
  rangeText: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textMute },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  stat: { alignItems: "center" },
  statLabel: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.headingExt, fontSize: 16, color: colors.text, marginTop: 2 },
});
