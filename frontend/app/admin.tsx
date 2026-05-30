import React, { useEffect, useState, useCallback } from "react";
import { 
  Alert, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ChevronLeft, 
  Users, 
  Crown, 
  Camera, 
  Sparkles, 
  Droplets, 
  MessageCircle,
  Phone,
  Clock,
  MapPin,
  X,
  Check,
  AlertCircle,
  Edit3,
  Calendar,
} from "lucide-react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { colors, fonts, radius } from "@/src/lib/theme";

type TabType = "overview" | "blood-tests" | "dietitian";

interface BloodTestOrder {
  id: string;
  user_id: string;
  package_name: string;
  package_price: number;
  tests: string[];
  city: string;
  address: string;
  time_slot: string;
  status: string;
  phlebotomist_phone: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface DietitianConsult {
  id: string;
  user_id: string;
  preferred_time: string;
  topic: string;
  notes: string | null;
  status: string;
  confirmed_time: string | null;
  call_phone: string | null;
  admin_notes: string | null;
  created_at: string;
}

export default function Admin() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    onboardedUsers: 0,
    paidUsers: 0,
    scansThisMonth: 0,
    coachMessages: 0,
    mealPlans: 0,
    bloodTestOrders: 0,
    dietitianConsults: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Blood test orders
  const [bloodOrders, setBloodOrders] = useState<BloodTestOrder[]>([]);
  const [loadingBlood, setLoadingBlood] = useState(false);

  // Dietitian consults
  const [consults, setConsults] = useState<DietitianConsult[]>([]);
  const [loadingConsults, setLoadingConsults] = useState(false);

  // Edit modal
  const [editConsult, setEditConsult] = useState<DietitianConsult | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStats = async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const iso = monthStart.toISOString();

