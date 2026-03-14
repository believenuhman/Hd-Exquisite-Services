import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { useCart, CartItem } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { ScreenBackground } from "@/components/ScreenBackground";

const FALLBACK_IMG = require("@/assets/images/hennessy.png");

function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart } = useCart();
  const fullStars = Math.floor(item.product.rating);

  return (
    <View style={styles.itemRow}>
      <View style={styles.thumbContainer}>
        <LinearGradient
          colors={["rgba(214,162,74,0.1)", "rgba(20,20,28,0.5)"]}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={item.product.image_url ? { uri: item.product.image_url } : FALLBACK_IMG}
          style={styles.thumbImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.itemCenter}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.product.name}
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= fullStars ? "star" : "star-outline"}
              size={10}
              color={Colors.goldAccent}
            />
          ))}
        </View>
        <Text style={styles.itemPrice}>
          ${(item.product.price * item.quantity).toFixed(2)}
        </Text>

      </View>

      <View style={styles.itemRight}>
        <View style={styles.qtyControl}>
          <Pressable
            onPress={() => {
              updateQuantity(item.product.id, item.quantity - 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.qtyBtn}
            hitSlop={8}
          >
            <Ionicons name="remove" size={14} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.qtyNum}>{item.quantity}</Text>
          <Pressable
            onPress={() => {
              updateQuantity(item.product.id, item.quantity + 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.qtyBtnAdd}
            hitSlop={8}
          >
            <LinearGradient
              colors={[Colors.goldStart, Colors.goldEnd]}
              style={styles.qtyBtnAddGrad}
            >
              <Text style={styles.qtyAddText}>Add</Text>
              <Ionicons name="add" size={12} color="#0B0B0F" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart } = useCart();
  const { formatPrice } = useAppSettings();
  const [activeFilter, setActiveFilter] = useState<string>(CATEGORIES[0]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        {items.length > 0 && (
          <Pressable
            onPress={() => {
              clearCart();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={20} color="rgba(185,185,195,0.6)" />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScrollContainer}
        contentContainerStyle={styles.catScroll}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setActiveFilter(c)}
            style={styles.catPillWrap}
          >
            {activeFilter === c ? (
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                style={styles.catPillFilled}
              >
                <Text style={styles.catPillActiveText}>{c}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.catPillInactive}>
                <Text style={styles.catPillInactiveText}>{c}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bag-outline" size={40} color={Colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse our collection and add your favorites
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: botPad + 200 },
            ]}
          >
            {items.map((item) => (
              <CartItemRow key={item.product.id} item={item} />
            ))}
          </ScrollView>

          <View
            style={[
              styles.summaryArea,
              { paddingBottom: botPad + (Platform.OS === "web" ? 84 : 72) },
            ]}
          >
            <LinearGradient
              colors={["rgba(11,11,15,0)", Colors.background]}
              style={[styles.summaryFade, { pointerEvents: "none" } as any]}
            />
            <LinearGradient
              colors={[Colors.background, Colors.background]}
              style={styles.summaryBg}
            />
            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={styles.summaryValue}>Calculated at checkout</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
            </View>

            <Pressable
              style={styles.checkoutBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push("/checkout");
              }}
            >
              <LinearGradient
                colors={[Colors.goldStart, Colors.goldEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkoutGrad}
              >
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={18} color="#0B0B0F" />
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    position: "relative",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  catScrollContainer: {
    flexGrow: 0,
    marginBottom: 12,
  },
  catScroll: {
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  catPillWrap: {
    borderRadius: 50,
    overflow: "hidden",
  },
  catPillFilled: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
  },
  catPillActiveText: {
    fontSize: 13,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: "#0B0B0F",
    letterSpacing: 0.3,
  },
  catPillInactive: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  catPillInactiveText: {
    fontSize: 13,
    fontFamily: "CormorantGaramond_400Regular",
    color: "rgba(185,185,195,0.75)",
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,28,0.78)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(214,162,74,0.25)",
    overflow: "hidden",
  },
  thumbContainer: {
    width: 80,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: 60,
    height: 78,
  },
  itemCenter: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 4,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textGold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  itemRight: {
    paddingRight: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    height: 34,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    minWidth: 18,
    textAlign: "center",
  },
  qtyBtnAdd: {
    borderRadius: 0,
    overflow: "hidden",
    height: 34,
  },
  qtyBtnAddGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 34,
    gap: 3,
  },
  qtyAddText: {
    fontSize: 12,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: "#0B0B0F",
    letterSpacing: 0.3,
  },
  summaryArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  summaryFade: {
    position: "absolute",
    top: -30,
    left: 0,
    right: 0,
    height: 30,
  },
  summaryBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(214,162,74,0.2)",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: "CormorantGaramond_400Regular",
    color: "rgba(185,185,195,0.8)",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  totalLabel: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textGold,
    letterSpacing: 0.5,
  },
  checkoutBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  checkoutGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
    borderRadius: 16,
  },
  checkoutText: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#0B0B0F",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "CormorantGaramond_400Regular",
    color: "rgba(185,185,195,0.65)",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
});
