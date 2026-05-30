import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles, Sun, Moon, Flame, Target, Trophy } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme, lightColors } from "@/src/contexts/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { MarkdownText } from "@/src/components/MarkdownText";
import { Card } from "@/src/components/Card";
import { fonts, radius } from "@/src/lib/theme";
import { useRouter } from "expo-router";
import { UtensilsCrossed, CheckCircle } from "lucide-react-native";

type Msg = { id: string; role: "user" | "assistant"; content: string };

// Quick prompts - short and actionable
const QUICK_MORNING = [
  "Plan my day 🌅",
  "What to eat today?",
  "Motivate me!",
];

const QUICK_LUNCH = [
  "Log my lunch 🍽️",
  "Healthy options?",
  "How am I doing?",
];

const QUICK_EVENING = [
  "Review my day 🌙",
  "How did I do?",
  "Tomorrow's plan",
];

const QUICK_ANYTIME = [
  "Quick snack idea",
  "Hit my protein?",
  "Water check 💧",
];

// Proactive AI Accountability Reminders
const PROACTIVE_REMINDERS = {
  morning: {
    icon: "🌅",
    title: "Set your intention",
    message: "Plan 3 wins for today. What's your #1 food goal?",
    cta: "Plan my day",
    secondary: "Skip planning",
  },
  lunch: {
    icon: "🍽️",
    title: "Mid-day check",
    message: "How's your eating going? Still on track?",
    cta: "Log my lunch",
    secondary: "I'm on track",
  },
  evening: {
    icon: "🌙",
    title: "Evening reflection",
    message: "Let's review your wins & learnings today.",
    cta: "Review my day",
    secondary: "Skip review",
  },
};

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getTimeOfDay(): "morning" | "lunch" | "evening" | "anytime" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 22) return "evening";
  return "anytime";
}

