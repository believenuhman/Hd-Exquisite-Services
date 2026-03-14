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
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Product } from "@/lib/supabase";

const CARD_WIDTH = 162;
const UD = Platform.OS !== "web";
const FALLBACK_IMAGE = require("@/assets/images/hennessy.png");

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  formatPrice?: (amount: number) => string;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  formatPrice,
}: ProductCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const priceStr = formatPrice
    ? formatPrice(product.price)
    : `$${product.price.toFixed(2)}`;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: UD,
            speed: 30,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: UD,
            speed: 20,
          }).start()
        }
        style={styles.card}
      >
        {/* Image area */}
        <View style={styles.imageArea}>
          <Image
            source={
              product.image_url ? { uri: product.image_url } : FALLBACK_IMAGE
            }
            style={styles.bottleImage}
            resizeMode="contain"
          />
          {product.is_trending && (
            <View style={styles.bestsellerBadge}>
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          )}
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={styles.ratingPillText}>{product.rating}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoArea}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{priceStr}</Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart?.();
              }}
              hitSlop={10}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={18} color="#000" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginRight: 14 },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: Colors.cardLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  imageArea: {
    height: 158,
    backgroundColor: "#F4EFE6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bottleImage: {
    width: CARD_WIDTH - 20,
    height: 138,
  },
  bestsellerBadge: {
    position: "absolute",
    top: 10,
    left: 0,
    backgroundColor: Colors.goldAccent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  bestsellerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#000",
    letterSpacing: 0.3,
  },
  ratingPill: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.goldAccent,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },
  infoArea: {
    padding: 10,
    backgroundColor: Colors.cardLight,
    gap: 6,
  },
  productName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textDark,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textDark,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.goldAccent,
    alignItems: "center",
    justifyContent: "center",
  },
});
