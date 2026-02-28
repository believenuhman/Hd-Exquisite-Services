import React, { useState, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { PRODUCTS, CATEGORIES, Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useCart } from "@/context/CartContext";

const { width } = Dimensions.get("window");
const UD = Platform.OS !== "web";

const TRENDING = PRODUCTS;
const CATS = CATEGORIES.filter((c) => c !== "All");

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <Pressable onPress={onPress} style={styles.pill}>
        <LinearGradient
          colors={[Colors.goldStart, Colors.goldEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pillFilled}
        >
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

function FeaturedRow({ product }: { product: Product }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart } = useCart();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: UD, speed: 20 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: UD, speed: 20 }).start()
        }
        style={styles.featCard}
      >
        <LinearGradient
          colors={["rgba(214,162,74,0.13)", "rgba(20,20,28,0.9)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.featGlow} />
        <Image
          source={product.image}
          style={styles.featImage}
          resizeMode="contain"
        />
        <View style={styles.featInfo}>
          <View>
            <Text style={styles.featBrand}>{product.brand}</Text>
            <Text style={styles.featName}>{product.name}</Text>
            <Text style={styles.featPrice}>${product.price.toFixed(2)}</Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              addToCart(product);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <LinearGradient
              colors={[Colors.goldStart, Colors.goldEnd]}
              style={styles.featAddBtn}
            >
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
  const { addToCart, totalItems } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered =
    TRENDING.filter(
      (p) =>
        p.category.toLowerCase() === activeCategory.toLowerCase() ||
        p.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase())
    ).length > 0
      ? TRENDING.filter(
          (p) =>
            p.category.toLowerCase() === activeCategory.toLowerCase() ||
            p.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase())
        )
      : TRENDING;

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 14, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.userSection}>
            <LinearGradient
              colors={[Colors.goldStart, Colors.goldEnd]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>D</Text>
            </LinearGradient>
            <View style={styles.userTextBlock}>
              <Text style={styles.userLabel}>Welcome back</Text>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>Darlene</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
              </View>
            </View>
          </View>
          <View style={styles.topIcons}>
            <Pressable
              onPress={() => router.push("/cart")}
              style={styles.iconBtn}
            >
              <Ionicons name="bag-outline" size={22} color={Colors.textPrimary} />
              {totalItems > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalItems}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="options-outline" size={22} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.searchBar}
          onPress={() => router.push("/search")}
        >
          <Ionicons name="search" size={17} color="rgba(185,185,195,0.7)" />
          <Text style={styles.searchPlaceholder}>Search Products</Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATS.map((c) => (
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

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <Pressable onPress={() => router.push("/search")}>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.goldAccent} />
            </View>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsScroll}
        >
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => router.push(`/product/${p.id}`)}
              onAddToCart={() => {
                addToCart(p);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          ))}
        </ScrollView>

        <View style={[styles.sectionRow, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>All Spirits</Text>
          <Pressable onPress={() => router.push("/search")}>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.goldAccent} />
            </View>
          </Pressable>
        </View>

        <View style={styles.featuredList}>
          {PRODUCTS.slice(0, 3).map((p) => (
            <FeaturedRow key={p.id} product={p} />
          ))}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#0B0B0F",
  },
  userTextBlock: {
    gap: 1,
  },
  userLabel: {
    fontSize: 11,
    color: "rgba(185,185,195,0.7)",
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  topIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    color: "#0B0B0F",
    fontFamily: "PlayfairDisplay_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  searchPlaceholder: {
    fontSize: 14,
    color: "rgba(185,185,195,0.6)",
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  catScroll: {
    gap: 8,
    paddingRight: 16,
    marginBottom: 4,
  },
  pill: {
    borderRadius: 50,
    overflow: "hidden",
  },
  pillFilled: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 50,
  },
  pillInactive: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillTextActive: {
    fontSize: 13,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: "#0B0B0F",
    letterSpacing: 0.3,
  },
  pillTextInactive: {
    fontSize: 13,
    fontFamily: "CormorantGaramond_400Regular",
    color: "rgba(185,185,195,0.8)",
    letterSpacing: 0.3,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: Colors.goldAccent,
    letterSpacing: 0.5,
  },
  cardsScroll: {
    paddingRight: 16,
    paddingBottom: 4,
  },
  featuredList: {
    gap: 12,
    marginTop: 4,
  },
  featCard: {
    flexDirection: "row",
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.25)",
    alignItems: "center",
    paddingRight: 16,
    height: 90,
  },
  featGlow: {
    position: "absolute",
    left: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(214,162,74,0.1)",
    top: 5,
  },
  featImage: {
    width: 70,
    height: 80,
    marginLeft: 8,
  },
  featInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
  },
  featBrand: {
    fontSize: 10,
    color: Colors.textGold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  featName: {
    fontSize: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  featPrice: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textGold,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  featAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
