import React, { useRef, useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { supabase, Product } from "@/lib/supabase";
import { ScreenBackground } from "@/components/ScreenBackground";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

const { width, height } = Dimensions.get("window");
const UD = Platform.OS !== "web";
const FALLBACK_IMG = require("@/assets/images/hennessy.png");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { formatPrice } = useAppSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const bottleScale = useRef(new Animated.Value(0.7)).current;
  const bottleOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setProduct(data as Product);
      setLoading(false);
      Animated.parallel([
        Animated.spring(bottleScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: UD }),
        Animated.timing(bottleOpacity, { toValue: 1, duration: 400, useNativeDriver: UD }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: UD }),
      ]).start();
    });
  }, [id]);

  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (loading) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.goldAccent} size="large" />
        </View>
      </ScreenBackground>
    );
  }

  if (!product) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={styles.notFound}>Product not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backPressable}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating % 1 >= 0.5;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addToCart(product);
    setAdded(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < quantity; i++) addToCart(product);
    router.push("/checkout");
  };

  return (
    <ScreenBackground>
      {/* Back button */}
      <View style={[styles.backRow, { top: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Hero bottle */}
      <View style={styles.heroArea}>
        <View style={[styles.glow1, { top: height * 0.05 }]} />
        <View style={[styles.glow2, { top: height * 0.1 }]} />
        <Animated.View style={[styles.bottleWrap, { opacity: bottleOpacity, transform: [{ scale: bottleScale }] }]}>
          <Image
            source={product.image_url ? { uri: product.image_url } : FALLBACK_IMG}
            style={styles.bottleImg}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Content sheet */}
      <Animated.View style={[styles.bottomSheet, { opacity: contentOpacity }]}>
        <LinearGradient
          colors={["rgba(11,11,15,0.0)", Colors.background]}
          style={[styles.fadeGradient, { pointerEvents: "none" } as any]}
        />

        <View style={[styles.contentArea, { paddingBottom: botPad + 12 }]}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLabel}>{product.category}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={Colors.goldAccent} />
              <Text style={styles.ratingBadgeText}>{product.rating}</Text>
            </View>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name={i <= fullStars ? "star" : i === fullStars + 1 && hasHalf ? "star-half" : "star-outline"} size={16} color={Colors.goldAccent} />
            ))}
          </View>

          <ScrollView style={styles.descScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <Text style={styles.description}>{product.description}</Text>
          </ScrollView>

          {/* Quantity selector */}
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
                hitSlop={8}
              >
                <Ionicons name="remove" size={18} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
                style={styles.qtyBtnAdd}
                hitSlop={8}
              >
                <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} style={styles.qtyBtnGrad}>
                  <Ionicons name="add" size={18} color="#000" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price * quantity)}</Text>
            <Text style={styles.stockLabel}>
              {product.stock_qty > 0 ? `${product.stock_qty} in stock` : "Out of stock"}
            </Text>
          </View>

          <View style={styles.ctaRow}>
            <Pressable onPress={handleAddToCart} disabled={product.stock_qty === 0} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>{added ? "Added ✓" : "Add to Cart"}</Text>
            </Pressable>
            <Pressable onPress={handleBuyNow} disabled={product.stock_qty === 0} style={[styles.goldBtn, { flex: 1 }]}>
              <LinearGradient colors={[Colors.goldStart, Colors.goldEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goldGrad}>
                <Ionicons name="bag-add-outline" size={16} color="#000" />
                <Text style={styles.goldBtnText}>Buy Now</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  backRow: { position: "absolute", left: 16, zIndex: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(11,11,15,0.6)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  heroArea: {
    height: height * 0.46,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glow1: {
    position: "absolute",
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(214,162,74,0.13)",
    left: width / 2 - 140,
  },
  glow2: {
    position: "absolute",
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(214,162,74,0.08)",
    left: width / 2 - 90,
  },
  bottleWrap: { alignItems: "center", justifyContent: "center" },
  bottleImg: { width: width * 0.48, height: height * 0.38, maxWidth: 220 },
  bottomSheet: { flex: 1, position: "relative" },
  fadeGradient: {
    position: "absolute",
    top: -60,
    left: 0, right: 0,
    height: 80,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  brandLabel: { fontFamily: "CormorantGaramond_600SemiBold", fontSize: 12, color: Colors.goldAccent, letterSpacing: 2.5, textTransform: "uppercase" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(214,162,74,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingBadgeText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 12, color: Colors.goldAccent },
  productName: { fontFamily: "PlayfairDisplay_900Black", fontSize: 28, color: Colors.textPrimary, letterSpacing: 0.5, marginBottom: 8, lineHeight: 34 },
  starsRow: { flexDirection: "row", gap: 3, marginBottom: 12 },
  descScroll: { maxHeight: 130, marginBottom: 12 },
  description: { fontFamily: "CormorantGaramond_400Regular", fontSize: 15, color: "#B9B9C3", lineHeight: 22 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  price: { fontFamily: "PlayfairDisplay_900Black", fontSize: 32, color: Colors.textGold },
  stockLabel: { fontFamily: "CormorantGaramond_400Regular", fontSize: 13, color: Colors.textSecondary },
  ctaRow: { flexDirection: "row", gap: 12 },
  outlineBtn: {
    flex: 1, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.goldAccent,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(214,162,74,0.08)",
  },
  outlineBtnText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 14, color: Colors.goldAccent },
  goldBtn: { height: 52, borderRadius: 14, overflow: "hidden" },
  goldBtnText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 14, color: "#000", letterSpacing: 0.5 },
  notFound: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: Colors.textPrimary, marginBottom: 16 },
  backPressable: { borderWidth: 1, borderColor: Colors.goldAccent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  backLink: { color: Colors.goldAccent, fontFamily: "CormorantGaramond_600SemiBold", fontSize: 15 },
  qtySection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  qtyLabel: { fontFamily: "CormorantGaramond_600SemiBold", fontSize: 15, color: Colors.textSecondary, letterSpacing: 0.5 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 0, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)" },
  qtyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: Colors.textPrimary, minWidth: 36, textAlign: "center" },
  qtyBtnAdd: { width: 44, height: 44, overflow: "hidden" },
  qtyBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  goldGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
