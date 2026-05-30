import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { X, Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, CheckCircle } from "lucide-react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSpring,
  withSequence,
  Easing,
  interpolate,
  useAnimatedProps
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts, radius } from "@/src/lib/theme";
import * as Haptics from "expo-haptics";

// Pose visual icons (emoji-based for universal support)
const POSE_VISUALS: Record<string, { emoji: string; breathCue: string }> = {
  // Standing poses
  "mountain": { emoji: "🧍", breathCue: "Slow, deep breaths through the nose" },
  "tadasana": { emoji: "🧍", breathCue: "Slow, deep breaths through the nose" },
  "forward fold": { emoji: "🙇", breathCue: "Exhale as you fold, relax the neck" },
  "uttanasana": { emoji: "🙇", breathCue: "Exhale as you fold, relax the neck" },
  "warrior": { emoji: "🤺", breathCue: "Strong breath, gaze forward" },
  "virabhadrasana": { emoji: "🤺", breathCue: "Strong breath, gaze forward" },
  "chair": { emoji: "🪑", breathCue: "Breathe steadily, engage core" },
  "utkatasana": { emoji: "🪑", breathCue: "Breathe steadily, engage core" },
  
  // Floor poses
  "cat-cow": { emoji: "🐱", breathCue: "Inhale arch back, exhale round spine" },
  "downward dog": { emoji: "🐕", breathCue: "Push floor away, breathe into back" },
  "adho mukha": { emoji: "🐕", breathCue: "Push floor away, breathe into back" },
  "child": { emoji: "🧒", breathCue: "Slow belly breaths, surrender" },
  "balasana": { emoji: "🧒", breathCue: "Slow belly breaths, surrender" },
  "plank": { emoji: "📐", breathCue: "Steady breath, core engaged" },
  "boat": { emoji: "⛵", breathCue: "Short breaths, core tight" },
  "navasana": { emoji: "⛵", breathCue: "Short breaths, core tight" },
  "bridge": { emoji: "🌉", breathCue: "Inhale lift, exhale lower" },
  "setu bandha": { emoji: "🌉", breathCue: "Inhale lift, exhale lower" },
  
  // Twists and stretches
  "lunge": { emoji: "🏃", breathCue: "Breathe into hip stretch" },
  "anjaneyasana": { emoji: "🏃", breathCue: "Breathe into hip stretch" },
  "pigeon": { emoji: "🕊️", breathCue: "Long exhales, release tension" },
  "eka pada": { emoji: "🕊️", breathCue: "Long exhales, release tension" },
  "twist": { emoji: "🔄", breathCue: "Inhale lengthen, exhale deepen" },
  "locust": { emoji: "🦗", breathCue: "Breathe into chest lift" },
  "salabhasana": { emoji: "🦗", breathCue: "Breathe into chest lift" },
  
  // Relaxation
  "savasana": { emoji: "😴", breathCue: "Natural breath, let go completely" },
  "legs-up": { emoji: "🦵", breathCue: "Effortless breath, soften everywhere" },
  "viparita": { emoji: "🦵", breathCue: "Effortless breath, soften everywhere" },
  
  // Flows
  "sun salutation": { emoji: "☀️", breathCue: "One breath per movement" },
  "side angle": { emoji: "📐", breathCue: "Breathe into side body" },
  "wind-relieving": { emoji: "💨", breathCue: "Gentle belly compression on exhale" },
  
  // Default
  "default": { emoji: "🧘", breathCue: "Breathe naturally and mindfully" },
};

function getPoseVisual(poseName: string): { emoji: string; breathCue: string } {
  const lowerName = poseName.toLowerCase();
  for (const [key, value] of Object.entries(POSE_VISUALS)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return POSE_VISUALS.default;
}

function parseDuration(durationStr: string): number {
  // Parse strings like "60s", "45s each side", "8 rounds", "2 min"
  const lower = durationStr.toLowerCase();
  
  if (lower.includes("min")) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 60 : 60;
  }
  
  if (lower.includes("round")) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 8 : 30; // ~8 sec per round
  }
  
  const secMatch = lower.match(/(\d+)s?/);
  if (secMatch) {
    let secs = parseInt(secMatch[1]);
    // If "each side", we'll run it twice (handled separately)
    if (lower.includes("x2") || lower.includes("x3")) {
      const reps = lower.includes("x3") ? 3 : 2;
      secs = secs * reps;
    }
    return secs;
  }
  
  return 45; // default
}

