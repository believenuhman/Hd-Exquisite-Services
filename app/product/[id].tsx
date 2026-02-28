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
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { PRODUCTS } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { GoldButton } from "@/components/GoldButton";

const { width, height } = Dimensions.get("window");
const UD = Platform.OS !== "web";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addToCart, items } = useCart();
  const [addedFeedback, setAddedFeedback] = useState(false);

  const bottleScale = useRef(new Animated.Value(0.85)).current;
  const bottleOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(bottleScale, {
          toValue: 1,
          useNativeDriver: UD,
          tension: 60,
          friction: 9,
        }),
        Animated.timing(bottleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: UD,
        }),
      ]),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: UD,
      }),
    ]).start();
  }, []);

  const product = PRODUCTS.find((p) => p.id === id);
  const cartItem = items.find((i) => i.product.id === id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!product) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.backBtn, { top: topPad + 12 }]}
          onPress={() => router.back()}
        >
          <View style={styles.navBtnInner}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </View>
        </Pressable>
        <View style={styles.notFoundState}>
          <Text style={styles.notFoundText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;

  const handleAddToCart = () => {
    addToCart(product);
    setAddedFeedback(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/cart");
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/particle-bg.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(11,11,15,0.35)", "rgba(11,11,15,0.55)", Colors.background]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.45, 1]}
      />

      <Pressable
        style={[styles.backBtn, { top: topPad + 12 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <View style={styles.navBtnInner}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </View>
      </Pressable>

      <Pressable
        style={[styles.menuBtn, { top: topPad + 12 }]}
        hitSlop={8}
      >
        <View style={styles.navBtnInner}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textPrimary} />
        </View>
      </Pressable>

      {cartItem && (
        <Pressable
          style={[styles.cartBadgeBtn, { top: topPad + 12 }]}
          onPress={() => router.push("/cart")}
        >
          <View style={styles.navBtnInner}>
            <Ionicons name="bag" size={20} color={Colors.goldAccent} />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItem.quantity}</Text>
            </View>
          </View>
        </Pressable>
      )}

      <View style={[styles.heroArea, { paddingTop: topPad + 54 }]}>
        <View style={styles.glowOrbLarge} />
        <View style={styles.glowOrbMid} />

        <Animated.View
          style={{
            opacity: bottleOpacity,
            transform: [{ scale: bottleScale }],
          }}
        >
          <Image
            source={product.image}
            style={styles.bottleImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomSheet, { opacity: contentOpacity }]}>
        <LinearGradient
          colors={["rgba(11,11,15,0.0)", Colors.background]}
          style={[styles.fadeGradient, { pointerEvents: "none" } as any]}
        />

        <View style={[styles.contentArea, { paddingBottom: botPad + 12 }]}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLabel}>{product.brand}</Text>
            <View style={styles.volBadge}>
              <Text style={styles.volText}>{product.volume}</Text>
            </View>
          </View>

          <Text style={styles.productTitle}>{product.name}</Text>

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
            <Text style={styles.ratingNum}>{product.rating}</Text>
          </View>

          <Text style={styles.category}>
            {product.tags[0]} · {product.abv} ABV
          </Text>

          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>

          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          <View style={styles.buttonsArea}>
            <GoldButton
              label={addedFeedback ? "Added!" : "Add to Cart"}
              onPress={handleAddToCart}
              variant="outline"
              icon={addedFeedback ? "checkmark" : "bag-add-outline"}
              iconPosition="left"
            />
            <GoldButton
              label="Buy Now"
              onPress={handleBuyNow}
              variant="filled"
              icon="arrow-forward"
              iconPosition="right"
            />
          </View>
        </View>
      </Animated.View>
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
    left: 16,
    zIndex: 10,
  },
  menuBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  cartBadgeBtn: {
    position: "absolute",
    right: 64,
    zIndex: 10,
  },
  navBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
  heroArea: {
    alignItems: "center",
    justifyContent: "center",
    height: height * 0.48,
  },
  glowOrbLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(214,162,74,0.13)",
  },
  glowOrbMid: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(214,162,74,0.1)",
  },
  bottleImage: {
    width: width * 0.45,
    height: height * 0.42,
  },
  bottomSheet: {
    flex: 1,
    position: "relative",
  },
  fadeGradient: {
    height: 40,
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
  },
  contentArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandLabel: {
    fontSize: 12,
    color: Colors.textGold,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  volBadge: {
    backgroundColor: "rgba(214,162,74,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.2)",
  },
  volText: {
    fontSize: 11,
    color: Colors.textGold,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 34,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingNum: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  category: {
    fontSize: 14,
    color: "rgba(185,185,195,0.75)",
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: "rgba(185,185,195,0.65)",
    fontFamily: "CormorantGaramond_400Regular",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 30,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textGold,
    letterSpacing: 0.8,
  },
  buttonsArea: {
    gap: 12,
    marginTop: 4,
  },
  notFoundState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
});
