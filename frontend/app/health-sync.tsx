import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Activity, Heart, Footprints, Moon, Smartphone, Mail, Clock } from "lucide-react-native";
import { Card } from "@/src/components/Card";
import { colors, fonts } from "@/src/lib/theme";

const SOURCES = [
  { id: "apple", name: "Apple Health", desc: "Sync steps, weight, sleep, workouts", Icon: Heart, color: "#FF3B5C", comingSoon: true },
  { id: "google", name: "Google Fit", desc: "Sync steps, weight, sleep, workouts", Icon: Activity, color: "#4A90E2", comingSoon: true },
  { id: "fitbit", name: "Fitbit", desc: "Sync steps, sleep, heart rate", Icon: Footprints, color: "#00B0B9", comingSoon: true },
  { id: "garmin", name: "Garmin", desc: "Workouts, steps, sleep", Icon: Moon, color: "#007ACC", comingSoon: true },
];

export default function HealthSync() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Connect Health</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="highlight">
          <Text style={styles.label}>Why connect?</Text>
          <Text style={styles.intro}>
            We automatically pull your steps, weight, sleep and workouts to update your habits and Health Score —
            no manual logging needed.
          </Text>
        </Card>

        <Text style={styles.section}>Health data sources</Text>
        {SOURCES.map((s) => {
          const { Icon } = s;
          return (
            <View key={s.id} testID={`sync-${s.id}`}>
              <Card style={styles.row}>
                <View style={[styles.icon, { backgroundColor: s.color + "20" }]}>
                  <Icon color={s.color} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>{s.desc}</Text>
                </View>
                {s.comingSoon ? (
                  <View style={styles.comingSoonBadge}>
                    <Clock size={10} color={colors.warning} />
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                ) : (
                  <Text style={styles.connect}>Connect</Text>
                )}
              </Card>
            </View>
          );
        })}

        <Text style={styles.section}>Food delivery insights</Text>
        <Pressable onPress={() => router.push("/delivery")} testID="open-delivery">
          <Card style={styles.row}>
            <View style={[styles.icon, { backgroundColor: "#F2BD45" + "20" }]}>
              <Mail color="#F2BD45" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Swiggy · Zomato · Blinkit</Text>
              <Text style={styles.rowSub}>Track delivery orders to estimate intake & spend</Text>
            </View>
            <Text style={styles.connect}>Open</Text>
          </Card>
        </Pressable>

        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Smartphone size={14} color={colors.textMute} />
            <Text style={styles.label}>Native integrations in progress</Text>
          </View>
          <Text style={styles.helper}>
            Apple Health & Google Fit integrations are coming soon. We're working on native device sync — stay tuned!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20 },
  label: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7 },
  intro: { fontFamily: fonts.body, color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  section: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 20, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMute, marginTop: 2 },
  connect: { fontFamily: fonts.bodySemi, color: colors.brand, fontSize: 13 },
  helper: { fontFamily: fonts.body, color: colors.textMute, fontSize: 12, lineHeight: 18 },
  comingSoonBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    backgroundColor: colors.warning + "20", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  comingSoonText: { 
    fontFamily: fonts.bodyMed, 
    color: colors.warning, 
    fontSize: 10, 
    textTransform: "uppercase", 
    letterSpacing: 0.5 
  },
});
