import React, { useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { PRODUCTS } from "@/data/products";
import { useCart } from "@/context/CartContext";

const { width, height } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addToCart, items } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const product = PRODUCTS.find((p) => p.id === id);
  const cartItem = items.find((i) => i.product.id === id);

  if (!product) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.backBtn, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAddToCart = () => {
    addToCart(product);
    setAddedToCart(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 30,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
      }),
    ]).start();
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/cart");
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.backBtn, { top: topPadding + 12 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <View style={styles.backBtnInner}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </View>
      </Pressable>

      {cartItem && (
        <Pressable
          style={[styles.cartIndicator, { top: topPadding + 12 }]}
          onPress={() => router.push("/cart")}
        >
          <View style={styles.cartIndicatorInner}>
            <Ionicons name="bag" size={20} color={Colors.goldAccent} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItem.quantity}</Text>
            </View>
          </View>
        </Pressable>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 120 },
        ]}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[
              "rgba(214,162,74,0.15)",
              Colors.background,
            ]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glowOrb} />
          <View style={styles.glowOrb2} />

          <Image
            source={product.image}
            style={styles.bottleImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{product.brand}</Text>
            <View style={styles.tagRow}>
              {product.tags.slice(0, 1).map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.ratingRow}>
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
                size={16}
                color={Colors.goldAccent}
              />
            ))}
            <Text style={styles.ratingValue}>{product.rating}</Text>
            <Text style={styles.reviewCount}>
              ({product.reviews.toLocaleString()} reviews)
            </Text>
          </View>

          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          <View style={styles.metaCards}>
            <View style={styles.metaCard}>
              <Ionicons name="wine-outline" size={18} color={Colors.goldAccent} />
              <Text style={styles.metaLabel}>Volume</Text>
              <Text style={styles.metaValue}>{product.volume}</Text>
            </View>
            <View style={styles.metaCard}>
              <Ionicons name="flame-outline" size={18} color={Colors.goldAccent} />
              <Text style={styles.metaLabel}>ABV</Text>
              <Text style={styles.metaValue}>{product.abv}</Text>
            </View>
            <View style={styles.metaCard}>
              <Ionicons name="ribbon-outline" size={18} color={Colors.goldAccent} />
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{product.category}</Text>
            </View>
          </View>

          <View style={styles.descSection}>
            <Text style={styles.descTitle}>About</Text>
            <Text style={styles.descText}>{product.description}</Text>
          </View>

          <View style={styles.tagsRow}>
            {product.tags.map((t) => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaContainer,
          { paddingBottom: bottomPadding + (Platform.OS === "web" ? 20 : 16) },
        ]}
      >
        <LinearGradient
          colors={["rgba(11,11,15,0)", Colors.background]}
          style={styles.ctaGradient}
        />
        <View style={styles.ctaRow}>
          <Animated.View style={[styles.addToCartBtn, { transform: [{ scale: buttonScale }] }]}>
            <Pressable
              style={styles.addToCartPressable}
              onPress={handleAddToCart}
            >
              {addedToCart ? (
                <>
                  <Ionicons name="checkmark" size={18} color={Colors.goldAccent} />
                  <Text style={styles.addToCartText}>Added!</Text>
                </>
              ) : (
                <>
                  <Ionicons name="bag-add-outline" size={18} color={Colors.goldAccent} />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          <Pressable style={styles.buyNowBtn} onPress={handleBuyNow}>
            <LinearGradient
              colors={[Colors.goldStart, Colors.goldEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyNowGradient}
            >
              <Text style={styles.buyNowText}>Buy Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#0B0B0F" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cartIndicator: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  cartIndicatorInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    fontSize: 9,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#0B0B0F",
  },
  scrollContent: {
    paddingTop: 0,
  },
  heroSection: {
    height: height * 0.42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(214,162,74,0.1)",
    top: "50%",
    left: "50%",
    marginTop: -110,
    marginLeft: -110,
  },
  glowOrb2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(214,162,74,0.08)",
    top: "50%",
    left: "50%",
    marginTop: -70,
    marginLeft: -70,
  },
  bottleImage: {
    width: width * 0.42,
    height: height * 0.38,
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  brandText: {
    fontSize: 13,
    color: Colors.textGold,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    backgroundColor: "rgba(214,162,74,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.15)",
  },
  tagText: {
    fontSize: 11,
    color: Colors.textGold,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 36,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 44,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 14,
  },
  ratingValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
    marginLeft: 6,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
  price: {
    fontSize: 38,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  metaCards: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  metaCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metaLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  descSection: {
    marginBottom: 20,
  },
  descTitle: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  descText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: "rgba(214,162,74,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.12)",
  },
  tagChipText: {
    fontSize: 12,
    color: Colors.textGold,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.background,
  },
  ctaGradient: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 30,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.goldAccent,
    overflow: "hidden",
  },
  addToCartPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  addToCartText: {
    fontSize: 15,
    color: Colors.goldAccent,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  buyNowBtn: {
    flex: 1.4,
    borderRadius: 18,
    overflow: "hidden",
  },
  buyNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderRadius: 18,
  },
  buyNowText: {
    fontSize: 15,
    color: "#0B0B0F",
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
});
