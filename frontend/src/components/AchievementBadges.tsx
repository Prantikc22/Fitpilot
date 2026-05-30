import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Trophy, Flame, Target, Heart, Zap, Crown, Star, Award, Medal, CheckCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";

const BADGES = [
  { id: "first_scan", name: "First Bite", desc: "Log your first meal", icon: Target, color: "#10B981" },
  { id: "streak_3", name: "Fire Starter", desc: "3 day streak", icon: Flame, color: "#FF6B35" },
  { id: "streak_7", name: "Week Warrior", desc: "7 day streak", icon: Star, color: "#FFD700" },
  { id: "streak_14", name: "Habit Hero", desc: "14 day streak", icon: Zap, color: "#7C3AED" },
  { id: "streak_30", name: "Monthly Master", desc: "30 day streak", icon: Trophy, color: "#F59E0B" },
  { id: "protein_pro", name: "Protein Pro", desc: "Hit protein 7 days", icon: Award, color: "#EF4444" },
  { id: "calorie_king", name: "Calorie King", desc: "Under target 7 days", icon: Crown, color: "#8B5CF6" },
  { id: "hydration_hero", name: "Hydration Hero", desc: "2.5L water 7 days", icon: Heart, color: "#3B82F6" },
  { id: "yoga_master", name: "Yoga Master", desc: "Complete 10 sessions", icon: Medal, color: "#14B8A6" },
  { id: "weight_goal", name: "Goal Crusher", desc: "Reach your goal weight", icon: CheckCircle, color: "#22C55E" },
];

type Props = {
  earned: string[]; // IDs of earned badges
  onBadgePress?: (badgeId: string) => void;
};

export function AchievementBadges({ earned, onBadgePress }: Props) {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Trophy color={colors.warning} size={18} />
        <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
        <Text style={[styles.count, { color: colors.textMute }]}>{earned.length}/{BADGES.length}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {BADGES.map((badge, i) => {
          const isEarned = earned.includes(badge.id);
          const Icon = badge.icon;
          return (
            <Animated.View key={badge.id} entering={FadeInDown.delay(i * 50).duration(300)}>
              <Pressable
                style={[styles.badge, !isEarned && styles.badgeLocked]}
                onPress={() => onBadgePress?.(badge.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: isEarned ? badge.color + "20" : colors.bgAlt }]}>
                  <Icon color={isEarned ? badge.color : colors.textDim} size={22} />
                </View>
                <Text style={[styles.badgeName, { color: isEarned ? colors.text : colors.textMute }]}>
                  {badge.name}
                </Text>
                {isEarned && (
                  <View style={[styles.earnedDot, { backgroundColor: colors.success }]}>
                    <CheckCircle color="#fff" size={10} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function BadgeDetail({ badgeId }: { badgeId: string }) {
  const { colors } = useTheme();
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return null;
  const Icon = badge.icon;
  
  return (
    <View style={styles.detailCard}>
      <View style={[styles.detailIcon, { backgroundColor: badge.color + "20" }]}>
        <Icon color={badge.color} size={32} />
      </View>
      <Text style={[styles.detailName, { color: colors.text }]}>{badge.name}</Text>
      <Text style={[styles.detailDesc, { color: colors.textMute }]}>{badge.desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    flex: 1,
  },
  count: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  scroll: {
    paddingHorizontal: 0,
    gap: 12,
  },
  badge: {
    alignItems: "center",
    width: 80,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  earnedDot: {
    position: "absolute",
    top: 0,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    alignItems: "center",
    padding: 24,
  },
  detailIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  detailName: {
    fontFamily: fonts.headingExt,
    fontSize: 20,
  },
  detailDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
});
