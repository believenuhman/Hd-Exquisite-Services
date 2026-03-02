import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { supabase, Product } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

const { width } = Dimensions.get("window");
const UD = Platform.OS !== "web";
const CATS = ["Beers", "Whiskey", "Wine", "Vodka", "Rum"];
const FALLBACK_IMG = require("@/assets/images/hennessy.png");

function CategoryPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  if (active) {
    return (
      <Pressable onPress={onPress} style={styles.pill}>
        <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pillFilled}>
          <Text style={styles.pillTextActive}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <View style={styles.pillInactive}>
        <Text style={styles.pillTextInactive}>{label}</Text>
      </View>
    </Pressable>
  );
}

function FeaturedRow({ product, formatPrice }: { product: Product; formatPrice: (n: number) => string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart } = useCart();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: UD, speed: 20 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: UD, speed: 20 }).start()}
        style={styles.featCard}
      >
        <LinearGradient colors={["rgba(214,162,74,0.13)", "rgba(20,20,28,0.9)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.featGlow} />
        <Image
          source={product.image_url ? { uri: product.image_url } : FALLBACK_IMG}
          style={styles.featImage}
          resizeMode="contain"
        />
        <View style={styles.featInfo}>
          <View>
            <Text style={styles.featCategory}>{product.category}</Text>
            <Text style={styles.featName}>{product.name}</Text>
            <Text style={styles.featPrice}>{formatPrice(product.price)}</Text>
          </View>
          <Pressable onPress={(e) => { e.stopPropagation(); addToCart(product); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} style={styles.featAddBtn}>
              <Ionicons name="bag-add" size={16} color="#0B0B0F" />
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("Whiskey");
  const { addToCart } = useCart();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (data) setAllProducts(data as Product[]);
    } catch (e) {
      console.warn("Products fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const trending = allProducts.filter((p) => p.is_trending);
  const filtered = allProducts.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
  const displayProducts = filtered.length > 0 ? filtered : allProducts;

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 14, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} tintColor={Colors.goldAccent} />}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Image source={require("@/assets/images/logo.jpg")} style={styles.logoImg} resizeMode="contain" />
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.brandTitle}>HD XQUISITE</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/cart")} style={styles.cartBtn}>
            <Ionicons name="bag-outline" size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {/* Search pill */}
        <Pressable onPress={() => router.push("/(tabs)/search")} style={styles.searchPill}>
          <Ionicons name="search" size={18} color="rgba(185,185,195,0.5)" />
          <Text style={styles.searchPlaceholder}>Search Products…</Text>
        </Pressable>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsRow}>
          {CATS.map((c) => (
            <CategoryPill key={c} label={c} active={activeCategory === c} onPress={() => setActiveCategory(c)} />
          ))}
        </ScrollView>

        {/* Trending */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={Colors.goldAccent} size="large" />
          </View>
        ) : (
          <>
            {trending.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trending</Text>
                  <Pressable onPress={() => router.push("/(tabs)/search")}>
                    <Text style={styles.seeAll}>See All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
                  {trending.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      formatPrice={formatPrice}
                      onPress={() => router.push(`/product/${p.id}`)}
                      onAddToCart={() => { addToCart(p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* All Spirits */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>All Spirits</Text>
            </View>
            {displayProducts.map((p) => (
              <FeaturedRow key={p.id} product={p} formatPrice={formatPrice} />
            ))}
            {displayProducts.length === 0 && (
              <Text style={styles.emptyText}>No products in this category yet.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImg: { width: 44, height: 44, borderRadius: 10 },
  greeting: { fontFamily: "CormorantGaramond_400Regular", fontSize: 13, color: Colors.textSecondary },
  brandTitle: { fontFamily: "PlayfairDisplay_900Black", fontSize: 16, color: Colors.textPrimary, letterSpacing: 2 },
  cartBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(214,162,74,0.15)",
  },
  searchPill: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(214,162,74,0.15)",
    borderRadius: 26, paddingHorizontal: 18, paddingVertical: 13,
    marginBottom: 18,
  },
  searchPlaceholder: { fontFamily: "CormorantGaramond_400Regular", fontSize: 16, color: "rgba(185,185,195,0.45)" },
  catsRow: { gap: 8, paddingRight: 8, marginBottom: 20 },
  pill: { borderRadius: 50, overflow: "hidden" },
  pillFilled: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50 },
  pillTextActive: { fontSize: 13, fontFamily: "CormorantGaramond_600SemiBold", color: "#0B0B0F", letterSpacing: 0.3 },
  pillInactive: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  pillTextInactive: { fontSize: 13, fontFamily: "CormorantGaramond_400Regular", color: "rgba(185,185,195,0.75)", letterSpacing: 0.3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: Colors.textPrimary },
  seeAll: { fontFamily: "CormorantGaramond_600SemiBold", fontSize: 14, color: Colors.goldAccent },
  trendingRow: { gap: 0, paddingRight: 8, marginBottom: 24 },
  featCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    overflow: "hidden",
    marginBottom: 12,
    height: 90,
  },
  featGlow: {
    position: "absolute",
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(214,162,74,0.12)",
    left: 20,
  },
  featImage: { width: 70, height: 80, marginHorizontal: 8 },
  featInfo: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 14 },
  featCategory: { fontFamily: "CormorantGaramond_400Regular", fontSize: 11, color: Colors.goldAccent, letterSpacing: 1.5, textTransform: "uppercase" },
  featName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, color: Colors.textPrimary },
  featPrice: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, color: Colors.textGold, marginTop: 2 },
  featAddBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyText: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 15, textAlign: "center", paddingVertical: 40 },
});
