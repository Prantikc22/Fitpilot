import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Droplets, MapPin, Calendar, Clock, Check, ChevronRight, FileText, Shield, Truck, AlertCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { ProLockCard } from "@/src/components/ProLockCard";
import { colors, fonts, radius } from "@/src/lib/theme";

const AVAILABLE_CITIES = [
  { id: "kolkata", name: "Kolkata", available: true },
  { id: "bangalore", name: "Bangalore", available: true },
  { id: "gurgaon", name: "Gurgaon", available: true },
];

const TEST_PACKAGES = [
  {
    id: "basic",
    name: "Basic Health Checkup",
    tests: ["CBC", "Blood Sugar", "Lipid Profile", "Thyroid (TSH)"],
    price: 999,
    originalPrice: 1499,
    popular: false,
  },
  {
    id: "comprehensive",
    name: "Comprehensive Panel",
    tests: ["CBC", "Liver Function", "Kidney Function", "Lipid Profile", "HbA1c", "Vitamin D", "B12", "Thyroid"],
    price: 1999,
    originalPrice: 3499,
    popular: true,
  },
  {
    id: "pcos",
    name: "PCOS/Hormone Panel",
    tests: ["LH", "FSH", "Prolactin", "AMH", "Testosterone", "DHEA-S", "Insulin", "Thyroid"],
    price: 2499,
    originalPrice: 4299,
    popular: false,
  },
  {
    id: "fitness",
    name: "Fitness & Metabolism",
    tests: ["CBC", "Iron Studies", "Vitamin D", "B12", "Magnesium", "CRP", "Testosterone"],
    price: 1799,
    originalPrice: 2999,
    popular: false,
  },
];

