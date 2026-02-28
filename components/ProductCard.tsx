import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Product } from "@/data/products";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 260;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
}

export function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            <LinearGradient
              colors={["rgba(214,162,74,0.12)", "rgba(214,162,74,0.02)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.glowCircle} />
            <Image
              source={product.image}
              style={styles.bottleImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.brandText} numberOfLines={1}>
              {product.brand}
            </Text>
            <Text style={styles.nameText} numberOfLines={2}>
              {product.name}
            </Text>

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
                  size={10}
                  color={Colors.goldAccent}
                />
              ))}
              <Text style={styles.ratingText}>{product.rating}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
              <Pressable
                style={styles.addBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddToCart?.();
                }}
                hitSlop={8}
              >
                <LinearGradient
                  colors={[Colors.goldStart, Colors.goldEnd]}
                  style={styles.addBtnGradient}
                >
                  <Ionicons name="add" size={16} color="#0B0B0F" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginRight: 16,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT - 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(214,162,74,0.18)",
    top: "50%",
    left: "50%",
    marginTop: -50,
    marginLeft: -50,
  },
  bottleImage: {
    width: CARD_WIDTH - 30,
    height: CARD_HEIGHT - 100,
  },
  info: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
  },
  brandText: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  nameText: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 3,
    fontFamily: "CormorantGaramond_400Regular",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  addBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  addBtnGradient: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
