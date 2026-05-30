import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Flame, Trophy, Star, Crown, Zap } from "lucide-react-native";
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withSequence, withDelay } from "react-native-reanimated";
import { colors, fonts } from "@/src/lib/theme";

const MILESTONES = [
  { days: 3, label: "Fire Starter", icon: Flame, color: "#FF6B35" },
  { days: 7, label: "Week Warrior", icon: Star, color: "#FFD700" },
  { days: 14, label: "Habit Hero", icon: Zap, color: "#7C3AED" },
  { days: 30, label: "Monthly Master", icon: Trophy, color: "#10B981" },
  { days: 60, label: "Elite Champion", icon: Crown, color: "#F59E0B" },
];

type Props = {
  streak: number;
  compact?: boolean;
};

export function StreakBadge({ streak, compact = false }: Props) {
  const scale = useSharedValue(1);
  
  const currentMilestone = [...MILESTONES].reverse().find(m => streak >= m.days);
  const nextMilestone = MILESTONES.find(m => m.days > streak);
  
  const Icon = currentMilestone?.icon || Flame;
  const badgeColor = currentMilestone?.color || colors.textMute;
  
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (compact) {
    return (
      <View style={styles.compact}>
        <Flame color={streak > 0 ? "#FF6B35" : colors.textMute} size={16} />
        <Text style={styles.compactText}>{streak}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View style={[styles.iconWrap, { backgroundColor: badgeColor + "20" }]}>
        <Icon color={badgeColor} size={28} />
      </View>
      <View style={styles.info}>
        <Text style={styles.streakNum}>{streak} day streak</Text>
        {currentMilestone && (
          <Text style={[styles.label, { color: badgeColor }]}>{currentMilestone.label}</Text>
        )}
        {nextMilestone && (
          <Text style={styles.hint}>
            {nextMilestone.days - streak} days to {nextMilestone.label}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  streakNum: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    marginTop: 2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 2,
  },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compactText: {
    fontFamily: fonts.headingExt,
    fontSize: 14,
    color: "#FF6B35",
  },
});
