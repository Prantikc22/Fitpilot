import React, { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Plus, Trash2 } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { colors, fonts, radius } from "@/src/lib/theme";
import { formatDateLocale, toISODate } from "@/src/lib/format";

const SOURCES = ["Swiggy", "Zomato", "Blinkit", "Zepto", "Instamart", "Uber Eats", "DoorDash", "Other"];

export default function Delivery() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(SOURCES[0]);
  const [vendor, setVendor] = useState("");
  const [orderItems, setOrderItems] = useState("");
  const [amount, setAmount] = useState("");
  const [calories, setCalories] = useState("");

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("user_id", session.user.id)
      .order("order_date", { ascending: false })
      .limit(50);
    setItems(data || []);
  }, [session?.user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!session?.user) return;
    if (!vendor.trim() || !orderItems.trim()) {
      Alert.alert("Missing info", "Add vendor and items.");
      return;
    }
    await supabase.from("delivery_orders").insert({
      user_id: session.user.id,
      source,
      vendor: vendor.trim(),
      items: orderItems.trim(),
      total_amount: Number(amount) || null,
      estimated_calories: Number(calories) || null,
      order_date: toISODate(new Date()),
    });
    // also create a food_log if calories provided
    if (Number(calories) > 0) {
      const h = new Date().getHours();
      const meal = h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snack";
      await supabase.from("food_logs").insert({
        user_id: session.user.id,
        meal_type: meal,
        items: [{ name: `${vendor} (${source})`, calories: Number(calories) }],
        calories: Number(calories),
        protein: 0,
        source: "delivery",
      });
    }
    setOpen(false); setVendor(""); setOrderItems(""); setAmount(""); setCalories("");
    await load();
  };

  const del = async (id: string) => {
    await supabase.from("delivery_orders").delete().eq("id", id);
    load();
  };

  const totalSpend = items.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalCal = items.reduce((s, r) => s + Number(r.estimated_calories || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><X size={22} color={colors.text} /></Pressable>
        <Text style={styles.title}>Food Delivery</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="highlight">
          <Text style={styles.label}>This month so far</Text>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 8 }}>
            <View><Text style={styles.statVal}>₹{totalSpend.toLocaleString()}</Text><Text style={styles.statLabel}>Spent</Text></View>
            <View><Text style={styles.statVal}>{Math.round(totalCal).toLocaleString()}</Text><Text style={styles.statLabel}>Est. kcal</Text></View>
            <View><Text style={styles.statVal}>{items.length}</Text><Text style={styles.statLabel}>Orders</Text></View>
          </View>
          <Text style={styles.note}>
            Manual entry now. Full Gmail auto-detection of Swiggy/Zomato/Blinkit emails is coming in the next release.
          </Text>
        </Card>

        <Pressable onPress={() => setOpen(true)} style={styles.addBtn} testID="delivery-add">
          <Plus color="#fff" size={18} /><Text style={styles.addBtnText}>Log a delivery order</Text>
        </Pressable>

        {items.length === 0 ? (
          <Text style={styles.empty}>No delivery orders logged yet.</Text>
        ) : (
          items.map((it) => (
            <Card key={it.id} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowKick}>{it.source} · {formatDateLocale(it.order_date)}</Text>
                  <Text style={styles.rowTitle}>{it.vendor}</Text>
                  <Text style={styles.rowSub}>{it.items}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {it.total_amount ? <Text style={styles.rowAmount}>₹{it.total_amount}</Text> : null}
                  {it.estimated_calories ? <Text style={styles.rowCal}>{it.estimated_calories} kcal</Text> : null}
                  <Pressable onPress={() => del(it.id)} hitSlop={6} style={{ marginTop: 6 }}><Trash2 color={colors.textDim} size={16} /></Pressable>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.h2}>Log delivery</Text>
            <Text style={styles.label}>Source</Text>
            <View style={styles.sourceRow}>
              {SOURCES.map((s) => (
                <Pressable key={s} onPress={() => setSource(s)} style={[styles.srcPill, source === s && styles.srcPillActive]}>
                  <Text style={[styles.srcText, source === s && { color: "#fff" }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Vendor / restaurant</Text>
            <TextInput value={vendor} onChangeText={setVendor} placeholder="e.g. Domino's, Sweetish House Mafia" placeholderTextColor={colors.textDim} style={styles.input} />
            <Text style={styles.label}>Items</Text>
            <TextInput value={orderItems} onChangeText={setOrderItems} placeholder="e.g. Veggie pizza, garlic bread" placeholderTextColor={colors.textDim} style={styles.input} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDim} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Est. calories</Text>
                <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDim} style={styles.input} />
              </View>
            </View>
            <Button title="Save" onPress={save} style={{ marginTop: 12 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 8, marginBottom: 6 },
  statVal: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  statLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase" },
  note: { fontFamily: fonts.body, color: colors.textMute, marginTop: 10, fontSize: 12, lineHeight: 17 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 999, backgroundColor: colors.brand },
  addBtnText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 15 },
  empty: { fontFamily: fonts.body, color: colors.textDim, marginTop: 16, textAlign: "center" },
  rowKick: { fontFamily: fonts.bodyMed, color: colors.brand, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, marginTop: 4 },
  rowSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMute, marginTop: 2 },
  rowAmount: { fontFamily: fonts.headingExt, fontSize: 16, color: colors.text },
  rowCal: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.textMute, marginTop: 2 },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bgAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" },
  h2: { fontFamily: fonts.headingExt, fontSize: 22, color: colors.text, marginBottom: 8 },
  sourceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  srcPill: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bgWarm, borderRadius: 999 },
  srcPillActive: { backgroundColor: colors.brand },
  srcText: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.text },
  input: { backgroundColor: colors.bgWarm, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, color: colors.text, fontSize: 15 },
});
