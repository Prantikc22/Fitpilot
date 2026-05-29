import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/src/components/Button";
import { colors, fonts } from "@/src/lib/theme";

const HERO =
  "https://images.pexels.com/photos/19783892/pexels-photo-19783892.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=940";

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: HERO }} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.top}>
            <Text style={styles.brand}>Leanly</Text>
          </View>
          <View style={styles.bottom}>
            <Text style={styles.title}>Lose weight the smart way.</Text>
            <Text style={styles.sub}>
              Personalized meal plans, AI food scans, and a coach in your pocket.
            </Text>
            <Button
              title="Get started"
              onPress={() => router.push("/(auth)/signup")}
              testID="welcome-get-started"
              style={{ marginTop: 16 }}
            />
            <Button
              title="I already have an account"
              variant="outline"
              onPress={() => router.push("/(auth)/login")}
              testID="welcome-login"
              style={{ marginTop: 12, borderColor: "rgba(255,255,255,0.4)" }}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  bg: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between", padding: 24 },
  top: { alignItems: "flex-start" },
  brand: { fontFamily: fonts.headingExt, fontSize: 22, color: "#fff", letterSpacing: -0.5 },
  bottom: { gap: 12 },
  title: { fontFamily: fonts.headingExt, fontSize: 40, color: "#fff", letterSpacing: -1.2, lineHeight: 46 },
  sub: { fontFamily: fonts.body, fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 22 },
});

// Override outline button text color for welcome
const _ = colors; // keep import
