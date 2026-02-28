import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  Image,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { PRODUCTS, CATEGORIES, Product } from "@/data/products";
import { useCart } from "@/context/CartContext";

function SearchResultCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;

  return (
    <Pressable
      style={styles.resultCard}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={styles.resultImageContainer}>
        <LinearGradient
          colors={["rgba(214,162,74,0.1)", "rgba(20,20,28,0.5)"]}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={product.image}
          style={styles.resultImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultBrand}>{product.brand}</Text>
        <Text style={styles.resultName}>{product.name}</Text>
        <View style={styles.resultRating}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={
                i <= fullStars
                  ? "star"
                  : i === fullStars + 1 && hasHalf
                  ? "star-half"
                  : "star-outline"
              }
              size={11}
              color={Colors.goldAccent}
            />
          ))}
          <Text style={styles.reviewCount}>({product.reviews})</Text>
        </View>
        <View style={styles.resultTags}>
          {product.tags.slice(0, 2).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.resultRight}>
        <Text style={styles.resultPrice}>${product.price.toFixed(2)}</Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            addToCart(product);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.addBtn}
        >
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            style={styles.addBtnGradient}
          >
            <Ionicons name="add" size={18} color="#0B0B0F" />
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered = PRODUCTS.filter((p) => {
    const matchQuery =
      query === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    const matchCategory =
      activeCategory === "All" ||
      p.category.toLowerCase() === activeCategory.toLowerCase() ||
      p.tags.some(
        (t) => t.toLowerCase() === activeCategory.toLowerCase()
      );

    return matchQuery && matchCategory;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.topSection, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.screenTitle}>Explore</Text>

        <View style={styles.searchWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spirits, brands, types..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => {
                setActiveCategory(cat);
                Haptics.selectionAsync();
              }}
              style={styles.catPillWrapper}
            >
              {activeCategory === cat ? (
                <LinearGradient
                  colors={[Colors.goldStart, Colors.goldEnd]}
                  style={styles.catPillActive}
                >
                  <Text style={styles.catTextActive}>{cat}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.catPillInactive}>
                  <Text style={styles.catTextInactive}>{cat}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SearchResultCard product={item} />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or category
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  screenTitle: {
    fontSize: 30,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.2,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 8,
  },
  catPillWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  catPillActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catPillInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  catTextActive: {
    fontSize: 13,
    color: "#0B0B0F",
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  catTextInactive: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  resultCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  resultImageContainer: {
    width: 90,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  resultImage: {
    width: 70,
    height: 100,
  },
  resultInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 4,
    gap: 3,
  },
  resultBrand: {
    fontSize: 10,
    color: Colors.textGold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  resultName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
    lineHeight: 20,
  },
  resultRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  reviewCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 3,
    fontFamily: "CormorantGaramond_400Regular",
  },
  resultTags: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "rgba(214,162,74,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
  },
  tagText: {
    fontSize: 10,
    color: Colors.textGold,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  resultRight: {
    paddingRight: 14,
    alignItems: "flex-end",
    gap: 10,
  },
  resultPrice: {
    fontSize: 16,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  addBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  addBtnGradient: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    textAlign: "center",
  },
});
