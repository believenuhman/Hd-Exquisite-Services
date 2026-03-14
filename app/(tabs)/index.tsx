import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { CATEGORIES, productMatchesCategory } from "@/constants/categories";
import { supabase, Product } from "@/lib/supabase";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

const { width } = Dimensions.get("window");
const H_PAD = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - H_PAD * 2 - CARD_GAP) / 2;
const UD = Platform.OS !== "web";
const FALLBACK_IMG = require("@/assets/images/hennessy.png");

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.92, useNativeDriver: UD, speed: 40 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: UD, speed: 30 }).start()
        }
        style={styles.pillWrap}
      >
        {active ? (
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pillActive}
          >
            <Text style={styles.pillActiveText}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.pillInactive}>
            <Text style={styles.pillInactiveText}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ProductGridCard({
  product,
  formatPrice,
}: {
  product: Product;
  formatPrice: (n: number) => string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart } = useCart();

  return (
    <Animated.View style={[styles.gridCard, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: UD, speed: 30 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: UD, speed: 20 }).start()
        }
        style={styles.gridCardInner}
      >
        <View style={styles.gridImageWrap}>
          <LinearGradient
            colors={["rgba(214,162,74,0.14)", "rgba(11,11,15,0.6)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.gridGlow} />
          <Image
            source={product.image_url ? { uri: product.image_url } : FALLBACK_IMG}
            style={styles.gridImg}
            resizeMode="contain"
          />
          {product.is_trending && (
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>HOT</Text>
            </View>
          )}
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.gridCat} numberOfLines={1}>
            {product.category}
          </Text>
          <Text style={styles.gridName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.gridBottom}>
            <Text style={styles.gridPrice}>{formatPrice(product.price)}</Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                addToCart(product);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hitSlop={10}
            >
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                style={styles.gridAddBtn}
              >
                <Ionicons name="add" size={18} color="#0B0B0F" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const { totalItems } = useCart();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setAllProducts(data as Product[]);
    } catch (e) {
      console.warn("Products fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = allProducts.filter((p) =>
    productMatchesCategory(p.category, activeCategory)
  );

  const gridRows: Product[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    gridRows.push(filtered.slice(i, i + 2));
  }

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: botPad + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts();
            }}
            tintColor={Colors.goldAccent}
          />
        }
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <View style={styles.topRow}>
            <View style={styles.brandGroup}>
              <View style={styles.logoRing}>
                <Image
                  source={require("@/assets/images/logo.jpg")}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.brandSub}>PREMIUM SPIRITS</Text>
                <Text style={styles.brandName}>HD XQUISITE</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={styles.cartBtn}
            >
              <Ionicons name="bag-outline" size={20} color={Colors.textPrimary} />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeNum}>
                    {totalItems > 9 ? "9+" : totalItems}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Hero search banner ──────────────────── */}
          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            style={styles.heroBanner}
          >
            <LinearGradient
              colors={["rgba(214,162,74,0.18)", "rgba(214,162,74,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBorderAccent} />
            <View>
              <Text style={styles.heroTitle}>Tap &amp; Sip.</Text>
              <Text style={styles.heroSub}>
                Fast delivery · Premium spirits
              </Text>
            </View>
            <View style={styles.heroSearchPill}>
              <Ionicons name="search" size={14} color={Colors.goldAccent} />
              <Text style={styles.heroSearchText}>Search products…</Text>
            </View>
          </Pressable>

          {/* ── Category tabs ───────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {CATEGORIES.map((c) => (
              <CategoryPill
                key={c}
                label={c}
                active={activeCategory === c}
                onPress={() => {
                  setActiveCategory(c);
                  Haptics.selectionAsync();
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Products ───────────────────────────── */}
        {loading ? (
          <View style={styles.loadWrap}>
            <ActivityIndicator color={Colors.goldAccent} size="large" />
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {/* Section title */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{activeCategory}</Text>
              <Text style={styles.sectionCount}>
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </Text>
            </View>

            {/* Grid */}
            {filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="wine-outline"
                  size={52}
                  color="rgba(214,162,74,0.25)"
                />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>
                  No {activeCategory} products available
                </Text>
              </View>
            ) : (
              gridRows.map((row, i) => (
                <View key={i} style={styles.gridRow}>
                  {row.map((p) => (
                    <ProductGridCard
                      key={p.id}
                      product={p}
                      formatPrice={formatPrice}
                    />
                  ))}
                  {row.length === 1 && (
                    <View style={{ width: CARD_WIDTH }} />
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: H_PAD },

  /* Header */
  header: { marginBottom: 6 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoRing: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.35)",
  },
  logoImg: { width: 46, height: 46 },
  brandSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 10,
    color: Colors.goldAccent,
    letterSpacing: 2.5,
  },
  brandName: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeNum: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 9,
    color: "#0B0B0F",
  },

  /* Hero banner */
  heroBanner: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    padding: 18,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
  },
  heroBorderAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.goldAccent,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  heroSub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroSearchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
  },
  heroSearchText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 12,
    color: "rgba(185,185,195,0.55)",
  },

  /* Category pills */
  pillRow: { gap: 8, paddingRight: 4, marginBottom: 6 },
  pillWrap: { borderRadius: 50, overflow: "hidden" },
  pillActive: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50 },
  pillActiveText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    color: "#0B0B0F",
    letterSpacing: 0.2,
  },
  pillInactive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillInactiveText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: "rgba(185,185,195,0.65)",
    letterSpacing: 0.2,
  },

  /* Loading */
  loadWrap: { paddingVertical: 60, alignItems: "center" },

  /* Grid */
  gridWrap: { paddingTop: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  sectionCount: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },

  /* Grid card */
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#13121A",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  gridCardInner: { flex: 1 },
  gridImageWrap: {
    height: 155,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gridGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(214,162,74,0.13)",
  },
  gridImg: { width: CARD_WIDTH - 24, height: 135 },
  trendBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.goldAccent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  trendBadgeText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 8,
    color: "#0B0B0F",
    letterSpacing: 0.8,
  },
  gridInfo: {
    padding: 12,
    backgroundColor: "rgba(11,11,15,0.6)",
    gap: 3,
  },
  gridCat: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 10,
    color: Colors.goldAccent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  gridName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  gridBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  gridPrice: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    color: Colors.textGold,
  },
  gridAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Empty */
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
