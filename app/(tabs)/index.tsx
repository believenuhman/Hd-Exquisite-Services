import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Dimensions,
  Platform,
  Image,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { PRODUCTS, CATEGORIES, Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";

const { width } = Dimensions.get("window");

const FEATURED_PRODUCTS = PRODUCTS.filter((p) => p.isFeatured);
const TRENDING_PRODUCTS = PRODUCTS;

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pillWrapper}>
      {active ? (
        <LinearGradient
          colors={[Colors.goldStart, Colors.goldEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pillActive}
        >
          <Text style={styles.pillTextActive}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.pillInactive}>
          <Text style={styles.pillTextInactive}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function FeaturedCard({ product }: { product: Product }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { addToCart } = useCart();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push(`/product/${product.id}`)}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
          }).start()
        }
        style={styles.featuredCard}
      >
        <LinearGradient
          colors={[
            "rgba(214,162,74,0.10)",
            "rgba(20,20,28,0.95)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.featuredGlow} />
        <Image
          source={product.image}
          style={styles.featuredImage}
          resizeMode="contain"
        />
        <View style={styles.featuredInfo}>
          <Text style={styles.featuredBrand}>{product.brand}</Text>
          <Text style={styles.featuredName}>{product.name}</Text>
          <View style={styles.featuredBottom}>
            <Text style={styles.featuredPrice}>
              ${product.price.toFixed(2)}
            </Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                addToCart(product);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.featuredAddBtn}
            >
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                style={styles.featuredAddGradient}
              >
                <Ionicons name="bag-add" size={16} color="#0B0B0F" />
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
  const [activeCategory, setActiveCategory] = useState("All");
  const { addToCart } = useCart();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered =
    activeCategory === "All"
      ? TRENDING_PRODUCTS
      : TRENDING_PRODUCTS.filter(
          (p) =>
            p.category.toLowerCase() === activeCategory.toLowerCase() ||
            p.tags.some(
              (t) => t.toLowerCase() === activeCategory.toLowerCase()
            )
        );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPadding + 12,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Evening</Text>
            <Text style={styles.subtitle}>What are you sipping tonight?</Text>
          </View>
          <Pressable style={styles.profileBtn}>
            <LinearGradient
              colors={["rgba(214,162,74,0.15)", "rgba(214,162,74,0.05)"]}
              style={styles.profileBtnInner}
            >
              <Ionicons name="person" size={20} color={Colors.goldAccent} />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <LinearGradient
            colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.04)"]}
            style={styles.searchGradient}
          >
            <Ionicons
              name="search"
              size={18}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push("/search")}
            >
              <Text style={styles.searchPlaceholder}>
                Search spirits, wines, beers...
              </Text>
            </Pressable>
          </LinearGradient>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onPress={() => {
                setActiveCategory(cat);
                Haptics.selectionAsync();
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <View style={styles.sectionAccent} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {FEATURED_PRODUCTS.map((p) => (
            <FeaturedCard key={p.id} product={p} />
          ))}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <View style={styles.sectionAccent} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  profileBtn: {
    borderRadius: 20,
    overflow: "hidden",
  },
  profileBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  searchContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  searchGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.2,
  },
  categoryScroll: {
    paddingRight: 20,
    paddingBottom: 4,
    gap: 8,
    marginBottom: 4,
  },
  pillWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  pillActive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillInactive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pillTextActive: {
    fontSize: 13,
    color: "#0B0B0F",
    fontFamily: "CormorantGaramond_600SemiBold",
    letterSpacing: 0.3,
  },
  pillTextInactive: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  sectionAccent: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(214,162,74,0.2)",
  },
  featuredScroll: {
    paddingRight: 20,
    gap: 16,
  },
  featuredCard: {
    width: width * 0.72,
    height: 200,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
  },
  featuredGlow: {
    position: "absolute",
    left: 90,
    top: "50%",
    marginTop: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(214,162,74,0.1)",
  },
  featuredImage: {
    width: 100,
    height: 170,
    marginRight: 12,
  },
  featuredInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  featuredBrand: {
    fontSize: 11,
    color: Colors.textGold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  featuredName: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 24,
    marginTop: 2,
  },
  featuredBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  featuredPrice: {
    fontSize: 20,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  featuredAddBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  featuredAddGradient: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  trendingScroll: {
    paddingRight: 20,
    paddingBottom: 8,
  },
});
