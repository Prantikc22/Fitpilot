import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Flame, Star, Trophy, Zap, Crown } from "lucide-react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";

interface StreakCelebrationProps {
  streak: number;
  visible: boolean;
  onClose: () => void;
}

const CELEBRATION_EMOJIS = ["🔥", "⭐", "💪", "🎉", "✨", "🏆", "🌟", "💫"];

export function StreakCelebration({ streak, visible, onClose }: StreakCelebrationProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: useSharedValue(0),
    y: useSharedValue(0),
    scale: useSharedValue(0),
    rotation: useSharedValue(0),
    emoji: CELEBRATION_EMOJIS[i % CELEBRATION_EMOJIS.length],
  }));

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12 })
      );
      rotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      
      confettiOpacity.value = withTiming(1, { duration: 500 });
      particles.forEach((particle, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        
        particle.x.value = withDelay(
          i * 50,
          withSpring(Math.cos(angle) * distance, { damping: 10 })
        );
        particle.y.value = withDelay(
          i * 50,
          withSpring(Math.sin(angle) * distance - 50, { damping: 10 })
        );
        particle.scale.value = withDelay(
          i * 50,
          withSequence(
            withSpring(1, { damping: 8 }),
            withDelay(1500, withTiming(0, { duration: 300 }))
          )
        );
        particle.rotation.value = withDelay(
          i * 50,
          withTiming(Math.random() * 360, { duration: 1000, easing: Easing.out(Easing.ease) })
        );
      });
      
      const timeout = setTimeout(() => {
        handleClose();
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onClose)();
    });
    scale.value = withTiming(0.5, { duration: 300 });
    confettiOpacity.value = withTiming(0, { duration: 300 });
    particles.forEach((particle) => {
      particle.scale.value = withTiming(0, { duration: 200 });
    });
  };

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  const getStreakMessage = () => {
    if (streak >= 60) return { text: "LEGENDARY!", subtitle: "60+ days of pure dedication", icon: Crown, color: "#F59E0B" };
    if (streak >= 30) return { text: "MONTHLY MASTER!", subtitle: "30 days strong!", icon: Trophy, color: "#10B981" };
    if (streak >= 14) return { text: "HABIT HERO!", subtitle: "2 weeks of consistency!", icon: Zap, color: "#7C3AED" };
    if (streak >= 7) return { text: "WEEK WARRIOR!", subtitle: "One full week!", icon: Star, color: "#FFD700" };
    if (streak >= 3) return { text: "FIRE STARTER!", subtitle: "3 days and counting!", icon: Flame, color: "#FF6B35" };
    return { text: "STREAK!", subtitle: "Keep it going!", icon: Flame, color: "#FF6B35" };
  };

  const message = getStreakMessage();
  const IconComponent = message.icon;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Animated.View style={[styles.confettiContainer, confettiStyle]}>
          {particles.map((particle) => (
            <Particle key={particle.id} particle={particle} />
          ))}
        </Animated.View>

        <Animated.View style={[styles.badge, badgeStyle, { backgroundColor: colors.bgAlt }]}>
          <View style={[styles.iconCircle, { backgroundColor: message.color + "30" }]}>
            <IconComponent color={message.color} size={40} />
          </View>
          <Text style={[styles.streakNum, { color: message.color }]}>{streak}</Text>
          <Text style={[styles.dayText, { color: colors.textMute }]}>DAY STREAK</Text>
          <Text style={[styles.title, { color: message.color }]}>{message.text}</Text>
          <Text style={[styles.subtitle, { color: colors.textMute }]}>{message.subtitle}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Particle({ particle }: { particle: any }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.x.value },
      { translateY: particle.y.value },
      { scale: particle.scale.value },
      { rotate: `${particle.rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, style]}>
      <Text style={styles.particleEmoji}>{particle.emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  particle: {
    position: "absolute",
  },
  particleEmoji: {
    fontSize: 28,
  },
  badge: {
    borderRadius: radius.xl,
    padding: 32,
    alignItems: "center",
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  streakNum: {
    fontFamily: fonts.headingExt,
    fontSize: 48,
  },
  dayText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: -4,
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
});
