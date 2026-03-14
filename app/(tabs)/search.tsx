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
    <Animated.View style={{ transform: [{ scale }] }}>
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
        {/* Image */}
        <View style={styles.thumb}>
          <Image
            source={item.image_url ? { uri: item.image_url } : FALLBACK_IMG}
            style={styles.thumbImg}
            resizeMode="contain"
          />
          {item.is_trending && (
            <View style={styles.bestsellerBadge}>
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          )}
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

        {/* Add */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            addToCart(item);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={styles.addWrap}
          hitSlop={8}
        >
          <View style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
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
    <View style={[styles.headerArea, { paddingTop: topPad + 16 }]}>
      <Text style={styles.pageTitle}>Search</Text>

      {/* Search input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="rgba(80,80,90,0.55)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search spirits, wines, cocktails…"
          placeholderTextColor="rgba(80,80,90,0.5)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="rgba(80,80,90,0.5)" />
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
            style={[styles.chip, activeCategory === c && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                activeCategory === c && styles.chipTextActive,
              ]}
            >
              {c}
            </Text>
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

      {/* Count row */}
      {!loading && (
        <View style={styles.countRow}>
          <View style={styles.countLine} />
          <Text style={styles.countText}>
            {results.length} {results.length === 1 ? "product" : "products"}
          </Text>
          <View style={styles.countLine} />
        </View>
      )}
    </View>
  );

  return (
    <ScreenBackground>
      {loading ? (
        <>
          <View style={[styles.headerArea, { paddingTop: topPad + 16 }]}>
            <Text style={styles.pageTitle}>Search</Text>
          </View>
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.goldAccent} size="large" />
          </View>
        </>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="search-outline"
                size={48}
                color="rgba(228,161,43,0.25)"
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
  headerArea: { paddingHorizontal: 18, paddingBottom: 8 },
  pageTitle: {
    fontFamily: "PlayfairDisplay_900Black",
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  /* Search box */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textDark,
  },

  /* Chips */
  chipsRow: { gap: 8, paddingRight: 4, marginBottom: 14 },
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

  /* Sort */
  sortRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sortBtnActive: {
    backgroundColor: "rgba(228,161,43,0.12)",
    borderColor: "rgba(228,161,43,0.4)",
  },
  sortText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(185,185,195,0.55)",
  },
  sortTextActive: {
    color: Colors.goldAccent,
    fontFamily: "Inter_600SemiBold",
  },

  /* Count */
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  countLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  countText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },

  /* List */
  list: { paddingHorizontal: 18, paddingTop: 4, gap: 10 },

  /* Card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(228,161,43,0.18)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  thumb: {
    width: 96,
    height: 100,
    backgroundColor: "#1C1828",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  thumbImg: { width: 78, height: 84 },
  bestsellerBadge: {
    position: "absolute",
    top: 8,
    left: 0,
    backgroundColor: Colors.goldAccent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  bestsellerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    color: "#000",
    letterSpacing: 0.3,
  },
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 3,
  },
  catLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.goldAccent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  itemName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 17,
  },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingNum: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.goldAccent,
    marginLeft: 4,
  },
  priceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.goldAccent,
  },
  addWrap: { paddingHorizontal: 14 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.magenta,
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
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
