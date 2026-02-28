import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useCart, CartItem } from "@/context/CartContext";

const SHIPPING = 9.99;

function CartItemCard({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemImageContainer}>
        <LinearGradient
          colors={["rgba(214,162,74,0.1)", "rgba(20,20,28,0.5)"]}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={item.product.image}
          style={styles.itemImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemBrand}>{item.product.brand}</Text>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.itemMeta}>
          {item.product.volume} · {item.product.abv} ABV
        </Text>

        <View style={styles.quantityRow}>
          <Pressable
            onPress={() => {
              updateQuantity(item.product.id, item.quantity - 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.qtyBtn}
            hitSlop={8}
          >
            <Ionicons name="remove" size={16} color={Colors.goldAccent} />
          </Pressable>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <Pressable
            onPress={() => {
              updateQuantity(item.product.id, item.quantity + 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.qtyBtn}
            hitSlop={8}
          >
            <Ionicons name="add" size={16} color={Colors.goldAccent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Pressable
          onPress={() => {
            removeFromCart(item.product.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          hitSlop={8}
          style={styles.removeBtn}
        >
          <Ionicons name="close" size={16} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.itemPrice}>
          ${(item.product.price * item.quantity).toFixed(2)}
        </Text>
        <Text style={styles.itemUnitPrice}>
          ${item.product.price.toFixed(2)} each
        </Text>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart, totalItems } = useCart();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const total = subtotal + (subtotal > 0 ? SHIPPING : 0);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-outline" size={42} color={Colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse our premium collection and add your favorites
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <Pressable
          onPress={() => {
            clearCart();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }}
        >
          <Text style={styles.clearText}>Clear All</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 220 },
        ]}
      >
        <View style={styles.itemsList}>
          {items.map((item) => (
            <CartItemCard key={item.product.id} item={item} />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.summaryContainer,
          { paddingBottom: bottomPadding + (Platform.OS === "web" ? 84 : 72) },
        ]}
      >
        <LinearGradient
          colors={["rgba(20,20,28,0.95)", "#14141C"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.summaryBorder} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>${SHIPPING.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>

        <Pressable
          style={styles.checkoutBtn}
          onPress={() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          }
        >
          <LinearGradient
            colors={[Colors.goldStart, Colors.goldEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutGradient}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#0B0B0F" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 30,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.3,
  },
  clearText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  itemsList: {
    gap: 14,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  itemImageContainer: {
    width: 90,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImage: {
    width: 70,
    height: 100,
  },
  itemInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 4,
    gap: 3,
  },
  itemBrand: {
    fontSize: 10,
    color: Colors.textGold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_400Regular",
  },
  itemName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    marginTop: 2,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  qtyBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
    minWidth: 20,
    textAlign: "center",
  },
  itemRight: {
    paddingRight: 14,
    paddingVertical: 14,
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  removeBtn: {
    padding: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  itemUnitPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
  },
  summaryContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryBorder: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(214,162,74,0.2)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  totalRow: {
    marginBottom: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  totalLabel: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  totalValue: {
    fontSize: 22,
    color: Colors.textGold,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  checkoutBtn: {
    borderRadius: 18,
    overflow: "hidden",
  },
  checkoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
    borderRadius: 18,
  },
  checkoutText: {
    fontSize: 16,
    color: "#0B0B0F",
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  emptyTitle: {
    fontSize: 22,
    color: Colors.textPrimary,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: "CormorantGaramond_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