export default function Coach() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const listRef = useRef<FlatList<Msg>>(null);

  const timeOfDay = getTimeOfDay();
  const quickPrompts = 
    timeOfDay === "morning" ? QUICK_MORNING :
    timeOfDay === "lunch" ? QUICK_LUNCH :
    timeOfDay === "evening" ? QUICK_EVENING :
    QUICK_ANYTIME;

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("coach_messages")
      .select("id,role,content,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setMsgs((data || []) as Msg[]);

    // Check if user already checked in today
    const today = new Date().toISOString().slice(0, 10);
    const { data: checkIn } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .maybeSingle();
    setCheckedIn(!!checkIn);

    // Load streak
    const { data: streakData } = await supabase
      .from("daily_checkins")
      .select("date")
      .eq("user_id", session.user.id)
      .order("date", { ascending: false })
      .limit(60);

    if (streakData && streakData.length > 0) {
      let currentStreak = 0;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const dates = streakData.map((d: any) => d.date);
      for (let i = 0; i < 60; i++) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().slice(0, 10);
        if (dates.includes(checkDateStr)) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }
      setStreak(currentStreak);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const markCheckIn = async () => {
    if (!session?.user?.id || checkedIn) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await supabase.from("daily_checkins").upsert({
        user_id: session.user.id,
        date: today,
        type: timeOfDay,
      });
      setCheckedIn(true);
      setStreak((s) => s + 1);
    } catch (e) {
      // Table might not exist, fail silently
      console.log("Check-in save failed:", e);
    }
  };

  const send = async (override?: string) => {
    const userMsg = (override ?? text).trim();
    if (!userMsg || !profile || !session?.user) return;
    setText("");
    const userRow: Msg = { id: `u_${Date.now()}`, role: "user", content: userMsg };
    setMsgs((m) => [...m, userRow]);
    setSending(true);

    // Mark daily check-in on first message
    if (!checkedIn) {
      markCheckIn();
    }

    // Today calories
    const { data: foods } = await supabase
      .from("food_logs")
      .select("calories,protein")
      .eq("user_id", session.user.id)
      .gte("logged_at", startOfDayISO());
    const cals = (foods || []).reduce((s: number, f: any) => s + (Number(f.calories) || 0), 0);
    const pro = (foods || []).reduce((s: number, f: any) => s + (Number(f.protein) || 0), 0);

    try {
      const history = msgs.map((m) => ({ role: m.role, content: m.content }));
      const r = await api.coachMessage({
        profile,
        today_calories: cals,
        today_protein: pro,
        history,
        user_message: userMsg,
      });
      const ai: Msg = { id: `a_${Date.now()}`, role: "assistant", content: r.reply };
      setMsgs((m) => [...m, ai]);
      // persist
      await supabase.from("coach_messages").insert([
        { user_id: session.user.id, role: "user", content: userMsg },
        { user_id: session.user.id, role: "assistant", content: r.reply },
      ]);
    } catch (e: any) {
      const ai: Msg = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: "I had trouble connecting. Try again in a moment.",
      };
      setMsgs((m) => [...m, ai]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const TimeIcon = timeOfDay === "morning" ? Sun : timeOfDay === "evening" ? Moon : timeOfDay === "lunch" ? UtensilsCrossed : Sparkles;
  const greeting = 
    timeOfDay === "morning" ? "Good morning" :
    timeOfDay === "lunch" ? "Lunchtime" :
    timeOfDay === "evening" ? "Good evening" :
    "Hey there";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Sparkles size={18} color={colors.brand} />
          <Text style={styles.brand}>AI Coach</Text>
        </View>
        <Text style={styles.subtitle}>Quick, actionable advice. Always here.</Text>
      </View>

      {/* Check-in Banner */}
      {!checkedIn && msgs.length === 0 && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Pressable
            style={styles.checkinBanner}
            onPress={() => send(timeOfDay === "morning" ? "Plan my day" : timeOfDay === "lunch" ? "Log my lunch" : "Review my day")}
          >
            <View style={styles.checkinIcon}>
              <TimeIcon color={colors.brand} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkinTitle}>{greeting}! 👋</Text>
              <Text style={styles.checkinSub}>
                {timeOfDay === "morning"
                  ? "Tap to plan your day with AI"
                  : timeOfDay === "lunch"
                  ? "How's your day going? Check in!"
                  : timeOfDay === "evening"
                  ? "Tap to review your progress"
                  : "Quick chat with your coach"}
              </Text>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame color="#FF6B35" size={14} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* Streak & Goals Row */}
      {checkedIn && msgs.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.statsRow}>
          <View style={styles.statItem}>
            <CheckCircle color={colors.success} size={14} />
            <Text style={styles.statText}>Checked in</Text>
          </View>
          {streak > 0 && (
            <View style={styles.statItem}>
              <Flame color="#FF6B35" size={14} />
              <Text style={styles.statText}>{streak} day streak</Text>
            </View>
          )}
        </Animated.View>
      )}

      <Pressable style={styles.dietBtn} onPress={() => router.push("/(tabs)/log")} testID="coach-open-diet">
        <UtensilsCrossed color={colors.brand} size={16} />
        <Text style={styles.dietBtnText}>View today's meal plan</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Target color={colors.brand} size={28} />
            </View>
            <Text style={styles.emptyTitle}>Your AI health coach</Text>
            <Text style={styles.emptySub}>
              Short answers. Real results.{"\n"}Ask anything about food, fitness, or your plan.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeInDown.duration(200)}>
            <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
              {item.role === "user" ? (
                <Text style={[styles.bubbleText, { color: "#fff" }]}>{item.content}</Text>
              ) : (
                <MarkdownText>{item.content}</MarkdownText>
              )}
            </View>
          </Animated.View>
        )}
      />

      {msgs.length === 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.quickLabel}>
            {timeOfDay === "morning" ? "🌅 Morning check-in" : 
             timeOfDay === "lunch" ? "🍽️ Mid-day check" :
             timeOfDay === "evening" ? "🌙 Evening review" : 
             "💬 Quick questions"}
          </Text>
          <View style={styles.quickRow}>
            {quickPrompts.map((q) => (
              <Pressable key={q} onPress={() => send(q)} style={styles.quick} testID={`quick-${q.slice(0, 6)}`}>
                <Text style={styles.quickText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask me anything…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            multiline
            testID="coach-input"
          />
          <Pressable style={styles.send} onPress={() => send()} disabled={sending} testID="coach-send">
            {sending ? <ActivityIndicator color="#fff" /> : <Send color="#fff" size={18} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.bg },
  header: { padding: 20, paddingBottom: 8 },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontFamily: fonts.headingExt, fontSize: 24, color: lightColors.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.body, color: lightColors.textMute, fontSize: 14, marginTop: 4 },
  
  // Check-in Banner
  checkinBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightColors.brandLight,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: radius.xl,
    gap: 12,
  },
  checkinIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkinTitle: { fontFamily: fonts.headingExt, fontSize: 16, color: lightColors.text },
  checkinSub: { fontFamily: fonts.body, fontSize: 13, color: lightColors.textMute, marginTop: 2 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { fontFamily: fonts.headingExt, fontSize: 14, color: "#FF6B35" },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: { fontFamily: fonts.bodyMed, fontSize: 12, color: lightColors.textMute },

  list: { padding: 16, gap: 10 },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lightColors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontFamily: fonts.headingExt, fontSize: 20, color: lightColors.text, textAlign: "center" },
  emptySub: { fontFamily: fonts.body, color: lightColors.textMute, marginTop: 8, textAlign: "center", lineHeight: 20 },
  bubble: { padding: 12, borderRadius: 18, maxWidth: "85%", marginBottom: 6 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: lightColors.brand, borderBottomRightRadius: 6 },
  bubbleAI: { alignSelf: "flex-start", backgroundColor: lightColors.brandLight, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, color: lightColors.text, lineHeight: 22 },
  
  // Quick Section
  quickSection: { paddingHorizontal: 16, paddingBottom: 8 },
  quickLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: lightColors.textMute, marginBottom: 8 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: {
    backgroundColor: lightColors.bgAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  quickText: { fontFamily: fonts.bodyMed, color: lightColors.text, fontSize: 13 },
  
  inputRow: { flexDirection: "row", padding: 12, gap: 10, alignItems: "flex-end" },
  input: {
    flex: 1,
    backgroundColor: lightColors.bgAlt,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: lightColors.text,
    fontSize: 15,
    maxHeight: 120,
    borderColor: lightColors.border,
    borderWidth: 1,
  },
  send: {
    backgroundColor: lightColors.brand,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dietBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: lightColors.brandLight,
  },
  dietBtnText: { fontFamily: fonts.bodySemi, color: lightColors.brand, fontSize: 14 },
});