    const [u, ob, paid, sc, cm, mp, bt, dc] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarded", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).neq("subscription_tier", "free"),
      supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("source", "ai_vision").gte("logged_at", iso),
      supabase.from("coach_messages").select("id", { count: "exact", head: true }).gte("created_at", iso),
      supabase.from("meal_plans").select("id", { count: "exact", head: true }).gte("generated_at", iso),
      supabase.from("blood_test_orders").select("id", { count: "exact", head: true }),
      supabase.from("dietitian_consults").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: u.count || 0,
      onboardedUsers: ob.count || 0,
      paidUsers: paid.count || 0,
      scansThisMonth: sc.count || 0,
      coachMessages: cm.count || 0,
      mealPlans: mp.count || 0,
      bloodTestOrders: bt.count || 0,
      dietitianConsults: dc.count || 0,
    });
    setLoaded(true);
  };

  const fetchBloodOrders = async () => {
    setLoadingBlood(true);
    try {
      const { data, error } = await supabase
        .from("blood_test_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setBloodOrders(data || []);
    } catch (err: any) {
      console.error("Failed to fetch blood orders:", err);
    } finally {
      setLoadingBlood(false);
    }
  };

  const fetchConsults = async () => {
    setLoadingConsults(true);
    try {
      const { data, error } = await supabase
        .from("dietitian_consults")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setConsults(data || []);
    } catch (err: any) {
      console.error("Failed to fetch consults:", err);
    } finally {
      setLoadingConsults(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchStats();
    }
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role === "admin" && activeTab === "blood-tests") {
      fetchBloodOrders();
    }
  }, [profile?.role, activeTab]);

  useEffect(() => {
    if (profile?.role === "admin" && activeTab === "dietitian") {
      fetchConsults();
    }
  }, [profile?.role, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "overview") {
      await fetchStats();
    } else if (activeTab === "blood-tests") {
      await fetchBloodOrders();
    } else if (activeTab === "dietitian") {
      await fetchConsults();
    }
    setRefreshing(false);
  }, [activeTab]);

  const updateBloodOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("blood_test_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      setBloodOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      Alert.alert("Updated", `Status changed to ${newStatus}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const openEditConsult = (consult: DietitianConsult) => {
    setEditConsult(consult);
    setEditTime(consult.confirmed_time || "");
    setEditPhone(consult.call_phone || "");
    setEditNotes(consult.admin_notes || "");
  };

  const saveConsultChanges = async () => {
    if (!editConsult) return;
    setSaving(true);
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      if (editTime.trim()) {
        updates.confirmed_time = editTime.trim();
        updates.status = "confirmed";
      }
      if (editPhone.trim()) {
        updates.call_phone = editPhone.trim();
      }
      if (editNotes.trim()) {
        updates.admin_notes = editNotes.trim();
      }

      const { error } = await supabase
        .from("dietitian_consults")
        .update(updates)
        .eq("id", editConsult.id);

      if (error) throw error;

      setConsults((prev) =>
        prev.map((c) =>
          c.id === editConsult.id
            ? { ...c, ...updates }
            : c
        )
      );
      setEditConsult(null);
      Alert.alert("Saved", "Consultation updated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateConsultStatus = async (consultId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("dietitian_consults")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", consultId);
      if (error) throw error;
      setConsults((prev) =>
        prev.map((c) => (c.id === consultId ? { ...c, status: newStatus } : c))
      );
      Alert.alert("Updated", `Status changed to ${newStatus}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Card>
            <Text style={styles.deny}>This area is restricted to admins.</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const overviewCards = [
    { label: "Total Users", value: stats.totalUsers, icon: <Users color={colors.brand} size={18} /> },
    { label: "Onboarded", value: stats.onboardedUsers, icon: <Sparkles color={colors.brand} size={18} /> },
    { label: "Paid Users", value: stats.paidUsers, icon: <Crown color={colors.warning} size={18} /> },
    { label: "Scans (Month)", value: stats.scansThisMonth, icon: <Camera color={colors.terracotta} size={18} /> },
    { label: "Blood Test Orders", value: stats.bloodTestOrders, icon: <Droplets color={colors.info} size={18} /> },
    { label: "Dietitian Consults", value: stats.dietitianConsults, icon: <MessageCircle color={colors.success} size={18} /> },
  ];

  const estRevenue = Math.round(stats.paidUsers * 499 * 0.5 + (stats.paidUsers * 4999 * 0.5) / 12);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return colors.warning;
      case "confirmed": return colors.info;
      case "completed": return colors.success;
      case "cancelled": return colors.error;
      case "sample_collected":
      case "processing":
      case "report_ready":
        return colors.brand;
      default: return colors.textMute;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "blood-tests" && styles.tabActive]}
          onPress={() => setActiveTab("blood-tests")}
        >
          <Droplets size={14} color={activeTab === "blood-tests" ? colors.brand : colors.textMute} />
          <Text style={[styles.tabText, activeTab === "blood-tests" && styles.tabTextActive]}>
            Blood Tests
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "dietitian" && styles.tabActive]}
          onPress={() => setActiveTab("dietitian")}
        >
          <MessageCircle size={14} color={activeTab === "dietitian" ? colors.brand : colors.textMute} />
          <Text style={[styles.tabText, activeTab === "dietitian" && styles.tabTextActive]}>
            Dietitian
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <Card variant="dark">
              <Text style={[styles.label, { color: "rgba(255,255,255,0.7)" }]}>Estimated MRR</Text>
              <Text style={styles.revenue}>₹{estRevenue.toLocaleString()}</Text>
              <Text style={styles.revenueSub}>From {stats.paidUsers} paying users this period</Text>
            </Card>

            <View style={styles.grid}>
              {overviewCards.map((c) => (
                <View key={c.label} style={styles.cell}>
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {c.icon}
                      <Text style={styles.label}>{c.label}</Text>
                    </View>
                    <Text style={styles.statVal}>{loaded ? c.value.toLocaleString() : "—"}</Text>
                  </Card>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <Pressable style={styles.quickBtn} onPress={() => setActiveTab("blood-tests")}>
                <Droplets size={20} color={colors.brand} />
                <Text style={styles.quickBtnText}>Manage Blood Tests</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => setActiveTab("dietitian")}>
                <MessageCircle size={20} color={colors.brand} />
                <Text style={styles.quickBtnText}>Manage Consults</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Blood Tests Tab */}
        {activeTab === "blood-tests" && (
          <>
            <Card variant="highlight" style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Blood Test Orders</Text>
              <Text style={styles.summaryCount}>{bloodOrders.length} orders</Text>
            </Card>

            {loadingBlood ? (
              <Text style={styles.loadingText}>Loading orders...</Text>
            ) : bloodOrders.length === 0 ? (
              <Card>
                <View style={{ alignItems: "center", padding: 20 }}>
                  <AlertCircle size={32} color={colors.textMute} />
                  <Text style={styles.emptyText}>No blood test orders yet</Text>
                </View>
              </Card>
            ) : (
              bloodOrders.map((order) => (
                <Card key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderPackage}>{order.package_name}</Text>
                      <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <MapPin size={14} color={colors.textMute} />
                      <Text style={styles.detailText}>{order.city} • {order.address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Clock size={14} color={colors.textMute} />
                      <Text style={styles.detailText}>{order.time_slot}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={14} color={colors.textMute} />
                      <Text style={styles.detailText}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.testsRow}>
                    {order.tests?.slice(0, 4).map((test) => (
                      <View key={test} style={styles.testChip}>
                        <Text style={styles.testChipText}>{test}</Text>
                      </View>
                    ))}
                    {order.tests?.length > 4 && (
                      <Text style={styles.moreTests}>+{order.tests.length - 4} more</Text>
                    )}
                  </View>

                  <Text style={styles.priceTag}>₹{order.package_price}</Text>

                  {/* Status Actions */}
                  <View style={styles.actionRow}>
                    {order.status === "pending" && (
                      <Button
                        title="Confirm"
                        size="sm"
                        onPress={() => updateBloodOrderStatus(order.id, "confirmed")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {order.status === "confirmed" && (
                      <Button
                        title="Sample Collected"
                        size="sm"
                        onPress={() => updateBloodOrderStatus(order.id, "sample_collected")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {order.status === "sample_collected" && (
                      <Button
                        title="Processing"
                        size="sm"
                        onPress={() => updateBloodOrderStatus(order.id, "processing")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {order.status === "processing" && (
                      <Button
                        title="Report Ready"
                        size="sm"
                        onPress={() => updateBloodOrderStatus(order.id, "report_ready")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {order.status === "report_ready" && (
                      <Button
                        title="Complete"
                        size="sm"
                        onPress={() => updateBloodOrderStatus(order.id, "completed")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {!["completed", "cancelled"].includes(order.status) && (
                      <Pressable
                        style={styles.cancelBtn}
                        onPress={() =>
                          Alert.alert("Cancel Order?", "This cannot be undone.", [
                            { text: "No", style: "cancel" },
                            { text: "Yes, Cancel", onPress: () => updateBloodOrderStatus(order.id, "cancelled"), style: "destructive" },
                          ])
                        }
                      >
                        <X size={16} color={colors.error} />
                      </Pressable>
                    )}
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* Dietitian Tab */}
        {activeTab === "dietitian" && (
          <>
            <Card variant="highlight" style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Dietitian Consultations</Text>
              <Text style={styles.summaryCount}>{consults.length} bookings</Text>
            </Card>

            {loadingConsults ? (
              <Text style={styles.loadingText}>Loading consultations...</Text>
            ) : consults.length === 0 ? (
              <Card>
                <View style={{ alignItems: "center", padding: 20 }}>
                  <AlertCircle size={32} color={colors.textMute} />
                  <Text style={styles.emptyText}>No dietitian bookings yet</Text>
                </View>
              </Card>
            ) : (
              consults.map((consult) => (
                <Card key={consult.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderPackage} numberOfLines={2}>{consult.topic}</Text>
                      <Text style={styles.orderId}>#{consult.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(consult.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(consult.status) }]}>
                        {consult.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <Clock size={14} color={colors.textMute} />
                      <Text style={styles.detailText}>Preferred: {consult.preferred_time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={14} color={colors.textMute} />
                      <Text style={styles.detailText}>Booked: {formatDate(consult.created_at)}</Text>
                    </View>
                    {consult.confirmed_time && (
                      <View style={styles.detailRow}>
                        <Check size={14} color={colors.success} />
                        <Text style={[styles.detailText, { color: colors.success }]}>
                          Confirmed: {consult.confirmed_time}
                        </Text>
                      </View>
                    )}
                    {consult.call_phone && (
                      <View style={styles.detailRow}>
                        <Phone size={14} color={colors.brand} />
                        <Text style={[styles.detailText, { color: colors.brand }]}>
                          Call: {consult.call_phone}
                        </Text>
                      </View>
                    )}
                  </View>

                  {consult.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>User Notes:</Text>
                      <Text style={styles.notesText}>{consult.notes}</Text>
                    </View>
                  )}

                  {consult.admin_notes && (
                    <View style={[styles.notesBox, { backgroundColor: colors.brandLight }]}>
                      <Text style={[styles.notesLabel, { color: colors.brand }]}>Admin Notes:</Text>
                      <Text style={styles.notesText}>{consult.admin_notes}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <Button
                      title="Edit Details"
                      size="sm"
                      variant="outline"
                      onPress={() => openEditConsult(consult)}
                      style={{ flex: 1 }}
                      icon={<Edit3 size={14} color={colors.brand} />}
                    />
                    {consult.status === "pending" && (
                      <Button
                        title="Confirm"
                        size="sm"
                        onPress={() => openEditConsult(consult)}
                        style={{ flex: 1 }}
                      />
                    )}
                    {consult.status === "confirmed" && (
                      <Button
                        title="Complete"
                        size="sm"
                        onPress={() => updateConsultStatus(consult.id, "completed")}
                        style={{ flex: 1 }}
                      />
                    )}
                    {!["completed", "cancelled"].includes(consult.status) && (
                      <Pressable
                        style={styles.cancelBtn}
                        onPress={() =>
                          Alert.alert("Cancel Consult?", "This cannot be undone.", [
                            { text: "No", style: "cancel" },
                            { text: "Yes, Cancel", onPress: () => updateConsultStatus(consult.id, "cancelled"), style: "destructive" },
                          ])
                        }
                      >
                        <X size={16} color={colors.error} />
                      </Pressable>
                    )}
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Consult Modal */}
      <Modal visible={!!editConsult} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Consultation</Text>
              <Pressable onPress={() => setEditConsult(null)} hitSlop={10}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            {editConsult && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>
                    #{editConsult.id.slice(0, 8).toUpperCase()} • {editConsult.topic.slice(0, 40)}...
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Confirmed Time</Text>
                <TextInput
                  value={editTime}
                  onChangeText={setEditTime}
                  placeholder="e.g. Tomorrow 4:00 PM IST"
                  placeholderTextColor={colors.textDim}
                  style={styles.modalInput}
                />

                <Text style={styles.inputLabel}>Phone Number for Call</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor={colors.textDim}
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Admin Notes</Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Internal notes..."
                  placeholderTextColor={colors.textDim}
                  style={[styles.modalInput, { minHeight: 80, textAlignVertical: "top" }]}
                  multiline
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditConsult(null)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Save Changes"
                    onPress={saveConsultChanges}
                    loading={saving}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  
  // Tab Bar
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bgAlt,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: colors.brandLight,
  },
  tabText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.textMute,
  },
  tabTextActive: {
    color: colors.brand,
  },

  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.textMute,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  revenue: {
    fontFamily: fonts.headingExt,
    fontSize: 36,
    color: "#fff",
    marginTop: 8,
    letterSpacing: -1,
  },
  revenueSub: {
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "48%" },
  statVal: {
    fontFamily: fonts.headingExt,
    fontSize: 24,
    color: colors.text,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  deny: {
    fontFamily: fonts.bodyMed,
    color: colors.textMute,
    padding: 20,
    textAlign: "center",
  },

  sectionTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 16,
    color: colors.text,
    marginTop: 10,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.bgAlt,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.text,
  },

  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  summaryTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 16,
    color: colors.text,
  },
  summaryCount: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.brand,
  },

  loadingText: {
    fontFamily: fonts.body,
    color: colors.textMute,
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    fontFamily: fonts.bodyMed,
    color: colors.textMute,
    marginTop: 12,
  },

  orderCard: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderPackage: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  orderId: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
  },

  orderDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMute,
    flex: 1,
  },

  testsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  testChip: {
    backgroundColor: colors.bgWarm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  testChipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 10,
    color: colors.text,
  },
  moreTests: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMute,
    alignSelf: "center",
  },

  priceTag: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    color: colors.brand,
    marginTop: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  notesBox: {
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
  },
  notesLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.textMute,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.headingExt,
    fontSize: 18,
    color: colors.text,
  },
  modalInfo: {
    backgroundColor: colors.bgAlt,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  modalInfoText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.textMute,
  },
  inputLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.textMute,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
});
