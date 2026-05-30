import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Image, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, ExternalLink, Star, ShoppingBag, Heart, Percent, ChevronRight } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Card } from "@/src/components/Card";
import { colors, fonts, radius } from "@/src/lib/theme";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "supplements", label: "Supplements" },
  { id: "fitness", label: "Fitness" },
  { id: "food", label: "Food & Snacks" },
  { id: "wellness", label: "Wellness" },
];

const PRODUCTS = [
  {
    id: "1",
    name: "Whey Protein Isolate",
    brand: "MuscleBlaze",
    category: "supplements",
    price: 2499,
    originalPrice: 3499,
    discount: "29%",
    rating: 4.5,
    reviews: 1240,
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200",
    affiliateUrl: "https://example.com/product1",
    tag: "Popular",
  },
  {
    id: "2",
    name: "Resistance Bands Set",
    brand: "Boldfit",
    category: "fitness",
    price: 449,
    originalPrice: 799,
    discount: "44%",
    rating: 4.3,
    reviews: 856,
    image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=200",
    affiliateUrl: "https://example.com/product2",
  },
  {
    id: "3",
    name: "Peanut Butter (Crunchy)",
    brand: "MyFitness",
    category: "food",
    price: 399,
    originalPrice: 499,
    discount: "20%",
    rating: 4.7,
    reviews: 2105,
    image: "https://images.unsplash.com/photo-1612871689353-fcd0c1d14d99?w=200",
    affiliateUrl: "https://example.com/product3",
    tag: "Best Seller",
  },
  {
    id: "4",
    name: "Omega-3 Fish Oil",
    brand: "HealthKart",
    category: "supplements",
    price: 649,
    originalPrice: 899,
    discount: "28%",
    rating: 4.4,
    reviews: 721,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200",
    affiliateUrl: "https://example.com/product4",
  },
  {
    id: "5",
    name: "Yoga Mat Premium",
    brand: "Strauss",
    category: "fitness",
    price: 699,
    originalPrice: 1299,
    discount: "46%",
    rating: 4.6,
    reviews: 1892,
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200",
    affiliateUrl: "https://example.com/product5",
  },
  {
    id: "6",
    name: "Green Tea Extract",
    brand: "Naturyz",
    category: "wellness",
    price: 549,
    originalPrice: 799,
    discount: "31%",
    rating: 4.2,
    reviews: 432,
    image: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=200",
    affiliateUrl: "https://example.com/product6",
  },
];

export default function Marketplace() {
  const router = useRouter();
  const [category, setCategory] = useState("all");

  const filtered = category === "all" 
    ? PRODUCTS 
    : PRODUCTS.filter((p) => p.category === category);

  const openProduct = (url: string, name: string) => {
    Alert.alert(
      "Open External Link",
      `You'll be redirected to purchase ${name}. Leanly may earn a small commission.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => Linking.openURL(url) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Shop</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Card variant="highlight" style={styles.heroCard}>
          <ShoppingBag color={colors.brand} size={28} />
          <Text style={styles.heroTitle}>Curated Health Products</Text>
          <Text style={styles.heroSub}>
            Handpicked supplements, fitness gear & healthy snacks with exclusive discounts.
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Percent color={colors.success} size={12} />
              <Text style={styles.badgeText}>Up to 50% off</Text>
            </View>
            <View style={styles.badge}>
              <Heart color={colors.terracotta} size={12} />
              <Text style={styles.badgeText}>Leanly Approved</Text>
            </View>
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.catScroll}
          contentContainerStyle={styles.catContainer}
        >
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[styles.catPill, category === c.id && styles.catPillActive]}
            >
              <Text style={[styles.catText, category === c.id && styles.catTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Product Grid */}
        <View style={styles.grid}>
          {filtered.map((product, index) => (
            <Animated.View
              key={product.id}
              entering={FadeInDown.delay(index * 50).duration(300)}
              style={styles.gridItem}
            >
              <Pressable
                style={styles.productCard}
                onPress={() => openProduct(product.affiliateUrl, product.name)}
              >
                {product.tag && (
                  <View style={styles.productTag}>
                    <Text style={styles.productTagText}>{product.tag}</Text>
                  </View>
                )}
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productBrand}>{product.brand}</Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Star color="#FFB800" size={12} fill="#FFB800" />
                    <Text style={styles.rating}>{product.rating}</Text>
                    <Text style={styles.reviews}>({product.reviews})</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{product.price}</Text>
                    <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{product.discount}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.buyBtn}>
                  <Text style={styles.buyText}>View</Text>
                  <ExternalLink color={colors.brand} size={14} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          * Prices and availability may vary. Leanly earns a small commission on purchases.
        </Text>
      </ScrollView>
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
    paddingVertical: 12 
  },
  title: { fontFamily: fonts.headingExt, fontSize: 18, color: colors.text },
  scroll: { padding: 16, paddingBottom: 40 },
  
  heroCard: { padding: 20, alignItems: "center" },
  heroTitle: { 
    fontFamily: fonts.headingExt, 
    fontSize: 20, 
    color: colors.text, 
    marginTop: 12,
    textAlign: "center",
  },
  heroSub: { 
    fontFamily: fonts.body, 
    color: colors.textMute, 
    fontSize: 14, 
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  badgeRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  badge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    backgroundColor: colors.bgAlt, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 999 
  },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.text },
  
  catScroll: { marginTop: 16 },
  catContainer: { gap: 8, paddingHorizontal: 4 },
  catPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: colors.bgAlt, 
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  catText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  catTextActive: { color: "#fff" },
  
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 12, 
    marginTop: 16,
  },
  gridItem: { width: "48%" },
  productCard: { 
    backgroundColor: colors.bgAlt, 
    borderRadius: radius.lg, 
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  productTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.terracotta,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  productTagText: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#fff" },
  productImage: { width: "100%", height: 120, backgroundColor: colors.bgWarm },
  productInfo: { padding: 12 },
  productBrand: { 
    fontFamily: fonts.bodyMed, 
    fontSize: 10, 
    color: colors.textMute, 
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productName: { 
    fontFamily: fonts.bodySemi, 
    fontSize: 13, 
    color: colors.text, 
    marginTop: 4,
    lineHeight: 18,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  rating: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  reviews: { fontFamily: fonts.body, fontSize: 11, color: colors.textMute },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  price: { fontFamily: fonts.headingExt, fontSize: 16, color: colors.text },
  originalPrice: { 
    fontFamily: fonts.body, 
    fontSize: 12, 
    color: colors.textDim, 
    textDecorationLine: "line-through" 
  },
  discountBadge: { backgroundColor: colors.success + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.success },
  buyBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderTopColor: colors.border 
  },
  buyText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.brand },
  
  disclaimer: { 
    fontFamily: fonts.body, 
    fontSize: 11, 
    color: colors.textDim, 
    textAlign: "center", 
    marginTop: 24,
    lineHeight: 16,
  },
});
