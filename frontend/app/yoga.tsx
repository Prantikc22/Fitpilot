import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Clock, Crown, Play } from "lucide-react-native";
import { useAuth } from "@/src/contexts/AuthContext";
import { Card } from "@/src/components/Card";
import { ProLockCard } from "@/src/components/ProLockCard";
import { colors, fonts } from "@/src/lib/theme";

const SEQUENCES = [
  {
    id: "morning",
    title: "Morning Reset",
    minutes: 12,
    benefit: "Wake the body, boost metabolism",
    hero: "https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=900",
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
    poses: [
      { name: "Seated Forward Fold (Paschimottanasana)", duration: "90s", note: "Sit tall, hinge forward, lengthen spine over legs." },
      { name: "Pigeon Pose (Eka Pada)", duration: "90s each side", note: "Open hips deeply. Use a block under hip if tight." },
      { name: "Supported Bridge", duration: "2 min", note: "Block under sacrum, melt into the support." },
      { name: "Legs-Up-The-Wall (Viparita Karani)", duration: "5 min", note: "Hips against wall, legs vertical. Restorative magic." },
      { name: "Savasana", duration: "3 min", note: "Lie flat, eyes closed, completely soft. Let go." },
    ],
  },
];

export default function Yoga() {
  const router = useRouter();
  const { profile } = useAuth();
  const isPro = (profile?.subscription_tier || "free") !== "free";
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Yoga Studio</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isPro && (
          <View style={{ marginBottom: 16 }}>
            <ProLockCard
              title="Unlock the full Yoga library"
              description="Curated sequences for weight loss, core, energy and sleep — designed by certified yoga teachers."
              testID="yoga-prolock"
            />
          </View>
        )}

        <Text style={styles.intro}>
          Four practice flows you can do anywhere — no equipment. Tap a flow to see every pose with cues and hold times.
        </Text>

        {SEQUENCES.map((s) => {
          const expanded = openId === s.id;
          const locked = !isPro && s.id !== "morning";
          return (
            <View key={s.id} style={{ marginTop: 14 }}>
              <Pressable
                onPress={() => (locked ? router.push("/paywall") : setOpenId(expanded ? null : s.id))}
                testID={`yoga-${s.id}`}
              >
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <Image source={{ uri: s.hero }} style={styles.hero} />
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.seqTitle}>{s.title}</Text>
                        <Text style={styles.seqBenefit}>{s.benefit}</Text>
                      </View>
                      {locked ? (
                        <View style={styles.lockBadge}>
                          <Crown color={colors.sand} size={12} />
                          <Text style={styles.lockText}>Pro</Text>
                        </View>
                      ) : (
                        <View style={styles.playBtn}>
                          <Play color="#fff" size={14} />
                        </View>
                      )}
                    </View>
                    <View style={styles.meta}>
                      <Clock color={colors.textMute} size={12} />
                      <Text style={styles.metaText}>{s.minutes} min · {s.poses.length} poses</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
              {expanded && !locked && (
                <View style={styles.poseList}>
                  {s.poses.map((p, i) => (
                    <View key={i} style={styles.poseRow}>
                      <View style={styles.poseNum}>
                        <Text style={styles.poseNumText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.poseName}>{p.name}</Text>
                        <Text style={styles.poseNote}>{p.note}</Text>
                      </View>
                      <Text style={styles.poseDur}>{p.duration}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <Text style={styles.footer}>
          New to yoga? Move slowly, breathe through the nose, and never push into sharp pain.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20 },
  intro: { fontFamily: fonts.body, color: colors.textMute, fontSize: 14, lineHeight: 20 },
  hero: { width: "100%", height: 140 },
  seqTitle: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text, letterSpacing: -0.3 },
  seqBenefit: { fontFamily: fonts.body, color: colors.textMute, fontSize: 13, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  metaText: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.textMute },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  lockText: { fontFamily: fonts.bodySemi, color: colors.sand, fontSize: 11, textTransform: "uppercase" },
  poseList: { backgroundColor: colors.bgAlt, borderRadius: 18, padding: 14, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  poseRow: { flexDirection: "row", paddingVertical: 10, gap: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  poseNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  poseNumText: { fontFamily: fonts.headingExt, color: colors.brand, fontSize: 13 },
  poseName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  poseNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMute, marginTop: 2, lineHeight: 17 },
  poseDur: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.brand, textTransform: "uppercase", marginLeft: 6 },
  footer: { fontFamily: fonts.body, color: colors.textDim, fontSize: 12, textAlign: "center", marginTop: 20, lineHeight: 18 },
});
