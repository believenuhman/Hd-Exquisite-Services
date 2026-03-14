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
import { ProductCard } from "@/components/ProductCard";
import { ScreenBackground } from "@/components/ScreenBackground";
import { DrawerMenu } from "@/components/DrawerMenu";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

const { width } = Dimensions.get("window");
const H_PAD = 18;
const GRID_GAP = 12;
const GRID_CARD_W = (width - H_PAD * 2 - GRID_GAP) / 2;
const UD = Platform.OS !== "web";
const FALLBACK_IMG = require("@/assets/images/hennessy.png");
const HD_LOGO = require("@/assets/logo/hd-xquisite-logo-dark.png");


function CategoryChip({
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
        style={[styles.chip, active && styles.chipActive]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function GridCard({
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
        <View style={styles.gridImgWrap}>
          <Image
            source={product.image_url ? { uri: product.image_url } : FALLBACK_IMG}
            style={styles.gridImg}
            resizeMode="contain"
          />
          {product.is_trending && (
            <View style={styles.gridBadge}>
              <Text style={styles.gridBadgeText}>Bestseller</Text>
            </View>
          )}
          <View style={styles.gridRating}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.gridRatingText}>{product.rating}</Text>
          </View>
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.gridName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.gridPriceRow}>
            <Text style={styles.gridPrice}>{formatPrice(product.price)}</Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                addToCart(product);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hitSlop={10}
              style={styles.gridAddBtn}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { totalItems, addToCart } = useCart();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [menuOpen, setMenuOpen] = useState(false);
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

  const featured = allProducts.filter((p) => p.is_trending);
  const bestsellers = allProducts.filter((p) => !p.is_trending).slice(0, 10);

  const filtered =
    activeCategory === "All"
      ? allProducts
      : allProducts.filter((p) =>
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
        {/* ── Top action bar ──────────────────────── */}
        <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
          <Pressable
            onPress={() => {
              setMenuOpen((prev) => !prev);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="menu" size={26} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.topRight}>
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="search" size={22} color={Colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="bag-outline" size={22} color={Colors.textPrimary} />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeNum}>
                    {totalItems > 9 ? "9+" : totalItems}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Brand logo header ───────────────────── */}
        <Pressable
          onPress={() => setActiveCategory("All")}
          style={styles.logoHeader}
        >
          <View style={styles.logoGlow} />
          <Image source={HD_LOGO} style={styles.headerLogo} resizeMode="contain" />
        </Pressable>

        {/* ── Hero banner ─────────────────────────── */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={["#1A0E04", "#0D090C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroGlowLeft} />
          <View style={styles.heroGlowRight} />
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Premium{"\n"}Spirits</Text>
            <Text style={styles.heroSub}>Free delivery on $50+</Text>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={11} color="#000" />
              <Text style={styles.heroBadgeText}>Fast Delivery</Text>
            </View>
          </View>
          <View style={styles.heroBottles}>
            <Image
              source={require("@/assets/images/hennessy.png")}
              style={[styles.heroBottle, { transform: [{ rotate: "-8deg" }] }]}
              resizeMode="contain"
            />
            <Image
              source={require("@/assets/images/vodka.png")}
              style={[styles.heroBottle, styles.heroBottleCenter]}
              resizeMode="contain"
            />
            <Image
              source={require("@/assets/images/rum.png")}
              style={[styles.heroBottle, { transform: [{ rotate: "8deg" }] }]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Search bar ──────────────────────────── */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={styles.searchBar}
        >
          <Ionicons name="search" size={18} color="rgba(100,100,110,0.7)" />
          <Text style={styles.searchPlaceholder}>Search drinks…</Text>
          <View style={styles.searchFilter}>
            <Ionicons name="options-outline" size={16} color={Colors.goldAccent} />
          </View>
        </Pressable>

        {/* ── Category chips ──────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <CategoryChip
            label="All"
            active={activeCategory === "All"}
            onPress={() => {
              setActiveCategory("All");
              Haptics.selectionAsync();
            }}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
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

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.goldAccent} size="large" />
          </View>
        ) : activeCategory === "All" ? (
          <>
            {/* ── Featured ───────────────────────── */}
            {featured.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Featured</Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/search")}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="arrow-forward" size={13} color={Colors.goldAccent} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalRow}
                >
                  {featured.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      formatPrice={formatPrice}
                      onPress={() => router.push(`/product/${p.id}`)}
                      onAddToCart={() => {
                        addToCart(p);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Best Sellers ───────────────────── */}
            {bestsellers.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Best Sellers</Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/search")}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                    <Ionicons name="arrow-forward" size={13} color={Colors.goldAccent} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalRow}
                >
                  {bestsellers.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      formatPrice={formatPrice}
                      onPress={() => router.push(`/product/${p.id}`)}
                      onAddToCart={() => {
                        addToCart(p);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {allProducts.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="wine-outline" size={48} color="rgba(228,161,43,0.3)" />
                <Text style={styles.emptyTitle}>No products yet</Text>
                <Text style={styles.emptySub}>Check back soon for new arrivals</Text>
              </View>
            )}
          </>
        ) : (
          /* ── Category grid ─────────────────────── */
          <View style={styles.gridSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{activeCategory}</Text>
              <Text style={styles.countLabel}>
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </Text>
            </View>
            {filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="wine-outline" size={48} color="rgba(228,161,43,0.25)" />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>
                  No {activeCategory} products available
                </Text>
              </View>
            ) : (
              gridRows.map((row, i) => (
                <View key={i} style={styles.gridRow}>
                  {row.map((p) => (
                    <GridCard key={p.id} product={p} formatPrice={formatPrice} />
                  ))}
                  {row.length === 1 && <View style={{ width: GRID_CARD_W }} />}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Drawer rendered after ScrollView — Modal floats above everything */}
      <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: H_PAD },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  /* Brand logo header */
  logoHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 14,
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 220,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(228,161,43,0.07)",
    shadowColor: Colors.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 0,
  },
  headerLogo: {
    width: 200,
    height: 80,
  },

  topRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.magenta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },

  /* Hero banner */
  heroBanner: {
    borderRadius: 20,
    overflow: "hidden",
    height: 170,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(228,161,43,0.2)",
  },
  heroGlowLeft: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(201,30,140,0.18)",
    left: -40,
    top: -20,
  },
  heroGlowRight: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(228,161,43,0.14)",
    right: -20,
    bottom: -30,
  },
  heroTextBlock: { flex: 1, zIndex: 2 },
  heroTitle: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 20,
    color: Colors.goldAccent,
    lineHeight: 25,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.goldAccent,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#000",
    letterSpacing: 0.3,
  },
  heroBottles: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: -8,
    zIndex: 2,
    height: 140,
    marginRight: -8,
  },
  heroBottle: { width: 44, height: 120 },
  heroBottleCenter: {
    width: 52,
    height: 140,
    marginBottom: -4,
    marginHorizontal: 6,
  },

  /* Search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(80,80,90,0.65)",
  },
  searchFilter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(228,161,43,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Category chips */
  chipsRow: {
    gap: 8,
    paddingRight: 4,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: {
    backgroundColor: Colors.goldAccent,
    borderColor: Colors.goldAccent,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(200,200,210,0.75)",
  },
  chipTextActive: {
    color: "#000",
    fontFamily: "Inter_600SemiBold",
  },

  /* Loader */
  loaderWrap: { paddingVertical: 60, alignItems: "center" },

  /* Sections */
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 19,
    color: Colors.textPrimary,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.goldAccent,
  },
  horizontalRow: { gap: 0, paddingRight: 4 },
  countLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* Grid */
  gridSection: { marginBottom: 12 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },
  gridCard: {
    width: GRID_CARD_W,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(228,161,43,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  gridCardInner: { flex: 1 },
  gridImgWrap: {
    height: 148,
    backgroundColor: "#1C1828",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridImg: { width: GRID_CARD_W - 18, height: 128 },
  gridBadge: {
    position: "absolute",
    top: 10,
    left: 0,
    backgroundColor: Colors.goldAccent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  gridBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#000",
    letterSpacing: 0.3,
  },
  gridRating: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(228,161,43,0.18)",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gridRatingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: Colors.goldAccent,
  },
  gridInfo: {
    padding: 10,
    backgroundColor: "#121212",
    gap: 6,
  },
  gridName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
    lineHeight: 16,
  },
  gridPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gridPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.goldAccent,
  },
  gridAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.magenta,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Empty */
  emptyWrap: {
    paddingVertical: 50,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
