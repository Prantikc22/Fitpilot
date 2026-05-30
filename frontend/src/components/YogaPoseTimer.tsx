import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { X, Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, CheckCircle } from "lucide-react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
  useAnimatedProps
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";
import * as Haptics from "expo-haptics";

const POSE_VISUALS: Record<string, { emoji: string; breathCue: string }> = {
  "mountain": { emoji: "🧍", breathCue: "Slow, deep breaths through the nose" },
  "tadasana": { emoji: "🧍", breathCue: "Slow, deep breaths through the nose" },
  "forward fold": { emoji: "🙇", breathCue: "Exhale as you fold, relax the neck" },
  "uttanasana": { emoji: "🙇", breathCue: "Exhale as you fold, relax the neck" },
  "warrior": { emoji: "🤺", breathCue: "Strong breath, gaze forward" },
  "virabhadrasana": { emoji: "🤺", breathCue: "Strong breath, gaze forward" },
  "chair": { emoji: "🪑", breathCue: "Breathe steadily, engage core" },
  "utkatasana": { emoji: "🪑", breathCue: "Breathe steadily, engage core" },
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
  "lunge": { emoji: "🏃", breathCue: "Breathe into hip stretch" },
  "anjaneyasana": { emoji: "🏃", breathCue: "Breathe into hip stretch" },
  "pigeon": { emoji: "🕊️", breathCue: "Long exhales, release tension" },
  "eka pada": { emoji: "🕊️", breathCue: "Long exhales, release tension" },
  "twist": { emoji: "🔄", breathCue: "Inhale lengthen, exhale deepen" },
  "locust": { emoji: "🦗", breathCue: "Breathe into chest lift" },
  "salabhasana": { emoji: "🦗", breathCue: "Breathe into chest lift" },
  "savasana": { emoji: "😴", breathCue: "Natural breath, let go completely" },
  "legs-up": { emoji: "🦵", breathCue: "Effortless breath, soften everywhere" },
  "viparita": { emoji: "🦵", breathCue: "Effortless breath, soften everywhere" },
  "sun salutation": { emoji: "☀️", breathCue: "One breath per movement" },
  "side angle": { emoji: "📐", breathCue: "Breathe into side body" },
  "wind-relieving": { emoji: "💨", breathCue: "Gentle belly compression on exhale" },
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
  const lower = durationStr.toLowerCase();
  
  if (lower.includes("min")) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 60 : 60;
  }
  
  if (lower.includes("round")) {
    const match = lower.match(/(\d+)/);
    return match ? parseInt(match[1]) * 8 : 30;
  }
  
  const secMatch = lower.match(/(\d+)s?/);
  if (secMatch) {
    let secs = parseInt(secMatch[1]);
    if (lower.includes("x2") || lower.includes("x3")) {
      const reps = lower.includes("x3") ? 3 : 2;
      secs = secs * reps;
    }
    return secs;
  }
  
  return 45;
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
  const { colors } = useTheme();
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
  
  const CIRCLE_LENGTH = 2 * Math.PI * 90;
  
  useEffect(() => {
    if (currentPose && visible) {
      const dur = parseDuration(currentPose.duration);
      setTotalTime(dur);
      setTimeLeft(dur);
      progress.value = 0;
    }
  }, [currentPoseIndex, visible, currentPose]);
  
  useEffect(() => {
    if (isPlaying) {
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
  
  const progressStyle = useAnimatedProps(() => ({
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
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{sequence.title}</Text>
          <Pressable onPress={() => setSoundEnabled(!soundEnabled)} hitSlop={10}>
            {soundEnabled ? <Volume2 size={22} color={colors.text} /> : <VolumeX size={22} color={colors.textMute} />}
          </Pressable>
        </View>
        
        <View style={styles.progressDots}>
          {sequence.poses.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot,
                { backgroundColor: colors.bgAlt },
                i < currentPoseIndex && { backgroundColor: colors.success },
                i === currentPoseIndex && { backgroundColor: colors.brand, width: 24 },
              ]} 
            />
          ))}
        </View>
        
        {completed ? (
          <View style={styles.completedContainer}>
            <Animated.View style={[styles.completedBadge, { backgroundColor: colors.success + "20" }]}>
              <CheckCircle color={colors.success} size={64} />
            </Animated.View>
            <Text style={[styles.completedTitle, { color: colors.text }]}>Flow Complete! 🎉</Text>
            <Text style={[styles.completedSub, { color: colors.textMute }]}>You finished all {totalPoses} poses</Text>
            <Pressable style={[styles.doneBtn, { backgroundColor: colors.brand }]} onPress={handleComplete}>
              <Text style={styles.doneBtnText}>Mark as Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.visualArea}>
              <View style={styles.ringContainer}>
                <Svg width={220} height={220} style={styles.svgRing}>
                  <Circle
                    cx={110}
                    cy={110}
                    r={90}
                    stroke={colors.bgAlt}
                    strokeWidth={8}
                    fill="transparent"
                  />
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
                
                <Animated.View style={[styles.centerContent, breathStyle]}>
                  <Text style={styles.poseEmoji}>{poseVisual.emoji}</Text>
                  <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
                </Animated.View>
              </View>
              
              <Animated.View style={[styles.breathCue, breathStyle, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.breathText, { color: colors.brand }]}>{poseVisual.breathCue}</Text>
              </Animated.View>
            </View>
            
            <View style={styles.poseInfo}>
              <Text style={[styles.poseCount, { color: colors.textMute }]}>Pose {currentPoseIndex + 1} of {totalPoses}</Text>
              <Text style={[styles.poseName, { color: colors.text }]}>{currentPose?.name}</Text>
              <Text style={[styles.poseNote, { color: colors.textMute }]}>{currentPose?.note}</Text>
              <View style={[styles.durationBadge, { backgroundColor: colors.bgAlt }]}>
                <Text style={[styles.durationText, { color: colors.textDim }]}>Hold: {currentPose?.duration}</Text>
              </View>
            </View>
            
            <View style={styles.controls}>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: colors.bgAlt }]} onPress={restart}>
                <RotateCcw size={22} color={colors.textMute} />
              </Pressable>
              
              <Pressable style={[styles.playBtn, { backgroundColor: colors.brand }]} onPress={togglePlay}>
                {isPlaying ? (
                  <Pause size={32} color="#fff" />
                ) : (
                  <Play size={32} color="#fff" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
              
              <Pressable style={[styles.secondaryBtn, { backgroundColor: colors.bgAlt }]} onPress={skipPose}>
                <SkipForward size={22} color={colors.textMute} />
              </Pressable>
            </View>
          </>
        )}
        
        {!completed && currentPoseIndex < totalPoses - 1 && (
          <View style={styles.upNext}>
            <Text style={[styles.upNextLabel, { color: colors.textMute }]}>Up Next</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sequence.poses.slice(currentPoseIndex + 1, currentPoseIndex + 4).map((pose, i) => (
                <View key={i} style={[styles.upNextCard, { backgroundColor: colors.bgAlt }]}>
                  <Text style={styles.upNextEmoji}>{getPoseVisual(pose.name).emoji}</Text>
                  <Text style={[styles.upNextName, { color: colors.textMute }]} numberOfLines={1}>{pose.name.split("(")[0].trim()}</Text>
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
  },
  breathCue: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  breathText: {
    fontFamily: fonts.bodyMed,
    fontSize: 14,
  },
  poseInfo: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 16,
  },
  poseCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  poseName: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  poseNote: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  durationBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  durationText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
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
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  upNextCard: {
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
    maxWidth: 80,
  },
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  completedTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 28,
    marginBottom: 8,
  },
  completedSub: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 32,
  },
  doneBtn: {
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
