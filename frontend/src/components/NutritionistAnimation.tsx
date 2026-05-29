import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ChefHat, Loader2 } from "lucide-react-native";
import { colors, fonts } from "@/src/lib/theme";

const STEPS = [
  "Reviewing your goals and preferences…",
  "Checking your cuisine, budget and allergies…",
  "Designing balanced meals for your macros…",
  "Selecting recipes you'll actually enjoy…",
  "Plating it up — almost ready…",
];

export function NutritionistAnimation({
  visible,
  onClose,
  durationMs = 12000,
}: {
  visible: boolean;
  onClose?: () => void;
  durationMs?: number;
}) {
  const [active, setActive] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setActive(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    const step = Math.max(1500, Math.floor(durationMs / STEPS.length));
    const id = setInterval(() => setActive((i) => Math.min(STEPS.length - 1, i + 1)), step);
    return () => {
      clearInterval(id);
      loop.stop();
    };
  }, [visible, durationMs, fade, spin]);

  if (!visible) return null;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.bg, { opacity: fade }]}>
      <View style={styles.card}>
        <View style={styles.iconHalo}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
            <Loader2 color={colors.brand} size={22} />
          </Animated.View>
          <ChefHat color={colors.brand} size={36} />
        </View>
        <Text style={styles.title}>Your nutritionist is preparing your plan</Text>
        <Text style={styles.subtitle}>Hang tight — this takes about 15 seconds.</Text>

        <View style={styles.steps}>
          {STEPS.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "todo";
            return (
              <View key={i} style={styles.stepRow}>
                {state === "done" ? (
                  <CheckCircle2 color={colors.success} size={18} />
                ) : (
                  <View
                    style={[
                      styles.dot,
                      state === "active" && { backgroundColor: colors.brand, borderColor: colors.brand },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.stepText,
                    state === "done" && { color: colors.text },
                    state === "todo" && { color: colors.textDim },
                  ]}
                >
                  {s}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: "rgba(20,24,22,0.55)", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 },
  card: { backgroundColor: colors.bgAlt, borderRadius: 28, padding: 24, width: "100%", maxWidth: 380 },
  iconHalo: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  spinner: { position: "absolute", width: 80, height: 80, alignItems: "flex-end", justifyContent: "center", paddingRight: 4 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text, textAlign: "center", marginTop: 16, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.body, color: colors.textMute, textAlign: "center", marginTop: 6, fontSize: 13 },
  steps: { marginTop: 18, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "transparent" },
  stepText: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.textMute, flex: 1, lineHeight: 19 },
});
