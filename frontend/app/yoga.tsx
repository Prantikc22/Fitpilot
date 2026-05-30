import React, { useState, useEffect, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Image, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Clock, Crown, Play, CheckCircle, Flame, Trophy, Star, Wind } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withSequence, withDelay } from "react-native-reanimated";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, lightColors } from "@/src/contexts/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { ProLockCard } from "@/src/components/ProLockCard";
import { Button } from "@/src/components/Button";
import { BreathingTimer } from "@/src/components/BreathingTimer";
import { YogaPoseTimer } from "@/src/components/YogaPoseTimer";
import { fonts, radius } from "@/src/lib/theme";

const SEQUENCES = [
  {
    id: "morning",
    title: "Morning Reset",
    minutes: 12,
    benefit: "Wake the body, boost metabolism",
    hero: "https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=900",
    calories: 45,
    poses: [
      { name: "Mountain Pose (Tadasana)", duration: "60s", note: "Stand tall, weight even, arms by side, slow breaths." },
      { name: "Forward Fold (Uttanasana)", duration: "45s", note: "Hinge at hips, soft knees, let head hang heavy." },
      { name: "Cat-Cow Flow", duration: "8 rounds", note: "On all fours, alternate arching and rounding the spine." },
      { name: "Downward Dog (Adho Mukha)", duration: "60s", note: "Hips high, heels reaching down, hands shoulder-width." },
      { name: "Low Lunge (Anjaneyasana)", duration: "45s each side", note: "Knee over ankle, hips sinking, chest lifted." },
      { name: "Child's Pose (Balasana)", duration: "90s", note: "Knees wide, forehead down, arms long. Breathe deeply." },
    ],
  },
  {
    id: "fatburn",
    title: "Power Vinyasa",
    minutes: 20,
    benefit: "Burn calories, build lean strength",
    hero: "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=900",
    calories: 120,
    poses: [
      { name: "Sun Salutation A", duration: "5 rounds", note: "Flow: mountain → forward fold → halfway lift → plank → chaturanga → up dog → down dog." },
      { name: "Warrior II (Virabhadrasana II)", duration: "45s each side", note: "Front knee bent 90°, arms parallel to floor, gaze over front hand." },
      { name: "Side Angle (Utthita Parsvakonasana)", duration: "30s each side", note: "Elbow on knee, top arm reaching long over ear." },
      { name: "Chair Pose (Utkatasana)", duration: "45s", note: "Sit deep, weight in heels, arms overhead, core engaged." },
      { name: "Plank Hold", duration: "60s", note: "Shoulders over wrists, body in one line, core tight." },
      { name: "Bridge Pose (Setu Bandha)", duration: "60s, x2", note: "Press through feet, lift hips, squeeze glutes." },
    ],
  },
  {
    id: "core",
    title: "Belly-Flat Core",
    minutes: 15,
    benefit: "Sculpt core, improve posture",
    hero: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=900",
    calories: 80,
    poses: [
      { name: "Boat Pose (Navasana)", duration: "30s, x3", note: "V-shape, lift chest, shins parallel to floor if possible." },
      { name: "Plank Variations", duration: "45s each side", note: "High plank → forearm plank → side plank." },
      { name: "Locust (Salabhasana)", duration: "30s, x2", note: "Lie on belly, lift chest, arms, and legs simultaneously." },
      { name: "Reclined Twist", duration: "60s each side", note: "Drop knees to one side, gaze opposite. Soften shoulders." },
      { name: "Wind-Relieving Pose", duration: "45s each side", note: "Hug one knee in, press into belly, breathe deep." },
    ],
  },
  {
    id: "evening",
    title: "Evening Unwind",
    minutes: 18,
    benefit: "Lower cortisol, sleep deeper",
    hero: "https://images.pexels.com/photos/4498482/pexels-photo-4498482.jpeg?auto=compress&cs=tinysrgb&w=900",
    calories: 35,
    poses: [
      { name: "Seated Forward Fold (Paschimottanasana)", duration: "90s", note: "Sit tall, hinge forward, lengthen spine over legs." },
      { name: "Pigeon Pose (Eka Pada)", duration: "90s each side", note: "Open hips deeply. Use a block under hip if tight." },
      { name: "Supported Bridge", duration: "2 min", note: "Block under sacrum, melt into the support." },
      { name: "Legs-Up-The-Wall (Viparita Karani)", duration: "5 min", note: "Hips against wall, legs vertical. Restorative magic." },
      { name: "Savasana", duration: "3 min", note: "Lie flat, eyes closed, completely soft. Let go." },
    ],
  },
];

