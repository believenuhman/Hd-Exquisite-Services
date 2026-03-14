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

const CARD_WIDTH = 168;
const CARD_HEIGHT = 244;
const UD = Platform.OS !== "web";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  formatPrice?: (amount: number) => string;
}

const FALLBACK_IMAGE = require("@/assets/images/hennessy.png");

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
        {/* Image */}
        <View style={styles.imageArea}>
          <LinearGradient
            colors={["rgba(214,162,74,0.14)", "rgba(11,11,15,0.65)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glowCircle} />
          <Image
            source={product.image_url ? { uri: product.image_url } : FALLBACK_IMAGE}
            style={styles.bottleImage}
            resizeMode="contain"
          />
          {product.is_trending && (
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>HOT</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoArea}>
          <Text style={styles.catLabel} numberOfLines={1}>
            {product.category}
          </Text>
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
            >
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                style={styles.addBtn}
              >
                <Ionicons name="add" size={16} color="#0B0B0F" />
              </LinearGradient>
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
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#13121A",
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.22)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  imageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowCircle: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(214,162,74,0.13)",
  },
  bottleImage: { width: CARD_WIDTH - 20, height: 140 },
  hotBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.goldAccent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hotBadgeText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 8,
    color: "#0B0B0F",
    letterSpacing: 0.8,
  },
  infoArea: {
    padding: 12,
    backgroundColor: "rgba(11,11,15,0.65)",
    gap: 3,
  },
  catLabel: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 10,
    color: Colors.goldAccent,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  productName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  priceText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: Colors.textGold,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
