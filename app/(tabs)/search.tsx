import React, { useState, useEffect } from "react";
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
const SORTS = ["Default", "Price ↑", "Price ↓", "Rating"];
const FALLBACK_IMG = require("@/assets/images/hennessy.png");

function SearchItem({ item, formatPrice }: { item: Product; formatPrice: (n: number) => string }) {
  const { addToCart } = useCart();
  const fullStars = Math.floor(item.rating);
  return (
    <Pressable onPress={() => router.push(`/product/${item.id}`)} style={styles.itemCard}>
      <View style={styles.itemThumb}>
        <LinearGradient colors={["rgba(214,162,74,0.1)", "rgba(20,20,28,0.8)"]} style={StyleSheet.absoluteFill} />
        <Image source={item.image_url ? { uri: item.image_url } : FALLBACK_IMG} style={styles.itemImg} resizeMode="contain" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemCat}>{item.category}</Text>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= fullStars ? "star" : "star-outline"} size={10} color={Colors.goldAccent} />)}
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
      </View>
      <Pressable onPress={e => { e.stopPropagation(); addToCart(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.addBtn}>
        <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} style={styles.addGrad}>
          <Ionicons name="add" size={18} color="#0B0B0F" />
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { formatPrice } = useAppSettings();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("Default");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setAllProducts(data as Product[]); setLoading(false); });
  }, []);

  let results = allProducts;
  if (query.length > 0) {
    const q = query.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (activeCategory !== "All") results = results.filter(p => productMatchesCategory(p.category, activeCategory));
  if (activeSort === "Price ↑") results = [...results].sort((a, b) => a.price - b.price);
  else if (activeSort === "Price ↓") results = [...results].sort((a, b) => b.price - a.price);
  else if (activeSort === "Rating") results = [...results].sort((a, b) => b.rating - a.rating);

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="rgba(185,185,195,0.5)" />
          <TextInput
            style={styles.input}
            placeholder="Search spirits…"
            placeholderTextColor="rgba(185,185,195,0.4)"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(185,185,195,0.5)" />
            </Pressable>
          )}
        </View>
        <FlatList
          data={CATS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          contentContainerStyle={{ gap: 8, marginBottom: 10 }}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => setActiveCategory(c)} style={styles.chip}>
              {activeCategory === c ? (
                <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chipFill}>
                  <Text style={styles.chipActiveText}>{c}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chipInactive}><Text style={styles.chipText}>{c}</Text></View>
              )}
            </Pressable>
          )}
        />
        <View style={styles.sortRow}>
          {SORTS.map(s => (
            <Pressable key={s} onPress={() => setActiveSort(s)} style={[styles.sortBtn, activeSort === s && styles.sortBtnActive]}>
              <Text style={[styles.sortText, activeSort === s && styles.sortTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.goldAccent} size="large" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={p => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 90 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!results.length}
          ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
          renderItem={({ item }) => <SearchItem item={item} formatPrice={formatPrice} />}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontFamily: "PlayfairDisplay_900Black", fontSize: 28, color: Colors.textPrimary, marginBottom: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(214,162,74,0.15)", borderRadius: 26, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 14 },
  input: { flex: 1, color: Colors.textPrimary, fontFamily: "CormorantGaramond_400Regular", fontSize: 16 },
  chip: { borderRadius: 50, overflow: "hidden" },
  chipFill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  chipInactive: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  chipActiveText: { fontSize: 13, fontFamily: "CormorantGaramond_600SemiBold", color: "#0B0B0F" },
  chipText: { fontSize: 13, fontFamily: "CormorantGaramond_400Regular", color: "rgba(185,185,195,0.7)" },
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  sortBtnActive: { backgroundColor: "rgba(214,162,74,0.12)", borderColor: "rgba(214,162,74,0.35)" },
  sortText: { fontFamily: "CormorantGaramond_400Regular", fontSize: 13, color: "rgba(185,185,195,0.6)" },
  sortTextActive: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(20,20,28,0.78)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(214,162,74,0.2)", overflow: "hidden" },
  itemThumb: { width: 76, height: 86, alignItems: "center", justifyContent: "center" },
  itemImg: { width: 60, height: 74 },
  itemInfo: { flex: 1, paddingVertical: 12, paddingLeft: 4, gap: 3 },
  itemCat: { fontFamily: "CormorantGaramond_400Regular", fontSize: 10, color: Colors.goldAccent, letterSpacing: 1.5, textTransform: "uppercase" },
  itemName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 14, color: Colors.textPrimary },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontFamily: "CormorantGaramond_400Regular", fontSize: 10, color: Colors.textSecondary, marginLeft: 4 },
  itemPrice: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, color: Colors.textGold },
  addBtn: { paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  addGrad: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyText: { color: Colors.textSecondary, fontFamily: "CormorantGaramond_400Regular", fontSize: 16, textAlign: "center", paddingTop: 60 },
});