export default function BloodTests() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const isPro = (profile?.subscription_tier || "free") !== "free";
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [step, setStep] = useState<"city" | "select" | "schedule" | "confirm">("city");
  const [address, setAddress] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const slots = [
    "Tomorrow, 7-9 AM",
    "Tomorrow, 9-11 AM",
    "Day after, 7-9 AM",
    "Day after, 9-11 AM",
  ];

  const handleBook = async () => {
    if (!session?.user || !selectedPackage || !selectedCity) return;
    
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter your address for home collection.");
      return;
    }
    if (!selectedSlot) {
      Alert.alert("Select Time", "Please select a preferred time slot.");
      return;
    }

    const selectedTest = TEST_PACKAGES.find((t) => t.id === selectedPackage);
    if (!selectedTest) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("blood_test_orders").insert({
        user_id: session.user.id,
        package_id: selectedTest.id,
        package_name: selectedTest.name,
        package_price: selectedTest.price,
        tests: selectedTest.tests,
        city: selectedCity,
        address: address.trim(),
        time_slot: selectedSlot,
        status: "pending",
      }).select("id").single();

      if (error) throw error;
      setOrderId(data?.id || null);
      setStep("confirm");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTest = TEST_PACKAGES.find((t) => t.id === selectedPackage);
  const cityName = AVAILABLE_CITIES.find(c => c.id === selectedCity)?.name || "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Blood Tests</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isPro && (
          <View style={{ marginBottom: 16 }}>
            <ProLockCard
              title="AI-Powered Blood Test Insights"
              description="Elite members get personalized diet recommendations based on their blood reports."
              testID="blood-prolock"
            />
          </View>
        )}

        {step === "city" && (
          <>
            {/* Hero */}
            <Card variant="highlight" style={styles.heroCard}>
              <Droplets color={colors.brand} size={28} />
              <Text style={styles.heroTitle}>Lab Tests at Home</Text>
              <Text style={styles.heroSub}>
                Book blood tests with home sample collection. Get reports in 24-48 hours.
              </Text>
              <View style={styles.featureRow}>
                <FeatureChip icon={Truck} text="Free Home Collection" />
                <FeatureChip icon={FileText} text="Digital Reports" />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Select Your City</Text>
            <Text style={styles.cityNote}>
              Currently available in select cities. We're expanding soon!
            </Text>

            <View style={styles.cityGrid}>
              {AVAILABLE_CITIES.map((city, index) => (
                <Animated.View key={city.id} entering={FadeInDown.delay(index * 100).duration(300)} style={styles.cityCardWrapper}>
                  <Pressable
                    style={[styles.cityCard, selectedCity === city.id && styles.cityCardSelected]}
                    onPress={() => setSelectedCity(city.id)}
                  >
                    <MapPin size={24} color={selectedCity === city.id ? colors.brand : colors.textMute} />
                    <Text style={[styles.cityName, selectedCity === city.id && styles.cityNameSelected]}>
                      {city.name}
                    </Text>
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Card style={styles.otherCityCard}>
              <AlertCircle size={20} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.otherCityTitle}>Not in your city?</Text>
                <Text style={styles.otherCityText}>
                  We're launching in Mumbai, Delhi, Chennai, Hyderabad, and Pune soon. Stay tuned!
                </Text>
              </View>
            </Card>

            <Button
              title="Continue"
              onPress={() => selectedCity && setStep("select")}
              disabled={!selectedCity}
              style={{ marginTop: 20 }}
            />
          </>
        )}

        {step === "select" && (
          <>
            <View style={styles.locationBar}>
              <MapPin size={16} color={colors.brand} />
              <Text style={styles.locationText}>{cityName}</Text>
              <Pressable onPress={() => setStep("city")}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Select a Package</Text>

            {TEST_PACKAGES.map((pkg, index) => (
              <Animated.View key={pkg.id} entering={FadeInDown.delay(index * 50).duration(300)}>
                <Pressable
                  style={[
                    styles.packageCard,
                    selectedPackage === pkg.id && styles.packageSelected,
                  ]}
                  onPress={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Most Popular</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.testCount}>{pkg.tests.length} tests included</Text>
                    </View>
                    <View style={styles.priceCol}>
                      <Text style={styles.price}>₹{pkg.price}</Text>
                      <Text style={styles.originalPrice}>₹{pkg.originalPrice}</Text>
                    </View>
                  </View>
                  <View style={styles.testList}>
                    {pkg.tests.map((test) => (
                      <View key={test} style={styles.testChip}>
                        <Text style={styles.testChipText}>{test}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[
                    styles.radioOuter,
                    selectedPackage === pkg.id && styles.radioOuterSelected,
                  ]}>
                    {selectedPackage === pkg.id && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              </Animated.View>
            ))}

            <Button
              title="Continue"
              onPress={() => selectedPackage && setStep("schedule")}
              disabled={!selectedPackage}
              style={{ marginTop: 20 }}
            />
            <Pressable onPress={() => setStep("city")} style={{ marginTop: 12 }}>
              <Text style={styles.backLink}>← Change City</Text>
            </Pressable>
          </>
        )}

        {step === "schedule" && selectedTest && (
          <>
            <Card style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>{selectedTest.name}</Text>
                <View style={styles.summaryLocation}>
                  <MapPin size={12} color={colors.textMute} />
                  <Text style={styles.summaryLocationText}>{cityName}</Text>
                </View>
              </View>
              <Text style={styles.summaryPrice}>₹{selectedTest.price}</Text>
            </Card>

            <Text style={styles.sectionTitle}>Collection Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={`Enter your full address in ${cityName}...`}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Select Time Slot</Text>
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <Pressable
                  key={slot}
                  style={[
                    styles.slotBtn,
                    selectedSlot === slot && styles.slotBtnActive,
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Clock size={14} color={selectedSlot === slot ? "#fff" : colors.textMute} />
                  <Text style={[
                    styles.slotText,
                    selectedSlot === slot && styles.slotTextActive,
                  ]}>
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.infoRow}>
              <Shield color={colors.success} size={16} />
              <Text style={styles.infoText}>NABL Accredited Labs • Certified Phlebotomists</Text>
            </View>

            <Button title="Book Now" onPress={handleBook} loading={submitting} style={{ marginTop: 20 }} />
            <Pressable onPress={() => setStep("select")} style={{ marginTop: 12 }}>
              <Text style={styles.backLink}>← Change Package</Text>
            </Pressable>
          </>
        )}

        {step === "confirm" && selectedTest && (
          <Card variant="highlight" style={{ alignItems: "center", padding: 24 }}>
            <View style={styles.checkCircle}>
              <Check color="#fff" size={28} />
            </View>
            <Text style={styles.confirmTitle}>Booking Confirmed!</Text>
            <Text style={styles.confirmSub}>
              {selectedTest.name} • {selectedSlot}
            </Text>
            <View style={styles.confirmLocation}>
              <MapPin size={14} color={colors.brand} />
              <Text style={styles.confirmLocationText}>{cityName}</Text>
            </View>
            <Text style={styles.confirmAddress}>{address}</Text>
            {orderId && (
              <Text style={styles.orderIdText}>Order ID: {orderId.slice(0, 8).toUpperCase()}</Text>
            )}
            <Text style={styles.confirmNote}>
              Our phlebotomist will call you 30 minutes before arrival. Reports will be shared within 24-48 hours.
            </Text>
            <Button title="Done" onPress={() => router.back()} style={{ marginTop: 20, width: "100%" }} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureChip({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureChip}>
      <Icon color={colors.brand} size={14} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 12 
  },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 20, paddingBottom: 40 },
  
  heroCard: { padding: 20, alignItems: "center" },
  heroTitle: { 
    fontFamily: fonts.headingExt, 
    fontSize: 20, 
    color: colors.text, 
    marginTop: 12 
  },
  heroSub: { 
    fontFamily: fonts.body, 
    color: colors.textMute, 
    fontSize: 14, 
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  featureRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  featureChip: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    backgroundColor: colors.bgAlt, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 999 
  },
  featureText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.text },
  
  sectionTitle: { 
    fontFamily: fonts.headingExt, 
    fontSize: 16, 
    color: colors.text, 
    marginTop: 24, 
    marginBottom: 12 
  },

  // City selection
  cityNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    marginBottom: 16,
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  cityCardWrapper: {
    width: "48%",
  },
  cityCard: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cityCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  cityName: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.text,
    marginTop: 8,
  },
  cityNameSelected: {
    color: colors.brand,
  },
  availableBadge: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  availableText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.success,
  },
  otherCityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    padding: 16,
  },
  otherCityTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
  },
  otherCityText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
    marginTop: 4,
    lineHeight: 18,
  },

  // Location bar
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  locationText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.brand,
  },
  changeLink: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.textMute,
    marginLeft: 8,
    textDecorationLine: "underline",
  },
  
  packageCard: { 
    backgroundColor: colors.bgAlt, 
    borderRadius: radius.lg, 
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  packageSelected: { borderColor: colors.brand },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  popularText: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#fff" },
  packageHeader: { flexDirection: "row", justifyContent: "space-between" },
  packageName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  testCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textMute, marginTop: 2 },
  priceCol: { alignItems: "flex-end" },
  price: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.brand },
  originalPrice: { 
    fontFamily: fonts.body, 
    fontSize: 12, 
    color: colors.textDim, 
    textDecorationLine: "line-through" 
  },
  testList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  testChip: { 
    backgroundColor: colors.bgWarm, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 999 
  },
  testChipText: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.text },
  radioOuter: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: colors.brand },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  
  summaryCard: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    padding: 16,
  },
  summaryTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  summaryLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  summaryLocationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMute,
  },
  summaryPrice: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.brand },
  
  input: { 
    backgroundColor: colors.bgWarm, 
    borderRadius: radius.lg, 
    padding: 14, 
    fontSize: 15, 
    fontFamily: fonts.body, 
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  
  slotGrid: { gap: 10 },
  slotBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10,
    backgroundColor: colors.bgAlt, 
    padding: 14, 
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  slotText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  slotTextActive: { color: "#fff" },
  
  infoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    marginTop: 16,
    backgroundColor: colors.success + "15",
    padding: 12,
    borderRadius: radius.md,
  },
  infoText: { fontFamily: fonts.body, fontSize: 12, color: colors.success, flex: 1 },
  
  backLink: { 
    fontFamily: fonts.bodyMed, 
    fontSize: 14, 
    color: colors.textMute, 
    textAlign: "center" 
  },
  
  checkCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: colors.success, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  confirmTitle: { 
    fontFamily: fonts.headingExt, 
    fontSize: 22, 
    color: colors.text, 
    marginTop: 16 
  },
  confirmSub: { 
    fontFamily: fonts.bodySemi, 
    fontSize: 14, 
    color: colors.brand, 
    marginTop: 8 
  },
  confirmLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  confirmLocationText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.brand,
  },
  confirmAddress: { 
    fontFamily: fonts.body, 
    fontSize: 13, 
    color: colors.textMute, 
    textAlign: "center",
    marginTop: 8,
  },
  orderIdText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 8,
    backgroundColor: colors.bgAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  confirmNote: { 
    fontFamily: fonts.body, 
    fontSize: 12, 
    color: colors.textDim, 
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
});
