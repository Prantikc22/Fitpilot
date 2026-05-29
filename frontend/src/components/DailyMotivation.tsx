import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring 
} from "react-native-reanimated";
import { X, Flame, Trophy, Star, Target, Zap } from "lucide-react-native";
import { colors, fonts, radius } from "@/src/lib/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DailyMotivationProps {
  streak: number;
  healthScore: number;
  userName?: string;
  onClose: () => void;
}

const MOTIVATION_MESSAGES = [
  { min: 0, max: 20, message: "Every journey begins with a single step. You're building something amazing!", icon: "🌱" },
  { min: 21, max: 40, message: "You're making progress! Consistency is the key to transformation.", icon: "📈" },
  { min: 41, max: 60, message: "Halfway there! Your body is adapting. Keep pushing!", icon: "💪" },
  { min: 61, max: 80, message: "Incredible discipline! You're in the top tier of health-conscious people.", icon: "🔥" },
  { min: 81, max: 100, message: "Peak performance! You're an inspiration. Keep dominating!", icon: "🏆" },
];

const STREAK_REWARDS = [
  { days: 3, reward: "Bronze Badge", emoji: "🥉" },
  { days: 7, reward: "Silver Badge", emoji: "🥈" },
  { days: 14, reward: "Gold Badge", emoji: "🥇" },
  { days: 30, reward: "Diamond Status", emoji: "💎" },
  { days: 60, reward: "Legend Status", emoji: "👑" },
];

export function DailyMotivationModal({ streak, healthScore, userName, onClose }: DailyMotivationProps) {
  const [visible, setVisible] = useState(false);

  const pulseScale = useSharedValue(1);
  const starRotation = useSharedValue(0);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
      starRotation.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );
    }
  }, [visible]);

  const checkIfShouldShow = async () => {
    try {
      const lastShown = await AsyncStorage.getItem("lastMotivationShown");
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        await AsyncStorage.setItem("lastMotivationShown", today);
        setTimeout(() => setVisible(true), 1500); // Show after 1.5s on home
      }
    } catch {
      setVisible(true);
    }
  };

  const handleClose = () => {
    setVisible(false);
    onClose();
  };

  const motivationMessage = MOTIVATION_MESSAGES.find(
    m => healthScore >= m.min && healthScore <= m.max
  ) || MOTIVATION_MESSAGES[0];

  const currentBadge = STREAK_REWARDS.filter(r => streak >= r.days).pop();
  const nextBadge = STREAK_REWARDS.find(r => streak < r.days);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(15)} style={styles.container}>
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
            <X color={colors.textMute} size={20} />
          </Pressable>

          {/* Header with greeting */}
          <View style={styles.header}>
            <Animated.View style={starStyle}>
              <Star color={colors.warning} size={24} fill={colors.warning} />
            </Animated.View>
            <Text style={styles.greeting}>
              Good {getTimeOfDay()}, {userName || "Champion"}!
            </Text>
          </View>

          {/* Health Score Display */}
          <Animated.View style={[styles.scoreCircle, pulseStyle]}>
            <Text style={styles.scoreNum}>{healthScore}</Text>
            <Text style={styles.scoreLabel}>Health Score</Text>
          </Animated.View>

          <Text style={styles.motivation}>
            {motivationMessage.icon} {motivationMessage.message}
          </Text>

          {/* Streak Section */}
          <View style={styles.streakSection}>
            <View style={styles.streakBadge}>
              <Flame color={streak > 0 ? "#FF6B35" : colors.textMute} size={28} />
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>

            {currentBadge && (
              <View style={styles.badge}>
                <Text style={{ fontSize: 24 }}>{currentBadge.emoji}</Text>
                <Text style={styles.badgeText}>{currentBadge.reward}</Text>
              </View>
            )}
          </View>

          {nextBadge && (
            <View style={styles.nextGoal}>
              <Target color={colors.brand} size={16} />
              <Text style={styles.nextGoalText}>
                {nextBadge.days - streak} more days to unlock {nextBadge.emoji} {nextBadge.reward}!
              </Text>
            </View>
          )}

          {/* Daily Tips */}
          <View style={styles.tipCard}>
            <Zap color={colors.warning} size={16} />
            <Text style={styles.tipText}>{getDailyTip()}</Text>
          </View>

          <Pressable style={styles.ctaBtn} onPress={handleClose}>
            <Text style={styles.ctaText}>Let's crush today! 💪</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getDailyTip(): string {
  const tips = [
    "Drink a glass of water first thing in the morning to kickstart your metabolism.",
    "Take a 5-minute walk after each meal to improve digestion.",
    "Aim for 7-9 hours of sleep tonight for optimal recovery.",
    "Try eating slowly — it takes 20 minutes for your brain to register fullness.",
    "Add a handful of protein to every meal to stay fuller longer.",
    "Stand up and stretch every hour if you sit at a desk.",
    "Swap one sugary drink for water today.",
    "Practice deep breathing for 2 minutes to reduce stress hormones.",
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return tips[dayOfYear % tips.length];
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.xl,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  greeting: {
    fontFamily: fonts.headingExt,
    fontSize: 20,
    color: colors.text,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreNum: {
    fontFamily: fonts.headingExt,
    fontSize: 32,
    color: "#fff",
  },
  scoreLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  motivation: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  streakSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 16,
  },
  streakBadge: {
    alignItems: "center",
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: radius.lg,
    minWidth: 90,
  },
  streakNum: {
    fontFamily: fonts.headingExt,
    fontSize: 28,
    color: colors.text,
    marginTop: 4,
  },
  streakLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 10,
    color: colors.textMute,
    textTransform: "uppercase",
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.warning + "20",
    padding: 16,
    borderRadius: radius.lg,
    minWidth: 90,
  },
  badgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.warning,
    marginTop: 4,
  },
  nextGoal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
  },
  nextGoalText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.brand,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.bg,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 20,
    width: "100%",
  },
  tipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    flex: 1,
    lineHeight: 19,
  },
  ctaBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: "#fff",
  },
});
