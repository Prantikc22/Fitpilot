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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { MarkdownText } from "@/src/components/MarkdownText";
import { colors, fonts, radius } from "@/src/lib/theme";
import { useRouter } from "expo-router";
import { UtensilsCrossed } from "lucide-react-native";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const QUICK = [
  "How am I doing this week?",
  "What should I eat for dinner?",
  "I had a heavy lunch — help",
  "Tips to hit my protein target",
];

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Coach() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("coach_messages")
      .select("id,role,content,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setMsgs((data || []) as Msg[]);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (override?: string) => {
    const userMsg = (override ?? text).trim();
    if (!userMsg || !profile || !session?.user) return;
    setText("");
    const userRow: Msg = { id: `u_${Date.now()}`, role: "user", content: userMsg };
    setMsgs((m) => [...m, userRow]);
    setSending(true);

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <Sparkles size={18} color={colors.brand} />
          <Text style={styles.brand}>Leanly Coach</Text>
        </View>
        <Text style={styles.subtitle}>Evidence-based, warm, and on your side.</Text>
      </View>

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
            <Text style={styles.emptyTitle}>Ask anything about your plan.</Text>
            <Text style={styles.emptySub}>Try a starter below or type your own.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
            {item.role === "user" ? (
              <Text style={[styles.bubbleText, { color: "#fff" }]}>{item.content}</Text>
            ) : (
              <MarkdownText>{item.content}</MarkdownText>
            )}
          </View>
        )}
      />

      {msgs.length === 0 && (
        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={styles.quick} testID={`quick-${q.slice(0, 6)}`}>
              <Text style={styles.quickText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message Leanly…"
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
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, paddingBottom: 8 },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontFamily: fonts.headingExt, fontSize: 24, color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.body, color: colors.textMute, fontSize: 14, marginTop: 4 },
  list: { padding: 16, gap: 10 },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  emptySub: { fontFamily: fonts.body, color: colors.textMute, marginTop: 4 },
  bubble: { padding: 12, borderRadius: 18, maxWidth: "85%", marginBottom: 6 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.brand, borderBottomRightRadius: 6 },
  bubbleAI: { alignSelf: "flex-start", backgroundColor: colors.brandLight, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  quick: { backgroundColor: colors.bgAlt, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  quickText: { fontFamily: fonts.bodyMed, color: colors.text, fontSize: 13 },
  inputRow: { flexDirection: "row", padding: 12, gap: 10, alignItems: "flex-end" },
  input: {
    flex: 1,
    backgroundColor: colors.bgAlt,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: 15,
    maxHeight: 120,
    borderColor: colors.border,
    borderWidth: 1,
  },
  send: { backgroundColor: colors.brand, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dietBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginBottom: 8, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.brandLight },
  dietBtnText: { fontFamily: fonts.bodySemi, color: colors.brand, fontSize: 14 },
});
