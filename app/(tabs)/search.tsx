import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
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

const CATS = ["All", ...CATEGORIES] as const;
const SORTS = ["Default", "Price ↑", "Price ↓", "Rating"] as const;
const FALLBACK_IMG = require("@/assets/images/hennessy.png");
const UD = Platform.OS !== "web";

function SearchResultCard({
  item,
  formatPrice,
}: {
  item: Product;
  formatPrice: (n: number) => string;
}) {
  const { addToCart } = useCart();
  const scale = useRef(new Animated.Value(1)).current;
  const fullStars = Math.floor(item.rating);

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => router.push(`/product/${item.id}`)}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: UD, speed: 30 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: UD, speed: 20 }).start()
        }
        style={styles.card}
      >
        {/* Thumbnail */}
        <View style={styles.thumb}>
          <LinearGradient
            colors={["rgba(214,162,74,0.12)", "rgba(11,11,15,0.65)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.thumbGlow} />
          <Image
            source={item.image_url ? { uri: item.image_url } : FALLBACK_IMG}
            style={styles.thumbImg}
            resizeMode="contain"
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.catLabel} numberOfLines={1}>
            {item.category}
          </Text>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= fullStars ? "star" : "star-outline"}
                size={11}
                color={Colors.goldAccent}
              />
            ))}
            <Text style={styles.ratingNum}>{item.rating}</Text>
          </View>
          <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
        </View>

        {/* Add btn */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            addToCart(item);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={styles.addWrap}
          hitSlop={8}
        >
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            style={styles.addGrad}
          >
            <Ionicons name="add" size={20} color="#0B0B0F" />
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeSort, setActiveSort] = useState<string>("Default");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAllProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

  let results = allProducts;
  if (query.length > 0) {
    const q = query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (activeCategory !== "All") {
    results = results.filter((p) =>
      productMatchesCategory(p.category, activeCategory)
    );
  }
  if (activeSort === "Price ↑") results = [...results].sort((a, b) => a.price - b.price);
  else if (activeSort === "Price ↓") results = [...results].sort((a, b) => b.price - a.price);
  else if (activeSort === "Rating") results = [...results].sort((a, b) => b.rating - a.rating);

  const ListHeader = (
    <View style={[styles.stickyHeader, { paddingTop: topPad + 16 }]}>
      {/* Title */}
      <Text style={styles.pageTitle}>Explore</Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color="rgba(185,185,195,0.45)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search spirits, wines, cocktails…"
          placeholderTextColor="rgba(185,185,195,0.38)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons
              name="close-circle"
              size={18}
              color="rgba(185,185,195,0.45)"
            />
          </Pressable>
        )}
      </View>

      {/* Category chips */}
      <FlatList
        data={CATS as unknown as string[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => {
              setActiveCategory(c);
              Haptics.selectionAsync();
            }}
            style={styles.chip}
          >
            {activeCategory === c ? (
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipActive}
              >
                <Text style={styles.chipActiveText}>{c}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.chipInactive}>
                <Text style={styles.chipInactiveText}>{c}</Text>
              </View>
            )}
          </Pressable>
        )}
      />

      {/* Sort row */}
      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setActiveSort(s)}
            style={[styles.sortBtn, activeSort === s && styles.sortBtnActive]}
          >
            <Text
              style={[
                styles.sortText,
                activeSort === s && styles.sortTextActive,
              ]}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Count indicator */}
      {!loading && (
        <View style={styles.countRow}>
          <View style={styles.countDivider} />
          <Text style={styles.countText}>
            {results.length} {results.length === 1 ? "product" : "products"}
          </Text>
          <View style={styles.countDivider} />
        </View>
      )}
    </View>
  );

  return (
    <ScreenBackground>
      {loading ? (
        <>
          <View style={[styles.stickyHeader, { paddingTop: topPad + 16 }]}>
            <Text style={styles.pageTitle}>Explore</Text>
          </View>
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.goldAccent} size="large" />
          </View>
        </>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="search-outline"
                size={48}
                color="rgba(214,162,74,0.25)"
              />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySub}>
                Try a different search or category
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SearchResultCard item={item} formatPrice={formatPrice} />
          )}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pageTitle: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 30,
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  /* Search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.18)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },

  /* Category chips */
  chipsRow: { gap: 8, paddingRight: 4, marginBottom: 14 },
  chip: { borderRadius: 50, overflow: "hidden" },
  chipActive: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
  },
  chipActiveText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    color: "#0B0B0F",
  },
  chipInactive: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipInactiveText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: "rgba(185,185,195,0.65)",
  },

  /* Sort */
  sortRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sortBtnActive: {
    backgroundColor: "rgba(214,162,74,0.12)",
    borderColor: "rgba(214,162,74,0.4)",
  },
  sortText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 13,
    color: "rgba(185,185,195,0.55)",
  },
  sortTextActive: {
    color: Colors.goldAccent,
    fontFamily: "CormorantGaramond_600SemiBold",
  },

  /* Count row */
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  countDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  countText: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  /* List */
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },

  /* Card */
  cardWrap: {},
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13121A",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.18)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  thumb: {
    width: 90,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(214,162,74,0.12)",
  },
  thumbImg: { width: 72, height: 84 },
  info: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 6,
    paddingRight: 4,
    gap: 4,
  },
  catLabel: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 10,
    color: Colors.goldAccent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  itemName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingNum: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  priceText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: Colors.textGold,
  },
  addWrap: { paddingHorizontal: 16 },
  addGrad: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Loader */
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  /* Empty */
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
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
    textAlign: "center",
  },
});