const DAILY_BENEFITS = [
  { day: 1, benefit: "Reduced stress hormones", icon: "🧘" },
  { day: 3, benefit: "Improved flexibility", icon: "🌟" },
  { day: 7, benefit: "Better sleep quality", icon: "😴" },
  { day: 14, benefit: "Increased energy", icon: "⚡" },
  { day: 30, benefit: "Stronger core & posture", icon: "💪" },
];

export default function Yoga() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const { colors } = useTheme();
  const isPro = (profile?.subscription_tier || "free") !== "free";
  const [openId, setOpenId] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  const celebrationScale = useSharedValue(1);

  const [tableExists, setTableExists] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!session?.user?.id) return;
    const todayDate = new Date().toISOString().slice(0, 10);
    
    try {
      // Get today's completions
      const { data: todayData, error: todayError } = await supabase
        .from("yoga_completions")
        .select("sequence_id")
        .eq("user_id", session.user.id)
        .eq("completed_date", todayDate);
      
      // Check if table exists
      if (todayError && todayError.code === "42P01") {
        // Table doesn't exist - set flag and use local state only
        setTableExists(false);
        console.log("yoga_completions table not found - using local tracking");
        return;
      }
      
      if (todayData) {
        setCompletedToday(todayData.map((d: any) => d.sequence_id));
      }

      // Calculate streak
      const { data: streakData } = await supabase
        .from("yoga_completions")
        .select("completed_date")
        .eq("user_id", session.user.id)
        .order("completed_date", { ascending: false })
        .limit(60);

      if (streakData && streakData.length > 0) {
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const uniqueDates = [...new Set(streakData.map((d: any) => d.completed_date))].sort().reverse();
        
        for (let i = 0; i < uniqueDates.length; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().slice(0, 10);
          
          if (uniqueDates.includes(checkDateStr)) {
            currentStreak++;
          } else if (i === 0) {
            // Today not done yet, check if yesterday was done
            const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
            if (uniqueDates.includes(yesterdayStr)) {
              // Continue counting from yesterday
              for (let j = 0; j < uniqueDates.length; j++) {
                const pastDate = new Date(today);
                pastDate.setDate(pastDate.getDate() - j - 1);
                const pastDateStr = pastDate.toISOString().slice(0, 10);
                if (uniqueDates.includes(pastDateStr)) {
                  currentStreak++;
                } else {
                  break;
                }
              }
            }
            break;
          } else {
            break;
          }
        }
        setStreak(currentStreak);
      }
    } catch (error: any) {
      // Handle table not existing gracefully
      if (error?.code === "42P01" || error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
        setTableExists(false);
        console.log("yoga_completions table not found - using local tracking");
      } else {
        console.log("Error loading yoga progress:", error);
      }
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  const markAsDone = async (sequenceId: string) => {
    if (!session?.user?.id) return;
    if (completedToday.includes(sequenceId)) return;

    setLoading(true);
    const todayDate = new Date().toISOString().slice(0, 10);

    try {
      // Only try to save to DB if table exists
      if (tableExists) {
        const { error } = await supabase.from("yoga_completions").insert({
          user_id: session.user.id,
          sequence_id: sequenceId,
          completed_date: todayDate,
        });
        
        if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
          setTableExists(false);
        }
      }

      // Update local state regardless of DB status
      setCompletedToday([...completedToday, sequenceId]);
      
      // Celebration animation
      celebrationScale.value = withSequence(
        withSpring(1.2, { damping: 5 }),
        withSpring(1, { damping: 8 })
      );

      // Update habit exercise_done (this table should exist)
      await supabase.from("habits").upsert({
        user_id: session.user.id,
        date: todayDate,
        exercise_done: true,
      }, { onConflict: "user_id,date" });

      if (tableExists) {
        await loadProgress();
      }

      const sequence = SEQUENCES.find(s => s.id === sequenceId);
      Alert.alert(
        "🎉 Great work!",
        `You completed ${sequence?.title}!\n${sequence?.calories} calories burned.\n\nKeep your streak alive — practice tomorrow!`,
        [{ text: "Awesome!" }]
      );
    } catch (error) {
      console.log("Error marking yoga done:", error);
      // Still mark as done locally even if DB fails
      setCompletedToday([...completedToday, sequenceId]);
      
      celebrationScale.value = withSequence(
        withSpring(1.2, { damping: 5 }),
        withSpring(1, { damping: 8 })
      );
      
      const sequence = SEQUENCES.find(s => s.id === sequenceId);
      Alert.alert(
        "🎉 Great work!",
        `You completed ${sequence?.title}!\n${sequence?.calories} calories burned.`,
        [{ text: "Awesome!" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const nextMilestone = DAILY_BENEFITS.find(b => b.day > streak) || DAILY_BENEFITS[DAILY_BENEFITS.length - 1];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Yoga Studio</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Streak & Progress Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Card variant="highlight" style={styles.streakCard}>
            <Animated.View style={[styles.streakBadge, { backgroundColor: colors.brandLight }, celebrationStyle]}>
              <Flame color={streak > 0 ? "#FF6B35" : colors.textMute} size={24} />
              <Text style={[styles.streakNum, { color: colors.brand }]}>{streak}</Text>
            </Animated.View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.streakLabel, { color: colors.text }]}>Day Streak</Text>
              {streak > 0 ? (
                <Text style={[styles.streakHint, { color: colors.textMute }]}>
                  {nextMilestone.day - streak} days to {nextMilestone.icon} {nextMilestone.benefit}
                </Text>
              ) : (
                <Text style={[styles.streakHint, { color: colors.textMute }]}>Start your journey today!</Text>
              )}
            </View>
            {completedToday.length > 0 && (
              <View style={[styles.todayDone, { backgroundColor: colors.success + "20" }]}>
                <CheckCircle color={colors.success} size={16} />
                <Text style={[styles.todayDoneText, { color: colors.success }]}>Done today</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Breathing Exercise Quick Access */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Pressable onPress={() => setShowBreathing(true)} testID="breathing-btn">
            <Card style={styles.breathingCard}>
              <View style={[styles.breathingIcon, { backgroundColor: colors.brandLight }]}>
                <Wind color={colors.brand} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.breathingTitle, { color: colors.text }]}>Breathing Exercise</Text>
                <Text style={[styles.breathingDesc, { color: colors.textMute }]}>Box breathing, 4-7-8 & more</Text>
              </View>
              <Play color={colors.brand} size={20} />
            </Card>
          </Pressable>
        </Animated.View>

        {!isPro && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: 16 }}>
            <ProLockCard
              title="Unlock all flows"
              description="Get Power Vinyasa, Core workout & Evening Unwind routines with Pro."
              testID="yoga-prolock"
            />
          </Animated.View>
        )}

        <Text style={[styles.intro, { color: colors.textMute }]}>
          Four practice flows you can do anywhere — no equipment. Tap a flow to see every pose with cues and hold times.
        </Text>

        {SEQUENCES.map((s, index) => {
          const expanded = openId === s.id;
          const locked = !isPro && s.id !== "morning";
          const done = completedToday.includes(s.id);
          
          return (
            <Animated.View 
              key={s.id} 
              entering={FadeInDown.delay(300 + index * 100).duration(400)}
              style={{ marginTop: 14 }}
            >
              <Pressable
                onPress={() => (locked ? router.push("/paywall") : setOpenId(expanded ? null : s.id))}
                testID={`yoga-${s.id}`}
              >
                <Card style={[styles.sequenceCard, done && { borderColor: colors.success, borderWidth: 2 }]}>
                  <Image source={{ uri: s.hero }} style={styles.hero} />
                  {done && (
                    <View style={styles.doneOverlay}>
                      <CheckCircle color="#fff" size={32} />
                    </View>
                  )}
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seqTitle, { color: colors.text }]}>{s.title}</Text>
                        <Text style={[styles.seqBenefit, { color: colors.textMute }]}>{s.benefit}</Text>
                      </View>
                      {locked ? (
                        <View style={[styles.lockBadge, { backgroundColor: colors.brand }]}>
                          <Crown color={colors.sand} size={12} />
                          <Text style={[styles.lockText, { color: colors.sand }]}>Upgrade</Text>
                        </View>
                      ) : done ? (
                        <View style={[styles.doneBadge, { backgroundColor: colors.success + "20" }]}>
                          <CheckCircle color={colors.success} size={14} />
                          <Text style={[styles.doneText, { color: colors.success }]}>Done</Text>
                        </View>
                      ) : (
                        <View style={[styles.playBtn, { backgroundColor: colors.brand }]}>
                          <Play color="#fff" size={14} />
                        </View>
                      )}
                    </View>
                    <View style={styles.meta}>
                      <Clock color={colors.textMute} size={12} />
                      <Text style={[styles.metaText, { color: colors.textMute }]}>{s.minutes} min · {s.poses.length} poses · ~{s.calories} cal</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
              
              {expanded && !locked && (
                <Animated.View entering={FadeIn.duration(300)} style={[styles.poseList, { backgroundColor: colors.bgAlt, borderColor: colors.border }]}>
                  <View style={[styles.instructionHeader, { borderBottomColor: colors.border }]}>
                    <Star color={colors.brand} size={16} />
                    <Text style={[styles.instructionTitle, { color: colors.brand }]}>Follow these poses in order</Text>
                  </View>
                  
                  {/* Start Guided Flow Button */}
                  <Pressable 
                    style={[styles.guidedFlowBtn, { backgroundColor: colors.brand }]} 
                    onPress={() => setActiveFlowId(s.id)}
                    testID={`start-flow-${s.id}`}
                  >
                    <View style={styles.guidedFlowIcon}>
                      <Play color="#fff" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guidedFlowTitle}>Start Guided Flow</Text>
                      <Text style={styles.guidedFlowDesc}>Visual timer • Breathing cues • Auto-advance</Text>
                    </View>
                  </Pressable>
                  
                  {s.poses.map((p, i) => (
                    <View key={i} style={[styles.poseRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.poseNum, { backgroundColor: colors.brandLight }]}>
                        <Text style={[styles.poseNumText, { color: colors.brand }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.poseName, { color: colors.text }]}>{p.name}</Text>
                        <Text style={[styles.poseNote, { color: colors.textMute }]}>{p.note}</Text>
                      </View>
                      <Text style={[styles.poseDur, { color: colors.brand }]}>{p.duration}</Text>
                    </View>
                  ))}
                  
                  {!done && (
                    <Button
                      title={loading ? "Saving..." : "✓ Mark as Done (Manual)"}
                      onPress={() => markAsDone(s.id)}
                      disabled={loading}
                      style={{ marginTop: 16 }}
                      variant="secondary"
                      testID={`mark-done-${s.id}`}
                    />
                  )}
                  
                  {done && (
                    <View style={[styles.completedBanner, { backgroundColor: colors.warning + "15" }]}>
                      <Trophy color={colors.warning} size={20} />
                      <Text style={[styles.completedText, { color: colors.warning }]}>Completed today! Great job 🎉</Text>
                    </View>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        {/* Benefits Timeline */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <Card style={{ marginTop: 24 }}>
            <Text style={[styles.benefitsTitle, { color: colors.text }]}>Your Yoga Journey</Text>
            <Text style={[styles.benefitsSub, { color: colors.textMute }]}>Practice daily to unlock these benefits</Text>
            <View style={styles.timeline}>
              {DAILY_BENEFITS.map((b, i) => {
                const achieved = streak >= b.day;
                return (
                  <View key={i} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.bgAlt, borderColor: colors.border }, achieved && { backgroundColor: colors.success + "20", borderColor: colors.success }]}>
                      <Text style={{ fontSize: 14 }}>{achieved ? "✓" : b.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.timelineDay, { color: colors.textMute }, achieved && { color: colors.text }]}>
                        Day {b.day}
                      </Text>
                      <Text style={[styles.timelineBenefit, { color: colors.textDim }, achieved && { color: colors.textMute }]}>
                        {b.benefit}
                      </Text>
                    </View>
                    {achieved && <CheckCircle color={colors.success} size={16} />}
                  </View>
                );
              })}
            </View>
          </Card>
        </Animated.View>

        <Text style={[styles.footer, { color: colors.textDim }]}>
          New to yoga? Move slowly, breathe through the nose, and never push into sharp pain.
        </Text>
      </ScrollView>

      <BreathingTimer visible={showBreathing} onClose={() => setShowBreathing(false)} />
      
      <YogaPoseTimer 
        visible={activeFlowId !== null}
        onClose={() => setActiveFlowId(null)}
        sequence={SEQUENCES.find(s => s.id === activeFlowId) || null}
        onComplete={() => {
          if (activeFlowId) {
            markAsDone(activeFlowId);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18 },
  scroll: { padding: 20, paddingBottom: 40 },
  
  // Streak Card
  streakCard: { flexDirection: "row", alignItems: "center", padding: 16 },
  streakBadge: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  streakNum: { 
    fontFamily: fonts.headingExt, 
    fontSize: 18, 
    marginTop: -2 
  },
  streakLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
  streakHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  todayDone: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 999 
  },
  todayDoneText: { fontFamily: fonts.bodyMed, fontSize: 11 },

  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 16 },
  
  // Sequence Cards
  sequenceCard: { padding: 0, overflow: "hidden" },
  hero: { width: "100%", height: 140 },
  doneOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    height: 140, 
    backgroundColor: "rgba(0,0,0,0.4)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  seqTitle: { fontFamily: fonts.headingExt, fontSize: 18, letterSpacing: -0.3 },
  seqBenefit: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  metaText: { fontFamily: fonts.bodyMed, fontSize: 12 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  lockText: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase" },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  doneText: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase" },
  
  // Pose List
  poseList: { borderRadius: 18, padding: 14, marginTop: 8, borderWidth: 1 },
  instructionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1 },
  instructionTitle: { fontFamily: fonts.bodySemi, fontSize: 14 },
  
  // Guided Flow Button
  guidedFlowBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 16,
    gap: 12,
  },
  guidedFlowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  guidedFlowTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 16,
    color: "#fff",
  },
  guidedFlowDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  
  poseRow: { flexDirection: "row", paddingVertical: 10, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  poseNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  poseNumText: { fontFamily: fonts.headingExt, fontSize: 13 },
  poseName: { fontFamily: fonts.bodySemi, fontSize: 14 },
  poseNote: { fontFamily: fonts.body, fontSize: 12, marginTop: 2, lineHeight: 17 },
  poseDur: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: "uppercase", marginLeft: 6 },
  
  completedBanner: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    marginTop: 16, 
    padding: 12, 
    borderRadius: 12 
  },
  completedText: { fontFamily: fonts.bodySemi, fontSize: 14 },

  // Benefits Timeline
  benefitsTitle: { fontFamily: fonts.headingExt, fontSize: 18 },
  benefitsSub: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  timeline: { marginTop: 16, gap: 12 },
  timelineItem: { flexDirection: "row", alignItems: "center" },
  timelineDot: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: "center", 
    justifyContent: "center",
    borderWidth: 2,
  },
  timelineDay: { fontFamily: fonts.bodySemi, fontSize: 13 },
  timelineBenefit: { fontFamily: fonts.body, fontSize: 12 },

  footer: { fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginTop: 20, lineHeight: 18 },

  // Breathing Card
  breathingCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16, 
    marginTop: 12 
  },
  breathingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  breathingTitle: { 
    fontFamily: fonts.bodySemi, 
    fontSize: 15, 
  },
  breathingDesc: { 
    fontFamily: fonts.body, 
    fontSize: 13, 
    marginTop: 2 
  },
});
