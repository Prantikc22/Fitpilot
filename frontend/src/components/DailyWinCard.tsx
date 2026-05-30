import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming
} from "react-native-reanimated";
import { Trophy, Sparkles, TrendingUp, Award, Gift } from "lucide-react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";

interface DailyWinProps {
  todayCalories: number;
  todayProtein: number;
  calorieTarget: number;
  proteinTarget: number;
  waterMl: number;
  steps: number;
  exerciseDone: boolean;
  streak: number;
  yesterdayCalories?: number;
  yesterdayProtein?: number;
}

type WinType = {
  title: string;
  description: string;
  icon: "trophy" | "sparkles" | "trending" | "award" | "gift";
  color: string;
};

export function DailyWinCard({
  todayCalories,
  todayProtein,
  calorieTarget,
  proteinTarget,
  waterMl,
  steps,
  exerciseDone,
  streak,
  yesterdayCalories,
  yesterdayProtein,
}: DailyWinProps) {
  const { colors } = useTheme();
  const [win, setWin] = useState<WinType | null>(null);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    // Determine the best win to show
    const wins: WinType[] = [];

    // Protein wins
    if (todayProtein >= 30) {
      wins.push({
        title: "Protein Champion! 💪",
        description: `You've hit ${todayProtein}g protein${yesterdayProtein ? ` — ${todayProtein > yesterdayProtein ? "better than" : "same as"} yesterday!` : " already!"}`,
        icon: "award",
        color: colors.terracotta,
      });
    }

    // Calorie discipline
    if (todayCalories > 0 && todayCalories <= calorieTarget) {
      const remaining = calorieTarget - todayCalories;
      wins.push({
        title: "Staying on Track! 🎯",
        description: `${remaining} cal left today — you're crushing it!`,
        icon: "trophy",
        color: colors.success,
      });
    }

    // Water wins
    if (waterMl >= 2000) {
      wins.push({
        title: "Hydration Hero! 💧",
        description: `${(waterMl / 1000).toFixed(1)}L water — your body thanks you!`,
        icon: "sparkles",
        color: colors.info,
      });
    }

    // Exercise win
    if (exerciseDone) {
      wins.push({
        title: "Movement Made! 🏃",
        description: "Exercise logged today — endorphins activated!",
        icon: "trending",
        color: colors.brand,
      });
    }

    // Streak wins
    if (streak >= 3) {
      wins.push({
        title: `${streak} Day Streak! 🔥`,
        description: "Consistency is your superpower. Keep going!",
        icon: "gift",
        color: colors.warning,
      });
    }

    // Steps wins
    if (steps >= 5000) {
      wins.push({
        title: "Step Star! 👟",
        description: `${steps.toLocaleString()} steps — every step counts!`,
        icon: "trending",
        color: colors.brand,
      });
    }

    // Show random win from available ones
    if (wins.length > 0) {
      const randomWin = wins[Math.floor(Math.random() * wins.length)];
      setWin(randomWin);
    } else {
      // Default encouraging message
      setWin({
        title: "New Day, New Wins! ✨",
        description: "Log your first meal to unlock today's win!",
        icon: "sparkles",
        color: colors.brand,
      });
    }
  }, [todayCalories, todayProtein, waterMl, steps, exerciseDone, streak, colors]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.3,
  }));

  const IconComponent = {
    trophy: Trophy,
    sparkles: Sparkles,
    trending: TrendingUp,
    award: Award,
    gift: Gift,
  }[win?.icon || "sparkles"];

  if (!win) return null;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <View style={[styles.card, { backgroundColor: colors.bgAlt, borderLeftColor: win.color }]}>
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle, { backgroundColor: colors.brandLight }]} />
        <View style={[styles.iconWrap, { backgroundColor: win.color + "20" }]}>
          <IconComponent color={win.color} size={22} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{win.title}</Text>
          <Text style={[styles.description, { color: colors.textMute }]}>{win.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
