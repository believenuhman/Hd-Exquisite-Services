import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Product } from "@/lib/supabase";

const CARD_WIDTH = 170;
const CARD_HEIGHT = 230;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  formatPrice?: (amount: number) => string;
}

const FALLBACK_IMAGE = require("@/assets/images/hennessy.png");

export function ProductCard({ product, onPress, onAddToCart, formatPrice }: ProductCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;
  const priceStr = formatPrice ? formatPrice(product.price) : `$${product.price.toFixed(2)}`;

  return (
    <Animated.View style={[styles.animWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: Platform.OS !== "web", speed: 20 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 20 }).start()
        }
        style={styles.card}
      >
        <View style={styles.imageArea}>
          <LinearGradient
            colors={["rgba(214,162,74,0.14)", "rgba(11,11,15,0.6)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glowCircle} />
          <Image
            source={product.image_url ? { uri: product.image_url } : FALLBACK_IMAGE}
            style={styles.bottleImage}
            resizeMode="contain"
          />
        </View>

        <LinearGradient
          colors={["rgba(14,12,10,0.85)", "rgba(22,18,12,0.95)"]}
          style={styles.infoArea}
        >
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= fullStars ? "star" : i === fullStars + 1 && hasHalf ? "star-half" : "star-outline"}
                size={10}
                color={Colors.goldAccent}
              />
            ))}
            <Text style={styles.ratingNum}>{product.rating}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{priceStr}</Text>
            <Pressable onPress={(e) => { e.stopPropagation(); onAddToCart?.(); }} hitSlop={8}>
              <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} style={styles.addBtn}>
                <Ionicons name="add" size={14} color="#0B0B0F" />
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animWrapper: { marginRight: 14 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(20,20,28,0.78)",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.25)",
  },
  imageArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  glowCircle: {
    position: "absolute",
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(214,162,74,0.15)",
    top: "50%", left: "50%", marginTop: -50, marginLeft: -50,
  },
  bottleImage: { width: CARD_WIDTH - 20, height: 140 },
  infoArea: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  productName: {
    fontSize: 14, fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary, letterSpacing: 0.3,
  },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingNum: {
    fontSize: 10, color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular", marginLeft: 4,
  },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  priceText: {
    fontSize: 18, fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textGold, letterSpacing: 0.5,
  },
  addBtn: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
