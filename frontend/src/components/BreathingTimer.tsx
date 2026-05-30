import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { X, Play, Pause, RotateCcw } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";
import * as Haptics from "expo-haptics";

const PATTERNS = [
  { id: "box", name: "Box Breathing", inhale: 4, hold1: 4, exhale: 4, hold2: 4, desc: "Calm & focus" },
  { id: "478", name: "4-7-8 Relax", inhale: 4, hold1: 7, exhale: 8, hold2: 0, desc: "Deep relaxation" },
  { id: "energize", name: "Energizer", inhale: 3, hold1: 0, exhale: 3, hold2: 0, desc: "Quick energy boost" },
];

type Phase = "inhale" | "hold1" | "exhale" | "hold2" | "idle";
const PHASE_LABELS: Record<Phase, string> = {
  inhale: "Breathe In",
  hold1: "Hold",
  exhale: "Breathe Out",
  hold2: "Hold",
  idle: "Ready",
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function BreathingTimer({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycles, setCycles] = useState(0);
  
  const scale = useSharedValue(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const totalCycleTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;

  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      return;
    }
    
    if (phase === "inhale") {
      scale.value = withTiming(1.4, { duration: pattern.inhale * 1000, easing: Easing.inOut(Easing.ease) });
    } else if (phase === "exhale") {
      scale.value = withTiming(1, { duration: pattern.exhale * 1000, easing: Easing.inOut(Easing.ease) });
    }
  }, [phase, isActive]);

  useEffect(() => {
    if (!isActive) return;
    
    const runCycle = () => {
      const phases: { phase: Phase; duration: number }[] = [
        { phase: "inhale", duration: pattern.inhale },
        ...(pattern.hold1 > 0 ? [{ phase: "hold1" as Phase, duration: pattern.hold1 }] : []),
        { phase: "exhale", duration: pattern.exhale },
        ...(pattern.hold2 > 0 ? [{ phase: "hold2" as Phase, duration: pattern.hold2 }] : []),
      ];
      
      let currentPhaseIndex = 0;
      let phaseElapsed = 0;
      
      intervalRef.current = setInterval(() => {
        if (currentPhaseIndex >= phases.length) {
          currentPhaseIndex = 0;
          phaseElapsed = 0;
          setCycles(c => c + 1);
        }
        
        const currentPhase = phases[currentPhaseIndex];
        setPhase(currentPhase.phase);
        setTimeLeft(currentPhase.duration - phaseElapsed);
        
        phaseElapsed++;
        if (phaseElapsed > currentPhase.duration) {
          currentPhaseIndex++;
          phaseElapsed = 0;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 1000);
    };
    
    runCycle();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, pattern]);

  const toggleActive = () => {
    if (isActive) {
      setIsActive(false);
      setPhase("idle");
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsActive(true);
      setCycles(0);
    }
  };

  const reset = () => {
    setIsActive(false);
    setPhase("idle");
    setCycles(0);
    setTimeLeft(0);
    scale.value = 1;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Breathing Exercise</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.patternPicker}>
          {PATTERNS.map(p => (
            <Pressable
              key={p.id}
              style={[
                styles.patternBtn, 
                { backgroundColor: colors.bgAlt },
                pattern.id === p.id && { borderColor: colors.brand, backgroundColor: colors.brandLight }
              ]}
              onPress={() => { setPattern(p); reset(); }}
            >
              <Text style={[styles.patternName, { color: pattern.id === p.id ? colors.brand : colors.text }]}>
                {p.name}
              </Text>
              <Text style={[styles.patternDesc, { color: colors.textMute }]}>{p.desc}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.visualWrap}>
          <Animated.View style={[styles.circle, circleStyle, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
            <Text style={[styles.phaseLabel, { color: colors.brand }]}>{PHASE_LABELS[phase]}</Text>
            {isActive && <Text style={[styles.timer, { color: colors.brand }]}>{timeLeft}s</Text>}
          </Animated.View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{cycles}</Text>
            <Text style={[styles.statLabel, { color: colors.textMute }]}>Cycles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalCycleTime}s</Text>
            <Text style={[styles.statLabel, { color: colors.textMute }]}>Per cycle</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable style={[styles.resetBtn, { backgroundColor: colors.bgAlt }]} onPress={reset}>
            <RotateCcw color={colors.textMute} size={20} />
          </Pressable>
          <Pressable style={[styles.playBtn, { backgroundColor: colors.brand }]} onPress={toggleActive}>
            {isActive ? <Pause color="#fff" size={28} /> : <Play color="#fff" size={28} />}
          </Pressable>
          <View style={{ width: 48 }} />
        </View>

        <Text style={[styles.hint, { color: colors.textMute }]}>
          Find a comfortable position. Follow the expanding circle as you breathe.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.headingExt,
    fontSize: 22,
  },
  patternPicker: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },
  patternBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  patternName: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  patternDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  visualWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseLabel: {
    fontFamily: fonts.headingExt,
    fontSize: 20,
  },
  timer: {
    fontFamily: fonts.heading,
    fontSize: 48,
    marginTop: 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 30,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.headingExt,
    fontSize: 24,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
