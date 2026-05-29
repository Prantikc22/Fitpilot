import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Camera as CamIcon, ImageIcon, X, Check, Sparkles } from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { api, FoodAnalyzeRes } from "@/src/lib/api";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { colors, fonts, radius } from "@/src/lib/theme";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

function guessMeal(): (typeof MEALS)[number] {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export default function Scan() {
  const router = useRouter();
  const { session } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalyzeRes | null>(null);
  const [meal, setMeal] = useState<(typeof MEALS)[number]>(guessMeal());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Pre-request permissions so the action is fast
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  async function loadBase64(uri: string): Promise<string | null> {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      return compressed.base64 || null;
    } catch (e) {
      console.warn("compress fail", e);
      return null;
    }
  }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Please grant camera access to scan food.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!r.canceled && r.assets[0]) {
      setImageUri(r.assets[0].uri);
      const b64 = await loadBase64(r.assets[0].uri);
      setImageBase64(b64);
      analyze(b64);
    }
  }
  async function fromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Please allow photo library access.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!r.canceled && r.assets[0]) {
      setImageUri(r.assets[0].uri);
      const b64 = await loadBase64(r.assets[0].uri);
      setImageBase64(b64);
      analyze(b64);
    }
  }

  async function analyze(b64?: string | null) {
    const data = b64 ?? imageBase64;
    if (!data) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const r = await api.analyzeFood(data);
      setResult(r);
    } catch (e: any) {
      Alert.alert("Couldn't analyze", e.message || "Try another photo.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveLog() {
    if (!session?.user || !result) return;
    setSaving(true);
    await supabase.from("food_logs").insert({
      user_id: session.user.id,
      meal_type: meal,
      items: result.items,
      calories: result.total_calories,
      protein: result.total_protein,
      carbs: result.total_carbs,
      fat: result.total_fat,
      source: "ai_vision",
    });
    setSaving(false);
    router.replace("/(tabs)/log");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="scan-close">
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Scan food</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!imageUri ? (
          <View style={styles.placeholder}>
            <View style={styles.iconCircle}>
              <Sparkles color={colors.brand} size={26} />
            </View>
            <Text style={styles.placeholderTitle}>AI-powered food scan</Text>
            <Text style={styles.placeholderSub}>
              Snap or upload a photo of your meal. Our AI estimates calories and macros instantly.
            </Text>
          </View>
        ) : (
          <View style={styles.imgWrap}>
            <Image source={{ uri: imageUri }} style={styles.img} />
          </View>
        )}

        {analyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Analyzing your meal…</Text>
          </View>
        )}

        {result && (
          <View>
            <Card style={{ marginTop: 16 }} testID="scan-result-card">
              <Text style={styles.h3}>Detected</Text>
              {result.summary ? <Text style={styles.summary}>{result.summary}</Text> : null}
              <View style={styles.totalsRow}>
                <Total label="kcal" value={Math.round(result.total_calories).toString()} />
                <Total label="protein" value={`${Math.round(result.total_protein)}g`} />
                <Total label="carbs" value={`${Math.round(result.total_carbs)}g`} />
                <Total label="fat" value={`${Math.round(result.total_fat)}g`} />
              </View>
              <View style={{ marginTop: 12 }}>
                {result.items.map((it, i) => (
                  <View key={i} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      {it.quantity ? <Text style={styles.itemQty}>{it.quantity}</Text> : null}
                    </View>
                    <Text style={styles.itemCal}>{Math.round(it.calories)} kcal</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={[styles.label, { marginTop: 18, marginBottom: 8 }]}>Add to</Text>
            <View style={styles.mealRow}>
              {MEALS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMeal(m)}
                  style={[styles.mealPill, meal === m && styles.mealPillActive]}
                  testID={`scan-meal-${m}`}
                >
                  <Text style={[styles.mealPillText, meal === m && { color: "#fff" }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        {!imageUri ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable style={[styles.bigBtn, { backgroundColor: colors.brand }]} onPress={fromCamera} testID="scan-camera">
              <CamIcon color="#fff" size={20} />
              <Text style={styles.bigBtnText}>Take photo</Text>
            </Pressable>
            <Pressable
              style={[styles.bigBtn, { backgroundColor: colors.brandLight }]}
              onPress={fromLibrary}
              testID="scan-library"
            >
              <ImageIcon color={colors.brand} size={20} />
              <Text style={[styles.bigBtnText, { color: colors.brand }]}>From library</Text>
            </Pressable>
          </View>
        ) : result ? (
          <Button
            title="Save to log"
            onPress={saveLog}
            loading={saving}
            testID="scan-save"
          />
        ) : (
          <Button title="Pick a different photo" variant="secondary" onPress={() => { setImageUri(null); setImageBase64(null); setResult(null); }} testID="scan-retry" />
        )}
      </View>
    </SafeAreaView>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.totalVal}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20 },
  placeholder: { padding: 32, alignItems: "center", backgroundColor: colors.bgAlt, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  placeholderTitle: { fontFamily: fonts.headingExt, fontSize: 20, color: colors.text, marginTop: 14 },
  placeholderSub: { fontFamily: fonts.body, color: colors.textMute, textAlign: "center", marginTop: 8, lineHeight: 20 },
  imgWrap: { borderRadius: radius.xl, overflow: "hidden", backgroundColor: "#000" },
  img: { width: "100%", aspectRatio: 4 / 3 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 20, justifyContent: "center" },
  loadingText: { fontFamily: fonts.bodyMed, color: colors.textMute },
  h3: { fontFamily: fonts.headingExt, fontSize: 20, color: colors.text },
  summary: { fontFamily: fonts.body, color: colors.textMute, marginTop: 6, lineHeight: 20 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, backgroundColor: colors.bgWarm, padding: 14, borderRadius: radius.lg },
  totalVal: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  totalLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", marginTop: 2 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  itemName: { fontFamily: fonts.bodySemi, color: colors.text, fontSize: 15 },
  itemQty: { fontFamily: fonts.body, color: colors.textMute, fontSize: 13, marginTop: 2 },
  itemCal: { fontFamily: fonts.bodyMed, color: colors.brand, fontSize: 14 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7 },
  mealRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  mealPill: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bgAlt, borderRadius: 999, borderColor: colors.border, borderWidth: 1 },
  mealPillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  mealPillText: { fontFamily: fonts.bodySemi, color: colors.text, fontSize: 13, textTransform: "capitalize" },
  bottom: { padding: 16, paddingTop: 0 },
  bigBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  bigBtnText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 15 },
});