type Pose = {
  name: string;
  duration: string;
  note: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  sequence: {
    id: string;
    title: string;
    poses: Pose[];
  } | null;
  onComplete: () => void;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function YogaPoseTimer({ visible, onClose, sequence, onComplete }: Props) {
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completed, setCompleted] = useState(false);
  
  const progress = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentPose = sequence?.poses[currentPoseIndex];
  const poseVisual = currentPose ? getPoseVisual(currentPose.name) : POSE_VISUALS.default;
  const totalPoses = sequence?.poses.length || 0;
  
  // Progress ring calculations
  const CIRCLE_LENGTH = 2 * Math.PI * 90;
  
  useEffect(() => {
    if (currentPose && visible) {
      const dur = parseDuration(currentPose.duration);
      setTotalTime(dur);
      setTimeLeft(dur);
      progress.value = 0;
    }
  }, [currentPoseIndex, visible, currentPose]);
  
  // Breathing animation
  useEffect(() => {
    if (isPlaying) {
      // Create breathing rhythm: 4s inhale, 4s exhale
      const breathCycle = () => {
        breathScale.value = withSequence(
          withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        );
      };
      breathCycle();
      breathIntervalRef.current = setInterval(breathCycle, 8000);
    } else {
      breathScale.value = withTiming(1, { duration: 300 });
    }
    
    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [isPlaying]);
  
  // Timer logic
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        progress.value = withTiming(1 - (newTime / totalTime), { duration: 1000 });
        
        if (newTime <= 3 && newTime > 0 && soundEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        if (newTime <= 0) {
          // Move to next pose
          handleNextPose();
        }
        
        return Math.max(0, newTime);
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalTime]);
  
  const handleNextPose = () => {
    if (currentPoseIndex < totalPoses - 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPoseIndex(prev => prev + 1);
    } else {
      // Completed all poses
      setIsPlaying(false);
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const skipPose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    handleNextPose();
  };
  
  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };
  
  const restart = () => {
    setCurrentPoseIndex(0);
    setIsPlaying(false);
    setCompleted(false);
    progress.value = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  
  const handleClose = () => {
    restart();
    onClose();
  };
  
  const handleComplete = () => {
    onComplete();
    handleClose();
  };
  
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));
  
  const progressStyle = useAnimatedStyle(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [CIRCLE_LENGTH, 0]),
  }));
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };
  
  if (!sequence) return null;
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{sequence.title}</Text>
          <Pressable onPress={() => setSoundEnabled(!soundEnabled)} hitSlop={10}>
            {soundEnabled ? <Volume2 size={22} color={colors.text} /> : <VolumeX size={22} color={colors.textMute} />}
          </Pressable>
        </View>
        
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {sequence.poses.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot,
                i < currentPoseIndex && styles.dotCompleted,
                i === currentPoseIndex && styles.dotActive,
              ]} 
            />
          ))}
        </View>
        
        {completed ? (
          /* Completion screen */
          <View style={styles.completedContainer}>
            <Animated.View style={styles.completedBadge}>
              <CheckCircle color={colors.success} size={64} />
            </Animated.View>
            <Text style={styles.completedTitle}>Flow Complete! 🎉</Text>
            <Text style={styles.completedSub}>You finished all {totalPoses} poses</Text>
            <Pressable style={styles.doneBtn} onPress={handleComplete}>
              <Text style={styles.doneBtnText}>Mark as Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Main visual area */}
            <View style={styles.visualArea}>
              {/* Progress Ring */}
              <View style={styles.ringContainer}>
                <Svg width={220} height={220} style={styles.svgRing}>
                  {/* Background circle */}
                  <Circle
                    cx={110}
                    cy={110}
                    r={90}
                    stroke={colors.bgAlt}
                    strokeWidth={8}
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <AnimatedCircle
                    cx={110}
                    cy={110}
                    r={90}
                    stroke={colors.brand}
                    strokeWidth={8}
                    fill="transparent"
                    strokeDasharray={CIRCLE_LENGTH}
                    strokeDashoffset={CIRCLE_LENGTH}
                    strokeLinecap="round"
                    transform="rotate(-90 110 110)"
                    animatedProps={progressStyle}
                  />
                </Svg>
                
                {/* Center content with breathing animation */}
                <Animated.View style={[styles.centerContent, breathStyle]}>
                  <Text style={styles.poseEmoji}>{poseVisual.emoji}</Text>
                  <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
                </Animated.View>
              </View>
              
              {/* Breathing cue */}
              <Animated.View style={[styles.breathCue, breathStyle]}>
                <Text style={styles.breathText}>{poseVisual.breathCue}</Text>
              </Animated.View>
            </View>
            
            {/* Pose info */}
            <View style={styles.poseInfo}>
              <Text style={styles.poseCount}>Pose {currentPoseIndex + 1} of {totalPoses}</Text>
              <Text style={styles.poseName}>{currentPose?.name}</Text>
              <Text style={styles.poseNote}>{currentPose?.note}</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>Hold: {currentPose?.duration}</Text>
              </View>
            </View>
            
            {/* Controls */}
            <View style={styles.controls}>
              <Pressable style={styles.secondaryBtn} onPress={restart}>
                <RotateCcw size={22} color={colors.textMute} />
              </Pressable>
              
              <Pressable style={styles.playBtn} onPress={togglePlay}>
                {isPlaying ? (
                  <Pause size={32} color="#fff" />
                ) : (
                  <Play size={32} color="#fff" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
              
              <Pressable style={styles.secondaryBtn} onPress={skipPose}>
                <SkipForward size={22} color={colors.textMute} />
              </Pressable>
            </View>
          </>
        )}
        
        {/* Upcoming poses preview */}
        {!completed && currentPoseIndex < totalPoses - 1 && (
          <View style={styles.upNext}>
            <Text style={styles.upNextLabel}>Up Next</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sequence.poses.slice(currentPoseIndex + 1, currentPoseIndex + 4).map((pose, i) => (
                <View key={i} style={styles.upNextCard}>
                  <Text style={styles.upNextEmoji}>{getPoseVisual(pose.name).emoji}</Text>
                  <Text style={styles.upNextName} numberOfLines={1}>{pose.name.split("(")[0].trim()}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  progressDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgAlt,
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  dotActive: {
    backgroundColor: colors.brand,
    width: 24,
  },
  visualArea: {
    alignItems: "center",
    paddingVertical: 20,
  },
  ringContainer: {
    width: 220,
    height: 220,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  svgRing: {
    position: "absolute",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  poseEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  timeText: {
    fontFamily: fonts.headingExt,
    fontSize: 36,
    color: colors.text,
  },
  breathCue: {
    marginTop: 20,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  breathText: {
    fontFamily: fonts.bodyMed,
    fontSize: 14,
    color: colors.brand,
  },
  poseInfo: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 16,
  },
  poseCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    marginBottom: 8,
  },
  poseName: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  poseNote: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMute,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  durationBadge: {
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  durationText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.textDim,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 32,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  upNext: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  upNextLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.textMute,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  upNextCard: {
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    minWidth: 80,
  },
  upNextEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  upNextName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMute,
    maxWidth: 80,
  },
  // Completed screen
  completedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  completedBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  completedTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 28,
    color: colors.text,
    marginBottom: 8,
  },
  completedSub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textMute,
    marginBottom: 32,
  },
  doneBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
  },
  doneBtnText: {
    fontFamily: fonts.headingExt,
    fontSize: 16,
    color: "#fff",
  },
});
