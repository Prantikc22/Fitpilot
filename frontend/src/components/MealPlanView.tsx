import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Coffee, Soup, UtensilsCrossed, Cookie, Clock, Flame, Sparkles, Wand2, Beef } from "lucide-react-native";
import Animated, { FadeInDown, FadeIn, Layout } from "react-native-reanimated";
import type { MealPlan, Meal } from "@/src/lib/api";
import { colors, fonts } from "@/src/lib/theme";

const META = {
  breakfast: { label: "Breakfast", Icon: Coffee, color: "#E8B057" },
  lunch: { label: "Lunch", Icon: Soup, color: "#3A7D44" },
  dinner: { label: "Dinner", Icon: UtensilsCrossed, color: "#C0604A" },
  snack: { label: "Snack", Icon: Cookie, color: "#4A708B" },
} as const;

function MealBlock({ kind, meal, index }: { kind: keyof typeof META; meal?: Meal; index: number }) {
  if (!meal || !meal.name) return null;
  const { label, Icon, color } = META[kind];
  
  // Safely get values with defaults
  const calories = meal.calories ?? 0;
  const protein = meal.protein ?? 0;
  const items = Array.isArray(meal.items) ? meal.items : [];
  const prepTime = meal.prep_time || '';
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify().damping(14)}
      layout={Layout.springify()}
      style={styles.meal} 
      testID={`meal-${kind}`}
    >
      <View style={styles.mealHead}>
        <Animated.View 
          entering={FadeIn.delay(index * 100 + 200)}
          style={[styles.mealIcon, { backgroundColor: color + "20" }]}
        >
          <Icon color={color} size={18} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mealLabel}>{label}</Text>
          <Text style={styles.mealName} numberOfLines={2}>
            {meal.name}
          </Text>
        </View>
        <View style={styles.macroBlock}>
          <Text style={styles.macroVal}>{Math.round(calories)}</Text>
          <Text style={styles.macroUnit}>kcal</Text>
        </View>
      </View>
      {items.length > 0 && (
        <View style={styles.itemsRow}>
          {items.slice(0, 5).map((it, i) => (
            <Animated.View 
              key={i} 
              entering={FadeIn.delay(index * 100 + 300 + i * 50)}
              style={styles.itemPill}
            >
              <Text style={styles.itemPillText}>{String(it)}</Text>
            </Animated.View>
          ))}
        </View>
      )}
      <View style={styles.metaRow}>
        {prepTime ? (
          <View style={styles.metaPill}>
            <Clock color={colors.textMute} size={11} />
            <Text style={styles.metaText}>{prepTime}</Text>
          </View>
        ) : null}
        <View style={styles.metaPill}>
          <Beef color={colors.terracotta} size={11} />
          <Text style={styles.metaText}>{Math.round(protein)}g protein</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function MealPlanView({
  plan,
  onImprove,
}: {
  plan: MealPlan;
  onImprove?: () => void;
}) {
  // Safely extract totals with defaults
  const totalCalories = plan?.total_calories ?? 0;
  const totalProtein = plan?.total_protein ?? 0;
  const tip = plan?.tip || '';
  
  // Check if we have any valid meals
  const hasMeals = plan?.breakfast?.name || plan?.lunch?.name || plan?.dinner?.name || plan?.snack?.name;
  
  if (!hasMeals) {
    return (
      <Animated.View entering={FadeIn} style={styles.emptyState}>
        <Sparkles color={colors.textMute} size={24} />
        <Text style={styles.emptyText}>No meal plan data available</Text>
        <Text style={styles.emptyHint}>Try generating a new plan</Text>
      </Animated.View>
    );
  }
  
  return (
    <View>
      <Animated.View entering={FadeInDown.springify()} style={styles.totalsRow}>
        <View style={styles.totalCell}>
          <Text style={styles.totalVal}>{Math.round(totalCalories)}</Text>
          <Text style={styles.totalLabel}>kcal total</Text>
        </View>
        <View style={styles.totalCell}>
          <Text style={styles.totalVal}>{Math.round(totalProtein)}g</Text>
          <Text style={styles.totalLabel}>protein</Text>
        </View>
      </Animated.View>

      <MealBlock kind="breakfast" meal={plan.breakfast} index={0} />
      <MealBlock kind="lunch" meal={plan.lunch} index={1} />
      <MealBlock kind="dinner" meal={plan.dinner} index={2} />
      <MealBlock kind="snack" meal={plan.snack} index={3} />

      {tip ? (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.tipCard}>
          <Sparkles color={colors.brand} size={14} />
          <Text style={styles.tipText}>{tip}</Text>
        </Animated.View>
      ) : null}

      {onImprove ? (
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Pressable onPress={onImprove} style={styles.improveBtn} testID="meal-plan-improve">
            <Wand2 color={colors.brand} size={16} />
            <Text style={styles.improveText}>Ask the nutritionist to improve</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontFamily: fonts.bodySemi, color: colors.textMute, fontSize: 14 },
  emptyHint: { fontFamily: fonts.body, color: colors.textDim, fontSize: 12 },
  totalsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  totalCell: { flex: 1, backgroundColor: colors.brand, borderRadius: 18, padding: 14, alignItems: "center" },
  totalVal: { fontFamily: fonts.headingExt, fontSize: 22, color: "#fff", letterSpacing: -0.6 },
  totalLabel: { fontFamily: fonts.bodyMed, color: "rgba(255,255,255,0.8)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  meal: { backgroundColor: colors.bgAlt, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  mealHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  mealLabel: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textMute, textTransform: "uppercase", letterSpacing: 0.6 },
  mealName: { fontFamily: fonts.headingExt, fontSize: 15, color: colors.text, marginTop: 2, letterSpacing: -0.2, lineHeight: 19 },
  macroBlock: { alignItems: "flex-end" },
  macroVal: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text, letterSpacing: -0.5 },
  macroUnit: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.textMute, textTransform: "uppercase" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  itemPill: { backgroundColor: colors.bgWarm, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  itemPillText: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.text },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.textMute },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.brandLight, padding: 12, borderRadius: 14, marginTop: 4 },
  tipText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text, lineHeight: 19 },
  improveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.brand, marginTop: 12 },
  improveText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.brand },
});
